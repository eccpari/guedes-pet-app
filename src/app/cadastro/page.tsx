'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { PlusCircle, Trash2, UserPlus } from 'lucide-react'

interface PetForm {
  nome: string
  especie: string
  raca: string
}

export default function CadastroPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [pets, setPets] = useState<PetForm[]>([{ nome: '', especie: 'cachorro', raca: '' }])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const addPet = () => setPets([...pets, { nome: '', especie: 'cachorro', raca: '' }])
  const removePet = (i: number) => setPets(pets.filter((_, idx) => idx !== i))
  const updatePet = (i: number, field: keyof PetForm, value: string) => {
    const updated = [...pets]
    updated[i][field] = value
    setPets(updated)
  }

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setLoading(true)

    // Criar usuário
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, telefone, role: 'cliente' }
      }
    })

    if (error || !data.user) {
      setErro(error?.message === 'User already registered'
        ? 'Este e-mail já está cadastrado.'
        : 'Erro ao criar conta. Verifique os dados e tente novamente.')
      setLoading(false)
      return
    }

    // Cadastrar pets
    const petsValidos = pets.filter(p => p.nome.trim())
    if (petsValidos.length > 0) {
      await supabase.from('pets').insert(
        petsValidos.map(p => ({
          dono_id: data.user!.id,
          nome: p.nome.trim(),
          especie: p.especie,
          raca: p.raca || null,
        }))
      )
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-10">
      {/* Header */}
      <div className="bg-gradient-to-b from-brand-600 to-brand-500 px-6 pt-12 pb-8 safe-top">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-float flex items-center justify-center mb-3 overflow-hidden">
            <img src="/icons/logo.png" alt="" className="w-14 h-14 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Criar Conta
          </h1>
          <p className="text-brand-100 text-sm mt-1">Guedes Pet App</p>
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="card">
          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="label">Seu nome completo</label>
              <input className="input" type="text" placeholder="Maria da Silva"
                value={nome} onChange={e => setNome(e.target.value)} required />
            </div>

            <div>
              <label className="label">WhatsApp</label>
              <input className="input" type="tel" placeholder="(11) 99999-9999"
                value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>

            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="seu@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>

            <div>
              <label className="label">Senha (mínimo 6 caracteres)</label>
              <input className="input" type="password" placeholder="••••••••"
                value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
            </div>

            {/* Pets */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-neutral-700">
                  Seus Pets 🐾
                </label>
                <button type="button" onClick={addPet}
                  className="flex items-center gap-1 text-brand-600 text-sm font-semibold">
                  <PlusCircle className="w-4 h-4" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {pets.map((pet, i) => (
                  <div key={i} className="bg-neutral-50 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-500 uppercase tracking-wide">
                        Pet {i + 1}
                      </span>
                      {i > 0 && (
                        <button type="button" onClick={() => removePet(i)}
                          className="ml-auto text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input className="input text-sm" type="text" placeholder="Nome do pet"
                      value={pet.nome} onChange={e => updatePet(i, 'nome', e.target.value)}
                      required />

                    <select className="input text-sm"
                      value={pet.especie} onChange={e => updatePet(i, 'especie', e.target.value)}>
                      <option value="cachorro">🐶 Cachorro</option>
                      <option value="gato">🐱 Gato</option>
                      <option value="outro">🐾 Outro</option>
                    </select>

                    <input className="input text-sm" type="text" placeholder="Raça (opcional)"
                      value={pet.raca} onChange={e => updatePet(i, 'raca', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl font-medium">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <><UserPlus className="w-5 h-5" /> Criar minha conta</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-500 mt-4">
          Já tem conta?{' '}
          <a href="/login" className="text-brand-600 font-bold">Entrar</a>
        </p>
      </div>
    </div>
  )
}
