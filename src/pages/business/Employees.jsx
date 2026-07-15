import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = {
  name: '', role: '', email: '', phone: '', document: '', address: '',
  commission_rate: '', salary: '', work_schedule: '', work_days: '',
  start_date: '', status: 'ativo'
}

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export function Employees() {
  const { businessId } = useParams()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [selectedDays, setSelectedDays] = useState([])

  async function fetchEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setEmployees(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [businessId])

  function openNew() {
    setForm(emptyForm)
    setSelectedDays([])
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(employee) {
    setForm({
      name: employee.name,
      role: employee.role || '',
      email: employee.email || '',
      phone: employee.phone || '',
      document: employee.document || '',
      address: employee.address || '',
      commission_rate: employee.commission_rate || '',
      salary: employee.salary || '',
      work_schedule: employee.work_schedule || '',
      work_days: employee.work_days || '',
      start_date: employee.start_date || '',
      status: employee.status || 'ativo',
    })
    setSelectedDays(employee.work_days ? employee.work_days.split(',') : [])
    setEditingId(employee.id)
    setError('')
    setShowModal(true)
  }

  function toggleDay(day) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      role: form.role,
      email: form.email,
      phone: form.phone,
      document: form.document,
      address: form.address,
      commission_rate: parseFloat(form.commission_rate) || 0,
      salary: parseFloat(form.salary) || 0,
      work_schedule: form.work_schedule,
      work_days: selectedDays.join(','),
      start_date: form.start_date || null,
      status: form.status,
    }

    if (editingId) {
      await supabase.from('employees').update(payload).eq('id', editingId)
    } else {
      await supabase.from('employees').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchEmployees()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este funcionário?')) return
    await supabase.from('employees').delete().eq('id', id)
    fetchEmployees()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Funcionários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie a equipe do seu negócio.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Novo funcionário</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : employees.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum funcionário cadastrado ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar funcionário</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cargo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Jornada</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Salário</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{employee.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{employee.role || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{employee.work_schedule || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{employee.salary ? fmt(employee.salary) : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${employee.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(employee)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(employee.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar funcionário' : 'Novo funcionário'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Nome" placeholder="Nome completo" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Cargo" placeholder="Ex: Técnico, Vendedor" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            <Input label="CPF" placeholder="000.000.000-00" value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
            <Input label="Email" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Endereço" placeholder="Rua, número, bairro" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Salário (R$)" type="number" placeholder="0,00" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
              <Input label="Comissão (%)" type="number" placeholder="0" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} />
            </div>

            <Input label="Horário de trabalho" placeholder="Ex: 08:00 - 18:00" value={form.work_schedule} onChange={(e) => setForm((f) => ({ ...f, work_schedule: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Dias de trabalho</label>
              <div className="flex gap-1.5 flex-wrap">
                {weekDays.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedDays.includes(day)
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <Input label="Data de admissão" type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="afastado">Afastado</option>
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar funcionário'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}