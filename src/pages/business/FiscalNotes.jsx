import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'

const emptyForm = {
  type: 'nfse', client_id: '', number: '', series: '1',
  issue_date: new Date().toISOString().split('T')[0],
  total: '', tax_amount: '', description: '', notes: '', status: 'rascunho'
}

const typeLabels = { nfe: 'NF-e', nfse: 'NFS-e', nfce: 'NFC-e' }
const statusColors = {
  rascunho: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  emitida: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  cancelada: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

export function FiscalNotes() {
  const { businessId } = useParams()
  const [notes, setNotes] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('todos')

  async function fetchData() {
    const [{ data: notesData }, { data: clientsData }] = await Promise.all([
      supabase.from('fiscal_notes').select('*, clients(name)').eq('business_id', businessId).order('issue_date', { ascending: false }),
      supabase.from('clients').select('id, name').eq('business_id', businessId),
    ])
    setNotes(notesData || [])
    setClients(clientsData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(note) {
    setForm({
      type: note.type, client_id: note.client_id || '', number: note.number || '',
      series: note.series || '1', issue_date: note.issue_date, total: note.total,
      tax_amount: note.tax_amount || '', description: note.description || '',
      notes: note.notes || '', status: note.status
    })
    setEditingId(note.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.total) { setError('Informe o valor total.'); return }
    setSaving(true); setError('')

    const payload = {
      type: form.type, client_id: form.client_id || null,
      number: form.number, series: form.series,
      issue_date: form.issue_date, total: parseFloat(form.total) || 0,
      tax_amount: parseFloat(form.tax_amount) || 0,
      description: form.description, notes: form.notes, status: form.status,
    }

    if (editingId) { await supabase.from('fiscal_notes').update(payload).eq('id', editingId) }
    else { await supabase.from('fiscal_notes').insert({ ...payload, business_id: businessId }) }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir esta nota?')) return
    await supabase.from('fiscal_notes').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`
  const filtered = filter === 'todos' ? notes : notes.filter(n => n.type === filter)
  const totalEmitido = notes.filter(n => n.status === 'emitida').reduce((acc, n) => acc + Number(n.total), 0)
  const totalImpostos = notes.filter(n => n.status === 'emitida').reduce((acc, n) => acc + Number(n.tax_amount || 0), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notas Fiscais</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Controle de NF-e, NFS-e e NFC-e.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Nova nota</Button></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total emitido</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">{fmt(totalEmitido)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total em impostos</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1">{fmt(totalImpostos)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 dark:text-gray-400">Notas emitidas</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{notes.filter(n => n.status === 'emitida').length}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {[['todos', 'Todas'], ['nfe', 'NF-e'], ['nfse', 'NFS-e'], ['nfce', 'NFC-e']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all " + (filter === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-6">
        <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">Módulo fiscal em desenvolvimento</p>
        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">A emissão real de NF-e requer integração com SEFAZ e certificado digital A1. Este módulo permite o controle manual das notas emitidas externamente.</p>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma nota fiscal registrada.</p>
          <div className="w-40 mx-auto mt-4"><Button onClick={openNew}>Registrar nota</Button></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Número</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Cliente</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Impostos</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((note) => (
                <tr key={note.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4"><span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{typeLabels[note.type]}</span></td>
                  <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{note.number || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{note.clients?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(note.issue_date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{fmt(note.total)}</td>
                  <td className="px-6 py-4 text-red-500 dark:text-red-400">{note.tax_amount > 0 ? fmt(note.tax_amount) : '—'}</td>
                  <td className="px-6 py-4"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[note.status] || '')}>{note.status}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(note)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(note.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar nota' : 'Registrar nota fiscal'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex gap-2">
              {Object.entries(typeLabels).map(([val, label]) => (
                <button key={val} onClick={() => setForm((f) => ({ ...f, type: val }))}
                  className={"flex-1 py-2 rounded-lg text-sm font-medium border transition-all " + (form.type === val ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400')}>
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Número" placeholder="000001" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
              <Input label="Série" placeholder="1" value={form.series} onChange={(e) => setForm((f) => ({ ...f, series: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Sem cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Data de emissão" type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} />
            <Input label="Descrição do serviço/produto" placeholder="Ex: Serviço de manutenção" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Valor total (R$)" type="number" placeholder="0,00" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} />
              <Input label="Valor impostos (R$)" type="number" placeholder="0,00" value={form.tax_amount} onChange={(e) => setForm((f) => ({ ...f, tax_amount: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="rascunho">Rascunho</option>
                <option value="emitida">Emitida</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <Input label="Observações" placeholder="Opcional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Registrar nota'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
