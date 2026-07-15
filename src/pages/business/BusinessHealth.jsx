import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function BusinessHealth() {
  const { businessId } = useParams()
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState(0)
  const [details, setDetails] = useState([])

  useEffect(() => {
    async function fetchHealth() {
      const today = new Date().toISOString().split('T')[0]
      const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

      const [
        { data: transactions },
        { count: clientsCount },
        { data: inventory },
        { count: openOrders },
        { count: overdueAppointments },
        { count: activeEmployees },
      ] = await Promise.all([
        supabase.from('transactions').select('type, amount').eq('business_id', businessId).gte('date', firstDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
        supabase.from('inventory').select('quantity, min_quantity').eq('business_id', businessId),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('business_id', businessId).in('status', ['aberta', 'em andamento']),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('business_id', businessId).lt('date', today).eq('status', 'agendado'),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'ativo'),
      ])

      const receitas = transactions?.filter(t => t.type === 'receita').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const despesas = transactions?.filter(t => t.type === 'despesa').reduce((acc, t) => acc + Number(t.amount), 0) || 0
      const saldo = receitas - despesas
      const itensBaixoEstoque = inventory?.filter(i => i.quantity <= i.min_quantity).length || 0
      const totalItens = inventory?.length || 0

      const checks = [
        {
          label: 'Fluxo de caixa positivo',
          ok: saldo >= 0,
          strong: saldo > 0,
          message: saldo >= 0 ? `Saldo de R$ ${saldo.toFixed(2).replace('.', ',')} este mês` : `Saldo negativo: R$ ${saldo.toFixed(2).replace('.', ',')}`,
          points: 20,
        },
        {
          label: 'Clientes cadastrados',
          ok: (clientsCount || 0) > 0,
          strong: (clientsCount || 0) >= 5,
          message: `${clientsCount || 0} clientes cadastrados`,
          points: 15,
        },
        {
          label: 'Estoque controlado',
          ok: itensBaixoEstoque === 0,
          strong: totalItens > 0 && itensBaixoEstoque === 0,
          message: itensBaixoEstoque > 0 ? `${itensBaixoEstoque} item(ns) com estoque baixo` : 'Estoque dentro do limite',
          points: 15,
        },
        {
          label: 'Ordens de serviço em dia',
          ok: (openOrders || 0) <= 3,
          strong: (openOrders || 0) === 0,
          message: `${openOrders || 0} OS abertas`,
          points: 20,
        },
        {
          label: 'Agenda em dia',
          ok: (overdueAppointments || 0) === 0,
          strong: (overdueAppointments || 0) === 0,
          message: overdueAppointments > 0 ? `${overdueAppointments} agendamento(s) não concluído(s)` : 'Agenda em dia',
          points: 15,
        },
        {
          label: 'Equipe ativa',
          ok: (activeEmployees || 0) > 0,
          strong: (activeEmployees || 0) >= 2,
          message: `${activeEmployees || 0} funcionário(s) ativo(s)`,
          points: 15,
        },
      ]

      const totalScore = checks.reduce((acc, c) => acc + (c.ok ? (c.strong ? c.points : c.points * 0.6) : 0), 0)

      setScore(Math.round(totalScore))
      setDetails(checks)
      setLoading(false)
    }

    fetchHealth()
  }, [businessId])

  function getScoreConfig(score) {
    if (score >= 80) return { label: 'Excelente', color: 'text-green-600', bg: 'bg-green-100', bar: 'bg-green-500' }
    if (score >= 60) return { label: 'Bom', color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500' }
    if (score >= 40) return { label: 'Regular', color: 'text-yellow-600', bg: 'bg-yellow-100', bar: 'bg-yellow-500' }
    return { label: 'Crítico', color: 'text-red-600', bg: 'bg-red-100', bar: 'bg-red-500' }
  }

  const config = getScoreConfig(score)

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  const strong = details.filter(d => d.ok && d.strong)
  const attention = details.filter(d => d.ok && !d.strong)
  const critical = details.filter(d => !d.ok)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Saúde do Negócio</h1>
        <p className="text-gray-500 text-sm mt-1">Avaliação geral do desempenho do seu negócio.</p>
      </div>

      {/* Score */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 mb-6 flex items-center gap-8">
        <div className="text-center">
          <div className={`text-6xl font-bold ${config.color}`}>{score}</div>
          <div className={`text-sm font-medium mt-1 px-3 py-1 rounded-full ${config.bg} ${config.color}`}>{config.label}</div>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>0</span>
            <span>100</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-700 ${config.bar}`} style={{ width: `${score}%` }} />
          </div>
          <p className="text-sm text-gray-500 mt-3">Pontuação baseada em fluxo de caixa, clientes, estoque, ordens de serviço, agenda e equipe.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pontos fortes */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-green-700 mb-3">Pontos fortes</h2>
          {strong.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum ponto forte identificado.</p>
          ) : (
            strong.map((d, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pontos de atenção */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-yellow-700 mb-3">Pontos de atenção</h2>
          {attention.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum ponto de atenção.</p>
          ) : (
            attention.map((d, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-yellow-500 mt-0.5">!</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Problemas críticos */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-700 mb-3">Problemas críticos</h2>
          {critical.length === 0 ? (
            <p className="text-xs text-gray-400">Nenhum problema crítico.</p>
          ) : (
            critical.map((d, i) => (
              <div key={i} className="flex items-start gap-2 mb-2">
                <span className="text-red-500 mt-0.5">✕</span>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{d.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{d.message}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}