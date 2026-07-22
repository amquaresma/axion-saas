import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { name: '', type: 'conta_corrente', balance: '' }

const accountTypes = [
  { value: 'conta_corrente', label: 'Conta Corrente' },
  { value: 'conta_poupanca', label: 'Conta Poupança' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'carteira', label: 'Carteira' },
  { value: 'investimento', label: 'Investimento' },
]

export function BankAccounts() {
  const { businessId } = useParams()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchAccounts() {
    const { data } = await supabase.from('bank_accounts').select('*').eq('business_id', businessId).order('created_at')
    setAccounts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(account) {
    setForm({ name: account.name, type: account.type, balance: account.balance })
    setEditingId(account.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    const payload = { name: form.name, type: form.type, balance: parseFloat(form.balance) || 0 }
    if (editingId) { await supabase.from('bank_accounts').update(payload).eq('id', editingId) }
    else { await supabase.from('bank_accounts').insert({ ...payload, business_id: businessId }) }
    setSaving(false); setShowModal(false); fetchAccounts()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta conta?')) return
    await supabase.from('bank_accounts').delete().eq('id', id); fetchAccounts()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`
  const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas Bancárias</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gerencie seus bancos, caixas e carteiras.</p>
        </div>
        <div className="w-44"><Button onClick={openNew}>Nova conta</Button></div>
      </div>

      {/* Saldo total */}
      <div className="bg-blue-600 rounded-xl p-6 mb-6 text-white">
        <p className="text-sm text-blue-200">Saldo total</p>
        <p className="text-3xl font-bold mt-1">{fmt(totalBalance)}</p>
        <p className="text-sm text-blue-200 mt-1">{accounts.length} conta(s) cadastrada(s)</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma conta cadastrada ainda.</p>
          <div className="w-44 mx-auto mt-4"><Button onClick={openNew}>Adicionar conta</Button></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <div key={account.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{account.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{accountTypes.find(t => t.value === account.type)?.label || account.type}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(account)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                  <button onClick={() => handleDelete(account.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                </div>
              </div>
              <p className={`text-2xl font-bold ${Number(account.balance) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {fmt(account.balance)}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar conta' : 'Nova conta'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <Input label="Nome da conta" placeholder="Ex: Banco do Brasil, Caixa" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {accountTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Input label="Saldo inicial (R$)" type="number" placeholder="0,00" value={form.balance} onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar conta'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
