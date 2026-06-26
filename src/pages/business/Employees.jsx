import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', role: '', email: '', phone: '', commission_rate: '' }

export function Employees() {
  const { businessId } = useParams()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

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
      commission_rate: employee.commission_rate || '',
    })
    setEditingId(employee.id)
    setError('')
    setShowModal(true)
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
      commission_rate: parseFloat(form.commission_rate) || 0,
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie a equipe do seu negócio.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Novo funcionário</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum funcionário cadastrado ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar funcionário</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cargo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Telefone</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Comissão</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{employee.name}</td>
                  <td className="px-6 py-4 text-gray-500">{employee.role || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{employee.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{employee.phone || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{employee.commission_rate ? `${employee.commission_rate}%` : '—'}</td>
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
          <div className="flex flex-col gap-4">
            <Input
              label="Nome"
              placeholder="Nome completo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Cargo"
              placeholder="Ex: Técnico, Vendedor"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Taxa de comissão (%)"
              type="number"
              placeholder="0"
              value={form.commission_rate}
              onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))}
            />
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