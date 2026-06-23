export function Card({ children, onClick, className = '' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-xl p-6 transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''}
        ${className}`}
    >
      {children}
    </div>
  )
}
