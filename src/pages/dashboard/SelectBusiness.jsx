import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Carousel } from '../../components/Carousel'
import { AxionLogo } from '../../components/AxionLogo'

export function SelectBusiness() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'usuário'
  const initials = userName.charAt(0).toUpperCase()

  useEffect(() => {
    async function fetchBusinesses() {
      const { data } = await supabase.from('businesses').select('*').eq('user_id', user.id)
      setBusinesses(data || [])
      setLoading(false)
    }
    fetchBusinesses()
  }, [user])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <AxionLogo />
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              {theme === 'dark' ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>
              )}
            </button>
            <button onClick={() => navigate('/notifications')} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" /></svg>
            </button>
            <button onClick={() => navigate('/settings')} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />
            <button onClick={() => navigate('/settings')} className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{userName.split(' ')[0]}</span>
            </button>
            <button onClick={signOut} className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {businesses.length === 0 ? (
          <div className="max-w-lg mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bem-vindo ao Axion, {userName.split(' ')[0]}!</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Veja como a plataforma pode ajudar o seu negócio.</p>
            </div>
            <Carousel />
            <div className="mt-6"><Button onClick={() => navigate('/dashboard/new')}>Criar meu primeiro negócio</Button></div>
          </div>
        ) : (
          <div>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Olá, {userName.split(' ')[0]}!</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Selecione um negócio para continuar.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {businesses.map((business) => (
                <div
                  key={business.id}
                  onClick={() => navigate(`/b/${business.id}/dashboard`)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-7 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{business.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{business.name}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{business.type || 'Negócio'}</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">Acessar →</p>
                </div>
              ))}
              <div
                onClick={() => navigate('/dashboard/new')}
                className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-7 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col items-center justify-center gap-3 min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-2xl text-gray-400 dark:text-gray-500">+</span>
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Novo negócio</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
