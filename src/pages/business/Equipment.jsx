import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { type: '', brand: '', model: '', serial_number: '', client_id: '', notes: '' }

export function Equipment() {
  const { businessId } = useParams()
  const [items, setItems] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: equipData }, { data: clientsData }] = await Promise.all([
      supabase.from('equipment').select('*, clients(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('business_id', businessId)
    ])
    setItems(equipData || [])
    setClients(clientsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(item) {
    setForm({
      type: item.type || '', brand: item.brand || '', model: item.model || '',
      serial_number: item.serial_number || '', client_id: item.client_id || '', notes: item.notes || ''
    })
    setEditingId(item.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.type.trim()) { setError('Tipo é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      type: form.type, brand: form.brand, model: form.model,
      serial_number: form.serial_number, client_id: form.client_id || null, notes: form.notes
    }

    if (editingId) {
      await supabase.from('equipment').update(payload).eq('id', editingId)
    } else {
      await supabase.from('equipment').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este equipamento?')) return
    await supabase.from('equipment').delete().eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Equipamentos</h1>
          <p className="text-gray-500 text-sm mt-1">Equipamentos de clientes em atendimento.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Novo equipamento</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum equipamento cadastrado ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar equipamento</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Marca/Modelo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Nº Série</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.type}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{[item.brand, item.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.serial_number || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.clients?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar equipamento' : 'Novo equipamento'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Tipo" placeholder="Ex: Notebook, Celular" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            <Input label="Marca" placeholder="Ex: Dell, Samsung" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            <Input label="Modelo" placeholder="Ex: Inspiron 15" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            <Input label="Número de série" placeholder="Opcional" value={form.serial_number} onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Sem cliente vinculado</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar equipamento'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}