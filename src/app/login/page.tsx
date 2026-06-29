'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState('')

  // Se já está logado, vai para home
  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      setSubmitting(false)
    }
    // Não precisa de router.push — o onAuthStateChange no AuthProvider
    // vai detectar o login e o useEffect acima vai redirecionar
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-500 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-28 h-28 bg-white rounded-3xl shadow-float flex items-center justify-center mb-6 overflow-hidden">
          <img src="/icons/logo.png" alt="Guedes Pet" className="w-24 h-24 object-contain"
            onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-display)' }}>
          Guedes Pet
        </h1>
        <p className="text-brand-100 text-sm text-center mb-8">Pet Shop & Clínica — Cuidando com amor 🐾</p>

        <div className="w-full max-w-sm bg-white rounded-4xl shadow-float p-6">
          <h2 className="text-xl font-bold text-neutral-800 mb-5">Entrar na sua conta</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input type={mostrarSenha ? 'text' : 'password'} className="input pr-12"
                  placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)}
                  required autoComplete="current-password" />
                <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {erro && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl font-medium">{erro}</div>}
            <button type="submit" disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2">
              {submitting
                ? <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                : <><LogIn className="w-5 h-5" /> Entrar</>}
            </button>
          </form>
          <Link href="/esqueci-senha" className="block text-center text-sm text-brand-600 font-semibold mt-4">
            Esqueci minha senha
          </Link>
        </div>
        <p className="text-brand-100 text-sm mt-6">
          Ainda não tem conta?{' '}
          <Link href="/cadastro" className="text-white font-bold underline">Cadastre-se</Link>
        </p>
      </div>
    </div>
  )
}
