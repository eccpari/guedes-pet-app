'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EsqueciSenhaPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setEnviado(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-500 flex flex-col px-6 pt-16">
      <Link href="/login" className="text-white/80 flex items-center gap-1 mb-8">
        <ArrowLeft className="w-5 h-5" /> Voltar
      </Link>

      <div className="bg-white rounded-4xl p-6 shadow-float">
        <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <Mail className="w-7 h-7 text-brand-500" />
        </div>

        <h1 className="text-xl font-bold text-neutral-900 mb-1">Esqueci a senha</h1>
        <p className="text-neutral-500 text-sm mb-5">
          Digite seu e-mail e vamos enviar um link para redefinir sua senha.
        </p>

        {enviado ? (
          <div className="bg-brand-50 text-brand-700 rounded-2xl px-4 py-4 text-sm font-medium">
            ✅ E-mail enviado! Verifique sua caixa de entrada.
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-4">
            <div>
              <label className="label">Seu e-mail</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
