import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createBill } from '../../services/financeService'

const emptyForm = { client_id: '', employee_id: '', notes: '', discount: '0', commission_rate: '0' }
const emptyItem = { description: '', quantity: '1', unit_price: '' }

const statusColors = {
  'pendente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  'em_producao': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  'pronto': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  'entregue': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'cancelado': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const statusLabels = {
  'pendente': 'Pendente', 'em_producao': 'Em produção',
  'pronto': 'Pronto', 'entregue': 'Entregue', 'cancelado': 'Cancelado'
}

export function Orders() {
  const { businessId } = useParams()
  const [orders, setOrders] = useState([])
  const [clients, setClients] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [items, setItems] = useState([{ ...emptyItem }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchData() {
    const [{ data: ordersData }, { data: clientsData }, { data: employeesData }] = await Promise.all([
      supabase.from('orders').select('*, clients(name), employees(name)').eq('business_id', businessId).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
      supabase.from('employees').select('id, name, commission_rate').eq('business_id', businessId),
    ])
    setOrders(ordersData || [])
    setClients(clientsData || [])
    setEmployees(employeesData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() { setForm(emptyForm); setItems([{ ...emptyItem }]); setError(''); setShowModal(true) }

  async function openDetail(order) {
    setSelectedOrder(order)
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setOrderItems(data || [])
    setShowDetailModal(true)
  }

  function addItem() { setItems((prev) => [...prev, { ...emptyItem }]) }
  function removeItem(i) { setItems((prev) => prev.filter((_, idx) => idx !== i)) }
  function updateItem(i, field, value) {
    setItems((prev) => {
      const updated = [...prev]
      updated[i] = { ...updated[i], [field]: value }
      return updated
    })
  }

  const subtotal = items.reduce((acc, i) => acc + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0)
  const total = subtotal - (parseFloat(form.discount) || 0)
  const commissionAmount = total * ((parseFloat(form.commission_rate) || 0) / 100)

  function handleEmployeeSelect(employeeId) {
    const employee = employees.find(e => e.id === employeeId)
    setForm((f) => ({ ...f, employee_id: employeeId, commission_rate: employee?.commission_rate || '0' }))
  }

  async function handleSave() {
    if (!form.client_id) { setError('Selecione um cliente.'); return }
    if (items.some(i => !i.description.trim())) { setError('Preencha a descrição de todos os itens.'); return }
    setSaving(true); setError('')

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      business_id: businessId,
      client_id: form.client_id,
      employee_id: form.employee_id || null,
      notes: form.notes,
      discount: parseFloat(form.discount) || 0,
      total,
      commission_rate: parseFloat(form.commission_rate) || 0,
      commission_amount: commissionAmount,
    }).select().single()

    if (orderError) { setError('Erro ao criar pedido.'); setSaving(false); return }

    await supabase.from('order_items').insert(
      items.map(i => ({
        order_id: order.id,
        description: i.description,
        quantity: parseFloat(i.quantity) || 1,
        unit_price: parseFloat(i.unit_price) || 0,
        total: (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0),
      }))
    )

    setSaving(false); setShowModal(false); fetchData()
  }

  async function updateStatus(orderId, status, order) {
    await supabase.from('orders').update({ status }).eq('id', orderId)

    if (status === 'entregue' && order.total > 0) {
      await createBill({
        businessId,
        description: `Pedido #${order.number} — ${order.clients?.name || ''}`,
        amount: order.total,
        type: 'receber',
        dueDate: new Date().toISOString().split('T')[0],
        category: 'Venda',
        clientId: order.client_id,
        origin: 'pedido',
        originId: orderId,
      })

      if (order.commission_amount > 0) {
        await createBill({
          businessId,
          description: `Comissão pedido #${order.number} — ${order.employees?.name || ''}`,
          amount: order.commission_amount,
          type: 'pagar',
          dueDate: new Date().toISOString().split('T')[0],
          category: 'Comissão',
          origin: 'comissao',
          originId: orderId,
        })
      }
    }

    fetchData(); setShowDetailModal(false)
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este pedido?')) return
    await supabase.from('orders').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie pedidos de venda e comissões.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Novo pedido</Button></div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum pedido criado ainda.</p>
          <div className="w-40 mx-auto mt-4"><Button onClick={openNew}>Criar pedido</Button></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">#</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Vendedor</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Comissão</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{order.number}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white">{order.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.employees?.name || '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{fmt(order.total)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{order.commission_amount > 0 ? fmt(order.commission_amount) : '—'}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[order.status] || '')}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openDetail(order)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Ver</button>
                      <button onClick={() => handleDelete(order.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Novo pedido" onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vendedor</label>
              <select value={form.employee_id} onChange={(e) => handleEmployeeSelect(e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem vendedor</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} {e.commission_rate ? `(${e.commission_rate}%)` : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Itens</label>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input placeholder="Descrição" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                  <input placeholder="Qtd" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                    className="w-16 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                  <input placeholder="Preço" type="number" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                  {items.length > 1 && <button onClick={() => removeItem(i)} className="text-red-500 text-xs px-2">✕</button>}
                </div>
              ))}
              <button onClick={addItem} className="text-blue-600 dark:text-blue-400 text-xs font-medium mt-1">+ Adicionar item</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Desconto (R$)" type="number" placeholder="0,00" value={form.discount} onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))} />
              <Input label="Comissão (%)" type="number" placeholder="0" value={form.commission_rate} onChange={(e) => setForm((f) => ({ ...f, commission_rate: e.target.value }))} />
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1"><span>Desconto</span><span>- {fmt(parseFloat(form.discount) || 0)}</span></div>
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2"><span>Comissão ({form.commission_rate}%)</span><span>{fmt(commissionAmount)}</span></div>
              <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white"><span>Total</span><span>{fmt(total)}</span></div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Criar pedido'}</Button>
          </div>
        </Modal>
      )}

      {showDetailModal && selectedOrder && (
        <Modal title={`Pedido #${selectedOrder.number}`} onClose={() => setShowDetailModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-500 dark:text-gray-400">Cliente</p><p className="font-medium text-gray-900 dark:text-white">{selectedOrder.clients?.name || '—'}</p></div>
              <div><p className="text-gray-500 dark:text-gray-400">Status</p><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[selectedOrder.status])}>{statusLabels[selectedOrder.status]}</span></div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-200 dark:border-gray-700"><th className="text-left px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Item</th><th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Qtd</th><th className="text-right px-4 py-2 text-gray-500 dark:text-gray-400 font-medium">Total</th></tr></thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2 text-gray-900 dark:text-white">{item.description}</td>
                      <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{item.quantity}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between font-bold text-gray-900 dark:text-white"><span>Total</span><span>{fmt(selectedOrder.total)}</span></div>
            {selectedOrder.commission_amount > 0 && <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400"><span>Comissão ({selectedOrder.commission_rate}%)</span><span>{fmt(selectedOrder.commission_amount)}</span></div>}

            {selectedOrder.status !== 'entregue' && selectedOrder.status !== 'cancelado' && (
              <div className="flex gap-2 flex-wrap">
                {selectedOrder.status === 'pendente' && <Button onClick={() => updateStatus(selectedOrder.id, 'em_producao', selectedOrder)} variant="outline">Em produção</Button>}
                {selectedOrder.status === 'em_producao' && <Button onClick={() => updateStatus(selectedOrder.id, 'pronto', selectedOrder)} variant="outline">Pronto</Button>}
                {selectedOrder.status === 'pronto' && <Button onClick={() => updateStatus(selectedOrder.id, 'entregue', selectedOrder)}>Marcar entregue</Button>}
                <Button onClick={() => updateStatus(selectedOrder.id, 'cancelado', selectedOrder)} variant="outline">Cancelar</Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
