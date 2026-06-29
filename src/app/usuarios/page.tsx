'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, UserCheck, UserX, Mail, Shield, UserCog, Search } from 'lucide-react'
import { Profile, Role } from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import clsx from 'clsx'

const ROLE_LABELS: Record<Role, string> = {
  admin: '👑 Admin',
  funcionario: '🛠️ Funcionário',
  cliente: '🐾 Cliente',
}

const ROLE_CORES: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  funcionario: 'bg-blue-100 text-blue-700',
  cliente: 'bg-brand-50 text-brand-700',
}

export default function UsuariosPage() {
  const supabase = createClient()
  const { user: authUser } = useAuth()
  const [adminProfile, setAdminProfile] = useState<Profile | null>(null)
  const [usuarios, setUsuarios] = useState<Profile[]>([])
  const [busca, setBusca] = useState('')
  const [filtroRole, setFiltroRole] = useState<Role | 'todos'>('todos')
  const [modalRole, setModalRole] = useState<Profile | null>(null)
  const [novoRole, setNovoRole] = useState<Role>('cliente')
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const init = async () => {
      const user = authUser
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setAdminProfile(p)
    }
    init()
    carregarUsuarios()
  }, [])

  const carregarUsuarios = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('nome')
    setUsuarios(data || [])
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusca = u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.telefone?.includes(busca)
    const matchRole = filtroRole === 'todos' || u.role === filtroRole
    return matchBusca && matchRole
  })

  const alterarRole = async () => {
    if (!modalRole) return
    setLoading(true)
    await supabase.from('profiles').update({ role: novoRole }).eq('id', modalRole.id)
    setModalRole(null)
    setMensagem(`Perfil de ${modalRole.nome} alterado para ${ROLE_LABELS[novoRole]}`)
    setTimeout(() => setMensagem(''), 3000)
    carregarUsuarios()
    setLoading(false)
  }

  const desativarUsuario = async (usuario: Profile) => {
    if (!confirm(`Desativar ${usuario.nome}?`)) return
    await supabase.from('profiles').update({ ativo: !usuario.ativo }).eq('id', usuario.id)
    carregarUsuarios()
  }

  const enviarResetSenha = async (email: string) => {
    setLoading(true)
    // Precisamos do email - buscar via admin API
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha`,
    })
    if (!error) {
      setMensagem(`E-mail de redefinição enviado para ${email}`)
      setTimeout(() => setMensagem(''), 4000)
    }
    setLoading(false)
  }

  const contagens = {
    todos: usuarios.length,
    admin: usuarios.filter(u => u.role === 'admin').length,
    funcionario: usuarios.filter(u => u.role === 'funcionario').length,
    cliente: usuarios.filter(u => u.role === 'cliente').length,
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-12 pb-4 safe-top">
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Usuários</h1>
        <p className="text-brand-100 text-sm mt-0.5">{usuarios.length} cadastrados</p>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            className="input pl-11"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>

        {/* Filtros de role */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: 'todos', label: `Todos (${contagens.todos})` },
            { value: 'cliente', label: `Clientes (${contagens.cliente})` },
            { value: 'funcionario', label: `Funcionários (${contagens.funcionario})` },
            { value: 'admin', label: `Admin (${contagens.admin})` },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFiltroRole(value as any)}
              className={clsx(
                'px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                filtroRole === value
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-neutral-600 border border-neutral-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {usuariosFiltrados.map(usuario => (
            <div key={usuario.id} className={clsx('card', !usuario.ativo && 'opacity-60')}>
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 bg-brand-100 rounded-2xl flex items-center justify-center shrink-0">
                  <span className="text-brand-700 font-bold text-lg">
                    {usuario.nome.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-neutral-900 truncate">{usuario.nome}</span>
                    <span className={clsx('badge text-[10px]', ROLE_CORES[usuario.role])}>
                      {ROLE_LABELS[usuario.role]}
                    </span>
                    {!usuario.ativo && (
                      <span className="badge bg-red-100 text-red-600 text-[10px]">Inativo</span>
                    )}
                  </div>
                  {usuario.telefone && (
                    <p className="text-xs text-neutral-500 mt-0.5">{usuario.telefone}</p>
                  )}
                  <p className="text-xs text-neutral-400">
                    Desde {format(new Date(usuario.created_at), "MMM yyyy", { locale: ptBR })}
                  </p>
                </div>

                {/* Ações */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setModalRole(usuario); setNovoRole(usuario.role) }}
                    className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center"
                    title="Alterar perfil"
                  >
                    <UserCog className="w-4 h-4 text-neutral-600" />
                  </button>
                  <button
                    onClick={() => desativarUsuario(usuario)}
                    className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center"
                    title={usuario.ativo ? 'Desativar' : 'Ativar'}
                  >
                    {usuario.ativo
                      ? <UserX className="w-4 h-4 text-red-400" />
                      : <UserCheck className="w-4 h-4 text-brand-500" />
                    }
                  </button>
                </div>
              </div>
            </div>
          ))}

          {usuariosFiltrados.length === 0 && (
            <div className="text-center py-12 text-neutral-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal alterar role */}
      {modalRole && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-1">Alterar Perfil</h2>
            <p className="text-neutral-500 text-sm mb-4">{modalRole.nome}</p>

            <div className="space-y-2 mb-5">
              {(['cliente', 'funcionario', 'admin'] as Role[]).map(role => (
                <button
                  key={role}
                  onClick={() => setNovoRole(role)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all',
                    novoRole === role ? 'bg-brand-50 border-2 border-brand-400' : 'bg-neutral-50 border-2 border-transparent'
                  )}
                >
                  <Shield className={clsx('w-5 h-5', novoRole === role ? 'text-brand-600' : 'text-neutral-400')} />
                  <div className="text-left">
                    <p className="font-semibold text-sm">{ROLE_LABELS[role]}</p>
                    <p className="text-xs text-neutral-500">
                      {role === 'admin' && 'Acesso completo ao app'}
                      {role === 'funcionario' && 'Vê agenda com nomes, gerencia produtos, cupons e fidelidade'}
                      {role === 'cliente' && 'Acesso padrão de cliente'}
                    </p>
                  </div>
                  {novoRole === role && (
                    <div className="ml-auto w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setModalRole(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={alterarRole} disabled={loading} className="btn-primary flex-1">
                {loading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {mensagem && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-brand-500 text-white px-5 py-4 rounded-3xl shadow-float text-center font-semibold animate-fade-in-up">
          {mensagem}
        </div>
      )}

      <BottomNav profile={adminProfile} />
    </div>
  )
}
