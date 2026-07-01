import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useBusiness } from '../contexts/BusinessContext'

const menuItems = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Clientes', path: 'clientes' },
  { label: 'Serviços', path: 'servicos' },
  { label: 'Financeiro', path: 'financeiro' },
  { label: 'Estoque', path: 'estoque' },
  { label: 'Funcionários', path: 'funcionarios' },
  { label: 'Ordens de Serviço', path: 'ordens-servico' },
  { label: 'Equipamentos', path: 'equipamentos' },
  { label: 'Ferramentas', path: 'ferramentas' },
  { label: 'Agenda', path: 'agenda' },
  { label: 'Central de Controle', path: 'controle' },
]

export function Sidebar() {
  const { businessId } = useParams()
  const { business } = useBusiness()
  const navigate = useNavigate()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div
        className="px-4 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => navigate('/dashboard')}
      >
        <p className="text-xs text-gray-400 mb-0.5">Axion</p>
        <p className="text-sm font-semibold text-gray-900 truncate">
          {business?.name || '...'}
        </p>
      </div>

      <nav className="flex-1 py-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={`/b/${businessId}/${item.path}`}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 font-medium border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}