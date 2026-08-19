import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'

const SUGGESTIONS = [
  'Qual é meu lucro este mês?',
  'Tenho contas vencidas?',
  'Como está minha margem de lucro?',
  'Quantas OS estão abertas?',
  'Tenho itens com estoque baixo?',
  'Qual é minha taxa de conversão de orçamentos?',
  'Quais impostos estão pendentes?',
  'Como está a saúde do meu negócio?',
  'Quais são meus próximos agendamentos?',
  'Quanto devo em salários este mês?',
]

export function AIAssistant() {
  const { businessId } = useParams()
  const { business } = useBusiness()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Olá! Sou o assistente de IA do Axion. Tenho acesso a todos os dados do seu negócio — financeiro, vendas, estoque, RH, fiscal e muito mais. Como posso ajudar?` }
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
        { data: bills },
        { data: quotes },
        { data: orders },
        { data: taxRecords },
        { data: advances },
        { data: bankAccounts },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).gte('date', firstDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('services').select('*').eq('business_id', businessId),
        supabase.from('inventory').select('*').eq('business_id', businessId),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'ativo'),
        supabase.from('work_orders').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('appointments').select('*').eq('business_id', businessId).gte('date', today).order('date').limit(5),
        supabase.from('tools').select('*').eq('business_id', businessId),
        supabase.from('bills').select('*').eq('business_id', businessId),
        supabase.from('quotes').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('orders').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('tax_records').select('*').eq('business_id', businessId),
        supabase.from('employee_advances').select('*, employees(name)').eq('business_id', businessId).eq('status', 'pendente'),
        supabase.from('bank_accounts').select('*').eq('business_id', businessId),
      ])

      const receitas = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity) || []
      const osAbertas = workOrders?.filter(o => ['aberta', 'em andamento'].includes(o.status)) || []
      const ferramentasManutencao = tools?.filter(t => t.status === 'manutenção') || []
      const contasVencidas = bills?.filter(b => b.status === 'vencido') || []
      const contasAReceber = bills?.filter(b => b.type === 'receber' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const contasAPagar = bills?.filter(b => b.type === 'pagar' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const totalOrcamentos = quotes?.length || 0
      const orcamentosAprovados = quotes?.filter(q => q.status === 'aprovado').length || 0
      const taxaConversao = totalOrcamentos > 0 ? ((orcamentosAprovados / totalOrcamentos) * 100).toFixed(1) : 0
      const pedidosEntregues = orders?.filter(o => o.status === 'entregue').reduce((acc, o) => acc + Number(o.total), 0) || 0
      const impostosVencidos = taxRecords?.filter(t => t.status === 'pendente') || []
      const saldoBancos = bankAccounts?.reduce((acc, b) => acc + Number(b.balance), 0) || 0
      const margem = receitas > 0 ? ((receitas - despesas) / receitas * 100).toFixed(1) : 0

      setContext({
        negocio: business?.name,
        mes: now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }),
        receitas, despesas, lucro: receitas - despesas, margem,
        totalClientes: clients || 0,
        totalFuncionarios: employees || 0,
        totalServicos: services?.length || 0,
        servicosEmAndamento: services?.filter(s => s.status === 'em andamento').length || 0,
        itensBaixoEstoque: itensBaixoEstoque.map(i => `${i.name} (${i.quantity} un)`),
        osAbertas: osAbertas.map(o => `${o.clients?.name || 'sem cliente'} - ${o.status}`),
        proximosAgendamentos: appointments?.map(a => `${a.title} em ${new Date(a.date + 'T00:00:00').toLocaleDateString('pt-BR')}`) || [],
        ferramentasManutencao: ferramentasManutencao.map(t => t.name),
        contasVencidas: contasVencidas.map(b => `${b.description} (R$ ${Number(b.amount).toFixed(2).replace('.', ',')})`),
        contasAReceber, contasAPagar,
        taxaConversao, totalOrcamentos, orcamentosAprovados,
        pedidosEntregues,
        impostosVencidos: impostosVencidos.map(t => `${t.type} - R$ ${Number(t.amount).toFixed(2).replace('.', ',')}`),
        saldoBancos,
        adiantamentosPendentes: advances?.map(a => `${a.employees?.name}: R$ ${Number(a.amount).toFixed(2).replace('.', ',')}`) || [],
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

    const systemPrompt = `Você é um assistente de gestão empresarial integrado ao sistema Axion. Responda de forma direta, objetiva e em português brasileiro. Seja conciso mas completo. Use dados reais do negócio para dar conselhos práticos.

Dados do negócio "${context?.negocio}" (${context?.mes}):

FINANCEIRO:
- Receitas: R$ ${context?.receitas?.toFixed(2)}
- Despesas: R$ ${context?.despesas?.toFixed(2)}
- Lucro: R$ ${context?.lucro?.toFixed(2)}
- Margem de lucro: ${context?.margem}%
- Saldo total em bancos: R$ ${context?.saldoBancos?.toFixed(2)}
- A receber: R$ ${context?.contasAReceber?.toFixed(2)}
- A pagar: R$ ${context?.contasAPagar?.toFixed(2)}
- Contas vencidas: ${context?.contasVencidas?.length > 0 ? context.contasVencidas.join(', ') : 'nenhuma'}

VENDAS:
- Total de orçamentos: ${context?.totalOrcamentos}
- Orçamentos aprovados: ${context?.orcamentosAprovados}
- Taxa de conversão: ${context?.taxaConversao}%
- Total em pedidos entregues: R$ ${context?.pedidosEntregues?.toFixed(2)}

OPERACIONAL:
- Clientes: ${context?.totalClientes}
- Funcionários ativos: ${context?.totalFuncionarios}
- Serviços: ${context?.totalServicos} total, ${context?.servicosEmAndamento} em andamento
- OS abertas: ${context?.osAbertas?.length > 0 ? context.osAbertas.join(', ') : 'nenhuma'}
- Próximos agendamentos: ${context?.proximosAgendamentos?.length > 0 ? context.proximosAgendamentos.join(', ') : 'nenhum'}

ESTOQUE E FERRAMENTAS:
- Itens com estoque baixo: ${context?.itensBaixoEstoque?.length > 0 ? context.itensBaixoEstoque.join(', ') : 'nenhum'}
- Ferramentas em manutenção: ${context?.ferramentasManutencao?.length > 0 ? context.ferramentasManutencao.join(', ') : 'nenhuma'}

FISCAL E RH:
- Impostos pendentes: ${context?.impostosVencidos?.length > 0 ? context.impostosVencidos.join(', ') : 'nenhum'}
- Adiantamentos pendentes: ${context?.adiantamentosPendentes?.length > 0 ? context.adiantamentosPendentes.join(', ') : 'nenhum'}`

    const history = messages.filter((_, i) => i > 0).map(m => ({ role: m.role, content: m.content }))

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }],
          max_tokens: 1024, temperature: 0.7,
        })
      })
      const data = await response.json()
      const reply = data.choices?.[0]?.message?.content || 'Não consegui processar. Tente novamente.'
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao conectar com a IA. Tente novamente.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assistente de IA</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Faça perguntas sobre qualquer aspecto do seu negócio.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-white dark:bg-gray-900">
          {messages.map((msg, i) => (
            <div key={i} className={"flex " + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={"max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap " + (msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm')}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl text-sm text-gray-400 flex gap-1 items-center">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="px-6 pb-4 bg-white dark:bg-gray-900">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Sugestões de perguntas:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-400 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-800 p-4 flex gap-3 bg-white dark:bg-gray-900">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pergunte sobre finanças, vendas, estoque, RH, impostos..."
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
          <button onClick={() => handleSend()} disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
