'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Award, Stamp, RefreshCw, Eye, EyeOff, Plus, Edit2, Check } from 'lucide-react'
import { CampanhaFidelidade, Carimbo, Profile } from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import clsx from 'clsx'

export default function FidelidadePage() {
  const supabase = createClient()
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [campanha, setCampanha] = useState<CampanhaFidelidade | null>(null)
  const [meuCarimbo, setMeuCarimbo] = useState<Carimbo | null>(null)
  const [codigoInput, setCodigoInput] = useState('')
  const [codigoGerado, setCodigoGerado] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Partial<CampanhaFidelidade> | null>(null)
  const [secaoArquivada, setSecaoArquivada] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' } | null>(null)
  const [premioConcluido, setPremioConcluido] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const isFuncionario = profile?.role === 'funcionario'
  const isStaff = isAdmin || isFuncionario

  useEffect(() => {
    const init = async () => {
      const user = authUser
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    init()
  }, [])

  useEffect(() => { if (profile) carregarDados() }, [profile])

  const carregarDados = async () => {
    const user = authUser
    if (!user) return

    // Campanha ativa
    const query = isStaff
      ? supabase.from('campanhas_fidelidade').select('*').eq('ativa', true).order('created_at', { ascending: false }).limit(1).single()
      : supabase.from('campanhas_fidelidade').select('*').eq('ativa', true).eq('secao_arquivada', false).gt('validade', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).single()

    const { data: c } = await query
    setCampanha(c)
    if (c) setSecaoArquivada(c.secao_arquivada)

    // Carimbos do cliente
    if (c && !isStaff) {
      const { data: carimbo } = await supabase
        .from('carimbos')
        .select('*')
        .eq('campanha_id', c.id)
        .eq('cliente_id', user.id)
        .single()
      setMeuCarimbo(carimbo)
    }
  }

  const gerarCodigo = async () => {
    if (!campanha) return
    setLoading(true)

    // Código aleatório de 6 caracteres alfanumérico
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const codigo = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    const { error } = await supabase.from('codigos_carimbo').insert({
      campanha_id: campanha.id,
      codigo,
      expira_em: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    })

    if (!error) setCodigoGerado(codigo)
    setLoading(false)

    // Apaga o código da tela após 10 min
    setTimeout(() => setCodigoGerado(''), 10 * 60 * 1000)
  }

  const usarCodigo = async () => {
    if (!codigoInput || !campanha) return
    setLoading(true)

    const user = authUser
    if (!user) { setLoading(false); return }

    // Validar código
    const { data: codigoData } = await supabase
      .from('codigos_carimbo')
      .select('*')
      .eq('codigo', codigoInput.toUpperCase())
      .eq('campanha_id', campanha.id)
      .eq('usado', false)
      .gt('expira_em', new Date().toISOString())
      .single()

    if (!codigoData) {
      setMensagem({ texto: 'Código inválido ou expirado. Peça um novo para a loja.', tipo: 'erro' })
      setLoading(false)
      return
    }

    // Verificar se o cliente ja usou esse código
    const { data: jaUsou } = await supabase
      .from('codigos_carimbo')
      .select('id')
      .eq('id', codigoData.id)
      .eq('usado_por', user.id)
      .single()

    if (jaUsou) {
      setMensagem({ texto: 'Você já usou este código.', tipo: 'erro' })
      setLoading(false)
      return
    }

    // Marcar código como usado
    await supabase.from('codigos_carimbo').update({
      usado: true,
      usado_por: user.id,
      usado_em: new Date().toISOString(),
    }).eq('id', codigoData.id)

    // Adicionar carimbo
    const { data: existing } = await supabase
      .from('carimbos')
      .select('*')
      .eq('campanha_id', campanha.id)
      .eq('cliente_id', user.id)
      .single()

    const novaQtd = (existing?.quantidade || 0) + 1

    if (existing) {
      await supabase.from('carimbos').update({ quantidade: novaQtd }).eq('id', existing.id)
    } else {
      await supabase.from('carimbos').insert({
        campanha_id: campanha.id,
        cliente_id: user.id,
        quantidade: 1,
      })
    }

    // Verificar se ganhou prêmio
    if (novaQtd >= campanha.total_carimbos) {
      setPremioConcluido(true)
    } else {
      setMensagem({ texto: `🎉 Carimbo adicionado! Você tem ${novaQtd}/${campanha.total_carimbos}`, tipo: 'sucesso' })
    }

    setCodigoInput('')
    carregarDados()
    setLoading(false)
  }

  const salvarCampanha = async () => {
    if (!editando?.nome || !editando?.total_carimbos || !editando?.premio || !editando?.validade) return
    setLoading(true)

    if (editando.id) {
      await supabase.from('campanhas_fidelidade').update({
        nome: editando.nome,
        descricao: editando.descricao,
        total_carimbos: editando.total_carimbos,
        premio: editando.premio,
        validade: editando.validade,
        ativa: editando.ativa ?? true,
      }).eq('id', editando.id)
    } else {
      // Arquivar campanha anterior
      await supabase.from('campanhas_fidelidade').update({ ativa: false }).eq('ativa', true)
      await supabase.from('campanhas_fidelidade').insert({
        nome: editando.nome,
        descricao: editando.descricao,
        total_carimbos: editando.total_carimbos,
        premio: editando.premio,
        validade: editando.validade,
        ativa: true,
        secao_arquivada: false,
      })
    }

    setModal(false)
    setEditando(null)
    carregarDados()
    setLoading(false)
  }

  const toggleSecao = async () => {
    if (!campanha) return
    const novo = !secaoArquivada
    await supabase.from('campanhas_fidelidade').update({ secao_arquivada: novo }).eq('id', campanha.id)
    setSecaoArquivada(novo)
  }

  const carimbosFeitos = meuCarimbo?.quantidade || 0
  const totalCarimbos = campanha?.total_carimbos || 8

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-amber-500 to-amber-600 text-white px-4 pt-12 pb-6 safe-top">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Fidelidade</h1>
            <p className="text-amber-100 text-sm">Colete carimbos e ganhe prêmios 🏆</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <button onClick={toggleSecao} className="bg-white/20 p-2 rounded-xl" title="Ocultar/mostrar">
                {secaoArquivada ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            )}
            {isStaff && (
              <button onClick={() => { setEditando(campanha || { total_carimbos: 8, ativa: true }); setModal(true) }}
                className="bg-white/20 p-2 rounded-xl">
                {campanha ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {!campanha && (
          <div className="text-center py-12 text-neutral-400">
            <Award className="w-16 h-16 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Nenhuma campanha ativa</p>
            {isStaff && <p className="text-sm mt-1">Crie uma nova campanha para os clientes</p>}
          </div>
        )}

        {campanha && (
          <>
            {/* Card da campanha */}
            <div className="card border-2 border-amber-100">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                  <Award className="w-7 h-7 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-neutral-900">{campanha.nome}</h2>
                  {campanha.descricao && <p className="text-sm text-neutral-500 mt-0.5">{campanha.descricao}</p>}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="badge bg-amber-100 text-amber-700">🎁 {campanha.premio}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    Válida até {format(parseISO(campanha.validade), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>

            {/* Cartela de carimbos (cliente) */}
            {!isStaff && (
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-neutral-800">Seus Carimbos</h3>
                  <span className="text-sm font-bold text-amber-600">{carimbosFeitos}/{totalCarimbos}</span>
                </div>

                {/* Grid de carimbos */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {Array.from({ length: totalCarimbos }).map((_, i) => (
                    <div key={i} className={clsx(
                      'aspect-square rounded-2xl flex items-center justify-center text-xl transition-all',
                      i < carimbosFeitos
                        ? 'bg-amber-100 shadow-inner'
                        : 'bg-neutral-100'
                    )}>
                      {i < carimbosFeitos ? '🐾' : ''}
                    </div>
                  ))}
                </div>

                {/* Barra de progresso */}
                <div className="bg-neutral-100 rounded-full h-2 mb-3">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (carimbosFeitos / totalCarimbos) * 100)}%` }}
                  />
                </div>

                <p className="text-sm text-neutral-500 text-center">
                  {carimbosFeitos >= totalCarimbos
                    ? '🎉 Parabéns! Você completou a cartela!'
                    : `Faltam ${totalCarimbos - carimbosFeitos} carimbo(s) para ganhar: ${campanha.premio}`}
                </p>

                {/* Input código */}
                {carimbosFeitos < totalCarimbos && (
                  <div className="mt-4 flex gap-2">
                    <input
                      className="input flex-1 text-center font-mono uppercase tracking-widest text-lg"
                      placeholder="CÓDIGO"
                      maxLength={6}
                      value={codigoInput}
                      onChange={e => setCodigoInput(e.target.value.toUpperCase())}
                    />
                    <button onClick={usarCodigo} disabled={loading || codigoInput.length !== 6}
                      className="btn-accent px-5">
                      {loading ? '...' : <Check className="w-5 h-5" />}
                    </button>
                  </div>
                )}
                <p className="text-xs text-neutral-400 text-center mt-2">
                  Peça o código para a Guedes Pet após cada compra
                </p>
              </div>
            )}

            {/* Gerar código (staff) */}
            {isStaff && (
              <div className="card border-2 border-dashed border-amber-200">
                <h3 className="font-bold text-neutral-800 mb-3">Gerar Código de Carimbo</h3>
                <p className="text-sm text-neutral-500 mb-3">
                  Gere um código único para o cliente inserir e receber o carimbo. O código expira em 10 minutos.
                </p>

                {codigoGerado ? (
                  <div className="text-center">
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl px-6 py-5 mb-3">
                      <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider mb-1">Código válido por 10 min</p>
                      <p className="font-mono text-4xl font-bold text-amber-700 tracking-widest">{codigoGerado}</p>
                    </div>
                    <button onClick={gerarCodigo} disabled={loading}
                      className="btn-secondary flex items-center gap-2 mx-auto">
                      <RefreshCw className="w-4 h-4" /> Novo código
                    </button>
                  </div>
                ) : (
                  <button onClick={gerarCodigo} disabled={loading} className="btn-accent w-full flex items-center justify-center gap-2">
                    {loading ? '...' : <><Stamp className="w-5 h-5" /> Gerar Código</>}
                  </button>
                )}
              </div>
            )}

            {isAdmin && secaoArquivada && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm text-amber-700 font-medium">
                🗃️ Seção de fidelidade oculta para clientes
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal campanha */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <h2 className="text-lg font-bold mb-4">{editando?.id ? 'Editar' : 'Nova'} Campanha</h2>
            <div className="space-y-3">
              <div><label className="label">Nome da campanha</label>
                <input className="input" value={editando?.nome || ''} placeholder="Ex: Cartela de Verão"
                  onChange={e => setEditando({ ...editando, nome: e.target.value })} /></div>
              <div><label className="label">Descrição (opcional)</label>
                <textarea className="input resize-none" rows={2} value={editando?.descricao || ''}
                  onChange={e => setEditando({ ...editando, descricao: e.target.value })} /></div>
              <div><label className="label">Quantidade de carimbos para ganhar</label>
                <input className="input" type="number" min="1" value={editando?.total_carimbos || 8}
                  onChange={e => setEditando({ ...editando, total_carimbos: parseInt(e.target.value) })} /></div>
              <div><label className="label">Prêmio</label>
                <input className="input" value={editando?.premio || ''} placeholder="Ex: 1 banho grátis"
                  onChange={e => setEditando({ ...editando, premio: e.target.value })} /></div>
              <div><label className="label">Validade da campanha</label>
                <input className="input" type="date" value={editando?.validade?.substring(0, 10) || ''}
                  onChange={e => setEditando({ ...editando, validade: new Date(e.target.value).toISOString() })} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={salvarCampanha} disabled={loading} className="btn-accent flex-1">{loading ? '...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {mensagem && (
        <div className={clsx(
          'fixed top-20 left-4 right-4 z-50 px-5 py-4 rounded-3xl shadow-float text-center font-semibold animate-fade-in-up text-white',
          mensagem.tipo === 'sucesso' ? 'bg-brand-500' : 'bg-red-500'
        )}>
          {mensagem.texto}
        </div>
      )}

      {/* Modal prêmio */}
      {premioConcluido && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
          <div className="bg-white rounded-4xl p-8 text-center max-w-sm w-full animate-fade-in-up">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Parabéns!
            </h2>
            <p className="text-neutral-600 mb-2">Você completou a campanha!</p>
            <p className="font-bold text-amber-600 text-lg mb-4">Prêmio: {campanha?.premio}</p>
            <p className="text-sm text-neutral-400 mb-6">
              Conclua seu prêmio apresentando este app na loja. Aguarde nossa próxima promoção! 🐾
            </p>
            <button onClick={() => setPremioConcluido(false)} className="btn-accent w-full">
              Entendido, obrigado!
            </button>
          </div>
        </div>
      )}

      <BottomNav profile={profile} />
    </div>
  )
}
