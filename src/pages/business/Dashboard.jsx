import { useBusiness } from '../../contexts/BusinessContext'

export function BusinessDashboard() {
  const { business, loading } = useBusiness()

  if (loading) {
    return <p className="text-gray-400 text-sm">Carregando...</p>
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{business?.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do negócio</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Clientes', value: '0' },
          { label: 'Serviços ativos', value: '0' },
          { label: 'Receita do mês', value: 'R$ 0,00' },
          { label: 'Despesas do mês', value: 'R$ 0,00' },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}