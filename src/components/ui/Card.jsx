export function Card({ children, onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}
