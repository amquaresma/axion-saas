import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useBusiness } from '../contexts/BusinessContext'

const menuGroups = [
  {
    label: 'Geral',
    items: [
      { label: 'Dashboard', path: 'dashboard' },
    ]
  },
  {
    label: 'Operacional',
    items: [
      { label: 'Clientes', path: 'clientes' },
      { label: 'Serviços', path: 'servicos' },
      { label: 'Ordens de Serviço', path: 'ordens-servico' },
      { label: 'Equipamentos', path: 'equipamentos' },
      { label: 'Agenda', path: 'agenda' },
    ]
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Funcionários', path: 'funcionarios' },
      { label: 'Ferramentas', path: 'ferramentas' },
      { label: 'Estoque', path: 'estoque' },
    ]
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Financeiro', path: 'financeiro' },
      { label: 'Relatórios', path: 'relatorios' },
    ]
  },
  {
    label: 'Inteligência',
    items: [
      { label: 'Central de Controle', path: 'controle' },
      { label: 'Saúde do Negócio', path: 'saude' },
      { label: 'Assistente IA', path: 'ia' },
    ]
  },
]

export function Sidebar() {
  const { businessId } = useParams()
  const { business } = useBusiness()
  const navigate = useNavigate()

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Negócio atual */}
      <div
        className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => navigate('/dashboard')}
      >
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Axion</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
          {business?.name || '...'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">← Trocar negócio</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {menuGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="px-5 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={`/b/${businessId}/${item.path}`}
                className={({ isActive }) =>
                  `flex items-center px-5 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border-r-2 border-blue-600 dark:border-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
