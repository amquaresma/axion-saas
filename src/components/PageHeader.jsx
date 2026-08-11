import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { AxionLogo } from './AxionLogo'

export function PageHeader() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'usuário'
  const initials = userName.charAt(0).toUpperCase()

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <AxionLogo />
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>
            )}
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Voltar
          </button>
          <button onClick={() => navigate('/settings')} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{userName.split(' ')[0]}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
