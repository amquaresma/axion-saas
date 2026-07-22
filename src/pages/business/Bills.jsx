import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { payBill, updateOverdueBills } from '../../services/financeService'

const emptyForm = { description: '', amount: '', type: 'receber', due_date: '', category: '', client_id: '', notes: '' }

const statusColors = {
  'pendente': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  'pago': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'vencido': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  'cancelado': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
}

const categories = {
  receber: ['Serviço', 'Venda', 'Comissão', 'Aluguel', 'Outro'],
  pagar: ['Fornecedor', 'Aluguel', 'Salário', 'Material', 'Transporte', 'Imposto', 'Outro'],
}

export function Bills() {
  const { businessId } = useParams()
  const [bills, setBills] = useState([])
  const [clients, setClients] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [payForm, setPayForm] = useState({ bank_account_id: '', paid_at: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [payingBill, setPayingBill] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [typeFilter, setTypeFilter] = useState('todos')

  async function fetchData() {
    const [{ data: billsData }, { data: clientsData }, { data: accountsData }] = await Promise.all([
      supabase.from('bills').select('*, clients(name), bank_accounts(name)').eq('business_id', businessId).order('due_date'),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
      supabase.from('bank_accounts').select('id, name').eq('business_id', businessId),
    ])
    await updateOverdueBills(businessId)
    setBills(billsData || [])
    setClients(clientsData || [])
    setBankAccounts(accountsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(bill) {
    setForm({
      description: bill.description, amount: bill.amount, type: bill.type,
      due_date: bill.due_date, category: bill.category || '', client_id: bill.client_id || '', notes: bill.notes || ''
    })
    setEditingId(bill.id); setError(''); setShowModal(true)
  }

  function openPay(bill) {
    setPayingBill(bill)
    setPayForm({ bank_account_id: bankAccounts[0]?.id || '', paid_at: new Date().toISOString().split('T')[0] })
    setShowPayModal(true)
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Descrição é obrigatória.'); return }
    if (!form.amount) { setError('Valor é obrigatório.'); return }
    if (!form.due_date) { setError('Data de vencimento é obrigatória.'); return }
    setSaving(true); setError('')
    const payload = {
      description: form.description, amount: parseFloat(form.amount),
      type: form.type, due_date: form.due_date, category: form.category,
      client_id: form.client_id || null, notes: form.notes, status: 'pendente'
    }
    if (editingId) { await supabase.from('bills').update(payload).eq('id', editingId) }
    else { await supabase.from('bills').insert({ ...payload, business_id: businessId, origin: 'manual' }) }
    setSaving(false); setShowModal(false); fetchData()
  }

  async function handlePay() {
    setSaving(true)
    await payBill({ billId: payingBill.id, bankAccountId: payForm.bank_account_id || null, paidAt: payForm.paid_at })
    setSaving(false); setShowPayModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta conta?')) return
    await supabase.from('bills').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  const filtered = bills.filter(b => {
    if (filter !== 'todos' && b.status !== filter) return false
    if (typeFilter !== 'todos' && b.type !== typeFilter) return false
    return true
  })

  const totalReceber = bills.filter(b => b.type === 'receber' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0)
  const totalPagar = bills.filter(b => b.type === 'pagar' && b.status === 'pendente').reduce((acc, b) => acc + Number(b.amount), 0)
  const totalVencido = bills.filter(b => b.status === 'vencido').reduce((acc, b) => acc + Number(b.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas a Pagar / Receber</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Controle seus compromissos financeiros.</p>
        </div>
        <div className="w-44"><Button onClick={openNew}>Nova conta</Button></div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">A receber</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{fmt(totalReceber)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">A pagar</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1">{fmt(totalPagar)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Vencido</p>
          <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">{fmt(totalVencido)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['todos', 'Todos'], ['pendente', 'Pendentes'], ['vencido', 'Vencidos'], ['pago', 'Pagos']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (filter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            {label}
          </button>
        ))}
        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
        {[['todos', 'Todos'], ['receber', 'A receber'], ['pagar', 'A pagar']].map(([val, label]) => (
          <button key={val} onClick={() => setTypeFilter(val)} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (typeFilter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma conta encontrada.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Vencimento</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill) => (
                <tr key={bill.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">{bill.description}</p>
                    {bill.clients?.name && <p className="text-xs text-gray-400 dark:text-gray-500">{bill.clients.name}</p>}
                    {bill.origin && bill.origin !== 'manual' && <p className="text-xs text-blue-500 dark:text-blue-400">Auto: {bill.origin}</p>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(bill.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (bill.type === 'receber' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                      {bill.type === 'receber' ? 'A receber' : 'A pagar'}
                    </span>
                  </td>
                  <td className={"px-6 py-4 font-semibold " + (bill.type === 'receber' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400')}>{fmt(bill.amount)}</td>
                  <td className="px-6 py-4">
                    <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[bill.status] || 'bg-gray-100 text-gray-500')}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {bill.status === 'pendente' || bill.status === 'vencido' ? (
                        <button onClick={() => openPay(bill)} className="text-green-600 dark:text-green-400 text-xs font-medium">Pagar</button>
                      ) : null}
                      <button onClick={() => openEdit(bill)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(bill.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar conta' : 'Nova conta'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex gap-2">
              {['receber', 'pagar'].map((t) => (
                <button key={t} onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                  className={"flex-1 py-2 rounded-lg text-sm font-medium border transition-all " + (form.type === t ? (t === 'receber' ? 'bg-green-50 dark:bg-green-900/30 border-green-400 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border-red-400 text-red-600 dark:text-red-400') : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400')}>
                  {t === 'receber' ? 'A receber' : 'A pagar'}
                </button>
              ))}
            </div>
            <Input label="Descrição" placeholder="Ex: Pagamento cliente X" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Vencimento" type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {categories[form.type].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar conta'}</Button>
          </div>
        </Modal>
      )}

      {showPayModal && payingBill && (
        <Modal title="Registrar pagamento" onClose={() => setShowPayModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{payingBill.description}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{`R$ ${Number(payingBill.amount).toFixed(2).replace('.', ',')}`}</p>
            </div>
            <Input label="Data do pagamento" type="date" value={payForm.paid_at} onChange={(e) => setPayForm((f) => ({ ...f, paid_at: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta bancária</label>
              <select value={payForm.bank_account_id} onChange={(e) => setPayForm((f) => ({ ...f, bank_account_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem conta vinculada</option>
                {bankAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <Button onClick={handlePay} disabled={saving}>{saving ? 'Registrando...' : 'Confirmar pagamento'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
