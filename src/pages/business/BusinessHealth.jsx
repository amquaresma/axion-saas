import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function BusinessHealth() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [details, setDetails] = useState([])
  const [indicators, setIndicators] = useState([])

  useEffect(() => {
    async function fetchHealth() {
      const today = new Date().toISOString().split('T')[0]
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [
        { data: transactions },
        { count: clientsCount },
        { data: inventory },
        { count: openOrders },
        { count: overdueAppointments },
        { count: activeEmployees },
        { data: bills },
        { data: quotes },
        { data: orders },
        { data: taxRecords },
      ] = await Promise.all([
        supabase.from('transactions').select('type, amount').eq('business_id', businessId).gte('date', firstDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('inventory').select('quantity, min_quantity').eq('business_id', businessId),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['aberta', 'em andamento']),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('business_id', businessId).lt('date', today).eq('status', 'agendado'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'ativo'),
        supabase.from('bills').select('type, amount, status').eq('business_id', businessId),
        supabase.from('quotes').select('status').eq('business_id', businessId),
        supabase.from('orders').select('total, status').eq('business_id', businessId),
        supabase.from('tax_records').select('status, amount').eq('business_id', businessId),
      ])

      const receitas = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const saldo = receitas - despesas
      const margem = receitas > 0 ? ((saldo / receitas) * 100) : 0
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity).length || 0
      const contasVencidas = bills?.filter(b => b.status === 'vencido').length || 0
      const contasAPagar = bills?.filter(b => b.type === 'pagar' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const totalOrcamentos = quotes?.length || 0
      const orcamentosAprovados = quotes?.filter(q => q.status === 'aprovado').length || 0
      const taxaConversao = totalOrcamentos > 0 ? (orcamentosAprovados / totalOrcamentos * 100) : 0
      const impostosVencidos = taxRecords?.filter(t => t.status === 'pendente').length || 0
      const totalVendas = orders?.filter(o => o.status === 'entregue').reduce((acc, o) => acc + Number(o.total), 0) || 0

      const checks = [
        { label: 'Fluxo de caixa positivo', ok: saldo >= 0, strong: saldo > receitas * 0.1, message: saldo >= 0 ? `Saldo de R$ ${saldo.toFixed(2).replace('.', ',')} este mês` : `Saldo negativo`, points: 15, path: 'financeiro' },
        { label: 'Margem de lucro saudável', ok: margem >= 10, strong: margem >= 25, message: `Margem de ${margem.toFixed(1)}%`, points: 15, path: 'relatorios' },
        { label: 'Clientes cadastrados', ok: (clientsCount || 0) > 0, strong: (clientsCount || 0) >= 5, message: `${clientsCount || 0} clientes`, points: 10, path: 'clientes' },
        { label: 'Estoque controlado', ok: itensBaixoEstoque === 0, strong: itensBaixoEstoque === 0, message: itensBaixoEstoque > 0 ? `${itensBaixoEstoque} item(ns) com estoque baixo` : 'Estoque dentro do limite', points: 10, path: 'estoque' },
        { label: 'Contas em dia', ok: contasVencidas === 0, strong: contasVencidas === 0 && contasAPagar < receitas * 0.5, message: contasVencidas > 0 ? `${contasVencidas} conta(s) vencida(s)` : 'Contas em dia', points: 15, path: 'contas' },
        { label: 'OS em dia', ok: (openOrders || 0) <= 3, strong: (openOrders || 0) === 0, message: `${openOrders || 0} OS abertas`, points: 10, path: 'ordens-servico' },
        { label: 'Agenda em dia', ok: (overdueAppointments || 0) === 0, strong: true, message: overdueAppointments > 0 ? `${overdueAppointments} agendamento(s) não concluído(s)` : 'Agenda em dia', points: 10, path: 'agenda' },
        { label: 'Equipe ativa', ok: (activeEmployees || 0) > 0, strong: (activeEmployees || 0) >= 2, message: `${activeEmployees || 0} funcionário(s) ativo(s)`, points: 5, path: 'funcionarios' },
        { label: 'Taxa de conversão', ok: taxaConversao >= 30, strong: taxaConversao >= 60, message: totalOrcamentos > 0 ? `${taxaConversao.toFixed(0)}% de conversão` : 'Sem orçamentos', points: 5, path: 'orcamentos' },
        { label: 'Impostos em dia', ok: impostosVencidos === 0, strong: true, message: impostosVencidos > 0 ? `${impostosVencidos} imposto(s) pendente(s)` : 'Impostos em dia', points: 5, path: 'impostos' },
      ]

      const totalScore = checks.reduce((acc, c) => acc + (c.ok ? (c.strong ? c.points : c.points * 0.6) : 0), 0)

      const kpis = [
        { label: 'Receita do mês', value: `R$ ${receitas.toFixed(2).replace('.', ',')}`, color: 'text-green-600 dark:text-green-400', path: 'financeiro' },
        { label: 'Margem de lucro', value: `${margem.toFixed(1)}%`, color: margem >= 10 ? 'text-green-600 dark:text-green-400' : 'text-red-500', path: 'relatorios' },
        { label: 'Taxa de conversão', value: `${taxaConversao.toFixed(0)}%`, color: taxaConversao >= 30 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500', path: 'orcamentos' },
        { label: 'Total em vendas', value: `R$ ${totalVendas.toFixed(2).replace('.', ',')}`, color: 'text-blue-600 dark:text-blue-400', path: 'pedidos' },
      ]

      setScore(Math.round(totalScore))
      setDetails(checks)
      setIndicators(kpis)
      setLoading(false)
    }
    fetchHealth()
  }, [businessId])

  function getScoreConfig(score) {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', bar: 'bg-green-500' }
    if (score >= 60) return { label: 'Bom', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', bar: 'bg-blue-500' }
    if (score >= 40) return { label: 'Regular', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30', bar: 'bg-yellow-500' }
    return { label: 'Crítico', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', bar: 'bg-red-500' }
  }

  const config = getScoreConfig(score)
  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  const strong = details.filter(d => d.ok && d.strong)
  const attention = details.filter(d => d.ok && !d.strong)
  const critical = details.filter(d => !d.ok)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saúde do Negócio</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Avaliação completa do desempenho do seu negócio.</p>
      </div>

      {/* Score */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 mb-6 flex items-center gap-8">
        <div className="text-center flex-shrink-0">
          <div className={`text-6xl font-bold ${config.color}`}>{score}</div>
          <div className={`text-sm font-medium mt-2 px-4 py-1 rounded-full ${config.bg} ${config.color}`}>{config.label}</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1"><span>0</span><span>100</span></div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-700 ${config.bar}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Pontuação baseada em 10 indicadores: financeiro, vendas, estoque, agenda, equipe, impostos e mais.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {indicators.map((kpi) => (
          <div key={kpi.label} onClick={() => navigate(`/b/${businessId}/${kpi.path}`)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all">
            <p className="text-xs text-gray-500 dark:text-gray-400">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Pontos fortes ({strong.length})
          </h2>
          {strong.length === 0 ? <p className="text-xs text-gray-400">Nenhum ponto forte ainda.</p> : strong.map((d, i) => (
            <div key={i} onClick={() => navigate(`/b/${businessId}/${d.path}`)} className="flex items-start gap-2 mb-3 cursor-pointer hover:opacity-80">
              <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
              <div><p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p><p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p></div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-yellow-700 dark:text-yellow-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
            Pontos de atenção ({attention.length})
          </h2>
          {attention.length === 0 ? <p className="text-xs text-gray-400">Nenhum ponto de atenção.</p> : attention.map((d, i) => (
            <div key={i} onClick={() => navigate(`/b/${businessId}/${d.path}`)} className="flex items-start gap-2 mb-3 cursor-pointer hover:opacity-80">
              <span className="text-yellow-500 mt-0.5 flex-shrink-0">!</span>
              <div><p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p><p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p></div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
            Problemas críticos ({critical.length})
          </h2>
          {critical.length === 0 ? <p className="text-xs text-gray-400">Nenhum problema crítico.</p> : critical.map((d, i) => (
            <div key={i} onClick={() => navigate(`/b/${businessId}/${d.path}`)} className="flex items-start gap-2 mb-3 cursor-pointer hover:opacity-80">
              <span className="text-red-500 mt-0.5 flex-shrink-0">✕</span>
              <div><p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p><p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
