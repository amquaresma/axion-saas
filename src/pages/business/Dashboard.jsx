import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '../../contexts/BusinessContext'

export function BusinessDashboard() {
  const { businessId } = useParams()
  const { business, loading: loadingBusiness } = useBusiness()
  const [stats, setStats] = useState({ clients: 0, services: 0, revenue: 0, expenses: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const now = new Date()
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const [
        { count: clients },
        { count: services },
        { data: transactions }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('services').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'em andamento'),
        supabase.from('transactions').select('type, amount').eq('business_id', businessId).gte('date', firstDay).lte('date', lastDay),
      ])

      const revenue = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const expenses = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0

      setStats({ clients: clients || 0, services: services || 0, revenue, expenses })
      setLoading(false)
    }
    fetchStats()
  }, [businessId])

  if (loadingBusiness || loading) {
    return <p className="text-gray-400 text-sm">Carregando...</p>
  }

  const fmt = (val) => `R$ ${Number(val).toFixed(2).replace('.', ',')}`

  const cards = [
    { label: 'Clientes', value: stats.clients },
    { label: 'Serviços em andamento', value: stats.services },
    { label: 'Receita do mês', value: fmt(stats.revenue) },
    { label: 'Despesas do mês', value: fmt(stats.expenses) },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}