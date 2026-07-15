import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = { description: '', amount: '', type: 'receita', category: '', date: new Date().toISOString().split('T')[0] }

const categories = {
  receita: ['Serviço', 'Venda', 'Comissão', 'Outro'],
  despesa: ['Fornecedor', 'Aluguel', 'Salário', 'Material', 'Transporte', 'Outro'],
}

export function Finance() {
  const { businessId } = useParams()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchTransactions() {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('business_id', businessId)
      .order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTransactions() }, [businessId])

  const totalReceitas = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0)
  const totalDespesas = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0)
  const saldo = totalReceitas - totalDespesas

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setError('')
    setShowModal(true)
  }

  function openEdit(t) {
    setForm({ description: t.description, amount: t.amount, type: t.type, category: t.category || '', date: t.date })
    setEditingId(t.id)
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Descrição é obrigatória.'); return }
    if (!form.amount) { setError('Valor é obrigatório.'); return }
    setSaving(true)
    setError('')

    const payload = {
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      category: form.category,
      date: form.date,
    }

    if (editingId) {
      await supabase.from('transactions').update(payload).eq('id', editingId)
    } else {
      await supabase.from('transactions').insert({ ...payload, business_id: businessId })
    }

    setSaving(false)
    setShowModal(false)
    fetchTransactions()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta transação?')) return
    await supabase.from('transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financeiro</h1>
          <p className="text-gray-500 text-sm mt-1">Controle suas receitas e despesas.</p>
        </div>
        <div className="w-44">
          <Button onClick={openNew}>Nova transação</Button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Receitas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{fmt(totalReceitas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Despesas</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{fmt(totalDespesas)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo</p>
          <p className={`text-2xl font-bold mt-1 ${saldo >= 0 ? 'text-gray-900' : 'text-red-500'}`}>{fmt(saldo)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : transactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-sm">Nenhuma transação registrada ainda.</p>
          <div className="w-44 mx-auto mt-4">
            <Button onClick={openNew}>Adicionar transação</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Valor</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{t.category || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.type === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-semibold ${t.type === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'despesa' ? '- ' : '+ '}{fmt(t.amount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(t)} className="text-blue-600 hover:text-blue-700 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar transação' : 'Nova transação'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <div className="flex gap-2">
                {['receita', 'despesa'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t, category: '' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      form.type === t
                        ? t === 'receita' ? 'bg-green-50 border-green-400 text-green-700' : 'bg-red-50 border-red-400 text-red-600'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Descrição"
              placeholder="Ex: Reparo de notebook"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <Input
              label="Valor (R$)"
              type="number"
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
            <Input
              label="Data"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white"
              >
                <option value="">Selecione...</option>
                {categories[form.type].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Registrar transação'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}