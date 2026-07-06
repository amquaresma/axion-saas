import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'

export function AIAssistant() {
  const { businessId } = useParams()
  const { business } = useBusiness()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o assistente de IA do Axion. Posso responder perguntas sobre seu negócio, como faturamento, clientes, estoque e muito mais. Como posso ajudar?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function fetchContext() {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      const [
        { data: transactions },
        { count: clients },
        { data: services },
        { data: inventory },
        { count: employees },
        { data: workOrders },
        { data: appointments },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).gte('date', firstDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('services').select('*').eq('business_id', businessId),
        supabase.from('inventory').select('*').eq('business_id', businessId),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'ativo'),
        supabase.from('work_orders').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('appointments').select('*').eq('business_id', businessId).gte('date', today),
      ])

      const receitas = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity) || []
      const osAbertas = workOrders?.filter(o => ['aberta', 'em andamento'].includes(o.status)) || []

      setContext({
        negocio: business?.name,
        mes: now.toLocaleString('pt-BR', { month: 'long' }),
        receitas, despesas, lucro: receitas - despesas,
        totalClientes: clients || 0,
        totalFuncionarios: employees || 0,
        servicos: services || [],
        itensBaixoEstoque,
        osAbertas,
        proximosAgendamentos: appointments?.slice(0, 5) || [],
        transacoes: transactions || [],
      })
    }
    if (business) fetchContext()
  }, [businessId, business])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const systemPrompt = `Você é um assistente de gestão empresarial integrado ao sistema Axion. Responda de forma direta, objetiva e em português brasileiro.

Dados atuais do negócio "${context?.negocio}":
- Mês atual: ${context?.mes}
- Receitas do mês: R$ ${context?.receitas?.toFixed(2)}
- Despesas do mês: R$ ${context?.despesas?.toFixed(2)}
- Lucro do mês: R$ ${context?.lucro?.toFixed(2)}
- Total de clientes: ${context?.totalClientes}
- Funcionários ativos: ${context?.totalFuncionarios}
- Serviços cadastrados: ${context?.servicos?.length} (${context?.servicos?.filter(s => s.status === 'em andamento').length} em andamento)
- Itens com estoque baixo: ${context?.itensBaixoEstoque?.length} (${context?.itensBaixoEstoque?.map(i => i.name).join(', ') || 'nenhum'})
- Ordens de serviço abertas: ${context?.osAbertas?.length} (${context?.osAbertas?.map(o => o.clients?.name).join(', ') || 'nenhuma'})
- Próximos agendamentos: ${context?.proximosAgendamentos?.length}

Responda perguntas sobre esses dados de forma clara e útil. Se perguntarem sobre algo que não está nos dados, diga que não tem essa informação disponível no momento.`

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ]
        })
      })

      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Não consegui processar sua pergunta. Tente novamente.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA. Verifique sua conexão e tente novamente.' }])
    }

    setLoading(false)
  }

  const suggestions = [
    'Quanto faturei este mês?',
    'Qual é meu lucro atual?',
    'Tenho itens com estoque baixo?',
    'Quantas OS estão abertas?',
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assistente de IA</h1>
        <p className="text-gray-500 text-sm mt-1">Faça perguntas sobre seu negócio em linguagem natural.</p>
      </div>

      {/* Chat */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={"max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed " + (msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900')}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-xl text-sm text-gray-500">
                Analisando dados...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Sugestões */}
        {messages.length === 1 && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); }}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte algo sobre seu negócio..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
