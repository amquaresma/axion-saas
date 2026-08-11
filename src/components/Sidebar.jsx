import { useState } from 'react'
import { NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import { useBusiness } from '../contexts/BusinessContext'

const menuGroups = [
  {
    label: 'Geral',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
    items: [{ label: 'Dashboard', path: 'dashboard' }]
  },
  {
    label: 'Vendas',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
    items: [
      { label: 'Orçamentos', path: 'orcamentos' },
      { label: 'Pedidos', path: 'pedidos' },
    ]
  },
  {
    label: 'Operacional',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l5.653-4.655m5.908-6.258a6.375 6.375 0 0 1-8.955 8.955" />
      </svg>
    ),
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
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    items: [
      { label: 'Funcionários', path: 'funcionarios' },
      { label: 'Adiantamentos', path: 'adiantamentos' },
      { label: 'Férias', path: 'ferias' },
      { label: 'Controle de Horas', path: 'horas' },
      { label: 'Ferramentas', path: 'ferramentas' },
      { label: 'Estoque', path: 'estoque' },
      { label: 'Movimentações', path: 'movimentacoes' },
    ]
  },
  {
    label: 'Financeiro',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    items: [
      { label: 'Visão Geral', path: 'financeiro' },
      { label: 'Contas a Pagar/Receber', path: 'contas' },
      { label: 'Contas Bancárias', path: 'bancos' },
      { label: 'Transferências', path: 'transferencias' },
      { label: 'Relatórios', path: 'relatorios' },
    ]
  },
  {
    label: 'Fiscal',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    items: [
      { label: 'Notas Fiscais', path: 'notas-fiscais' },
      { label: 'Apuração de Impostos', path: 'impostos' },
    ]
  },
  {
    label: 'Contabilidade',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    items: [{ label: 'Lançamentos', path: 'contabilidade' }]
  },
  {
    label: 'Inteligência',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
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
  const location = useLocation()

  const getInitialOpen = () => {
    const open = {}
    menuGroups.forEach(group => {
      const isActive = group.items.some(item => location.pathname.includes(item.path))
      if (isActive) open[group.label] = true
    })
    return open
  }

  const [openGroups, setOpenGroups] = useState(getInitialOpen)

  function toggleGroup(label) {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <aside className="w-60 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Negócio */}
      <div
        className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => navigate('/dashboard')}
      >
        <p className="text-xs text-gray-400 dark:text-gray-500">Axion</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate mt-0.5">{business?.name || '...'}</p>
        <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5">← Trocar negócio</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {menuGroups.map((group) => {
          const isGroupActive = group.items.some(item => location.pathname.includes(`/${item.path}`))
          const isOpen = openGroups[group.label]

          return (
            <div key={group.label} className="mb-1">
              {/* Cabeçalho do grupo */}
              <button
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors rounded-none ${
                  isGroupActive
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isGroupActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>
                    {group.icon}
                  </span>
                  <span>{group.label}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} text-gray-400 dark:text-gray-600`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Itens do grupo */}
              {isOpen && (
                <div className="ml-4 border-l border-gray-200 dark:border-gray-800 pl-3 mt-1 mb-1">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={`/b/${businessId}/${item.path}`}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2 text-sm rounded-lg transition-colors mb-0.5 ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
