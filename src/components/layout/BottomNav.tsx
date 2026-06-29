'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, ShoppingBag, Tag, Award, Users, User } from 'lucide-react'
import { Profile } from '@/types'
import clsx from 'clsx'

interface BottomNavProps {
  profile: Profile | null
}

export function BottomNav({ profile }: BottomNavProps) {
  const pathname = usePathname()
  const isAdmin = profile?.role === 'admin'
  const isFuncionario = profile?.role === 'funcionario'
  const isStaff = isAdmin || isFuncionario

  const navItems = [
    { href: '/agenda',    label: 'Agenda',    icon: Calendar   },
    { href: '/produtos',  label: 'Produtos',  icon: ShoppingBag },
    { href: '/cupons',    label: 'Cupons',    icon: Tag        },
    { href: '/fidelidade',label: 'Fidelidade',icon: Award      },
    ...(isAdmin ? [{ href: '/usuarios', label: 'Usuários', icon: Users }] : []),
    { href: '/perfil',    label: 'Meu Perfil', icon: User      },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 safe-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-2 py-2 rounded-2xl transition-all duration-150',
                active
                  ? 'text-brand-600'
                  : 'text-neutral-400 hover:text-neutral-600'
              )}
            >
              <Icon className={clsx('w-6 h-6', active && 'stroke-[2.5]')} />
              <span className={clsx(
                'text-[10px] font-semibold leading-none',
                active ? 'text-brand-600' : 'text-neutral-400'
              )}>
                {label}
              </span>
              {active && (
                <span className="absolute -bottom-0 w-1 h-1 bg-brand-500 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
