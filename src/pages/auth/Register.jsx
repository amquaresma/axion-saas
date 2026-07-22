import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { AxionLogo } from '../../components/AxionLogo'

export function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); setLoading(false); return }
    const { error } = await signUp(email, password, name)
    if (error) { setError('Erro ao criar conta. Tente novamente.'); setLoading(false); return }
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <AxionLogo />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Crie sua conta grátis</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nome" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Senha" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Criando conta...' : 'Criar conta'}</Button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          Já tem conta?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Entrar</Link>
        </p>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
          Emails de confirmação são enviados pelo Supabase. Verifique sua caixa de entrada.
        </p>
      </div>
    </div>
  )
}
