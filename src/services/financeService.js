
// Atualiza contas vencidas automaticamente
export async function updateOverdueBills(businessId) {
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('bills')
    .update({ status: 'vencido' })
    .eq('business_id', businessId)
    .eq('status', 'pendente')
    .lt('due_date', today)
}
