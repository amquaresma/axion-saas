import { supabase } from '../lib/supabase'

export async function createBill({
  businessId, description, amount, type, dueDate,
  category, clientId, origin, originId, notes,
}) {
  const { data, error } = await supabase.from('bills').insert({
    business_id: businessId,
    description, amount, type,
    due_date: dueDate,
    category: category || null,
    client_id: clientId || null,
    origin: origin || 'manual',
    origin_id: originId || null,
    notes: notes || null,
    status: 'pendente',
  }).select().single()
  return { data, error }
}

export async function payBill({ billId, bankAccountId, paidAt }) {
  const today = paidAt || new Date().toISOString().split('T')[0]
  const { data: bill } = await supabase.from('bills').select('*').eq('id', billId).single()
  if (!bill) return { error: 'Conta não encontrada' }

  await supabase.from('bills').update({ status: 'pago', paid_at: today, bank_account_id: bankAccountId }).eq('id', billId)

  if (bankAccountId) {
    const { data: account } = await supabase.from('bank_accounts').select('balance').eq('id', bankAccountId).single()
    if (account) {
      const newBalance = bill.type === 'receber'
        ? Number(account.balance) + Number(bill.amount)
        : Number(account.balance) - Number(bill.amount)
      await supabase.from('bank_accounts').update({ balance: newBalance }).eq('id', bankAccountId)
    }
  }

  await supabase.from('transactions').insert({
    business_id: bill.business_id,
    description: bill.description,
    amount: bill.amount,
    type: bill.type === 'receber' ? 'receita' : 'despesa',
    category: bill.category,
    date: today,
  })

  return { success: true }
}

export async function onWorkOrderCompleted({ businessId, clientId, description, amount }) {
  return createBill({
    businessId, description: `OS: ${description}`, amount,
    type: 'receber', dueDate: new Date().toISOString().split('T')[0],
    category: 'Serviço', clientId, origin: 'os',
  })
}

export async function onServiceCompleted({ businessId, clientId, description, amount }) {
  return createBill({
    businessId, description: `Serviço: ${description}`, amount,
    type: 'receber', dueDate: new Date().toISOString().split('T')[0],
    category: 'Serviço', clientId, origin: 'servico',
  })
}

export async function onSalaryGenerated({ businessId, employeeName, amount, dueDate }) {
  return createBill({
    businessId, description: `Salário: ${employeeName}`, amount,
    type: 'pagar', dueDate, category: 'Salário', origin: 'salario',
  })
}

export async function updateOverdueBills(businessId) {
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('bills')
    .update({ status: 'vencido' })
    .eq('business_id', businessId)
    .eq('status', 'pendente')
    .lt('due_date', today)
}
