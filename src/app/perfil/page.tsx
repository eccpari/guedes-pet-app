'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2, LogOut, Save, Edit2 } from 'lucide-react'
import { Pet, Profile } from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import clsx from 'clsx'

export default function PerfilPage() {
  const supabase = createClient()
  const router = useRouter()
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [modalPet, setModalPet] = useState(false)
  const [novoPet, setNovoPet] = useState({ nome: '', especie: 'cachorro', raca: '' })
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    const init = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      setNome(p?.nome || '')
      setTelefone(p?.telefone || '')
      const { data: meusPets } = await supabase.from('pets').select('*').eq('dono_id', user.id).eq('ativo', true)
      setPets(meusPets || [])
    }
    init()
  }, [user])

  const salvarPerfil = async () => {
    if (!profile) return
    setLoading(true)
    await supabase.from('profiles').update({ nome, telefone }).eq('id', profile.id)
    setProfile({ ...profile, nome, telefone })
    setEditando(false)
    setSucesso('Perfil atualizado!')
    setTimeout(() => setSucesso(''), 2000)
    setLoading(false)
  }

  const adicionarPet = async () => {
    if (!user || !novoPet.nome) return
    setLoading(true)
    const { data } = await supabase.from('pets').insert({
      dono_id: user.id,
      nome: novoPet.nome,
      especie: novoPet.especie,
      raca: novoPet.raca || null,
    }).select().single()
    if (data) setPets([...pets, data])
    setModalPet(false)
    setNovoPet({ nome: '', especie: 'cachorro', raca: '' })
    setLoading(false)
  }

  const removerPet = async (id: string) => {
    await supabase.from('pets').update({ ativo: false }).eq('id', id)
    setPets(pets.filter(p => p.id !== id))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <span className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full block" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="bg-gradient-to-b from-brand-600 to-brand-500 px-4 pt-12 pb-6 safe-top flex gap-4 items-center">
        <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center">
          <span className="text-3xl font-bold text-white">{profile.nome?.charAt(0)?.toUpperCase()}</span>
        </div>
        <div>
          <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{profile.nome}</p>
          <p className="text-brand-100 text-sm">
            {profile.role === 'admin' ? '👑 Administradora' : profile.role === 'funcionario' ? '🛠️ Funcionário' : '🐾 Cliente'}
          </p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-neutral-800">Meus Dados</h2>
            <button onClick={() => setEditando(!editando)} className="text-brand-600 font-semibold text-sm flex items-center gap-1">
              <Edit2 className="w-4 h-4" /> {editando ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          {editando ? (
            <div className="space-y-3">
              <div><label className="label">Nome completo</label>
                <input className="input" value={nome} onChange={e => setNome(e.target.value)} /></div>
              <div><label className="label">WhatsApp</label>
                <input className="input" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
              <button onClick={salvarPerfil} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-neutral-50">
                <span className="text-sm text-neutral-500">Nome</span>
                <span className="text-sm font-semibold">{profile.nome}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-neutral-500">WhatsApp</span>
                <span className="text-sm font-semibold">{profile.telefone || '—'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-neutral-800">Meus Pets 🐾</h2>
            <button onClick={() => setModalPet(true)} className="text-brand-600 font-semibold text-sm flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> Adicionar
            </button>
          </div>
          <div className="space-y-2">
            {pets.map(pet => (
              <div key={pet.id} className="flex items-center gap-3 bg-neutral-50 rounded-2xl px-3 py-2.5">
                <span className="text-2xl">{pet.especie === 'gato' ? '🐱' : '🐶'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{pet.nome}</p>
                  {pet.raca && <p className="text-xs text-neutral-400">{pet.raca}</p>}
                </div>
                <button onClick={() => removerPet(pet.id)} className="text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {pets.length === 0 && <p className="text-neutral-400 text-sm text-center py-3">Nenhum pet cadastrado</p>}
          </div>
        </div>

        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-200 text-red-500 font-semibold bg-white">
          <LogOut className="w-5 h-5" /> Sair da conta
        </button>
      </div>

      {modalPet && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4">Novo Pet</h2>
            <div className="space-y-3">
              <div><label className="label">Nome</label>
                <input className="input" value={novoPet.nome} placeholder="Bolinha" onChange={e => setNovoPet({ ...novoPet, nome: e.target.value })} /></div>
              <div><label className="label">Espécie</label>
                <select className="input" value={novoPet.especie} onChange={e => setNovoPet({ ...novoPet, especie: e.target.value })}>
                  <option value="cachorro">🐶 Cachorro</option>
                  <option value="gato">🐱 Gato</option>
                  <option value="outro">🐾 Outro</option>
                </select></div>
              <div><label className="label">Raça (opcional)</label>
                <input className="input" value={novoPet.raca} onChange={e => setNovoPet({ ...novoPet, raca: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalPet(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={adicionarPet} disabled={loading || !novoPet.nome} className="btn-primary flex-1">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {sucesso && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-brand-500 text-white px-5 py-4 rounded-3xl shadow-float text-center font-semibold animate-fade-in-up">
          {sucesso}
        </div>
      )}

      <BottomNav profile={profile} />
    </div>
  )
}
