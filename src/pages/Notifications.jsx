import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('user_id', user.id)

      if (!businesses?.length) { setLoading(false); return }

      const allNotifications = []
      const today = new Date().toISOString().split('T')[0]
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      for (const business of businesses) {
        const [
          { data: lowStock },
          { data: openOrders },
          { data: overdueAppointments },
          { data: toolsMaintenance },
          { data: inactiveClients },
        ] = await Promise.all([
          supabase.from('inventory').select('id, name, quantity, min_quantity').eq('business_id', business.id).filter('quantity', 'lte', 'min_quantity'),
          supabase.from('work_orders').select('id, clients(name), status').eq('business_id', business.id).in('status', ['aberta', 'em andamento']),
          supabase.from('appointments').select('id, title, date').eq('business_id', business.id).lt('date', today).eq('status', 'agendado'),
          supabase.from('tools').select('id, name, next_maintenance').eq('business_id', business.id).not('next_maintenance', 'is', null).lte('next_maintenance', today),
          supabase.from('clients').select('id, name, created_at').eq('business_id', business.id).lt('created_at', thirtyDaysAgo),
        ])

        lowStock?.forEach((item) => allNotifications.push({
          business: business.name, businessId: business.id,
          severity: 'high', type: 'Estoque',
          message: `Estoque baixo: ${item.name} (${item.quantity} unidades)`,
          path: 'estoque',
        }))

        openOrders?.forEach((order) => allNotifications.push({
          business: business.name, businessId: business.id,
          severity: 'medium', type: 'Ordem de Serviço',
          message: `OS em aberto: ${order.clients?.name || 'Cliente não informado'} — ${order.status}`,
          path: 'ordens-servico',
        }))

        overdueAppointments?.forEach((appt) => allNotifications.push({
          business: business.name, businessId: business.id,
          severity: 'high', type: 'Agenda',
          message: `Agendamento não concluído: ${appt.title} (${new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')})`,
          path: 'agenda',
        }))

        toolsMaintenance?.forEach((tool) => allNotifications.push({
          business: business.name, businessId: business.id,
          severity: 'medium', type: 'Ferramenta',
          message: `Manutenção vencida: ${tool.name} (${new Date(tool.next_maintenance + 'T00:00:00').toLocaleDateString('pt-BR')})`,
          path: 'ferramentas',
        }))
      }

      setNotifications(allNotifications)
      setLoading(false)
    }

    fetchNotifications()
  }, [user])

  const severityConfig = {
    high: { label: 'Alta', className: 'bg-red-100 text-red-700' },
    medium: { label: 'Média', className: 'bg-yellow-100 text-yellow-700' },
    low: { label: 'Baixa', className: 'bg-blue-100 text-blue-700' },
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">Axion</span>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Voltar</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-500 text-sm mt-1">Alertas e avisos de todos os seus negócios.</p>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-900 font-medium">Tudo em ordem!</p>
            <p className="text-gray-500 text-sm mt-1">Nenhuma notificação no momento.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n, index) => (
              <div
                key={index}
                onClick={() => navigate(`/b/${n.businessId}/${n.path}`)}
                className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-between cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityConfig[n.severity].className}`}>
                    {severityConfig[n.severity].label}
                  </span>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{n.business} · {n.type}</p>
                    <p className="text-sm text-gray-900">{n.message}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}