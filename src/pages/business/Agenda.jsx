import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { title: '', description: '', date: '', time: '', duration: '60', client_id: '', employee_id: '', status: 'agendado' }

const statusOptions = ['agendado', 'confirmado', 'concluído', 'cancelado']
const statusColors = {
  'agendado': 'bg-yellow-100 text-yellow-700',
  'confirmado': 'bg-blue-100 text-blue-700',
  'concluído': 'bg-green-100 text-green-700',
  'cancelado': 'bg-red-100 text-red-700',
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
  const [filter, setFilter] = useState('todos')

  async function fetchData() {
    const [{ data: apptData }, { data: clientsData }, { data: employeesData }] = await Promise.all([
      supabase.from('appointments').select('*, clients(name), employees(name)').eq('business_id', businessId).order('date', { ascending: true }).order('time', { ascending: true }),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setAppointments(apptData || [])
    setClients(clientsData || [])
    setEmployees(employeesData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(appt) {
    setForm({
      title: appt.title, description: appt.description || '', date: appt.date,
      time: appt.time || '', duration: appt.duration || '60',
      client_id: appt.client_id || '', employee_id: appt.employee_id || '', status: appt.status
    })
    setEditingId(appt.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Título é obrigatório.'); return }
    if (!form.date) { setError('Data é obrigatória.'); return }
    setSaving(true)
    setError('')

    const payload = {
      title: form.title, description: form.description, date: form.date,
      time: form.time || null, duration: parseInt(form.duration) || 60,
      client_id: form.client_id || null, employee_id: form.employee_id || null, status: form.status
    }

    if (editingId) {
      await supabase.from('appointments').update(payload).eq('id', editingId)
    } else {
      await supabase.from('appointments').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este agendamento?')) return
    await supabase.from('appointments').delete().eq('id', id)
    fetchData()
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = appointments.filter((a) => {
    if (filter === 'hoje') return a.date === today
    if (filter === 'futuros') return a.date >= today
    if (filter === 'passados') return a.date < today
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie seus compromissos e agendamentos.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Novo agendamento</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {[['todos', 'Todos'], ['hoje', 'Hoje'], ['futuros', 'Futuros'], ['passados', 'Passados']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={"px-4 py-1.5 rounded-lg text-sm font-medium border transition-all " + (filter === val ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum agendamento encontrado.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Novo agendamento</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Título</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Horário</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Responsável</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt) => (
                <tr key={appt.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{appt.title}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{appt.time || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{appt.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{appt.employees?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-1 rounded-full text-xs font-medium " + (statusColors[appt.status] || 'bg-gray-100 text-gray-600')}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(appt)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(appt.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar agendamento' : 'Novo agendamento'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Título" placeholder="Ex: Visita técnica, Reunião" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input label="Descrição" placeholder="Opcional" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              <Input label="Horário" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>
            <Input label="Duração (minutos)" type="number" placeholder="60" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white">
                <option value="">Sem cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Responsável</label>
              <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white">
                <option value="">Sem responsável</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white">
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar agendamento'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
