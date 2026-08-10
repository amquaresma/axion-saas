import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4']

export function Reports() {
  const { businessId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dre')

  useEffect(() => {
    async function fetchAll() {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [
        { data: transactions },
        { data: bills },
        { data: clients },
        { data: services },
        { data: inventory },
        { data: employees },
        { data: workOrders },
        { data: quotes },
        { data: orders },
        { data: advances },
        { data: movements },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).order('date', { ascending: false }),
        supabase.from('bills').select('*').eq('business_id', businessId),
        supabase.from('clients').select('*').eq('business_id', businessId),
        supabase.from('services').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('inventory').select('*').eq('business_id', businessId),
        supabase.from('employees').select('*').eq('business_id', businessId),
        supabase.from('work_orders').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('quotes').select('*, clients(name)').eq('business_id', businessId),
        supabase.from('orders').select('*, clients(name), employees(name)').eq('business_id', businessId),
        supabase.from('employee_advances').select('*, employees(name)').eq('business_id', businessId),
        supabase.from('inventory_movements').select('*, inventory(name)').eq('business_id', businessId).order('date', { ascending: false }),
      ])

      setData({
        transactions: transactions || [],
        bills: bills || [],
        clients: clients || [],
        services: services || [],
        inventory: inventory || [],
        employees: employees || [],
        workOrders: workOrders || [],
        quotes: quotes || [],
        orders: orders || [],
        advances: advances || [],
        movements: movements || [],
      })
      setLoading(false)
    }
    fetchAll()
  }, [businessId])

  function exportCSV(rows, filename) {
    if (!rows.length) return
    const headers = Object.keys(rows[0]).join(',')
    const body = rows.map((r) => Object.values(r).map((v) => `"${v ?? ''}"`).join(',')).join('\n')
    const blob = new Blob([headers + '\n' + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
  }

  const fmt = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`

  const tabs = [
    { key: 'dre', label: 'DRE' },
    { key: 'fluxo', label: 'Fluxo de Caixa' },
    { key: 'contas', label: 'Contas' },
    { key: 'vendas', label: 'Vendas' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'funcionarios', label: 'Funcionários' },
    { key: 'os', label: 'Ordens de Serviço' },
  ]

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  // DRE
  const receitas = data.transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0)
  const despesas = data.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0)
  const lucroLiquido = receitas - despesas
  const margemLucro = receitas > 0 ? ((lucroLiquido / receitas) * 100).toFixed(1) : 0

  const receitasPorCategoria = data.transactions.filter(t => t.type === 'receita').reduce((acc, t) => {
    acc[t.category || 'Sem categoria'] = (acc[t.category || 'Sem categoria'] || 0) + Number(t.amount); return acc
  }, {})
  const despesasPorCategoria = data.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => {
    acc[t.category || 'Sem categoria'] = (acc[t.category || 'Sem categoria'] || 0) + Number(t.amount); return acc
  }, {})

  // Fluxo de caixa por mês
  const fluxoPorMes = data.transactions.reduce((acc, t) => {
    const mes = t.date?.slice(0, 7)
    if (!mes) return acc
    if (!acc[mes]) acc[mes] = { mes, receitas: 0, despesas: 0 }
    if (t.type === 'receita') acc[mes].receitas += Number(t.amount)
    else acc[mes].despesas += Number(t.amount)
    return acc
  }, {})
  const fluxoData = Object.values(fluxoPorMes).sort((a, b) => a.mes.localeCompare(b.mes)).map(m => ({
    ...m, mes: new Date(m.mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    saldo: m.receitas - m.despesas
  }))

  // Contas
  const contasAReceber = data.bills.filter(b => b.type === 'receber' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0)
  const contasAPagar = data.bills.filter(b => b.type === 'pagar' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0)
  const contasVencidas = data.bills.filter(b => b.status === 'vencido').reduce((acc, b) => acc + Number(b.amount), 0)
  const contasPagas = data.bills.filter(b => b.status === 'pago').reduce((acc, b) => acc + Number(b.amount), 0)

  // Vendas
  const totalOrcamentos = data.quotes.length
  const orcamentosAprovados = data.quotes.filter(q => q.status === 'aprovado').length
  const taxaConversao = totalOrcamentos > 0 ? ((orcamentosAprovados / totalOrcamentos) * 100).toFixed(1) : 0
  const totalPedidos = data.orders.reduce((acc, o) => acc + Number(o.total), 0)
  const totalComissoes = data.orders.reduce((acc, o) => acc + Number(o.commission_amount || 0), 0)

  // Estoque
  const valorEstoque = data.inventory.reduce((acc, i) => acc + (Number(i.average_cost || i.price || 0) * Number(i.quantity)), 0)
  const itensBaixoEstoque = data.inventory.filter(i => i.quantity <= i.min_quantity)
  const entradasEstoque = data.movements.filter(m => m.type === 'entrada').reduce((acc, m) => acc + Number(m.quantity), 0)
  const saidasEstoque = data.movements.filter(m => m.type === 'saida').reduce((acc, m) => acc + Number(m.quantity), 0)

  // Funcionários
  const totalSalarios = data.employees.reduce((acc, e) => acc + Number(e.salary || 0), 0)
  const totalAdiantamentos = data.advances.filter(a => a.type === 'adiantamento').reduce((acc, a) => acc + Number(a.amount), 0)
  const totalValeTransporte = data.advances.filter(a => a.type === 'vale_transporte').reduce((acc, a) => acc + Number(a.amount), 0)
  const totalValeAlimentacao = data.advances.filter(a => a.type === 'vale_alimentacao').reduce((acc, a) => acc + Number(a.amount), 0)

  // OS
  const osPorStatus = data.workOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {})
  const totalOS = data.workOrders.reduce((acc, o) => acc + Number(o.price || 0), 0)
  const osConcluidasValor = data.workOrders.filter(o => o.status === 'concluída').reduce((acc, o) => acc + Number(o.price || 0), 0)

  function StatCard({ label, value, sub, color = 'text-gray-900 dark:text-white' }) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Análise completa do seu negócio.</p>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="w-36">Exportar PDF</Button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap " + (activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* DRE */}
      {activeTab === 'dre' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Receita bruta" value={fmt(receitas)} color="text-green-600 dark:text-green-400" />
            <StatCard label="Total de despesas" value={fmt(despesas)} color="text-red-500 dark:text-red-400" />
            <StatCard label="Lucro líquido" value={fmt(lucroLiquido)} color={lucroLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
            <StatCard label="Margem de lucro" value={`${margemLucro}%`} color={Number(margemLucro) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-500'} />
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">DRE Simplificado</h2>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 font-semibold text-green-600 dark:text-green-400">RECEITAS</td>
                  <td className="py-3 text-right font-bold text-green-600 dark:text-green-400">{fmt(receitas)}</td>
                </tr>
                {Object.entries(receitasPorCategoria).map(([cat, val]) => (
                  <tr key={cat} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pl-4 text-gray-500 dark:text-gray-400">{cat}</td>
                    <td className="py-2 text-right text-gray-500 dark:text-gray-400">{fmt(val)}</td>
                  </tr>
                ))}
                <tr className="border-b border-gray-100 dark:border-gray-800 mt-2">
                  <td className="py-3 font-semibold text-red-500 dark:text-red-400">DESPESAS</td>
                  <td className="py-3 text-right font-bold text-red-500 dark:text-red-400">({fmt(despesas)})</td>
                </tr>
                {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                  <tr key={cat} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pl-4 text-gray-500 dark:text-gray-400">{cat}</td>
                    <td className="py-2 text-right text-gray-500 dark:text-gray-400">({fmt(val)})</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">LUCRO LÍQUIDO</td>
                  <td className={`py-3 px-2 text-right font-bold text-lg ${lucroLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(lucroLiquido)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Receitas por categoria</h2>
              {Object.entries(receitasPorCategoria).map(([cat, val]) => (
                <div key={cat} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{cat}</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">{fmt(val)}</span>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Despesas por categoria</h2>
              {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                <div key={cat} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{cat}</span>
                  <span className="text-sm font-medium text-red-500 dark:text-red-400">{fmt(val)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.transactions, 'dre.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* Fluxo de Caixa */}
      {activeTab === 'fluxo' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de receitas" value={fmt(receitas)} color="text-green-600 dark:text-green-400" />
            <StatCard label="Total de despesas" value={fmt(despesas)} color="text-red-500 dark:text-red-400" />
            <StatCard label="Saldo" value={fmt(lucroLiquido)} color={lucroLiquido >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'} />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Evolução mensal</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={fluxoData}>
                <defs>
                  <linearGradient id="rec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.15}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient>
                  <linearGradient id="desp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#f9fafb' }} />
                <Legend />
                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#22c55e" fill="url(#rec)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" fill="url(#desp)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.transactions, 'fluxo-caixa.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* Contas */}
      {activeTab === 'contas' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="A receber" value={fmt(contasAReceber)} color="text-green-600 dark:text-green-400" />
            <StatCard label="A pagar" value={fmt(contasAPagar)} color="text-red-500 dark:text-red-400" />
            <StatCard label="Vencidas" value={fmt(contasVencidas)} color="text-orange-600 dark:text-orange-400" />
            <StatCard label="Pagas" value={fmt(contasPagas)} color="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Vencimento</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
              </tr></thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-3 text-gray-900 dark:text-white">{b.description}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(b.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (b.type === 'receber' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>{b.type === 'receber' ? 'A receber' : 'A pagar'}</span></td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{b.status}</td>
                    <td className={"px-6 py-3 text-right font-medium " + (b.type === 'receber' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>{fmt(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.bills, 'contas.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* Vendas */}
      {activeTab === 'vendas' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de orçamentos" value={data.quotes.length} />
            <StatCard label="Taxa de conversão" value={`${taxaConversao}%`} color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Total em pedidos" value={fmt(totalPedidos)} color="text-green-600 dark:text-green-400" />
            <StatCard label="Total em comissões" value={fmt(totalComissoes)} color="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Orçamentos por status</h2>
              {['rascunho', 'enviado', 'aprovado', 'recusado'].map(s => {
                const count = data.quotes.filter(q => q.status === s).length
                return <div key={s} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{s}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              })}
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pedidos por status</h2>
              {['pendente', 'em_producao', 'pronto', 'entregue', 'cancelado'].map(s => {
                const count = data.orders.filter(o => o.status === s).length
                return count > 0 ? <div key={s} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{s.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                </div> : null
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <div className="w-36"><Button onClick={() => exportCSV(data.quotes, 'orcamentos.csv')} variant="outline">CSV Orçamentos</Button></div>
            <div className="w-36"><Button onClick={() => exportCSV(data.orders, 'pedidos.csv')} variant="outline">CSV Pedidos</Button></div>
          </div>
        </div>
      )}

      {/* Clientes */}
      {activeTab === 'clientes' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de clientes" value={data.clients.length} />
            <StatCard label="Com serviços" value={[...new Set(data.services.map(s => s.client_id).filter(Boolean))].length} />
            <StatCard label="Com OS" value={[...new Set(data.workOrders.map(o => o.client_id).filter(Boolean))].length} />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Telefone</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Cadastro</th>
              </tr></thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{c.email || '—'}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{c.phone || '—'}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.clients, 'clientes.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* Estoque */}
      {activeTab === 'estoque' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de itens" value={data.inventory.length} />
            <StatCard label="Valor total" value={fmt(valorEstoque)} color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Entradas" value={`${entradasEstoque} un`} color="text-green-600 dark:text-green-400" />
            <StatCard label="Saídas" value={`${saidasEstoque} un`} color="text-red-500 dark:text-red-400" />
          </div>
          {itensBaixoEstoque.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Itens com estoque baixo ({itensBaixoEstoque.length})</p>
              {itensBaixoEstoque.map(i => <p key={i.id} className="text-sm text-red-600 dark:text-red-400">• {i.name} — {i.quantity} {i.unit || 'un'} (mín: {i.min_quantity})</p>)}
            </div>
          )}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Item</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Qtd</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Custo médio</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor total</th>
              </tr></thead>
              <tbody>
                {data.inventory.map((i) => (
                  <tr key={i.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{i.name}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{i.quantity} {i.unit || 'un'}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{fmt(i.average_cost || i.price)}</td>
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{fmt(Number(i.average_cost || i.price) * Number(i.quantity))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.inventory, 'estoque.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* Funcionários */}
      {activeTab === 'funcionarios' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total de funcionários" value={data.employees.length} />
            <StatCard label="Total em salários" value={fmt(totalSalarios)} color="text-red-500 dark:text-red-400" />
            <StatCard label="Adiantamentos" value={fmt(totalAdiantamentos)} color="text-orange-600 dark:text-orange-400" />
            <StatCard label="Vale transporte + alimentação" value={fmt(totalValeTransporte + totalValeAlimentacao)} color="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Cargo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Salário</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Comissão</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
              </tr></thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{e.name}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{e.role || '—'}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{e.salary ? fmt(e.salary) : '—'}</td>
                    <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{e.commission_rate ? `${e.commission_rate}%` : '—'}</td>
                    <td className="px-6 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (e.status === 'ativo' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500')}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.employees, 'funcionarios.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}

      {/* OS */}
      {activeTab === 'os' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de OS" value={data.workOrders.length} />
            <StatCard label="Valor total" value={fmt(totalOS)} color="text-blue-600 dark:text-blue-400" />
            <StatCard label="Concluídas" value={fmt(osConcluidasValor)} color="text-green-600 dark:text-green-400" />
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">OS por status</h2>
            {Object.entries(osPorStatus).map(([s, count]) => (
              <div key={s} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{s}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end"><div className="w-36"><Button onClick={() => exportCSV(data.workOrders, 'ordens-servico.csv')} variant="outline">Exportar CSV</Button></div></div>
        </div>
      )}
    </div>
  )
}
