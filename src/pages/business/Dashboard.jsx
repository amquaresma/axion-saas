import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'

export function BusinessDashboard() {
  const { businessId } = useParams()
  const { business, loading: loadingBusiness } = useBusiness()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('30d')

  useEffect(() => {
    async function fetchData() {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      let daysBack = 30
      if (filter === '7d') daysBack = 7
      if (filter === '90d') daysBack = 90
      if (filter === '12m') daysBack = 365
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        { count: clients },
        { count: services },
        { count: openOrders },
        { data: allTransactions },
        { data: recentTransactions },
        { data: inventory },
        { data: bills },
        { data: quotes },
        { data: orders },
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'em andamento'),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['aberta', 'em andamento']),
        supabase.from('transactions').select('*').eq('business_id', businessId).gte('date', firstDay).lte('date', lastDay).order('date', { ascending: false }),
        supabase.from('transactions').select('*').eq('business_id', businessId).gte('date', since).order('date', { ascending: false }),
        supabase.from('inventory').select('quantity, min_quantity').eq('business_id', businessId),
        supabase.from('bills').select('type, amount, status, due_date').eq('business_id', businessId),
        supabase.from('quotes').select('status').eq('business_id', businessId),
        supabase.from('orders').select('status, total').eq('business_id', businessId),
      ])

      const receitas = allTransactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = allTransactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity).length || 0
      const contasVencidas = bills?.filter(b => b.status === 'vencido').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const contasAReceber = bills?.filter(b => b.type === 'receber' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const contasAPagar = bills?.filter(b => b.type === 'pagar' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0) || 0
      const orcamentosPendentes = quotes?.filter(q => q.status === 'enviado').length || 0
      const pedidosAtivos = orders?.filter(o => ['pendente', 'em_producao', 'pronto'].includes(o.status)).length || 0
      const totalPedidosMes = orders?.reduce((acc, o) => acc + Number(o.total || 0), 0) || 0

      setStats({
        clients: clients || 0, services: services || 0, openOrders: openOrders || 0,
        receitas, despesas, saldo: receitas - despesas, itensBaixoEstoque,
        contasVencidas, contasAReceber, contasAPagar,
        orcamentosPendentes, pedidosAtivos, totalPedidosMes,
        margem: receitas > 0 ? ((receitas - despesas) / receitas * 100).toFixed(1) : 0,
      })
      setTransactions(recentTransactions || [])

      const grouped = {}
      recentTransactions?.forEach((t) => {
        const date = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        if (!grouped[date]) grouped[date] = { date, receitas: 0, despesas: 0 }
        if (t.type === 'receita') grouped[date].receitas += Number(t.amount)
        else grouped[date].despesas += Number(t.amount)
      })

      setChartData(Object.values(grouped).sort((a, b) => {
        const [da, ma] = a.date.split('/').map(Number)
        const [db, mb] = b.date.split('/').map(Number)
        return ma !== mb ? ma - mb : da - db
      }))
      setLoading(false)
    }
    fetchData()
  }, [businessId, filter])

  const fmt = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`

  if (loadingBusiness || loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  const kpiGroups = [
    {
      title: 'Financeiro do mês',
      color: 'border-green-500',
      cards: [
        { label: 'Receitas', value: fmt(stats.receitas), color: 'text-green-600 dark:text-green-400', path: 'financeiro' },
        { label: 'Despesas', value: fmt(stats.despesas), color: 'text-red-500 dark:text-red-400', path: 'financeiro' },
        { label: 'Lucro', value: fmt(stats.saldo), color: stats.saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500', path: 'financeiro' },
        { label: 'Margem', value: `${stats.margem}%`, color: 'text-blue-600 dark:text-blue-400', path: 'relatorios' },
      ]
    },
    {
      title: 'Contas',
      color: 'border-blue-500',
      cards: [
        { label: 'A receber', value: fmt(stats.contasAReceber), color: 'text-green-600 dark:text-green-400', path: 'contas' },
        { label: 'A pagar', value: fmt(stats.contasAPagar), color: 'text-red-500 dark:text-red-400', path: 'contas' },
        { label: 'Vencidas', value: fmt(stats.contasVencidas), color: stats.contasVencidas > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white', path: 'contas' },
        { label: 'Pedidos do mês', value: fmt(stats.totalPedidosMes), color: 'text-blue-600 dark:text-blue-400', path: 'pedidos' },
      ]
    },
    {
      title: 'Operacional',
      color: 'border-purple-500',
      cards: [
        { label: 'Clientes', value: stats.clients, color: 'text-gray-900 dark:text-white', path: 'clientes' },
        { label: 'OS abertas', value: stats.openOrders, color: stats.openOrders > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white', path: 'ordens-servico' },
        { label: 'Orçamentos pendentes', value: stats.orcamentosPendentes, color: stats.orcamentosPendentes > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white', path: 'orcamentos' },
        { label: 'Estoque baixo', value: stats.itensBaixoEstoque, color: stats.itensBaixoEstoque > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white', path: 'estoque' },
      ]
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{business?.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Visão geral do negócio</p>
      </div>

      {/* KPI Groups */}
      {kpiGroups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className={`text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 pl-1 border-l-2 ${group.color} pl-3`}>{group.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {group.cards.map((card) => (
              <div
                key={card.label}
                onClick={() => navigate(`/b/${businessId}/${card.path}`)}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className={`text-2xl font-bold mt-1.5 ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Filtro */}
      <div className="flex items-center justify-between mb-4 mt-8">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Fluxo de caixa</h2>
        <div className="flex gap-1">
          {[['7d', '7 dias'], ['30d', '30 dias'], ['90d', '90 dias'], ['12m', '12 meses']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={"px-3 py-1 rounded-lg text-xs font-medium border transition-all " + (filter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
        {chartData.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação no período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value) => fmt(value)} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
              <Legend />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#22c55e" fill="url(#colorReceitas)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fill="url(#colorDespesas)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Receitas vs Despesas por dia</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(value) => fmt(value)} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Extrato de transações</h2>
          <button onClick={() => navigate(`/b/${businessId}/financeiro`)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver tudo</button>
        </div>
        {transactions.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Nenhuma transação no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Categoria</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{t.description}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{t.category || '—'}</td>
                  <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-3">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (t.type === 'receita' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                      {t.type}
                    </span>
                  </td>
                  <td className={"px-6 py-3 font-semibold text-right " + (t.type === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>
                    {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
