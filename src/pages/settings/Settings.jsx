import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '' })
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (user) {
      setForm({ name: user.user_metadata?.name || '', email: user.email || '' })
    }
  }, [user])

  async function handleSaveProfile() {
    setSaving(true)
    setMessage('')
    setError('')
    const { error } = await supabase.auth.updateUser({ data: { name: form.name } })
    if (error) { setError('Erro ao salvar perfil.') } else { setMessage('Perfil atualizado com sucesso!') }
    setSaving(false)
  }

  async function handleSavePassword() {
    setPasswordMessage('')
    setPasswordError('')
    if (passwordForm.password.length < 6) { setPasswordError('A senha deve ter pelo menos 6 caracteres.'); return }
    if (passwordForm.password !== passwordForm.confirm) { setPasswordError('As senhas não coincidem.'); return }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password })
    if (error) { setPasswordError('Erro ao atualizar senha.') } else { setPasswordMessage('Senha atualizada com sucesso!'); setPasswordForm({ password: '', confirm: '' }) }
    setSavingPassword(false)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold text-gray-900">Axion</span>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Voltar</button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie seu perfil e preferências.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Informações do perfil</h2>
          <div className="flex flex-col gap-4">
            <Input label="Nome" placeholder="Seu nome" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Email" type="email" value={form.email} disabled className="bg-gray-50 cursor-not-allowed" />
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSaveProfile} disabled={saving}>{saving ? 'Salvando...' : 'Salvar perfil'}</Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Alterar senha</h2>
          <div className="flex flex-col gap-4">
            <Input label="Nova senha" type="password" placeholder="••••••••" value={passwordForm.password} onChange={(e) => setPasswordForm((f) => ({ ...f, password: e.target.value }))} />
            <Input label="Confirmar nova senha" type="password" placeholder="••••••••" value={passwordForm.confirm} onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))} />
            {passwordMessage && <p className="text-sm text-green-600">{passwordMessage}</p>}
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <Button onClick={handleSavePassword} disabled={savingPassword}>{savingPassword ? 'Atualizando...' : 'Atualizar senha'}</Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">Conta</h2>
          <p className="text-sm text-gray-500 mb-4">Encerrar sessão no Axion.</p>
          <Button variant="outline" onClick={handleSignOut}>Sair da conta</Button>
        </div>
      </main>
    </div>
  )
}
