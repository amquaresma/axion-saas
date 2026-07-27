import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { onServiceCompleted } from '../../services/financeService'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', description: '', price: '', client_id: '', status: 'pendente' }

const statusOptions = ['pendente', 'em andamento', 'concluído', 'cancelado']

const statusColors = {
  'pendente': 'bg-yellow-100 text-yellow-700',
  'em andamento': 'bg-blue-100 text-blue-700',
  'concluído': 'bg-green-100 text-green-700',
  'cancelado': 'bg-red-100 text-red-700',
}

export function Services() {
  const { businessId } = useParams()
  const [services, setServices] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: servicesData }, { data: clientsData }] = await Promise.all([
      supabase.from('services').select('*, clients(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('business_id', businessId)
    ])
    setServices(servicesData || [])
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

  function openEdit(service) {
    setForm({
      name: service.name,
      description: service.description || '',
      price: service.price || '',
      client_id: service.client_id || '',
      status: service.status || 'pendente',
    })
    setEditingId(service.id)
    setError('')
    setShowModal(true)
  }

 async function handleSave() {
  if (!form.name.trim()) {
    setError('Nome é obrigatório.')
    return
  }

  setSaving(true)
  setError('')

  try {
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price) || 0,
      client_id: form.client_id || null,
      status: form.status,
    }

    if (editingId) {
      const { data: oldService, error: oldServiceError } = await supabase
        .from('services')
        .select('status')
        .eq('id', editingId)
        .single()

      if (oldServiceError) throw oldServiceError

      const { error: updateError } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingId)

      if (updateError) throw updateError

      // Se concluiu o serviço, gera conta a receber
      if (
        oldService?.status !== 'concluído' &&
        form.status === 'concluído' &&
        payload.price > 0
      ) {
        await onServiceCompleted({
          businessId,
          clientId: form.client_id,
          description: form.name,
          amount: payload.price,
        })
      }
    } else {
      const { error: insertError } = await supabase
        .from('services')
        .insert({
          ...payload,
          business_id: businessId,
        })

      if (insertError) throw insertError

      // Se já for criado como concluído
      if (
        form.status === 'concluído' &&
        payload.price > 0
      ) {
        await onServiceCompleted({
          businessId,
          clientId: form.client_id,
          description: form.name,
          amount: payload.price,
        })
      }
    }

    setShowModal(false)
    fetchData()
  } catch (err) {
    console.error(err)
    setError(err.message || 'Erro ao salvar serviço.')
  } finally {
    setSaving(false)
  }
}
  async function handleDelete(id) {
    if (!confirm('Deseja excluir este serviço?')) return
    await supabase.from('services').delete().eq('id', id)
    fetchData()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Serviços</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os serviços do seu negócio.</p>
        </div>
        <div className="w-40">
          <Button onClick={openNew}>Novo serviço</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : services.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum serviço cadastrado ainda.</p>
          <div className="w-40 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar primeiro serviço</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Serviço</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{service.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{service.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {service.price ? `R$ ${Number(service.price).toFixed(2).replace('.', ',')}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[service.status] || 'bg-gray-100 text-gray-600'}`}>
                      {service.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(service)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(service.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar serviço' : 'Novo serviço'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Input
              label="Nome do serviço"
              placeholder="Ex: Troca de tela"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Descrição"
              placeholder="Opcional"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Valor (R$)"
              type="number"
              placeholder="0,00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
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
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Cadastrar serviço'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}