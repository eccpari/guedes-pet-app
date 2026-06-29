'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, addDays, startOfDay, parseISO, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, Lock, Clock, Scissors, Stethoscope, ArrowRight } from 'lucide-react'
import {
  Agendamento, Pet, Profile, TipoServico,
  GrupoAgenda, GRUPO_TIPOS,
  TIPO_SERVICO_LABELS, TIPO_SERVICO_CORES,
} from '@/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { useAuth } from '@/components/AuthProvider'
import clsx from 'clsx'

const HORARIOS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
]

export default function AgendaPage() {
  const supabase = createClient()
  const { user: authUser } = useAuth()
  const [profile, setProfile]               = useState<Profile | null>(null)
  const [pets, setPets]                     = useState<Pet[]>([])
  const [agendamentos, setAgendamentos]     = useState<Agendamento[]>([])
  const [grupo, setGrupo]                   = useState<GrupoAgenda | null>(null)
  const [dataSelecionada, setDataSelecionada] = useState(new Date())
  const [horarioSelecionado, setHorarioSelecionado] = useState<string | null>(null)
  const [modal, setModal]                   = useState(false)
  const [petSelecionado, setPetSelecionado] = useState<string>('')
  const [comTosa, setComTosa]               = useState(false)
  const [motivoClinica, setMotivoClinica]   = useState<TipoServico>('consulta')
  const [observacoes, setObservacoes]       = useState('')
  const [loading, setLoading]               = useState(false)
  const [sucesso, setSucesso]               = useState('')
  const [modalBloquear, setModalBloquear]   = useState(false)
  const [motivoBloqueio, setMotivoBloqueio] = useState('')
  const [grupoBloquear, setGrupoBloquear]   = useState<GrupoAgenda>('estetica')

  const isAdmin      = profile?.role === 'admin'
  const isFuncionario = profile?.role === 'funcionario'
  const isStaff      = isAdmin || isFuncionario

  // Agendamentos filtrados pelo grupo selecionado
  const agendamentosGrupo = agendamentos.filter(a => {
    if (!grupo) return false
    return GRUPO_TIPOS[grupo].includes(a.tipo) || a.status === 'bloqueado'
  })

  useEffect(() => {
    const init = async () => {
      const user = authUser
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: meusPets } = await supabase.from('pets').select('*').eq('dono_id', user.id).eq('ativo', true)
      setPets(meusPets || [])
      if (meusPets && meusPets.length > 0) setPetSelecionado(meusPets[0].id)
    }
    init()
  }, [])

  useEffect(() => {
    if (grupo) carregarAgendamentos()
  }, [dataSelecionada, grupo])

  const carregarAgendamentos = async () => {
    const inicio = startOfDay(dataSelecionada).toISOString()
    const fim    = new Date(startOfDay(dataSelecionada).getTime() + 86400000).toISOString()
    const select = isStaff ? '*, cliente:profiles(*), pet:pets(*)' : 'id, data_hora, status, tipo'
    const { data } = await supabase
      .from('agendamentos')
      .select(select)
      .gte('data_hora', inicio)
      .lt('data_hora', fim)
      .not('status', 'eq', 'cancelado')
    setAgendamentos((data as any) || [])
  }

  const getStatusHorario = (hora: string) => {
    const prefixo = `${format(dataSelecionada, 'yyyy-MM-dd')}T${hora}`
    // Bloqueios valem para ambas as agendas
    const bloqueio = agendamentos.find(
      a => a.data_hora.startsWith(prefixo) && a.status === 'bloqueado'
    )
    if (bloqueio) return 'bloqueado'
    // Ocupado somente dentro do grupo
    const ag = agendamentosGrupo.find(
      a => a.data_hora.startsWith(prefixo) && a.status !== 'bloqueado'
    )
    if (!ag) return 'livre'
    if (isStaff) return ag
    return 'ocupado'
  }

  const confirmarAgendamento = async () => {
    if (!petSelecionado || !horarioSelecionado || !profile || !grupo) return
    setLoading(true)
    const tipo: TipoServico = grupo === 'estetica'
      ? (comTosa ? 'banho_e_tosa' : 'banho')
      : motivoClinica
    const dataHora = `${format(dataSelecionada, 'yyyy-MM-dd')}T${horarioSelecionado}:00`
    const { error } = await supabase.from('agendamentos').insert({
      cliente_id: profile.id,
      pet_id:     petSelecionado,
      tipo,
      grupo,
      data_hora:  dataHora,
      observacoes: observacoes || null,
      status: 'agendado',
    })
    if (!error) {
      await fetch('/api/notificacoes/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: '📅 Novo Agendamento!',
          corpo: `${profile.nome} agendou ${TIPO_SERVICO_LABELS[tipo]} para ${format(dataSelecionada, 'dd/MM', { locale: ptBR })} às ${horarioSelecionado}`,
          url: '/agenda',
          paraAdmin: true,
        }),
      })
      setSucesso(`✅ ${TIPO_SERVICO_LABELS[tipo]} agendado para ${format(dataSelecionada, "d 'de' MMMM", { locale: ptBR })} às ${horarioSelecionado}!`)
      setModal(false)
      setObservacoes('')
      carregarAgendamentos()
      setTimeout(() => setSucesso(''), 4000)
    }
    setLoading(false)
  }

  const bloquearHorario = async () => {
    if (!horarioSelecionado || !profile) return
    setLoading(true)
    // Bloqueia nas duas agendas ao mesmo tempo com dois inserts
    const dataHora = `${format(dataSelecionada, 'yyyy-MM-dd')}T${horarioSelecionado}:00`
    const base = {
      cliente_id: profile.id,
      pet_id: pets[0]?.id || profile.id,
      tipo: 'outros' as TipoServico,
      data_hora: dataHora,
      status: 'bloqueado' as const,
      bloqueado_por: profile.id,
      motivo_bloqueio: motivoBloqueio || 'Bloqueado pelo admin',
    }
    // Bloqueia nas duas agendas simultaneamente
    await Promise.all([
      supabase.from('agendamentos').insert({ ...base, grupo: 'estetica' }),
      supabase.from('agendamentos').insert({ ...base, grupo: 'clinica', tipo: 'consulta' as TipoServico }),
    ])
    setModalBloquear(false)
    setMotivoBloqueio('')
    carregarAgendamentos()
    setLoading(false)
  }

  const proximosDias = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i))
    .filter(d => d.getDay() !== 0) // sem domingo

  // ── TELA 1: Escolha do grupo ──────────────────────────────────────────────
  if (!grupo) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col pb-24">
        {/* Header */}
        <div className="bg-gradient-to-b from-brand-700 to-brand-600 px-5 pt-12 pb-6 safe-top">
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Agendamento
          </h1>
          <p className="text-brand-100 text-sm mt-1">O que você precisa hoje?</p>
        </div>

        <div className="flex flex-col gap-4 px-4 pt-5 flex-1">
          {/* Card Banho & Tosa */}
          <button
            onClick={() => setGrupo('estetica')}
            className="relative overflow-hidden rounded-3xl p-5 text-left shadow-card-hover active:scale-95 transition-all duration-150 min-h-[160px] flex flex-col justify-end"
            style={{ background: 'linear-gradient(145deg, #1e5c4a 0%, #2c6e5c 40%, #3a8a74 100%)' }}
          >
            {/* Decoração */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
            <div className="absolute top-8 right-10 w-20 h-20 bg-white/5 rounded-full" />
            {/* Ícone grande de fundo */}
            <span className="absolute top-4 right-5 text-6xl opacity-25">🛁</span>

            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit mb-2">
              ✨ Estética Pet
            </span>
            <h2 className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Banho & Tosa
            </h2>
            <p className="text-white/70 text-sm mt-1 leading-snug">
              Banho, secagem, tosa e cuidados estéticos
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-white/80 text-sm font-semibold">Ver horários disponíveis</span>
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>

          {/* Card Consulta & Vacinas */}
          <button
            onClick={() => setGrupo('clinica')}
            className="relative overflow-hidden rounded-3xl p-5 text-left shadow-card-hover active:scale-95 transition-all duration-150 min-h-[160px] flex flex-col justify-end"
            style={{ background: 'linear-gradient(145deg, #1a3a7c 0%, #1d4ed8 50%, #3b82f6 100%)' }}
          >
            <div className="absolute top-0 right-0 w-36 h-36 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
            <div className="absolute top-8 right-10 w-20 h-20 bg-white/5 rounded-full" />
            <span className="absolute top-4 right-5 text-6xl opacity-25">🩺</span>

            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full w-fit mb-2">
              🏥 Clínica Veterinária
            </span>
            <h2 className="text-white font-bold text-2xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Consulta & Vacinas
            </h2>
            <p className="text-white/70 text-sm mt-1 leading-snug">
              Consultas veterinárias, vacinação e outros atendimentos
            </p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-white/80 text-sm font-semibold">Ver horários disponíveis</span>
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </div>
          </button>

          {/* Info */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
            <span className="text-xl">💡</span>
            <p className="text-xs text-neutral-500 leading-relaxed">
              <strong className="text-neutral-700">Banho e atendimento clínico podem acontecer ao mesmo tempo</strong> — cada um tem sua própria agenda de horários.
            </p>
          </div>
        </div>

        <BottomNav profile={profile} />
      </div>
    )
  }

  // ── TELA 2: Calendário do grupo ──────────────────────────────────────────
  const isEstetica = grupo === 'estetica'
  const headerGradient = isEstetica
    ? 'from-brand-700 to-brand-500'
    : 'from-blue-800 to-blue-500'
  const corLivre = isEstetica
    ? 'bg-brand-50 border-brand-200 hover:bg-brand-100 hover:border-brand-400'
    : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-400'
  const corTextoLivre = isEstetica ? 'text-brand-700' : 'text-blue-700'
  const corSubLivre   = isEstetica ? 'text-brand-500' : 'text-blue-500'

  return (
    <div className="min-h-screen bg-neutral-50 pb-24">
      {/* Header com identidade do grupo */}
      <div className={clsx('bg-gradient-to-b px-4 pt-12 pb-4 safe-top text-white', headerGradient)}>
        {/* Botão voltar */}
        <button
          onClick={() => { setGrupo(null); setAgendamentos([]) }}
          className="flex items-center gap-1 text-white/70 text-sm font-semibold mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
          {isEstetica ? 'Banho & Tosa' : 'Consulta & Vacinas'}
        </h1>
        <span className="inline-flex items-center gap-1 bg-white/20 text-white/90 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-1">
          {isEstetica ? '🛁 Agenda de Estética' : '🩺 Agenda Clínica'}
        </span>
      </div>

      {/* Seletor de data */}
      <div className="overflow-x-auto scrollbar-hide bg-white border-b border-neutral-100 px-3 py-2.5 flex gap-2">
        {proximosDias.map(dia => {
          const ativo = isSameDay(dia, dataSelecionada)
          return (
            <button
              key={dia.toISOString()}
              onClick={() => setDataSelecionada(dia)}
              className={clsx(
                'flex flex-col items-center min-w-[50px] py-2 px-2 rounded-2xl transition-all',
                ativo
                  ? isEstetica ? 'bg-brand-500 text-white shadow-card' : 'bg-blue-600 text-white shadow-card'
                  : 'bg-neutral-50 text-neutral-700'
              )}
            >
              <span className="text-[10px] font-semibold uppercase">
                {format(dia, 'EEE', { locale: ptBR }).substring(0, 3)}
              </span>
              <span className="text-lg font-bold leading-tight">{format(dia, 'd')}</span>
              <span className="text-[10px]">{format(dia, 'MMM', { locale: ptBR })}</span>
            </button>
          )
        })}
      </div>

      {/* Grade de horários */}
      <div className="px-4 py-4">
        <p className="text-sm font-semibold text-neutral-500 mb-3">
          {format(dataSelecionada, "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>

        {/* Manhã */}
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Manhã</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {HORARIOS.filter(h => parseInt(h) < 12).map(hora => <SlotHorario key={hora} hora={hora} />)}
        </div>

        {/* Tarde */}
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tarde</p>
        <div className="grid grid-cols-2 gap-2">
          {HORARIOS.filter(h => parseInt(h) >= 13).map(hora => <SlotHorario key={hora} hora={hora} />)}
        </div>

        {/* Bloquear (admin) */}
        {isAdmin && (
          <button
            onClick={() => { setHorarioSelecionado(null); setModalBloquear(true) }}
            className="mt-4 btn-secondary w-full flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> Bloquear horário
          </button>
        )}

        {/* Legenda */}
        <div className="mt-4 flex gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className={clsx('w-4 h-4 rounded border-2', isEstetica ? 'bg-brand-50 border-brand-300' : 'bg-blue-50 border-blue-300')} />
            <span className="text-xs text-neutral-500">Disponível</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 bg-neutral-100 border-neutral-200" />
            <span className="text-xs text-neutral-500">Ocupado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded border-2 bg-neutral-100 border-neutral-200" />
            <span className="text-xs text-neutral-500">Bloqueado</span>
          </div>
          {/* Cores por tipo (só staff) */}
          {isStaff && GRUPO_TIPOS[grupo].map(tipo => (
            <div key={tipo} className="flex items-center gap-1.5">
              <span className={clsx('badge text-[9px] px-1.5 py-0', TIPO_SERVICO_CORES[tipo])}>
                {TIPO_SERVICO_LABELS[tipo]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal confirmar agendamento */}
      {modal && horarioSelecionado && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-1">Confirmar Agendamento</h2>
            <p className="text-neutral-500 text-sm mb-5">
              {isEstetica ? '🛁' : '🩺'}{' '}
              {format(dataSelecionada, "d 'de' MMMM", { locale: ptBR })} às {horarioSelecionado}
            </p>

            <div className="space-y-4">
              {/* Pet */}
              <div>
                <label className="label">Seu pet</label>
                <div className="flex gap-2 flex-wrap">
                  {pets.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPetSelecionado(p.id)}
                      className={clsx(
                        'px-4 py-2 rounded-2xl text-sm font-semibold transition-all',
                        petSelecionado === p.id
                          ? isEstetica ? 'bg-brand-500 text-white' : 'bg-blue-600 text-white'
                          : 'bg-neutral-100 text-neutral-700'
                      )}
                    >
                      {p.especie === 'gato' ? '🐱' : '🐶'} {p.nome}
                    </button>
                  ))}
                </div>
              </div>

              {/* Banho com ou sem tosa */}
              {isEstetica && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                  <p className="text-sm font-bold text-amber-800 mb-2">✂️ Inclui tosa?</p>
                  <div className="flex gap-2">
                    {[
                      { value: false, label: '🛁 Só banho' },
                      { value: true,  label: '✂️ Banho e tosa' },
                    ].map(({ value, label }) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() => setComTosa(value)}
                        className={clsx(
                          'flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                          comTosa === value
                            ? 'bg-accent-400 text-white border-accent-400'
                            : 'bg-white text-amber-700 border-amber-200'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo da visita (clínica) */}
              {!isEstetica && (
                <div>
                  <label className="label">Motivo da visita</label>
                  <div className="flex gap-2 flex-wrap">
                    {([
                      { tipo: 'consulta',  label: '🩺 Consulta'  },
                      { tipo: 'vacinacao', label: '💉 Vacinação' },
                      { tipo: 'outros',    label: '📋 Outros'    },
                    ] as { tipo: TipoServico; label: string }[]).map(({ tipo, label }) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setMotivoClinica(tipo)}
                        className={clsx(
                          'px-4 py-2 rounded-2xl text-sm font-semibold transition-all',
                          motivoClinica === tipo
                            ? 'bg-blue-600 text-white'
                            : 'bg-neutral-100 text-neutral-700'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {motivoClinica === 'outros' && (
                    <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2 mt-2">
                      💡 Para "Outros", nossa equipe entrará em contato para entender o que seu pet precisa.
                    </p>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="label">Observações (opcional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Algo que devemos saber sobre o seu pet?"
                  value={observacoes}
                  onChange={e => setObservacoes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={confirmarAgendamento}
                disabled={loading}
                className={clsx('flex-1 py-3 rounded-2xl font-semibold text-white transition-all', loading ? 'opacity-50' : '', isEstetica ? 'bg-brand-500' : 'bg-blue-600')}
              >
                {loading ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal bloquear (admin) */}
      {modalBloquear && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white w-full rounded-t-4xl p-6 animate-fade-in-up">
            <h2 className="text-lg font-bold mb-1">Bloquear Horário</h2>
            <p className="text-neutral-500 text-sm mb-4">O horário será bloqueado em ambas as agendas.</p>
            <div className="space-y-3">
              <div>
                <label className="label">Horário</label>
                <div className="grid grid-cols-4 gap-2">
                  {HORARIOS.filter(h => getStatusHorario(h) === 'livre').map(h => (
                    <button
                      key={h}
                      onClick={() => setHorarioSelecionado(h)}
                      className={clsx(
                        'py-2 rounded-xl text-sm font-semibold',
                        horarioSelecionado === h ? 'bg-brand-500 text-white' : 'bg-neutral-100'
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Motivo (opcional)</label>
                <input
                  className="input"
                  placeholder="Ex: Reunião, folga..."
                  value={motivoBloqueio}
                  onChange={e => setMotivoBloqueio(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalBloquear(false)} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={bloquearHorario}
                disabled={!horarioSelecionado || loading}
                className="btn-primary flex-1"
              >
                {loading ? '...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {sucesso && (
        <div className={clsx(
          'fixed top-20 left-4 right-4 z-50 px-5 py-4 rounded-3xl shadow-float text-center font-semibold animate-fade-in-up text-white',
          isEstetica ? 'bg-brand-500' : 'bg-blue-600'
        )}>
          {sucesso}
        </div>
      )}

      <BottomNav profile={profile} />
    </div>
  )

  // ── Componente inline do slot ────────────────────────────────────────────
  function SlotHorario({ hora }: { hora: string }) {
    const status     = getStatusHorario(hora)
    const agendamento = typeof status === 'object' ? status as Agendamento : null
    const bloqueado  = status === 'bloqueado'
    const ocupado    = status === 'ocupado' || bloqueado || agendamento !== null

    return (
      <button
        disabled={ocupado && !isStaff}
        onClick={() => { if (!ocupado) { setHorarioSelecionado(hora); setComTosa(false); setModal(true) } }}
        className={clsx(
          'relative flex flex-col items-start px-4 py-3 rounded-2xl border-2 transition-all duration-150',
          !ocupado
            ? clsx(corLivre, 'active:scale-95')
            : 'bg-neutral-100 border-neutral-200 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-1.5">
          <Clock className={clsx('w-4 h-4', !ocupado ? corTextoLivre : 'text-neutral-400')} />
          <span className={clsx('font-bold text-sm', !ocupado ? corTextoLivre : 'text-neutral-500')}>
            {hora}
          </span>
        </div>

        {!ocupado && <span className={clsx('text-xs mt-0.5', corSubLivre)}>Disponível</span>}

        {bloqueado && (
          <div className="flex items-center gap-1 mt-0.5">
            <Lock className="w-3 h-3 text-neutral-400" />
            <span className="text-xs text-neutral-400">Bloqueado</span>
          </div>
        )}

        {/* Visão admin: nome + pet + tipo */}
        {agendamento && !bloqueado && isStaff && (
          <div className="mt-1 w-full">
            <span className={clsx('badge text-[10px]', TIPO_SERVICO_CORES[agendamento.tipo])}>
              {TIPO_SERVICO_LABELS[agendamento.tipo]}
            </span>
            <p className="text-xs font-semibold text-neutral-800 mt-0.5 truncate">
              {(agendamento as any).cliente?.nome || 'Cliente'}
            </p>
            <p className="text-xs text-neutral-400 truncate">
              {(agendamento as any).pet?.nome || ''}
            </p>
          </div>
        )}

        {agendamento && !bloqueado && !isStaff && (
          <span className="text-xs text-neutral-400 mt-0.5">Ocupado</span>
        )}
      </button>
    )
  }
}
