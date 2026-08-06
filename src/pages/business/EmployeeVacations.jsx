import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { employee_id: '', start_date: '', end_date: '', notes: '', status: 'agendado' }

const statusColors = {
  agendado: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  em_curso: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  concluido: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelado: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

export function EmployeeVacations() {
  const { businessId } = useParams()
  const [vacations, setVacations] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: vacData }, { data: empData }] = await Promise.all([
      supabase.from('employee_vacations').select('*, employees(name)').eq('business_id', businessId).order('start_date', { ascending: false }),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setVacations(vacData || [])
    setEmployees(empData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function calcDays(start, end) {
    if (!start || !end) return 0
    const diff = new Date(end) - new Date(start)
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(vac) {
    setForm({ employee_id: vac.employee_id, start_date: vac.start_date, end_date: vac.end_date, notes: vac.notes || '', status: vac.status })
    setEditingId(vac.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.employee_id) { setError('Selecione um funcionário.'); return }
    if (!form.start_date || !form.end_date) { setError('Informe as datas.'); return }
    if (new Date(form.end_date) < new Date(form.start_date)) { setError('Data final deve ser após a inicial.'); return }
    setSaving(true); setError('')

    const days = calcDays(form.start_date, form.end_date)
    const payload = { employee_id: form.employee_id, start_date: form.start_date, end_date: form.end_date, days, notes: form.notes, status: form.status }

    if (editingId) { await supabase.from('employee_vacations').update(payload).eq('id', editingId) }
    else { await supabase.from('employee_vacations').insert({ ...payload, business_id: businessId }) }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir?')) return
    await supabase.from('employee_vacations').delete().eq('id', id); fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Férias</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Controle de férias dos funcionários.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Agendar férias</Button></div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : vacations.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma férias agendada.</p>
          <div className="w-40 mx-auto mt-4"><Button onClick={openNew}>Agendar</Button></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Funcionário</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Início</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Fim</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Dias</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {vacations.map((vac) => (
                <tr key={vac.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{vac.employees?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(vac.start_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(vac.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{vac.days} dias</td>
                  <td className="px-6 py-4"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[vac.status] || '')}>{vac.status.replace('_', ' ')}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(vac)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(vac.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar férias' : 'Agendar férias'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Funcionário</label>
              <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Início" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              <Input label="Fim" type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
            </div>
            {form.start_date && form.end_date && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{calcDays(form.start_date, form.end_date)} dias de férias</p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="agendado">Agendado</option>
                <option value="em_curso">Em curso</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Agendar'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
