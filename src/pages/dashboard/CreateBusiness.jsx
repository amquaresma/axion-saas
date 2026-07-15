import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

const businessTypes = [
  'Assistência Técnica', 'Loja / Comércio', 'Prestador de Serviços',
  'Agência', 'Barbearia / Salão', 'Oficina Mecânica', 'Outro',
]

export function CreateBusiness() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Informe o nome do negócio.'); return }
    if (!type) { setError('Selecione o tipo do negócio.'); return }
    setError('')
    setLoading(true)
    const { error } = await supabase.from('businesses').insert({ user_id: user.id, name: name.trim(), type })
    if (error) { setError('Erro ao criar negócio. Tente novamente.'); setLoading(false); return }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Axion</span>
          <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">Cancelar</button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo negócio</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Preencha as informações para começar.</p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col gap-5">
          <Input label="Nome do negócio" placeholder="Ex: Assistência do João" value={name} onChange={(e) => setName(e.target.value)} />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de negócio</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-400 dark:focus:border-blue-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Selecione...</option>
              {businessTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Criando...' : 'Criar negócio'}</Button>
        </div>
      </main>
    </div>
  )
}
