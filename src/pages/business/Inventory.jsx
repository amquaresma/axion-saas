import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', quantity: '', min_quantity: '', price: '', category: '' }

export function Inventory() {
  const { businessId } = useParams()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchItems() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [businessId])

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(item) {
    setForm({
      name: item.name,
      quantity: item.quantity,
      min_quantity: item.min_quantity,
      price: item.price,
      category: item.category || '',
    })
    setEditingId(item.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name,
      quantity: parseInt(form.quantity) || 0,
      min_quantity: parseInt(form.min_quantity) || 0,
      price: parseFloat(form.price) || 0,
      category: form.category,
    }

    if (editingId) {
      await supabase.from('inventory').update(payload).eq('id', editingId)
    } else {
      await supabase.from('inventory').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchItems()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este item?')) return
    await supabase.from('inventory').delete().eq('id', id)
    fetchItems()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-gray-500 text-sm mt-1">Controle os produtos e materiais do seu negócio.</p>
        </div>
        <div className="w-40">
          <Button onClick={openNew}>Novo item</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhum item cadastrado ainda.</p>
          <div className="w-40 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar primeiro item</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Item</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Qtd</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Qtd mínima</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Preço unit.</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 text-gray-500">{item.category || '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{item.quantity}</td>
                  <td className="px-6 py-4 text-gray-500">{item.min_quantity}</td>
                  <td className="px-6 py-4 text-gray-500">{fmt(item.price)}</td>
                  <td className="px-6 py-4">
                    {item.quantity <= item.min_quantity ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">Estoque baixo</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                    )}
                  </td>
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
        <Modal title={editingId ? 'Editar item' : 'Novo item'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Input
              label="Nome do item"
              placeholder="Ex: Tela iPhone 11"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Categoria"
              placeholder="Ex: Peças, Materiais"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantidade"
                type="number"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              />
              <Input
                label="Qtd mínima"
                type="number"
                placeholder="0"
                value={form.min_quantity}
                onChange={(e) => setForm((f) => ({ ...f, min_quantity: e.target.value }))}
              />
            </div>
            <Input
              label="Preço unitário (R$)"
              type="number"
              placeholder="0,00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar item'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}