export function AxionLogo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/assets/logo.jpg" alt="Axion" className="w-9 h-9 rounded-lg object-cover" />
      <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Axion</span>
    </div>
  )
}
