import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createBill } from '../../services/financeService'

const emptyForm = { employee_id: '', type: 'adiantamento', amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'pendente' }

const typeLabels = {
  adiantamento: 'Adiantamento',
  reembolso: 'Reembolso',
  vale_transporte: 'Vale Transporte',
  vale_alimentacao: 'Vale Alimentação',
}

const statusColors = {
  pendente: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  pago: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  descontado: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

export function EmployeeAdvances() {
  const { businessId } = useParams()
  const [advances, setAdvances] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  async function fetchData() {
    const [{ data: advData }, { data: empData }] = await Promise.all([
      supabase.from('employee_advances').select('*, employees(name)').eq('business_id', businessId).order('date', { ascending: false }),
      supabase.from('employees').select('id, name').eq('business_id', businessId),
    ])
    setAdvances(advData || [])
    setEmployees(empData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [businessId])

  function openNew() { setForm(emptyForm); setEditingId(null); setError(''); setShowModal(true) }
  function openEdit(adv) {
    setForm({ employee_id: adv.employee_id, type: adv.type, amount: adv.amount, description: adv.description || '', date: adv.date, status: adv.status })
    setEditingId(adv.id); setError(''); setShowModal(true)
  }

  async function handleSave() {
    if (!form.employee_id) { setError('Selecione um funcionário.'); return }
    if (!form.amount) { setError('Informe o valor.'); return }
    setSaving(true); setError('')

    const payload = {
      employee_id: form.employee_id,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      status: form.status,
    }

    if (editingId) {
      await supabase.from('employee_advances').update(payload).eq('id', editingId)
    } else {
      await supabase.from('employee_advances').insert({ ...payload, business_id: businessId })

      // Gera conta a pagar automaticamente
      const employee = employees.find(e => e.id === form.employee_id)
      await createBill({
        businessId,
        description: `${typeLabels[form.type]}: ${employee?.name}`,
        amount: parseFloat(form.amount),
        type: 'pagar',
        dueDate: form.date,
        category: 'Funcionários',
        origin: 'rh',
      })
    }

    setSaving(false); setShowModal(false); fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('Deseja excluir?')) return
    await supabase.from('employee_advances').delete().eq('id', id); fetchData()
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`
  const totalPendente = advances.filter(a => a.status === 'pendente').reduce((acc, a) => acc + Number(a.amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Adiantamentos e Benefícios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Adiantamentos, reembolsos e vales dos funcionários.</p>
        </div>
        <div className="w-40"><Button onClick={openNew}>Novo lançamento</Button></div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(typeLabels).map(([type, label]) => {
          const total = advances.filter(a => a.type === type).reduce((acc, a) => acc + Number(a.amount), 0)
          return (
            <div key={type} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{fmt(total)}</p>
            </div>
          )
        })}
      </div>

      {loading ? <p className="text-gray-400 text-sm">Carregando...</p> : advances.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum lançamento registrado.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Funcionário</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Tipo</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Descrição</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Valor</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Data</th>
                <th className="text-left px-6 py-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {advances.map((adv) => (
                <tr key={adv.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{adv.employees?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{typeLabels[adv.type]}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{adv.description || '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{fmt(adv.amount)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{new Date(adv.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4"><span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (statusColors[adv.status] || '')}>{adv.status}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => openEdit(adv)} className="text-blue-600 dark:text-blue-400 text-xs font-medium">Editar</button>
                      <button onClick={() => handleDelete(adv.id)} className="text-red-500 dark:text-red-400 text-xs font-medium">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editingId ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Funcionário</label>
              <select value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="">Selecione...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                {Object.entries(typeLabels).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
            <Input label="Valor (R$)" type="number" placeholder="0,00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input label="Descrição" placeholder="Opcional" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            <Input label="Data" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="descontado">Descontado em folha</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
