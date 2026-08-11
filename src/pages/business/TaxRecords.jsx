import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createBill } from '../../services/financeService'

const emptyForm = {
  type: 'ISS', period: new Date().toISOString().slice(0, 7),
  base_amount: '', rate: '', amount: '',
  due_date: '', status: 'pendente', notes: ''
}

const taxTypes = ['ISS', 'ICMS', 'PIS', 'COFINS', 'IRPJ', 'CSLL', 'Simples Nacional']

const statusColors = {
  pendente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  pago: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
}

export function TaxRecords() {
  const { businessId } = useParams()
  const [taxes, setTaxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const { data } = await supabase.from('tax_records').select('*').eq('business_id', businessId).order('period', { ascending: false })
    setTaxes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function calcAmount() {
    const base = parseFloat(form.base_amount) || 0
    const rate = parseFloat(form.rate) || 0
    return (base * rate / 100).toFixed(2)
  }

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(tax) {
    setForm({ type: tax.type, period: tax.period, base_amount: tax.base_amount, rate: tax.rate, amount: tax.amount, due_date: tax.due_date || '', status: tax.status, notes: tax.notes || '' })
    setEditingId(tax.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.base_amount) { setError('Informe a base de cálculo.'); return }
    setSaving(true); setError('')

    const amount = parseFloat(form.amount) || parseFloat(calcAmount())
    const payload = {
      type: form.type, period: form.period,
      base_amount: parseFloat(form.base_amount),
      rate: parseFloat(form.rate) || 0,
      amount, due_date: form.due_date || null,
      status: form.status, notes: form.notes,
    }

    if (editingId) {
      await supabase.from('tax_records').update(payload).eq('id', editingId)
    } else {
      await supabase.from('tax_records').insert({ ...payload, business_id: businessId })
      if (form.due_date) {
        await createBill({
          businessId, description: `Imposto: ${form.type} — ${form.period}`,
          amount, type: 'pagar', dueDate: form.due_date,
          category: 'Imposto', origin: 'fiscal',
        })
      }
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir?')) return
    await supabase.from('tax_records').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`
  const totalPendente = taxes.filter(t => t.status === 'pendente').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalPago = taxes.filter(t => t.status === 'pago').reduce((acc, t) => acc + Number(t.amount), 0)

  const taxesByPeriod = taxes.reduce((acc, t) => {
    if (!acc[t.period]) acc[t.period] = []
    acc[t.period].push(t)
    return acc
  }, {})

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Apuração de Impostos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Controle e apuração de tributos.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Novo imposto</Button></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Impostos pendentes</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1">{fmt(totalPendente)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Impostos pagos</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{fmt(totalPago)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total apurado</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{fmt(totalPendente + totalPago)}</p>
        </div>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : taxes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum imposto apurado.</p>
          <div className="w-40 mx-auto mt-4"><Button onClick={openNew}>Apurar imposto</Button></div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Object.entries(taxesByPeriod).sort((a, b) => b[0].localeCompare(a[0])).map(([period, items]) => (
            <div key={period} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {new Date(period + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                    Total: {fmt(items.reduce((acc, t) => acc + Number(t.amount), 0))}
                  </span>
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Imposto</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Base</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Alíquota</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Vencimento</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                    <th className="px-6 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((tax) => (
                    <tr key={tax.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{tax.type}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{fmt(tax.base_amount)}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{tax.rate}%</td>
                      <td className="px-6 py-3 font-semibold text-red-500 dark:text-red-400">{fmt(tax.amount)}</td>
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{tax.due_date ? new Date(tax.due_date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-6 py-3"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[tax.status] || '')}>{tax.status}</span></td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => openEdit(tax)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                          <button onClick={() => handleDelete(tax.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar imposto' : 'Apurar imposto'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de imposto</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {taxTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Período (mês/ano)" type="month" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Base de cálculo (R$)" type="number" placeholder="0,00" value={form.base_amount} onChange={(e) => setForm((f) => ({ ...f, base_amount: e.target.value }))} />
              <Input label="Alíquota (%)" type="number" placeholder="0,00" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
            {form.base_amount && form.rate && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Valor calculado</span>
                <span className="font-bold text-red-500 dark:text-red-400">{fmt(calcAmount())}</span>
              </div>
            )}
            <Input label="Valor do imposto (R$)" type="number" placeholder={calcAmount() || '0,00'} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Vencimento" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
