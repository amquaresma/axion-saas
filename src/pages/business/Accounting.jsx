import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  description: '', debit_account: '', credit_account: '',
  amount: '', document: '', notes: ''
}

const commonAccounts = [
  'Caixa', 'Bancos', 'Contas a Receber', 'Estoques', 'Imobilizado',
  'Fornecedores', 'Contas a Pagar', 'Impostos a Pagar', 'Capital Social',
  'Receita de Vendas', 'Receita de Serviços', 'Custo das Mercadorias',
  'Despesas Administrativas', 'Despesas com Pessoal', 'Despesas Financeiras',
  'Lucros Acumulados',
]

export function Accounting() {
  const { businessId } = useParams()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('diario')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [transactions, setTransactions] = useState([])

  async function fetchData() {
    const [{ data: entriesData }, { data: transData }] = await Promise.all([
      supabase.from('accounting_entries').select('*').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('transactions').select('*').eq('business_id', businessId).order('date', { ascending: false }),
    ])
    setEntries(entriesData || [])
    setTransactions(transData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(entry) {
    setForm({ date: entry.date, description: entry.description, debit_account: entry.debit_account, credit_account: entry.credit_account, amount: entry.amount, document: entry.document || '', notes: entry.notes || '' })
    setEditingId(entry.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('Descrição é obrigatória.'); return }
    if (!form.debit_account) { setError('Conta de débito é obrigatória.'); return }
    if (!form.credit_account) { setError('Conta de crédito é obrigatória.'); return }
    if (!form.amount) { setError('Valor é obrigatório.'); return }
    setSaving(true); setError('')

    const payload = {
      date: form.date, description: form.description,
      debit_account: form.debit_account, credit_account: form.credit_account,
      amount: parseFloat(form.amount), document: form.document, notes: form.notes,
    }

    if (editingId) { await supabase.from('accounting_entries').update(payload).eq('id', editingId) }
    else { await supabase.from('accounting_entries').insert({ ...payload, business_id: businessId }) }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir este lançamento?')) return
    await supabase.from('accounting_entries').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`

  // Balancete
  const accountBalances = {}
  entries.forEach(e => {
    if (!accountBalances[e.debit_account]) accountBalances[e.debit_account] = { debito: 0, credito: 0 }
    if (!accountBalances[e.credit_account]) accountBalances[e.credit_account] = { debito: 0, credito: 0 }
    accountBalances[e.debit_account].debito += Number(e.amount)
    accountBalances[e.credit_account].credito += Number(e.amount)
  })

  // DRE contábil
  const receitas = transactions.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0)
  const despesas = transactions.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0)
  const lucro = receitas - despesas

  const tabs = [
    { key: 'diario', label: 'Livro Diário' },
    { key: 'razao', label: 'Livro Razão' },
    { key: 'balancete', label: 'Balancete' },
    { key: 'dre', label: 'DRE' },
    { key: 'balanco', label: 'Balanço Patrimonial' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contabilidade</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Lançamentos contábeis e demonstrativos.</p>
        </div>
        <div className="w-44"><Button onClick={openNew}>Novo lançamento</Button></div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={"px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap " + (activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300')}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Livro Diário */}
      {activeTab === 'diario' && (
        <div>
          {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : entries.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum lançamento registrado.</p>
              <div className="w-44 mx-auto mt-4"><Button onClick={openNew}>Primeiro lançamento</Button></div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Débito</th>
                    <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Crédito</th>
                    <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-3 text-gray-900 dark:text-white">{entry.description}</td>
                      <td className="px-6 py-3 text-blue-600 dark:text-blue-400">{entry.debit_account}</td>
                      <td className="px-6 py-3 text-green-600 dark:text-green-400">{entry.credit_account}</td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900 dark:text-white">{fmt(entry.amount)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3 justify-end">
                          <button onClick={() => openEdit(entry)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                          <button onClick={() => handleDelete(entry.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Livro Razão */}
      {activeTab === 'razao' && (
        <div className="flex flex-col gap-4">
          {Object.entries(accountBalances).map(([account, bal]) => (
            <div key={account} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{account}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                    <th className="text-left px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                    <th className="text-right px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Débito</th>
                    <th className="text-right px-6 py-2 text-gray-500 dark:text-gray-400 font-medium">Crédito</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.filter(e => e.debit_account === account || e.credit_account === account).map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-6 py-2 text-gray-500 dark:text-gray-400">{new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-2 text-gray-900 dark:text-white">{e.description}</td>
                      <td className="px-6 py-2 text-right text-blue-600 dark:text-blue-400">{e.debit_account === account ? fmt(e.amount) : '—'}</td>
                      <td className="px-6 py-2 text-right text-green-600 dark:text-green-400">{e.credit_account === account ? fmt(e.amount) : '—'}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                    <td className="px-6 py-2 text-gray-900 dark:text-white" colSpan={2}>Total</td>
                    <td className="px-6 py-2 text-right text-blue-600 dark:text-blue-400">{fmt(bal.debito)}</td>
                    <td className="px-6 py-2 text-right text-green-600 dark:text-green-400">{fmt(bal.credito)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          {Object.keys(accountBalances).length === 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum lançamento para exibir.</p>
            </div>
          )}
        </div>
      )}

      {/* Balancete */}
      {activeTab === 'balancete' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Balancete de Verificação</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Conta</th>
                <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Débito</th>
                <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Crédito</th>
                <th className="text-right px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(accountBalances).map(([account, bal]) => (
                <tr key={account} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-6 py-3 text-gray-900 dark:text-white">{account}</td>
                  <td className="px-6 py-3 text-right text-blue-600 dark:text-blue-400">{fmt(bal.debito)}</td>
                  <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">{fmt(bal.credito)}</td>
                  <td className={`px-6 py-3 text-right font-medium ${bal.debito - bal.credito >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
                    {fmt(Math.abs(bal.debito - bal.credito))} {bal.debito >= bal.credito ? 'D' : 'C'}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-bold">
                <td className="px-6 py-3 text-gray-900 dark:text-white">TOTAL</td>
                <td className="px-6 py-3 text-right text-blue-600 dark:text-blue-400">{fmt(Object.values(accountBalances).reduce((acc, b) => acc + b.debito, 0))}</td>
                <td className="px-6 py-3 text-right text-green-600 dark:text-green-400">{fmt(Object.values(accountBalances).reduce((acc, b) => acc + b.credito, 0))}</td>
                <td className="px-6 py-3"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* DRE */}
      {activeTab === 'dre' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Demonstração do Resultado do Exercício</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 font-semibold text-green-600 dark:text-green-400">RECEITA BRUTA</td>
                <td className="py-3 text-right font-bold text-green-600 dark:text-green-400">{fmt(receitas)}</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 font-semibold text-red-500 dark:text-red-400">(-) DEDUÇÕES E DESPESAS</td>
                <td className="py-3 text-right font-bold text-red-500 dark:text-red-400">({fmt(despesas)})</td>
              </tr>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <td className="py-3 px-2 font-bold text-gray-900 dark:text-white">LUCRO LÍQUIDO DO PERÍODO</td>
                <td className={`py-3 px-2 text-right font-bold text-xl ${lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(lucro)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500 dark:text-gray-400">Margem de lucro</td>
                <td className="py-2 text-right text-gray-500 dark:text-gray-400">{receitas > 0 ? ((lucro / receitas) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Balanço Patrimonial */}
      {activeTab === 'balanco' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4">ATIVO</h2>
            {['Caixa', 'Bancos', 'Contas a Receber', 'Estoques', 'Imobilizado'].map(acc => {
              const bal = accountBalances[acc]
              if (!bal) return null
              const saldo = bal.debito - bal.credito
              return saldo !== 0 ? (
                <div key={acc} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{acc}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{fmt(Math.abs(saldo))}</span>
                </div>
              ) : null
            })}
            <div className="flex justify-between pt-3 font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 mt-2">
              <span>Total Ativo</span>
              <span className="text-blue-600 dark:text-blue-400">{fmt(['Caixa', 'Bancos', 'Contas a Receber', 'Estoques', 'Imobilizado'].reduce((acc, a) => acc + Math.abs((accountBalances[a]?.debito || 0) - (accountBalances[a]?.credito || 0)), 0))}</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-4">PASSIVO + PATRIMÔNIO LÍQUIDO</h2>
            {['Fornecedores', 'Contas a Pagar', 'Impostos a Pagar', 'Capital Social', 'Lucros Acumulados'].map(acc => {
              const bal = accountBalances[acc]
              if (!bal) return null
              const saldo = bal.credito - bal.debito
              return saldo !== 0 ? (
                <div key={acc} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{acc}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{fmt(Math.abs(saldo))}</span>
                </div>
              ) : null
            })}
            <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">Resultado do período</span>
              <span className={`text-sm font-medium ${lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{fmt(lucro)}</span>
            </div>
            <div className="flex justify-between pt-3 font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 mt-2">
              <span>Total Passivo + PL</span>
              <span className="text-green-600 dark:text-green-400">{fmt(['Fornecedores', 'Contas a Pagar', 'Impostos a Pagar', 'Capital Social', 'Lucros Acumulados'].reduce((acc, a) => acc + Math.abs((accountBalances[a]?.credito || 0) - (accountBalances[a]?.debito || 0)), 0) + lucro)}</span>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar lançamento' : 'Novo lançamento contábil'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Descrição" placeholder="Ex: Pagamento de fornecedor" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta de Débito (D)</label>
              <select value={form.debit_account} onChange={(e) => setForm((f) => ({ ...f, debit_account: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {commonAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta de Crédito (C)</label>
              <select value={form.credit_account} onChange={(e) => setForm((f) => ({ ...f, credit_account: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {commonAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Documento" placeholder="Nº do documento (opcional)" value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Registrar lançamento'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
