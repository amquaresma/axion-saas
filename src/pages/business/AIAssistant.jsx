import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'

const SUGGESTIONS = [
  'Quanto faturei este mês?',
  'Qual é meu lucro atual?',
  'Tenho itens com estoque baixo?',
  'Quantas OS estão abertas?',
  'Como está a saúde do meu negócio?',
  'Quais são meus próximos agendamentos?',
]

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
        { data: tools },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).gte('date', firstDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('services').select('*').eq('business_id', businessId),
        supabase.from('inventory').select('*').eq('business_id', businessId),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'ativo'),
        supabase.from('work_orders').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('appointments').select('*').eq('business_id', businessId).gte('date', today).order('date').limit(5),
        supabase.from('tools').select('*').eq('business_id', businessId),
      ])

      const receitas = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity) || []
      const osAbertas = workOrders?.filter(o => ['aberta', 'em andamento'].includes(o.status)) || []
      const ferramentasManutencao = tools?.filter(t => t.status === 'manutenção') || []

      setContext({
        negocio: business?.name,
        mes: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        receitas, despesas, lucro: receitas - despesas,
        totalClientes: clients || 0,
        totalFuncionarios: employees || 0,
        totalServicos: services?.length || 0,
        servicosEmAndamento: services?.filter(s => s.status === 'em andamento').length || 0,
        itensBaixoEstoque: itensBaixoEstoque.map(i => `${i.name} (${i.quantity} un.)`),
        osAbertas: osAbertas.map(o => `${o.clients?.name || 'sem cliente'} - ${o.status}`),
        proximosAgendamentos: appointments?.map(a => `${a.title} em ${new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}`) || [],
        ferramentasManutencao: ferramentasManutencao.map(t => t.name),
      })
    }
    if (business) fetchContext()
  }, [businessId, business])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text) {
    const userMessage = (text || input).trim()
    if (!userMessage || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    const systemPrompt = `Você é um assistente de gestão empresarial integrado ao sistema Axion. Responda de forma direta, objetiva e em português brasileiro. Seja conciso mas completo.

Dados atuais do negócio "${context?.negocio}" (${context?.mes}):
- Receitas: R$ ${context?.receitas?.toFixed(2)}
- Despesas: R$ ${context?.despesas?.toFixed(2)}
- Lucro: R$ ${context?.lucro?.toFixed(2)}
- Clientes: ${context?.totalClientes}
- Funcionários ativos: ${context?.totalFuncionarios}
- Serviços: ${context?.totalServicos} total, ${context?.servicosEmAndamento} em andamento
- Estoque baixo: ${context?.itensBaixoEstoque?.length > 0 ? context.itensBaixoEstoque.join(', ') : 'nenhum'}
- OS abertas: ${context?.osAbertas?.length > 0 ? context.osAbertas.join(', ') : 'nenhuma'}
- Próximos agendamentos: ${context?.proximosAgendamentos?.length > 0 ? context.proximosAgendamentos.join(', ') : 'nenhum'}
- Ferramentas em manutenção: ${context?.ferramentasManutencao?.length > 0 ? context.ferramentasManutencao.join(', ') : 'nenhuma'}`

    const history = messages
      .filter((_, i) => i > 0)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: userMessage }
          ],
          max_tokens: 1024,
          temperature: 0.7,
        })
      })

      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Não consegui processar sua pergunta. Tente novamente.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA. Tente novamente.' }])
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assistente de IA</h1>
        <p className="text-gray-500 text-sm mt-1">Faça perguntas sobre seu negócio em linguagem natural.</p>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={"max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap " + (msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm')}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 px-4 py-3 rounded-xl text-sm text-gray-400 flex gap-1 items-center">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-6 pb-4">
            <p className="text-xs text-gray-400 mb-2">Sugestões:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

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
            onClick={() => handleSend()}
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
