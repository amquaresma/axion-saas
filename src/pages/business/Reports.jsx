import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'

export function Reports() {
  const { businessId } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('financeiro')

  useEffect(() => {
    async function fetchAll() {
      const [
        { data: transactions },
        { data: clients },
        { data: services },
        { data: inventory },
        { data: employees },
      ] = await Promise.all([
        supabase.from('transactions').select('*').eq('business_id', businessId).order('date', { ascending: false }),
        supabase.from('clients').select('*').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('services').select('*, clients(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').eq('business_id', businessId).order('name'),
        supabase.from('employees').select('*').eq('business_id', businessId).order('name'),
      ])
      setData({ transactions: transactions || [], clients: clients || [], services: services || [], inventory: inventory || [], employees: employees || [] })
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

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  const tabs = [
    { key: 'financeiro', label: 'Financeiro' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'servicos', label: 'Serviços' },
    { key: 'estoque', label: 'Estoque' },
    { key: 'funcionarios', label: 'Funcionários' },
  ]

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  const totalReceitas = data.transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalDespesas = data.transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-1">Visualize e exporte dados do seu negócio.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Financeiro */}
      {activeTab === 'financeiro' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">Total de Receitas</p>
              <p className="text-xl font-bold text-green-600 mt-1">{fmt(totalReceitas)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">Total de Despesas</p>
              <p className="text-xl font-bold text-red-500 mt-1">{fmt(totalDespesas)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-sm text-gray-500">Saldo</p>
              <p className={`text-xl font-bold mt-1 ${totalReceitas - totalDespesas >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(totalReceitas - totalDespesas)}</p>
            </div>
          </div>
          <div className="flex justify-end mb-4">
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
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{t.type}</span>
                    </td>
                    <td className={`px-6 py-3 font-medium ${t.type === 'receita' ? 'text-green-600' : 'text-red-500'}`}>{fmt(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clientes */}
      {activeTab === 'clientes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{data.clients.length} clientes cadastrados</p>
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

      {/* Serviços */}
      {activeTab === 'servicos' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{data.services.length} serviços registrados</p>
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

      {/* Estoque */}
      {activeTab === 'estoque' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{data.inventory.length} itens no estoque</p>
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

      {/* Funcionários */}
      {activeTab === 'funcionarios' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{data.employees.length} funcionários cadastrados</p>
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
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100">
                    <td className="px-6 py-3 font-medium text-gray-900">{e.name}</td>
                    <td className="px-6 py-3 text-gray-500">{e.role || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{e.salary ? fmt(e.salary) : '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}