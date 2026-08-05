import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createBill } from '../../services/financeService'

const emptyForm = { inventory_id: '', type: 'entrada', quantity: '', unit_cost: '', reason: 'compra', notes: '', date: new Date().toISOString().split('T')[0] }

const reasonOptions = {
  entrada: ['compra', 'devolucao', 'ajuste', 'producao'],
  saida: ['venda', 'perda', 'ajuste', 'uso_interno'],
}

const reasonLabels = {
  compra: 'Compra', devolucao: 'Devolução', ajuste: 'Ajuste',
  producao: 'Produção', venda: 'Venda', perda: 'Perda', uso_interno: 'Uso interno',
}

export function InventoryMovements() {
  const { businessId } = useParams()
  const [movements, setMovements] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todos')

  async function fetchData() {
    const [{ data: movData }, { data: itemsData }] = await Promise.all([
      supabase.from('inventory_movements').select('*, inventory(name, unit)').eq('business_id', businessId).order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('inventory').select('id, name, quantity, unit, average_cost').eq('business_id', businessId).order('name'),
    ])
    setMovements(movData || [])
    setItems(itemsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  async function handleSave() {
    if (!form.inventory_id) { setError('Selecione um produto.'); return }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { setError('Informe uma quantidade válida.'); return }
    setSaving(true); setError('')

    const item = items.find(i => i.id === form.inventory_id)
    const qty = parseFloat(form.quantity)
    const cost = parseFloat(form.unit_cost) || 0

    // Registra movimentação
    await supabase.from('inventory_movements').insert({
      business_id: businessId,
      inventory_id: form.inventory_id,
      type: form.type,
      quantity: qty,
      unit_cost: cost,
      reason: form.reason,
      notes: form.notes,
      date: form.date,
    })

    // Atualiza quantidade e custo médio
    const newQty = form.type === 'entrada'
      ? Number(item.quantity) + qty
      : Math.max(0, Number(item.quantity) - qty)

    let newAvgCost = Number(item.average_cost)
    if (form.type === 'entrada' && cost > 0) {
      const totalValue = (Number(item.quantity) * Number(item.average_cost)) + (qty * cost)
      newAvgCost = totalValue / newQty
    }

    await supabase.from('inventory').update({ quantity: newQty, average_cost: newAvgCost }).eq('id', form.inventory_id)

    // Se for compra, gera conta a pagar
    if (form.reason === 'compra' && cost > 0) {
      await createBill({
        businessId,
        description: `Compra: ${item.name} (${qty} ${item.unit || 'un'})`,
        amount: qty * cost,
        type: 'pagar',
        dueDate: form.date,
        category: 'Fornecedor',
        origin: 'estoque',
        originId: form.inventory_id,
      })
    }

    setSaving(false); setShowModal(false); setForm(emptyForm); fetchData()
  }

  const filtered = filter === 'todos' ? movements : movements.filter(m => m.type === filter)

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Movimentações de Estoque</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Entradas, saídas e histórico completo.</p>
        </div>
        <div className="w-44"><Button onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }}>Nova movimentação</Button></div>
      </div>

      {/* Resumo de itens */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Posição atual do estoque</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left py-2 text-gray-500 dark:text-gray-400 font-medium">Produto</th>
                <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Qtd</th>
                <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Custo médio</th>
                <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">Valor total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 text-gray-900 dark:text-white">{item.name}</td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">{item.quantity} {item.unit || 'un'}</td>
                  <td className="py-2 text-right text-gray-500 dark:text-gray-400">{fmt(item.average_cost)}</td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white">{fmt(Number(item.quantity) * Number(item.average_cost))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {[['todos', 'Todas'], ['entrada', 'Entradas'], ['saida', 'Saídas']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (filter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma movimentação registrada.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Produto</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Motivo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Qtd</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Custo unit.</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mov) => (
                <tr key={mov.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{mov.inventory?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (mov.type === 'entrada' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400')}>
                      {mov.type === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{reasonLabels[mov.reason] || mov.reason}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{mov.type === 'entrada' ? '+' : '-'}{mov.quantity} {mov.inventory?.unit || 'un'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{mov.unit_cost > 0 ? fmt(mov.unit_cost) : '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(mov.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Nova movimentação" onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {['entrada', 'saida'].map((t) => (
                <button key={t} onClick={() => setForm((f) => ({ ...f, type: t, reason: t === 'entrada' ? 'compra' : 'venda' }))}
                  className={"flex-1 py-2 rounded-lg text-sm font-medium border transition-all " + (form.type === t ? (t === 'entrada' ? 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-600 dark:text-red-400') : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400')}>
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Produto</label>
              <select value={form.inventory_id} onChange={(e) => setForm((f) => ({ ...f, inventory_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} (estoque: {i.quantity})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Motivo</label>
              <select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {reasonOptions[form.type].map((r) => <option key={r} value={r}>{reasonLabels[r]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Quantidade" type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              <Input label="Custo unitário (R$)" type="number" placeholder="0,00" value={form.unit_cost} onChange={(e) => setForm((f) => ({ ...f, unit_cost: e.target.value }))} />
            </div>
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Registrar movimentação'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
