import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function ControlCenter() {
  const { businessId } = useParams()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAlerts() {
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const [
        { data: lowStock },
        { data: openOrders },
        { data: overdueAppointments },
        { data: inactiveClients },
        { data: toolsMaintenance },
      ] = await Promise.all([
        supabase.from('inventory').select('id, name, quantity, min_quantity').eq('business_id', businessId).filter('quantity', 'lte', 'min_quantity'),
        supabase.from('work_orders').select('id, clients(name), status').eq('business_id', businessId).in('status', ['aberta', 'em andamento']),
        supabase.from('appointments').select('id, title, date').eq('business_id', businessId).lt('date', today).eq('status', 'agendado'),
        supabase.from('clients').select('id, name, created_at').eq('business_id', businessId).lt('created_at', thirtyDaysAgo),
        supabase.from('tools').select('id, name, next_maintenance').eq('business_id', businessId).not('next_maintenance', 'is', null).lte('next_maintenance', today),
      ])

      const newAlerts = []

      lowStock?.forEach((item) => {
        newAlerts.push({
          type: 'estoque',
          severity: 'high',
          message: `Estoque baixo: ${item.name} (${item.quantity} unidades)`,
          path: 'estoque',
        })
      })

      openOrders?.forEach((order) => {
        newAlerts.push({
          type: 'os',
          severity: 'medium',
          message: `OS em aberto: ${order.clients?.name || 'Cliente não informado'} — ${order.status}`,
          path: 'ordens-servico',
        })
      })

      overdueAppointments?.forEach((appt) => {
        newAlerts.push({
          type: 'agenda',
          severity: 'high',
          message: `Agendamento não concluído: ${appt.title} (${new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')})`,
          path: 'agenda',
        })
      })

      toolsMaintenance?.forEach((tool) => {
        newAlerts.push({
          type: 'ferramenta',
          severity: 'medium',
          message: `Manutenção vencida: ${tool.name} (${new Date(tool.next_maintenance + 'T00:00:00').toLocaleDateString('pt-BR')})`,
          path: 'ferramentas',
        })
      })

      setAlerts(newAlerts)
      setLoading(false)
    }

    fetchAlerts()
  }, [businessId])

  const severityConfig = {
    high: { label: 'Alta', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Média', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Baixa', className: 'bg-blue-100 text-blue-700' },
  }

  const typeLabels = {
    estoque: 'Estoque',
    os: 'Ordem de Serviço',
    agenda: 'Agenda',
    ferramenta: 'Ferramenta',
    cliente: 'Cliente',
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Central de Controle</h1>
        <p className="text-gray-500 text-sm mt-1">Pendências e alertas do seu negócio.</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : alerts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-900 font-medium">Tudo em ordem!</p>
          <p className="text-gray-500 text-sm mt-1">Nenhuma pendência ou alerta no momento.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              onClick={() => navigate(`/b/${businessId}/${alert.path}`)}
              className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityConfig[alert.severity].className}`}>
                  {severityConfig[alert.severity].label}
                </span>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">{typeLabels[alert.type] || alert.type}</p>
                  <p className="text-sm text-gray-900">{alert.message}</p>
                </div>
              </div>
              <span className="text-gray-400 text-sm">→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}