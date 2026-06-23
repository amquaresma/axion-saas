import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', email: '', phone: '', document: '', notes: '' }

export function Clients() {
  const { businessId } = useParams()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchClients() {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [businessId])

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(client) {
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', document: client.document || '', notes: client.notes || '' })
    setEditingId(client.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    if (editingId) {
      await supabase.from('clients').update({ ...form }).eq('id', editingId)
    } else {
      await supabase.from('clients').insert({ ...form, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchClients()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const field = (key, label, type = 'text', placeholder = '') => (
    <Input
      label={label}
      type={type}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os clientes do seu negócio.</p>
        </div>
        <div className="w-40">
          <Button onClick={openNew}>Novo cliente</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum cliente cadastrado ainda.</p>
          <div className="w-40 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar primeiro cliente</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Telefone</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">CPF/CNPJ</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{client.name}</td>
                  <td className="px-6 py-4 text-gray-500">{client.phone || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{client.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{client.document || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(client)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(client.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar cliente' : 'Novo cliente'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            {field('name', 'Nome', 'text', 'Nome completo')}
            {field('phone', 'Telefone', 'text', '(00) 00000-0000')}
            {field('email', 'Email', 'email', 'email@exemplo.com')}
            {field('document', 'CPF / CNPJ', 'text', '000.000.000-00')}
            {field('notes', 'Observações', 'text', 'Opcional')}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar cliente'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}