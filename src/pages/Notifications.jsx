import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

const emptyAlert = {
  title: '', message: '', type: 'lembrete', frequency: 'unico',
  alert_date: new Date().toISOString().split('T')[0], alert_time: '', business_id: '', active: true
}

const typeLabels = { lembrete: 'Lembrete', meta: 'Meta', recorrente: 'Recorrente' }
const frequencyLabels = { unico: 'Único', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }

export function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [customAlerts, setCustomAlerts] = useState([])
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('alertas')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyAlert)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    async function fetchAll() {
      const { data: businessesData } = await supabase.from('businesses').select('id, name').eq('user_id', user.id)
      setBusinesses(businessesData || [])

      const { data: alertsData } = await supabase.from('custom_alerts').select('*, businesses(name)').eq('user_id', user.id).order('created_at', { ascending: false })
      setCustomAlerts(alertsData || [])

      if (!businessesData?.length) { setLoading(false); return }

      const allNotifications = []
      const today = new Date().toISOString().split('T')[0]

      for (const business of businessesData) {
        const [
          { data: lowStock },
          { data: openOrders },
          { data: overdueAppointments },
          { data: toolsMaintenance },
          { data: overdueBills },
          { data: pendingQuotes },
          { data: taxesDue },
          { data: vacations },
        ] = await Promise.all([
          supabase.from('inventory').select('id, name, quantity, min_quantity').eq('business_id', business.id).filter('quantity', 'lte', 'min_quantity'),
          supabase.from('work_orders').select('id, clients(name), status').eq('business_id', business.id).in('status', ['aberta', 'em andamento']),
          supabase.from('appointments').select('id, title, date').eq('business_id', business.id).lt('date', today).eq('status', 'agendado'),
          supabase.from('tools').select('id, name, next_maintenance').eq('business_id', business.id).not('next_maintenance', 'is', null).lte('next_maintenance', today),
          supabase.from('bills').select('id, description, amount, due_date').eq('business_id', business.id).eq('status', 'vencido'),
          supabase.from('quotes').select('id, number, clients(name)').eq('business_id', business.id).eq('status', 'enviado'),
          supabase.from('tax_records').select('id, type, amount, due_date').eq('business_id', business.id).eq('status', 'pendente').lte('due_date', today),
          supabase.from('employee_vacations').select('id, employees(name), start_date, end_date').eq('business_id', business.id).eq('status', 'agendado').lte('start_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]).gte('end_date', today),
        ])

        lowStock?.forEach(i => allNotifications.push({ business: business.name, businessId: business.id, severity: 'high', type: 'Estoque', icon: '📦', message: `Estoque baixo: ${i.name} (${i.quantity} un)`, path: 'estoque' }))
        openOrders?.forEach(o => allNotifications.push({ business: business.name, businessId: business.id, severity: 'medium', type: 'OS', icon: '🔧', message: `OS em aberto: ${o.clients?.name || 'sem cliente'} — ${o.status}`, path: 'ordens-servico' }))
        overdueAppointments?.forEach(a => allNotifications.push({ business: business.name, businessId: business.id, severity: 'high', type: 'Agenda', icon: '📅', message: `Agendamento não concluído: ${a.title}`, path: 'agenda' }))
        toolsMaintenance?.forEach(t => allNotifications.push({ business: business.name, businessId: business.id, severity: 'medium', type: 'Ferramenta', icon: '🔨', message: `Manutenção vencida: ${t.name}`, path: 'ferramentas' }))
        overdueBills?.forEach(b => allNotifications.push({ business: business.name, businessId: business.id, severity: 'high', type: 'Financeiro', icon: '💰', message: `Conta vencida: ${b.description} — R$ ${Number(b.amount).toFixed(2).replace('.', ',')}`, path: 'contas' }))
        pendingQuotes?.forEach(q => allNotifications.push({ business: business.name, businessId: business.id, severity: 'low', type: 'Vendas', icon: '📋', message: `Orçamento #${q.number} aguardando resposta: ${q.clients?.name || ''}`, path: 'orcamentos' }))
        taxesDue?.forEach(t => allNotifications.push({ business: business.name, businessId: business.id, severity: 'high', type: 'Fiscal', icon: '📄', message: `Imposto vencido: ${t.type} — R$ ${Number(t.amount).toFixed(2).replace('.', ',')}`, path: 'impostos' }))
        vacations?.forEach(v => allNotifications.push({ business: business.name, businessId: business.id, severity: 'low', type: 'RH', icon: '🏖️', message: `Férias próximas: ${v.employees?.name} — ${new Date(v.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}`, path: 'ferias' }))
      }

      setNotifications(allNotifications)
      setLoading(false)
    }
    fetchAll()
  }, [user])

  async function handleSaveAlert() {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = { ...form, user_id: user.id, business_id: form.business_id || null }
    if (editingId) { await supabase.from('custom_alerts').update(payload).eq('id', editingId) }
    else { await supabase.from('custom_alerts').insert(payload) }
    setSaving(false); setShowModal(false)
    const { data } = await supabase.from('custom_alerts').select('*, businesses(name)').eq('user_id', user.id).order('created_at', { ascending: false })
    setCustomAlerts(data || [])
  }

  async function toggleAlert(id, active) {
    await supabase.from('custom_alerts').update({ active: !active }).eq('id', id)
    setCustomAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
  }

  async function deleteAlert(id) {
    if (!confirm('Excluir alerta?')) return
    await supabase.from('custom_alerts').delete().eq('id', id)
    setCustomAlerts(prev => prev.filter(a => a.id !== id))
  }

  function openNew() { setForm(emptyAlert); setEditingId(null); setShowModal(true) }
  function openEdit(alert) {
    setForm({ title: alert.title, message: alert.message || '', type: alert.type, frequency: alert.frequency, alert_date: alert.alert_date || '', alert_time: alert.alert_time || '', business_id: alert.business_id || '', active: alert.active })
    setEditingId(alert.id); setShowModal(true)
  }

  const severityConfig = {
    high: { label: 'Alta', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    medium: { label: 'Média', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' },
    low: { label: 'Baixa', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  }

  const highCount = notifications.filter(n => n.severity === 'high').length
  const mediumCount = notifications.filter(n => n.severity === 'medium').length
  const lowCount = notifications.filter(n => n.severity === 'low').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notificações</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Alertas automáticos e lembretes personalizados.</p>
          </div>
          <Button onClick={openNew} className="w-44">Novo lembrete</Button>
        </div>

        {/* Resumo */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{highCount}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Alta prioridade</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{mediumCount}</p>
              <p className="text-xs text-yellow-500 dark:text-yellow-400 mt-0.5">Média prioridade</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{lowCount}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">Baixa prioridade</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800">
          {[['alertas', 'Alertas automáticos'], ['lembretes', 'Meus lembretes']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px " + (activeTab === key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
              {label} {key === 'alertas' && notifications.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{notifications.length}</span>}
              {key === 'lembretes' && customAlerts.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">{customAlerts.length}</span>}
            </button>
          ))}
        </div>

        {/* Alertas automáticos */}
        {activeTab === 'alertas' && (
          loading ? <p className="text-gray-400 text-sm">Carregando...</p> :
          notifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-900 dark:text-white font-medium">Tudo em ordem!</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nenhum alerta automático no momento.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {['high', 'medium', 'low'].map(severity =>
                notifications.filter(n => n.severity === severity).map((n, i) => (
                  <div key={`${severity}-${i}`} onClick={() => navigate(`/b/${n.businessId}/${n.path}`)}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 cursor-pointer hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all">
                    <span className="text-xl">{n.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig[n.severity].className}`}>{severityConfig[n.severity].label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{n.business} · {n.type}</span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">{n.message}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400 dark:text-gray-600 flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
                  </div>
                ))
              )}
            </div>
          )
        )}

        {/* Lembretes personalizados */}
        {activeTab === 'lembretes' && (
          <div className="flex flex-col gap-3">
            {customAlerts.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🔔</p>
                <p className="text-gray-900 dark:text-white font-medium">Nenhum lembrete criado</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Crie lembretes personalizados para o seu negócio.</p>
                <div className="w-44 mx-auto mt-4"><Button onClick={openNew}>Criar lembrete</Button></div>
              </div>
            ) : (
              customAlerts.map((alert) => (
                <div key={alert.id} className={"bg-white dark:bg-gray-900 border rounded-xl px-5 py-4 flex items-center gap-4 transition-all " + (alert.active ? 'border-gray-200 dark:border-gray-800' : 'border-gray-100 dark:border-gray-900 opacity-60')}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{typeLabels[alert.type]}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">·</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{frequencyLabels[alert.frequency]}</span>
                      {alert.businesses?.name && <span className="text-xs text-gray-400 dark:text-gray-500">· {alert.businesses.name}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                    {alert.message && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.message}</p>}
                    {alert.alert_date && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(alert.alert_date + 'T00:00:00').toLocaleDateString('pt-BR')} {alert.alert_time || ''}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleAlert(alert.id, alert.active)}
                      className={"relative inline-flex h-5 w-9 items-center rounded-full transition-colors " + (alert.active ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700')}>
                      <span className={"inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform " + (alert.active ? 'translate-x-5' : 'translate-x-1')} />
                    </button>
                    <button onClick={() => openEdit(alert)} className="text-blue-600 dark:text-blue-400 text-xs font-medium px-2">Editar</button>
                    <button onClick={() => deleteAlert(alert.id)} className="text-red-500 dark:text-red-400 text-xs font-medium px-2">Excluir</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {showModal && (
        <Modal title={editingId ? 'Editar lembrete' : 'Novo lembrete'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Título" placeholder="Ex: Pagar fornecedor, Reunião mensal" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input label="Descrição (opcional)" placeholder="Detalhes do lembrete" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {Object.entries(typeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Frequência</label>
                <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {Object.entries(frequencyLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Data" type="date" value={form.alert_date} onChange={(e) => setForm((f) => ({ ...f, alert_date: e.target.value }))} />
              <Input label="Horário (opcional)" type="time" value={form.alert_time} onChange={(e) => setForm((f) => ({ ...f, alert_time: e.target.value }))} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Negócio (opcional)</label>
              <select value={form.business_id} onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Geral (todos os negócios)</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <Button onClick={handleSaveAlert} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar lembrete'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
