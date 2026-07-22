export function AxionLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/assets/logo.jpg" alt="Axion" className="w-7 h-7 rounded-md object-cover" />
      <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Axion</span>
    </div>
  )
}
