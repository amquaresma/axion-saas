import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { employee_id: '', date: new Date().toISOString().split('T')[0], check_in: '', check_out: '', notes: '' }

export function EmployeeHours() {
  const { businessId } = useParams()
  const [hours, setHours] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [filterEmployee, setFilterEmployee] = useState('')

  async function fetchData() {
    const [{ data: hoursData }, { data: empData }] = await Promise.all([
      supabase.from('employee_hours').select('*, employees(name)').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setHours(hoursData || [])
    setEmployees(empData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function calcHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0
    const [h1, m1] = checkIn.split(':').map(Number)
    const [h2, m2] = checkOut.split(':').map(Number)
    const minutes = (h2 * 60 + m2) - (h1 * 60 + m1)
    return Math.max(0, minutes / 60)
  }

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(h) {
    setForm({ employee_id: h.employee_id, date: h.date, check_in: h.check_in || '', check_out: h.check_out || '', notes: h.notes || '' })
    setEditingId(h.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.employee_id) { setError('Selecione um funcionário.'); return }
    if (!form.date) { setError('Informe a data.'); return }
    setSaving(true); setError('')

    const hoursWorked = calcHours(form.check_in, form.check_out)
    const overtime = Math.max(0, hoursWorked - 8)

    const payload = {
      employee_id: form.employee_id,
      date: form.date,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      hours_worked: hoursWorked,
      overtime,
      notes: form.notes,
    }

    if (editingId) { await supabase.from('employee_hours').update(payload).eq('id', editingId) }
    else { await supabase.from('employee_hours').insert({ ...payload, business_id: businessId }) }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir?')) return
    await supabase.from('employee_hours').delete().eq('id', id); fetchData()
  }

  const filtered = filterEmployee ? hours.filter(h => h.employee_id === filterEmployee) : hours
  const totalHours = filtered.reduce((acc, h) => acc + Number(h.hours_worked || 0), 0)
  const totalOvertime = filtered.reduce((acc, h) => acc + Number(h.overtime || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Controle de Horas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Registro de ponto e horas extras.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Registrar ponto</Button></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total de horas</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Horas extras</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{totalOvertime.toFixed(1)}h</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Registros</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{filtered.length}</p>
        </div>
      </div>

      <div className="mb-4">
        <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
          <option value="">Todos os funcionários</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum registro de ponto.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Funcionário</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Entrada</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Saída</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Horas</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Extras</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{h.employees?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{h.check_in || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{h.check_out || '—'}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{Number(h.hours_worked || 0).toFixed(1)}h</td>
                  <td className="px-6 py-4">
                    {Number(h.overtime) > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">+{Number(h.overtime).toFixed(1)}h</span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(h)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(h.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar registro' : 'Registrar ponto'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Funcionário</label>
              <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Entrada" type="time" value={form.check_in} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))} />
              <Input label="Saída" type="time" value={form.check_out} onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))} />
            </div>
            {form.check_in && form.check_out && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Horas trabalhadas</span>
                  <span className="font-medium text-gray-900 dark:text-white">{calcHours(form.check_in, form.check_out).toFixed(1)}h</span>
                </div>
                {calcHours(form.check_in, form.check_out) > 8 && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-400 mt-1">
                    <span>Horas extras</span>
                    <span className="font-medium">+{(calcHours(form.check_in, form.check_out) - 8).toFixed(1)}h</span>
                  </div>
                )}
              </div>
            )}
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
