import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'

export function Reports() {
  const { businessId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('financeiro')
  const printRef = useRef()

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: transactions },
        { data: clients },
        { data: services },
        { data: inventory },
        { data: employees },
        { data: workOrders },
        { data: appointments },
        { data: tools },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).order('date', { ascending: false }),
        supabase.from('clients').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('services').select('*, clients(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').eq('business_id', businessId).order('name'),
        supabase.from('employees').select('*').eq('business_id', businessId).order('name'),
        supabase.from('work_orders').select('*, clients(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('appointments').select('*').eq('business_id', businessId).order('date', { ascending: false }),
        supabase.from('tools').select('*').eq('business_id', businessId).order('name'),
      ])
      setData({
        transactions: transactions || [], clients: clients || [], services: services || [],
        inventory: inventory || [], employees: employees || [], workOrders: workOrders || [],
        appointments: appointments || [], tools: tools || []
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
    a.href = url
    a.download = filename
    a.click()
  }

  function exportPDF() {
    window.print()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  const tabs = [
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'servicos', label: 'Serviços' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'funcionarios', label: 'Funcionários' },
    { key: 'ordens', label: 'Ordens de Serviço' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'ferramentas', label: 'Ferramentas' },
  ]

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

  // Financeiro
  const totalReceitas = data.transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalDespesas = data.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0)
  const receitasPorCategoria = data.transactions.filter(t => t.type === 'receita').reduce((acc, t) => { acc[t.category || 'Sem categoria'] = (acc[t.category || 'Sem categoria'] || 0) + Number(t.amount); return acc }, {})
  const despesasPorCategoria = data.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => { acc[t.category || 'Sem categoria'] = (acc[t.category || 'Sem categoria'] || 0) + Number(t.amount); return acc }, {})

  // Clientes
  const clientesNoMes = data.clients.filter(c => c.created_at >= firstDayOfMonth).length

  // Serviços
  const servicosPorStatus = data.services.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc }, {})
  const totalServicos = data.services.reduce((acc, s) => acc + Number(s.price || 0), 0)

  // Estoque
  const totalEstoque = data.inventory.reduce((acc, i) => acc + (Number(i.price) * Number(i.quantity)), 0)
  const itensBaixoEstoque = data.inventory.filter(i => i.quantity <= i.min_quantity).length

  // Funcionários
  const totalSalarios = data.employees.reduce((acc, e) => acc + Number(e.salary || 0), 0)
  const funcionariosAtivos = data.employees.filter(e => e.status === 'ativo').length

  // OS
  const osPorStatus = data.workOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {})
  const totalOS = data.workOrders.reduce((acc, o) => acc + Number(o.price || 0), 0)

  // Agenda
  const agendaPorStatus = data.appointments.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {})

  // Ferramentas
  const ferramentasPorStatus = data.tools.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc }, {})

  function StatCard({ label, value, sub }) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    )
  }

  function GroupCard({ title, data }) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-3">{title}</p>
        {Object.entries(data).length === 0 ? (
          <p className="text-xs text-gray-400">Nenhum dado</p>
        ) : (
          Object.entries(data).map(([key, val]) => (
            <div key={key} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600 capitalize">{key}</span>
              <span className="text-sm font-medium text-gray-900">{typeof val === 'number' && val > 100 ? fmt(val) : val}</span>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div ref={printRef}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-1">Visualize e exporte dados do seu negócio.</p>
        </div>
        <div className="flex gap-2">
          <div className="w-36">
            <Button onClick={exportPDF} variant="outline">Exportar PDF</Button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap " + (activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'financeiro' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de Receitas" value={fmt(totalReceitas)} />
            <StatCard label="Total de Despesas" value={fmt(totalDespesas)} />
            <StatCard label="Saldo" value={fmt(totalReceitas - totalDespesas)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <GroupCard title="Receitas por categoria" data={receitasPorCategoria} />
            <GroupCard title="Despesas por categoria" data={despesasPorCategoria} />
          </div>
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.transactions, 'financeiro.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Descrição</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Categoria</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Data</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Tipo</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 text-gray-900">{t.description}</td>
                    <td className="px-6 py-3 text-gray-500">{t.category || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (t.type === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>{t.type}</span></td>
                    <td className={"px-6 py-3 font-medium " + (t.type === 'receita' ? 'text-green-600' : 'text-red-500')}>{fmt(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de clientes" value={data.clients.length} />
            <StatCard label="Novos este mês" value={clientesNoMes} />
            <StatCard label="Clientes ativos" value={data.clients.length} />
          </div>
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.clients, 'clientes.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Telefone</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'servicos' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de serviços" value={data.services.length} />
            <StatCard label="Valor total" value={fmt(totalServicos)} />
            <StatCard label="Concluídos" value={servicosPorStatus['concluído'] || 0} />
          </div>
          <GroupCard title="Serviços por status" data={servicosPorStatus} />
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.services, 'servicos.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Serviço</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-6 py-3 text-gray-500">{s.clients?.name || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{s.price ? fmt(s.price) : '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'estoque' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de itens" value={data.inventory.length} />
            <StatCard label="Valor total em estoque" value={fmt(totalEstoque)} />
            <StatCard label="Itens com estoque baixo" value={itensBaixoEstoque} />
          </div>
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.inventory, 'estoque.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Item</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Categoria</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Qtd</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Preço unit.</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.inventory.map((i) => (
                  <tr key={i.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-6 py-3 text-gray-500">{i.category || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{i.quantity}</td>
                    <td className="px-6 py-3 text-gray-500">{fmt(i.price)}</td>
                    <td className="px-6 py-3 text-gray-500">{fmt(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'funcionarios' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de funcionários" value={data.employees.length} />
            <StatCard label="Funcionários ativos" value={funcionariosAtivos} />
            <StatCard label="Total em salários" value={fmt(totalSalarios)} />
          </div>
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.employees, 'funcionarios.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Cargo</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Salário</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Comissão</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="px-6 py-3 text-gray-500">{e.role || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{e.salary ? fmt(e.salary) : '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{e.commission_rate ? `${e.commission_rate}%` : '—'}</td>
                    <td className="px-6 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (e.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ordens' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de OS" value={data.workOrders.length} />
            <StatCard label="Valor total" value={fmt(totalOS)} />
            <StatCard label="OS abertas" value={osPorStatus['aberta'] || 0} />
          </div>
          <GroupCard title="OS por status" data={osPorStatus} />
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.workOrders, 'ordens-servico.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Diagnóstico</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.workOrders.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{o.clients?.name || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{o.diagnosis || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{o.price ? fmt(o.price) : '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de agendamentos" value={data.appointments.length} />
            <StatCard label="Confirmados" value={agendaPorStatus['confirmado'] || 0} />
            <StatCard label="Cancelados" value={agendaPorStatus['cancelado'] || 0} />
          </div>
          <GroupCard title="Agendamentos por status" data={agendaPorStatus} />
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.appointments, 'agenda.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ferramentas' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total de ferramentas" value={data.tools.length} />
            <StatCard label="Disponíveis" value={ferramentasPorStatus['disponível'] || 0} />
            <StatCard label="Em manutenção" value={ferramentasPorStatus['manutenção'] || 0} />
          </div>
          <GroupCard title="Ferramentas por status" data={ferramentasPorStatus} />
          <div className="flex justify-end">
            <div className="w-36">
              <Button onClick={() => exportCSV(data.tools, 'ferramentas.csv')} variant="outline">Exportar CSV</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
