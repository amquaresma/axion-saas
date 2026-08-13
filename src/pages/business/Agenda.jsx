import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Calendar } from '../../components/Calendar'

const emptyForm = {
  title: '', description: '', date: '', time: '', duration: '60',
  type: 'agendamento', client_id: '', employee_id: '', status: 'agendado', priority: 'normal'
}

const statusOptions = ['agendado', 'confirmado', 'concluído', 'cancelado']
const typeOptions = [
  { value: 'agendamento', label: 'Agendamento' },
  { value: 'tarefa', label: 'Tarefa' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'lembrete', label: 'Lembrete' },
  { value: 'os', label: 'Ordem de Serviço' },
  { value: 'pessoal', label: 'Pessoal' },
]
const priorityOptions = ['baixa', 'normal', 'alta', 'urgente']

const statusColors = {
  'agendado': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  'confirmado': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'concluído': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const priorityColors = {
  'baixa': 'text-gray-400',
  'normal': 'text-blue-500',
  'alta': 'text-orange-500',
  'urgente': 'text-red-500',
}

export function Agenda() {
  const { businessId } = useParams()
  const [appointments, setAppointments] = useState([])
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [view, setView] = useState('calendario')
  const [filter, setFilter] = useState('todos')
  const [selectedDate, setSelectedDate] = useState(null)

  async function fetchData() {
    const [{ data: apptData }, { data: clientsData }, { data: employeesData }] = await Promise.all([
      supabase.from('appointments').select('*, clients(name), employees(name)').eq('business_id', businessId).order('date').order('time'),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setAppointments(apptData || [])
    setClients(clientsData || [])
    setEmployees(employeesData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew(date) {
    setForm({ ...emptyForm, date: date || '' })
    setEditingId(null); setError(''); setShowModal(true)
  }

  function openEdit(appt) {
    setForm({
      title: appt.title, description: appt.description || '', date: appt.date,
      time: appt.time || '', duration: appt.duration || '60', type: appt.type || 'agendamento',
      client_id: appt.client_id || '', employee_id: appt.employee_id || '',
      status: appt.status, priority: appt.priority || 'normal'
    })
    setEditingId(appt.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (!form.date) { setError('Data é obrigatória.'); return }
    setSaving(true); setError('')

    const payload = {
      title: form.title, description: form.description, date: form.date,
      time: form.time || null, duration: parseInt(form.duration) || 60,
      type: form.type, client_id: form.client_id || null,
      employee_id: form.employee_id || null, status: form.status,
      priority: form.priority,
    }

    if (editingId) { await supabase.from('appointments').update(payload).eq('id', editingId) }
    else { await supabase.from('appointments').insert({ ...payload, business_id: businessId }) }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este evento?')) return
    await supabase.from('appointments').delete().eq('id', id); fetchData()
  }

  const today = new Date().toISOString().split('T')[0]

  const calendarEvents = appointments.map(a => ({
    id: a.id, title: a.title, date: a.date, time: a.time,
    type: a.type || 'agendamento', status: a.status,
    _raw: a
  }))

  const filtered = appointments.filter(a => {
    if (filter === 'hoje') return a.date === today
    if (filter === 'futuros') return a.date >= today
    if (filter === 'passados') return a.date < today
    if (selectedDate) return a.date === selectedDate
    return true
  })

  const dayEvents = selectedDate ? appointments.filter(a => a.date === selectedDate) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Compromissos, tarefas e lembretes.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle view */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button onClick={() => setView('calendario')}
              className={"px-3 py-1.5 rounded-md text-sm font-medium transition-all " + (view === 'calendario' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
              Calendário
            </button>
            <button onClick={() => setView('lista')}
              className={"px-3 py-1.5 rounded-md text-sm font-medium transition-all " + (view === 'lista' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
              Lista
            </button>
          </div>
          <div className="w-40"><Button onClick={() => openNew(selectedDate || '')}>Novo evento</Button></div>
        </div>
      </div>

      {/* Vista Calendário */}
      {view === 'calendario' && (
        <div className="flex gap-6">
          <div className="flex-1">
            <Calendar
              events={calendarEvents}
              onDayClick={(date) => { setSelectedDate(date === selectedDate ? null : date) }}
              onEventClick={(event) => openEdit(event._raw)}
            />
          </div>

          {/* Painel lateral do dia selecionado */}
          {selectedDate && (
            <div className="w-72 flex-shrink-0">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <button onClick={() => openNew(selectedDate)} className="text-xs text-blue-600 dark:text-blue-400 font-medium">+ Novo</button>
                </div>
                <div className="p-3 flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">Nenhum evento neste dia.</p>
                  ) : (
                    dayEvents.map(appt => (
                      <div key={appt.id} onClick={() => openEdit(appt)}
                        className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          {appt.time && <span className="text-xs text-gray-400 dark:text-gray-500">{appt.time.slice(0, 5)}</span>}
                          <span className={"text-xs px-1.5 py-0.5 rounded " + (statusColors[appt.status] || '')}>{appt.status}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{appt.title}</p>
                        {appt.clients?.name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{appt.clients.name}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vista Lista */}
      {view === 'lista' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[['todos', 'Todos'], ['hoje', 'Hoje'], ['futuros', 'Futuros'], ['passados', 'Passados']].map(([val, label]) => (
              <button key={val} onClick={() => { setFilter(val); setSelectedDate(null) }}
                className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (filter === val && !selectedDate ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                {label}
              </button>
            ))}
          </div>

          {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : filtered.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum evento encontrado.</p>
              <div className="w-40 mx-auto mt-4"><Button onClick={() => openNew('')}>Novo evento</Button></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Evento</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Horário</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Prioridade</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((appt) => (
                    <tr key={appt.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{appt.title}</p>
                        {appt.clients?.name && <p className="text-xs text-gray-400 dark:text-gray-500">{appt.clients.name}</p>}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 capitalize">{appt.type || 'agendamento'}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{appt.time?.slice(0, 5) || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium capitalize ${priorityColors[appt.priority || 'normal']}`}>{appt.priority || 'normal'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[appt.status] || '')}>{appt.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => openEdit(appt)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                          <button onClick={() => handleDelete(appt.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar evento' : 'Novo evento'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <Input label="Título" placeholder="Ex: Reunião, Visita técnica, Pagar conta" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prioridade</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  {priorityOptions.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
            </div>

            <Input label="Descrição" placeholder="Detalhes do evento (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              <Input label="Horário" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>

            <Input label="Duração (min)" type="number" placeholder="60" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente (opcional)</label>
              <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Responsável (opcional)</label>
              <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem responsável</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar evento'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
