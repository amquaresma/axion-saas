import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', category: '', serial_number: '', status: 'disponível', responsible_id: '', last_maintenance: '', next_maintenance: '', notes: '' }

const statusOptions = ['disponível', 'em uso', 'manutenção', 'inativo']
const statusColors = {
  'disponível': 'bg-green-100 text-green-700',
  'em uso': 'bg-blue-100 text-blue-700',
  'manutenção': 'bg-orange-100 text-orange-700',
  'inativo': 'bg-gray-100 text-gray-500',
}

export function Tools() {
  const { businessId } = useParams()
  const [tools, setTools] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: toolsData }, { data: employeesData }] = await Promise.all([
      supabase.from('tools').select('*, employees(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setTools(toolsData || [])
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

  function openEdit(tool) {
    setForm({
      name: tool.name, category: tool.category || '', serial_number: tool.serial_number || '',
      status: tool.status || 'disponível', responsible_id: tool.responsible_id || '',
      last_maintenance: tool.last_maintenance || '', next_maintenance: tool.next_maintenance || '',
      notes: tool.notes || ''
    })
    setEditingId(tool.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name, category: form.category, serial_number: form.serial_number,
      status: form.status, responsible_id: form.responsible_id || null,
      last_maintenance: form.last_maintenance || null, next_maintenance: form.next_maintenance || null,
      notes: form.notes
    }

    if (editingId) {
      await supabase.from('tools').update(payload).eq('id', editingId)
    } else {
      await supabase.from('tools').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta ferramenta?')) return
    await supabase.from('tools').delete().eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ferramentas e Ativos</h1>
          <p className="text-gray-500 text-sm mt-1">Controle os recursos internos do seu negócio.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Nova ferramenta</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : tools.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhuma ferramenta cadastrada ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar ferramenta</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Responsável</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Próx. Manutenção</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tools.map((tool) => (
                <tr key={tool.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tool.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tool.category || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tool.employees?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{tool.next_maintenance ? new Date(tool.next_maintenance).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[tool.status] || 'bg-gray-100 text-gray-600'}`}>
                      {tool.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(tool)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(tool.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar ferramenta' : 'Nova ferramenta'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Nome" placeholder="Ex: Furadeira, Multímetro" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Categoria" placeholder="Ex: Elétrica, Medição" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <Input label="Número de série" placeholder="Opcional" value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Responsável</label>
              <select
                value={form.responsible_id}
                onChange={(e) => setForm((f) => ({ ...f, responsible_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Sem responsável</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Última manutenção" type="date" value={form.last_maintenance} onChange={(e) => setForm((f) => ({ ...f, last_maintenance: e.target.value }))} />
              <Input label="Próxima manutenção" type="date" value={form.next_maintenance} onChange={(e) => setForm((f) => ({ ...f, next_maintenance: e.target.value }))} />
            </div>

            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar ferramenta'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}