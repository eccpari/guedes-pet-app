export type Role = 'admin' | 'funcionario' | 'cliente'

export interface Profile {
  id: string
  nome: string
  telefone?: string
  role: Role
  ativo: boolean
  created_at: string
}

export interface Pet {
  id: string
  dono_id: string
  nome: string
  especie: string
  raca?: string
  peso_kg?: number
  observacoes?: string
  ativo: boolean
}

export type TipoServico = 'banho' | 'banho_e_tosa' | 'consulta' | 'vacinacao' | 'outros'
export type StatusAgendamento = 'agendado' | 'confirmado' | 'concluido' | 'cancelado' | 'bloqueado'

// Grupos de agenda — duas filas paralelas independentes
export type GrupoAgenda = 'estetica' | 'clinica'

export const GRUPO_TIPOS: Record<GrupoAgenda, TipoServico[]> = {
  estetica: ['banho', 'banho_e_tosa'],
  clinica:  ['consulta', 'vacinacao', 'outros'],
}

export interface Agendamento {
  id: string
  cliente_id: string
  pet_id: string
  tipo: TipoServico
  grupo: GrupoAgenda
  data_hora: string
  duracao_minutos: number
  status: StatusAgendamento
  observacoes?: string
  bloqueado_por?: string
  motivo_bloqueio?: string
  // joins
  cliente?: Profile
  pet?: Pet
}

export interface Produto {
  id: string
  nome: string
  descricao?: string
  preco: number
  foto_url?: string
  controla_estoque: boolean
  estoque?: number
  ativo: boolean
}

export interface ItemCarrinho {
  produto: Produto
  quantidade: number
}

export interface Reserva {
  id: string
  cliente_id: string
  status: 'pendente' | 'entregue' | 'cancelado'
  observacoes?: string
  created_at: string
  cliente?: Profile
  itens?: ReservaItem[]
}

export interface ReservaItem {
  id: string
  reserva_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
  produto?: Produto
}

export interface Cupom {
  id: string
  codigo: string
  descricao: string
  desconto_tipo: 'percentual' | 'fixo'
  desconto_valor: number
  validade: string
  limite_por_usuario: number
  ativo: boolean
  secao_arquivada: boolean
}

export interface CupomUso {
  id: string
  cupom_id: string
  cliente_id: string
  usado_em: string
}

export interface CampanhaFidelidade {
  id: string
  nome: string
  descricao?: string
  total_carimbos: number
  premio: string
  validade: string
  ativa: boolean
  secao_arquivada: boolean
}

export interface Carimbo {
  id: string
  campanha_id: string
  cliente_id: string
  quantidade: number
  premio_resgatado: boolean
  premio_resgatado_em?: string
}

export interface CodigoCarimbo {
  id: string
  campanha_id: string
  codigo: string
  usado: boolean
  expira_em: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Labels amigáveis
export const TIPO_SERVICO_LABELS: Record<TipoServico, string> = {
  banho: '🛁 Banho',
  banho_e_tosa: '✂️ Banho e Tosa',
  consulta: '🩺 Consulta',
  vacinacao: '💉 Vacinação',
  outros: '📋 Outros',
}

export const TIPO_SERVICO_CORES: Record<TipoServico, string> = {
  banho: 'bg-brand-100 text-brand-800',
  banho_e_tosa: 'bg-accent-100 text-accent-800',
  consulta: 'bg-blue-100 text-blue-800',
  vacinacao: 'bg-purple-100 text-purple-800',
  outros: 'bg-neutral-100 text-neutral-800',
}
