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
  const [search, setSearch] = useState('')

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').eq('business_id', businessId).order('created_at', { ascending: false })
    setClients(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClients() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(client) {
    setForm({ name: client.name, email: client.email || '', phone: client.phone || '', document: client.document || '', notes: client.notes || '' })
    setEditingId(client.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    if (editingId) { await supabase.from('clients').update({ ...form }).eq('id', editingId) }
    else { await supabase.from('clients').insert({ ...form, business_id: businessId }) }
    setSaving(false); setShowModal(false); fetchClients()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este cliente?')) return
    await supabase.from('clients').delete().eq('id', id); fetchClients()
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie os clientes do seu negócio.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Novo cliente</Button></div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">{search ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</p>
          {!search && <div className="w-44 mx-auto mt-4"><Button onClick={openNew}>Adicionar primeiro cliente</Button></div>}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Nome</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Telefone</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Email</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">CPF/CNPJ</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr key={client.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{client.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{client.phone || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{client.email || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{client.document || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(client)} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(client.id)} className="text-red-500 dark:text-red-400 hover:text-red-600 text-xs font-medium">Excluir</button>
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
            <Input label="Nome" placeholder="Nome completo" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Telefone" placeholder="(00) 00000-0000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Input label="Email" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="CPF / CNPJ" placeholder="000.000.000-00" value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar cliente'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
