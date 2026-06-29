'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, ShoppingBag, Tag, Award, MessageCircle, Users } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { InstallBanner } from '@/components/ui/InstallBanner'
import { useAuth } from '@/components/AuthProvider'

export default function HomePage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const whatsappUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511999999999'}`

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading])

  // Enquanto carrega ou redireciona, mostra tela verde simples
  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-600 to-brand-500 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-float flex items-center justify-center overflow-hidden">
            <img src="/icons/logo.png" alt="" className="w-14 h-14 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          <p className="text-white/70 text-sm font-semibold">Carregando...</p>
        </div>
      </div>
    )
  }

  const isAdmin = profile.role === 'admin'
  const menuItems = [
    { href: '/agenda',     label: 'Agendamento', icon: Calendar,    desc: 'Marque banho, consulta e mais',     color: 'from-brand-500 to-brand-600',     show: true,    full: true  },
    { href: '/produtos',   label: 'Produtos',    icon: ShoppingBag, desc: 'Reserve produtos da loja',          color: 'from-accent-400 to-accent-500',   show: true,    full: false },
    { href: '/cupons',     label: 'Cupons',      icon: Tag,         desc: 'Economize na sua visita',           color: 'from-purple-500 to-purple-600',   show: true,    full: false },
    { href: '/fidelidade', label: 'Fidelidade',  icon: Award,       desc: 'Carimbos e prêmios',                color: 'from-amber-500 to-amber-600',     show: true,    full: false },
    { href: '/usuarios',   label: 'Usuários',    icon: Users,       desc: 'Gerenciar clientes',                color: 'from-neutral-600 to-neutral-700', show: isAdmin, full: true  },
  ].filter(i => i.show)

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="bg-gradient-to-b from-brand-600 to-brand-500 px-6 pt-12 pb-10 safe-top">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-float flex items-center justify-center mb-4 overflow-hidden">
            <img src="/icons/logo.png" alt="Guedes Pet" className="w-20 h-20 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>Guedes Pet</h1>
          <p className="text-brand-100 text-sm mt-1">Olá, {profile.nome?.split(' ')[0]} 👋</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {menuItems.map(({ href, label, icon: Icon, desc, color, full }) => (
            <Link key={href} href={href}
              className={`relative overflow-hidden rounded-3xl p-4 text-white bg-gradient-to-br ${color} shadow-card active:scale-95 transition-all duration-150 ${full ? 'col-span-2' : ''}`}>
              <Icon className="w-7 h-7 mb-2 opacity-90" />
              <p className="font-bold text-base leading-tight">{label}</p>
              <p className="text-xs opacity-80 mt-0.5">{desc}</p>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full" />
            </Link>
          ))}
        </div>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center gap-3 bg-[#25D366] text-white rounded-3xl px-5 py-4 shadow-card active:scale-95 transition-all duration-150">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-base">Fale Conosco</p>
            <p className="text-xs opacity-80">Atendimento via WhatsApp</p>
          </div>
        </a>
      </div>
      <InstallBanner />
      <BottomNav profile={profile} />
    </div>
  )
}
