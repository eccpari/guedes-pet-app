'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tag, Plus, Edit2, Archive, Eye, EyeOff, Check } from 'lucide-react'
import { Cupom, Profile } from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import clsx from 'clsx'

export default function CuponsPage() {
  const supabase = createClient()
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [meuUso, setMeuUso] = useState<Record<string, number>>({})
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Partial<Cupom> | null>(null)
  const [secaoArquivada, setSecaoArquivada] = useState(false)
  const [loading, setLoading] = useState(false)

  const isAdmin = profile?.role === 'admin'

  useEffect(() => {
    const init = async () => {
      const user = authUser
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    init()
    carregarCupons()
  }, [])

  useEffect(() => { if (profile) carregarCupons() }, [profile])

  const carregarCupons = async () => {
    const user = authUser
    if (!user) return

    // Admin vê tudo, cliente vê apenas ativos e não arquivados
    const query = isAdmin
      ? supabase.from('cupons').select('*').order('created_at', { ascending: false })
      : supabase.from('cupons').select('*').eq('ativo', true).eq('secao_arquivada', false).gt('validade', new Date().toISOString())

    const { data } = await query
    setCupons(data || [])

    if (!isAdmin && data && data.length > 0) {
      setSecaoArquivada(data[0]?.secao_arquivada ?? false)
    }

    // Contar usos do usuário atual
    const { data: usos } = await supabase
      .from('cupons_uso')
      .select('cupom_id')
      .eq('cliente_id', user.id)

    const contagem: Record<string, number> = {}
    usos?.forEach(u => { contagem[u.cupom_id] = (contagem[u.cupom_id] || 0) + 1 })
    setMeuUso(contagem)
  }

  const salvarCupom = async () => {
    if (!editando?.codigo || !editando?.descricao || !editando?.desconto_valor || !editando?.validade) return
    setLoading(true)

    if (editando.id) {
      await supabase.from('cupons').update({
        codigo: editando.codigo.toUpperCase(),
        descricao: editando.descricao,
        desconto_tipo: editando.desconto_tipo || 'percentual',
        desconto_valor: editando.desconto_valor,
        validade: editando.validade,
        limite_por_usuario: editando.limite_por_usuario || 1,
        ativo: editando.ativo ?? true,
      }).eq('id', editando.id)
    } else {
      await supabase.from('cupons').insert({
        codigo: editando.codigo.toUpperCase(),
        descricao: editando.descricao,
        desconto_tipo: editando.desconto_tipo || 'percentual',
        desconto_valor: editando.desconto_valor,
        validade: editando.validade,
        limite_por_usuario: editando.limite_por_usuario || 1,
        ativo: true,
        secao_arquivada: false,
      })
    }

    setModal(false)
    setEditando(null)
    carregarCupons()
    setLoading(false)
  }

  const arquivarCupom = async (id: string) => {
    await supabase.from('cupons').update({ ativo: false }).eq('id', id)
    carregarCupons()
  }

  const toggleSecao = async () => {
    const novoEstado = !secaoArquivada
    await supabase.from('cupons').update({ secao_arquivada: novoEstado })
    setSecaoArquivada(novoEstado)
    carregarCupons()
  }

  const usarCupom = async (cupomId: string) => {
    const user = authUser
    if (!user) return
    await supabase.from('cupons_uso').insert({ cupom_id: cupomId, cliente_id: user.id })
    carregarCupons()
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      <div className="bg-brand-600 text-white px-4 pt-12 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Cupons de Desconto</h1>
            <p className="text-brand-100 text-sm mt-0.5">Economize na sua próxima visita 🏷️</p>
          </div>
          {isAdmin && (
            <button onClick={toggleSecao} className="bg-white/20 p-2 rounded-xl" title={secaoArquivada ? 'Mostrar seção' : 'Ocultar seção'}>
              {secaoArquivada ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {isAdmin && (
          <button onClick={() => { setEditando({ desconto_tipo: 'percentual', limite_por_usuario: 1, ativo: true }); setModal(true) }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Novo Cupom
          </button>
        )}

        {isAdmin && secaoArquivada && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 font-medium">
            🗃️ Seção oculta para clientes
          </div>
        )}

        {cupons.map(cupom => {
          const usado = meuUso[cupom.id] || 0
          const podeUsar = !isAdmin && usado < cupom.limite_por_usuario
          const vencido = new Date(cupom.validade) < new Date()

          return (
            <div key={cupom.id} className={clsx('card border-2', !cupom.ativo || vencido ? 'opacity-60 border-neutral-200' : 'border-brand-100')}>
              <div className="flex items-start gap-3">
                {/* Ícone */}
                <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Tag className="w-6 h-6 text-brand-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg text-sm">
                      {cupom.codigo}
                    </span>
                    {!cupom.ativo && <span className="badge bg-neutral-100 text-neutral-500">Arquivado</span>}
                    {vencido && <span className="badge bg-red-100 text-red-600">Vencido</span>}
                  </div>

                  <p className="text-sm text-neutral-700 mt-1">{cupom.descricao}</p>

                  <p className="text-base font-bold text-brand-600 mt-1">
                    {cupom.desconto_tipo === 'percentual'
                      ? `${cupom.desconto_valor}% de desconto`
                      : `R$ ${cupom.desconto_valor.toFixed(2)} de desconto`
                    }
                  </p>

                  <div className="text-xs text-neutral-400 mt-1 flex gap-3 flex-wrap">
                    <span>Válido até {format(parseISO(cupom.validade), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span>Uso: {usado}/{cupom.limite_por_usuario} por cliente</span>
                  </div>

                  {/* Progresso de uso (cliente) */}
                  {!isAdmin && cupom.limite_por_usuario > 1 && (
                    <div className="mt-2 flex gap-1">
                      {Array.from({ length: cupom.limite_por_usuario }).map((_, i) => (
                        <div key={i} className={clsx('h-1.5 flex-1 rounded-full', i < usado ? 'bg-brand-500' : 'bg-neutral-200')} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Ações admin */}
                {isAdmin && (
                  <div className="flex gap-1.5">
                    <button onClick={() => { setEditando(cupom); setModal(true) }}
                      className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                      <Edit2 className="w-3.5 h-3.5 text-neutral-600" />
                    </button>
                    <button onClick={() => arquivarCupom(cupom.id)}
                      className="w-8 h-8 bg-neutral-100 rounded-xl flex items-center justify-center">
                      <Archive className="w-3.5 h-3.5 text-neutral-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* Info de uso na loja */}
              {!isAdmin && (
                <div className="mt-3 bg-neutral-50 rounded-2xl px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-neutral-500">
                    💡 Apresente este cupom ao comprar na loja
                  </span>
                </div>
              )}
            </div>
          )
        })}

        {cupons.length === 0 && !isAdmin && (
          <div className="text-center py-12 text-neutral-400">
            <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum cupom disponível no momento</p>
          </div>
        )}
      </div>

      {/* Modal Cupom */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4">{editando?.id ? 'Editar' : 'Novo'} Cupom</h2>
            <div className="space-y-3">
              <div><label className="label">Código do cupom</label>
                <input className="input uppercase" value={editando?.codigo || ''} placeholder="DESCONTO10"
                  onChange={e => setEditando({ ...editando, codigo: e.target.value.toUpperCase() })} /></div>
              <div><label className="label">Descrição</label>
                <input className="input" value={editando?.descricao || ''} placeholder="10% de desconto em banho"
                  onChange={e => setEditando({ ...editando, descricao: e.target.value })} /></div>
              <div><label className="label">Tipo de desconto</label>
                <select className="input" value={editando?.desconto_tipo || 'percentual'}
                  onChange={e => setEditando({ ...editando, desconto_tipo: e.target.value as any })}>
                  <option value="percentual">Percentual (%)</option>
                  <option value="fixo">Valor fixo (R$)</option>
                </select></div>
              <div><label className="label">Valor do desconto</label>
                <input className="input" type="number" step="0.01" value={editando?.desconto_valor || ''}
                  onChange={e => setEditando({ ...editando, desconto_valor: parseFloat(e.target.value) })} /></div>
              <div><label className="label">Validade</label>
                <input className="input" type="date" value={editando?.validade?.substring(0, 10) || ''}
                  onChange={e => setEditando({ ...editando, validade: new Date(e.target.value).toISOString() })} /></div>
              <div><label className="label">Usos permitidos por cliente</label>
                <input className="input" type="number" min="1" value={editando?.limite_por_usuario || 1}
                  onChange={e => setEditando({ ...editando, limite_por_usuario: parseInt(e.target.value) })} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvarCupom} disabled={loading} className="btn-primary flex-1">{loading ? '...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav profile={profile} />
    </div>
  )
}
