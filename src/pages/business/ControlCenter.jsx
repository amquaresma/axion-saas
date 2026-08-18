import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function ControlCenter() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')

  useEffect(() => {
    async function fetchAlerts() {
      const today = new Date().toISOString().split('T')[0]
      const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        { data: lowStock },
        { data: openOrders },
        { data: overdueAppointments },
        { data: toolsMaintenance },
        { data: overdueBills },
        { data: pendingQuotes },
        { data: taxesDue },
        { data: upcomingVacations },
        { data: pendingAdvances },
        { data: openWorkOrders },
      ] = await Promise.all([
        supabase.from('inventory').select('id, name, quantity, min_quantity').eq('business_id', businessId).filter('quantity', 'lte', 'min_quantity'),
        supabase.from('work_orders').select('id, clients(name), status').eq('business_id', businessId).in('status', ['aberta', 'em andamento']),
        supabase.from('appointments').select('id, title, date').eq('business_id', businessId).lt('date', today).eq('status', 'agendado'),
        supabase.from('tools').select('id, name, next_maintenance').eq('business_id', businessId).not('next_maintenance', 'is', null).lte('next_maintenance', today),
        supabase.from('bills').select('id, description, amount, due_date, type').eq('business_id', businessId).eq('status', 'vencido'),
        supabase.from('quotes').select('id, number, clients(name)').eq('business_id', businessId).eq('status', 'enviado'),
        supabase.from('tax_records').select('id, type, amount, due_date').eq('business_id', businessId).eq('status', 'pendente').lte('due_date', today),
        supabase.from('employee_vacations').select('id, employees(name), start_date').eq('business_id', businessId).eq('status', 'agendado').lte('start_date', in7days).gte('start_date', today),
        supabase.from('employee_advances').select('id, employees(name), amount, type').eq('business_id', businessId).eq('status', 'pendente'),
        supabase.from('work_orders').select('id, clients(name), status, price').eq('business_id', businessId).eq('status', 'aberta'),
      ])

      const newAlerts = []

      overdueBills?.forEach(b => newAlerts.push({ type: 'financeiro', severity: 'high', message: `Conta vencida: ${b.description} — R$ ${Number(b.amount).toFixed(2).replace('.', ',')}`, path: 'contas' }))
      taxesDue?.forEach(t => newAlerts.push({ type: 'fiscal', severity: 'high', message: `Imposto vencido: ${t.type} — R$ ${Number(t.amount).toFixed(2).replace('.', ',')}`, path: 'impostos' }))
      lowStock?.forEach(i => newAlerts.push({ type: 'estoque', severity: 'high', message: `Estoque baixo: ${i.name} (${i.quantity} un)`, path: 'estoque' }))
      overdueAppointments?.forEach(a => newAlerts.push({ type: 'agenda', severity: 'high', message: `Agendamento não concluído: ${a.title}`, path: 'agenda' }))
      openOrders?.forEach(o => newAlerts.push({ type: 'os', severity: 'medium', message: `OS em aberto: ${o.clients?.name || 'sem cliente'} — ${o.status}`, path: 'ordens-servico' }))
      toolsMaintenance?.forEach(t => newAlerts.push({ type: 'ferramenta', severity: 'medium', message: `Manutenção vencida: ${t.name}`, path: 'ferramentas' }))
      pendingQuotes?.forEach(q => newAlerts.push({ type: 'vendas', severity: 'medium', message: `Orçamento #${q.number} aguardando resposta: ${q.clients?.name || ''}`, path: 'orcamentos' }))
      upcomingVacations?.forEach(v => newAlerts.push({ type: 'rh', severity: 'low', message: `Férias próximas: ${v.employees?.name} em ${new Date(v.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}`, path: 'ferias' }))
      pendingAdvances?.forEach(a => newAlerts.push({ type: 'rh', severity: 'low', message: `Adiantamento pendente: ${a.employees?.name} — R$ ${Number(a.amount).toFixed(2).replace('.', ',')}`, path: 'adiantamentos' }))

      setAlerts(newAlerts)
      setLoading(false)
    }
    fetchAlerts()
  }, [businessId])

  const severityConfig = {
    high: { label: 'Alta', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    medium: { label: 'Média', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    low: { label: 'Baixa', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  }

  const typeLabels = {
    financeiro: 'Financeiro', fiscal: 'Fiscal', estoque: 'Estoque',
    agenda: 'Agenda', os: 'Ordem de Serviço', ferramenta: 'Ferramenta',
    vendas: 'Vendas', rh: 'RH',
  }

  const filtered = filter === 'todos' ? alerts : alerts.filter(a => a.severity === filter)
  const highCount = alerts.filter(a => a.severity === 'high').length
  const mediumCount = alerts.filter(a => a.severity === 'medium').length
  const lowCount = alerts.filter(a => a.severity === 'low').length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Central de Controle</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Pendências e alertas do seu negócio.</p>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div onClick={() => setFilter('high')} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-all">
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{highCount}</p>
            <p className="text-sm text-red-500 dark:text-red-400 mt-1">Alta prioridade</p>
          </div>
          <div onClick={() => setFilter('medium')} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-all">
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{mediumCount}</p>
            <p className="text-sm text-yellow-500 dark:text-yellow-400 mt-1">Média prioridade</p>
          </div>
          <div onClick={() => setFilter('low')} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 cursor-pointer hover:shadow-sm transition-all">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{lowCount}</p>
            <p className="text-sm text-blue-500 dark:text-blue-400 mt-1">Baixa prioridade</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[['todos', 'Todos'], ['high', 'Alta'], ['medium', 'Média'], ['low', 'Baixa']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (filter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-900 dark:text-white font-medium text-lg">✅ Tudo em ordem!</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nenhuma pendência encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((alert, index) => (
            <div
              key={index}
              onClick={() => navigate(`/b/${businessId}/${alert.path}`)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${severityConfig[alert.severity].className}`}>
                  {severityConfig[alert.severity].label}
                </span>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{typeLabels[alert.type] || alert.type}</p>
                  <p className="text-sm text-gray-900 dark:text-white">{alert.message}</p>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 dark:text-gray-600 flex-shrink-0 ml-4"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
