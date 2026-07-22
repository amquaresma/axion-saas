import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { from_account_id: '', to_account_id: '', amount: '', date: new Date().toISOString().split('T')[0], notes: '' }

export function Transfers() {
  const { businessId } = useParams()
  const [transfers, setTransfers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchData() {
    const [{ data: transfersData }, { data: accountsData }] = await Promise.all([
      supabase.from('transfers').select('*, from:from_account_id(name), to:to_account_id(name)').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('bank_accounts').select('id, name, balance').eq('business_id', businessId),
    ])
    setTransfers(transfersData || [])
    setAccounts(accountsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  async function handleSave() {
    if (!form.from_account_id) { setError('Selecione a conta de origem.'); return }
    if (!form.to_account_id) { setError('Selecione a conta de destino.'); return }
    if (form.from_account_id === form.to_account_id) { setError('As contas devem ser diferentes.'); return }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Informe um valor válido.'); return }

    setSaving(true); setError('')

    const amount = parseFloat(form.amount)

    // Cria a transferência
    await supabase.from('transfers').insert({
      business_id: businessId,
      from_account_id: form.from_account_id,
      to_account_id: form.to_account_id,
      amount,
      date: form.date,
      notes: form.notes,
    })

    // Atualiza saldos
    const fromAccount = accounts.find(a => a.id === form.from_account_id)
    const toAccount = accounts.find(a => a.id === form.to_account_id)

    if (fromAccount) await supabase.from('bank_accounts').update({ balance: Number(fromAccount.balance) - amount }).eq('id', form.from_account_id)
    if (toAccount) await supabase.from('bank_accounts').update({ balance: Number(toAccount.balance) + amount }).eq('id', form.to_account_id)

    setSaving(false); setShowModal(false); setForm(emptyForm); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta transferência?')) return
    await supabase.from('transfers').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transferências</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Movimentações entre contas bancárias.</p>
        </div>
        <div className="w-44"><Button onClick={() => { setForm(emptyForm); setError(''); setShowModal(true) }}>Nova transferência</Button></div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">Você precisa cadastrar pelo menos 2 contas bancárias para fazer transferências.</p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : transfers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma transferência registrada ainda.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">De</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Para</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Observações</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{t.from?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{t.to?.name || '—'}</td>
                  <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">{fmt(t.amount)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{t.notes || '—'}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDelete(t.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Nova transferência" onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta de origem</label>
              <select value={form.from_account_id} onChange={(e) => setForm((f) => ({ ...f, from_account_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} (R$ {Number(a.balance).toFixed(2).replace('.', ',')})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta de destino</label>
              <select value={form.to_account_id} onChange={(e) => setForm((f) => ({ ...f, to_account_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {accounts.filter(a => a.id !== form.from_account_id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Transferindo...' : 'Confirmar transferência'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
