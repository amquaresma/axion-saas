import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { onWorkOrderCompleted } from "../../services/financeService"
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { client_id: '', equipment_id: '', employee_id: '', diagnosis: '', solution: '', price: '', status: 'aberta' }

const statusOptions = ['aberta', 'em andamento', 'aguardando peça', 'concluída', 'cancelada']

const statusColors = {
  'aberta': 'bg-yellow-100 text-yellow-700',
  'em andamento': 'bg-blue-100 text-blue-700',
  'aguardando peça': 'bg-orange-100 text-orange-700',
  'concluída': 'bg-green-100 text-green-700',
  'cancelada': 'bg-red-100 text-red-700',
}

export function WorkOrders() {
  const { businessId } = useParams()
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [equipment, setEquipment] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: ordersData }, { data: clientsData }, { data: equipData }, { data: employeesData }] = await Promise.all([
      supabase.from('work_orders').select('*, clients(name), equipment(type, model), employees(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
      supabase.from('equipment').select('id, type, model').eq('business_id', businessId),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setOrders(ordersData || [])
    setClients(clientsData || [])
    setEquipment(equipData || [])
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

  function openEdit(order) {
    setForm({
      client_id: order.client_id || '', equipment_id: order.equipment_id || '', employee_id: order.employee_id || '',
      diagnosis: order.diagnosis || '', solution: order.solution || '', price: order.price || '', status: order.status || 'aberta'
    })
    setEditingId(order.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
  if (!form.client_id) {
    setError('Selecione um cliente.')
    return
  }

  setSaving(true)
  setError('')

  try {
    const payload = {
      client_id: form.client_id || null,
      equipment_id: form.equipment_id || null,
      employee_id: form.employee_id || null,
      diagnosis: form.diagnosis,
      solution: form.solution,
      price: parseFloat(form.price) || 0,
      status: form.status,
    }

    if (editingId) {
      // Busca o status anterior da OS
      const { data: oldOrder, error: oldOrderError } = await supabase
        .from('work_orders')
        .select('status')
        .eq('id', editingId)
        .single()

      if (oldOrderError) throw oldOrderError

      // Atualiza a OS
      const { error: updateError } = await supabase
        .from('work_orders')
        .update(payload)
        .eq('id', editingId)

      if (updateError) throw updateError

      // Se acabou de ser concluída, cria automaticamente uma conta a receber
      if (
        oldOrder?.status !== 'concluída' &&
        form.status === 'concluída' &&
        payload.price > 0
      ) {
        await onWorkOrderCompleted({
          businessId,
          clientId: form.client_id,
          description: form.diagnosis || 'Ordem de Serviço',
          amount: payload.price,
        })
      }
    } else {
      // Cria nova OS
      const { error: insertError } = await supabase
        .from('work_orders')
        .insert({
          ...payload,
          business_id: businessId,
        })

      if (insertError) throw insertError

      // Se já for criada como concluída, gera a conta automaticamente
      if (
        form.status === 'concluída' &&
        payload.price > 0
      ) {
        await onWorkOrderCompleted({
          businessId,
          clientId: form.client_id,
          description: form.diagnosis || 'Ordem de Serviço',
          amount: payload.price,
        })
      }
    }

    setShowModal(false)
    fetchData()
  } catch (err) {
    console.error(err)
    setError(err.message || 'Erro ao salvar ordem de serviço.')
  } finally {
    setSaving(false)
  }
}

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta ordem de serviço?')) return
    await supabase.from('work_orders').delete().eq('id', id)
    fetchData()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ordens de Serviço</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie os atendimentos técnicos.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Nova OS</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhuma ordem de serviço registrada ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Abrir primeira OS</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Equipamento</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Técnico</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{order.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.equipment ? `${order.equipment.type} ${order.equipment.model || ''}` : '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.employees?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.price ? fmt(order.price) : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(order)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(order.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar OS' : 'Nova Ordem de Serviço'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Cliente</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Equipamento</label>
              <select
                value={form.equipment_id}
                onChange={(e) => setForm((f) => ({ ...f, equipment_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Sem equipamento</option>
                {equipment.map((e) => <option key={e.id} value={e.id}>{e.type} {e.model}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Técnico responsável</label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Sem técnico vinculado</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <Input label="Diagnóstico" placeholder="Problema identificado" value={form.diagnosis} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} />
            <Input label="Solução" placeholder="Solução aplicada" value={form.solution} onChange={(e) => setForm((f) => ({ ...f, solution: e.target.value }))} />
            <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />

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
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Abrir OS'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}