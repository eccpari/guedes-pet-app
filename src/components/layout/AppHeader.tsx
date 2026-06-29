'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronLeft } from 'lucide-react'
import { Profile } from '@/types'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Início',
  '/agenda': 'Agenda',
  '/produtos': 'Produtos',
  '/cupons': 'Cupons de Desconto',
  '/fidelidade': 'Programa de Fidelidade',
  '/usuarios': 'Usuários',
  '/perfil': 'Meu Perfil',
}

interface AppHeaderProps {
  profile: Profile | null
  notificacoes?: number
}

export function AppHeader({ profile, notificacoes = 0 }: AppHeaderProps) {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] || 'Guedes Pet'
  const isHome = pathname === '/'
  const isAdmin = profile?.role === 'admin'

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-100 safe-top">
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Botão voltar (quando não é a home) */}
        {!isHome && (
          <Link href="/" className="text-neutral-500 hover:text-neutral-800 -ml-1">
            <ChevronLeft className="w-6 h-6" />
          </Link>
        )}

        {/* Título */}
        <h1 className="flex-1 text-lg font-bold text-neutral-900 truncate">
          {isHome ? (
            <span style={{ fontFamily: 'var(--font-display)' }}>Guedes Pet</span>
          ) : title}
        </h1>

        {/* Notificações (só admin/funcionário) */}
        {isAdmin && (
          <Link href="/admin/notificacoes" className="relative p-1.5">
            <Bell className="w-6 h-6 text-neutral-500" />
            {notificacoes > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-accent-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {notificacoes > 9 ? '9+' : notificacoes}
              </span>
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
