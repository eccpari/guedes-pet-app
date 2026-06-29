-- ============================================================
-- GUEDES PET APP - Schema Supabase
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- EXTENSÕES
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELA: profiles (estende auth.users do Supabase)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text not null,
  telefone text,
  role text not null default 'cliente' check (role in ('admin','funcionario','cliente')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: pets
-- ============================================================
create table public.pets (
  id uuid primary key default uuid_generate_v4(),
  dono_id uuid references public.profiles(id) on delete cascade not null,
  nome text not null,
  especie text not null default 'cachorro',
  raca text,
  peso_kg numeric(5,2),
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: push_subscriptions (notificações push)
-- ============================================================
create table public.push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

-- ============================================================
-- TABELA: agendamentos
-- ============================================================
create table public.agendamentos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.profiles(id) on delete cascade not null,
  pet_id uuid references public.pets(id) on delete cascade not null,
  tipo text not null check (tipo in ('banho','banho_e_tosa','consulta','vacinacao','outros')),
  grupo text not null default 'estetica' check (grupo in ('estetica','clinica')),
  data_hora timestamptz not null,
  duracao_minutos int not null default 30,
  status text not null default 'agendado' check (status in ('agendado','confirmado','concluido','cancelado','bloqueado')),
  observacoes text,
  bloqueado_por uuid references public.profiles(id),
  motivo_bloqueio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cada grupo tem sua própria fila independente de horários
-- Estetica e clinica podem ter agendamentos no mesmo horário
create unique index idx_agendamentos_data_hora_grupo
  on public.agendamentos(data_hora, grupo)
  where status not in ('cancelado');

-- ============================================================
-- TABELA: produtos
-- ============================================================
create table public.produtos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  preco numeric(10,2) not null,
  foto_url text,
  controla_estoque boolean not null default false,
  estoque int default null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: reservas (carrinho/reserva de produtos)
-- ============================================================
create table public.reservas (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pendente' check (status in ('pendente','entregue','cancelado')),
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: reserva_itens
-- ============================================================
create table public.reserva_itens (
  id uuid primary key default uuid_generate_v4(),
  reserva_id uuid references public.reservas(id) on delete cascade not null,
  produto_id uuid references public.produtos(id) not null,
  quantidade int not null default 1,
  preco_unitario numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: cupons
-- ============================================================
create table public.cupons (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  descricao text not null,
  desconto_tipo text not null check (desconto_tipo in ('percentual','fixo')),
  desconto_valor numeric(10,2) not null,
  validade timestamptz not null,
  limite_por_usuario int not null default 1,
  ativo boolean not null default true,
  secao_arquivada boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: cupons_uso (controle de uso por cliente)
-- ============================================================
create table public.cupons_uso (
  id uuid primary key default uuid_generate_v4(),
  cupom_id uuid references public.cupons(id) on delete cascade not null,
  cliente_id uuid references public.profiles(id) on delete cascade not null,
  usado_em timestamptz not null default now(),
  unique(cupom_id, cliente_id)
);

-- ============================================================
-- TABELA: campanhas_fidelidade
-- ============================================================
create table public.campanhas_fidelidade (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  descricao text,
  total_carimbos int not null,
  premio text not null,
  validade timestamptz not null,
  ativa boolean not null default true,
  secao_arquivada boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- TABELA: carimbos (participação do cliente na campanha)
-- ============================================================
create table public.carimbos (
  id uuid primary key default uuid_generate_v4(),
  campanha_id uuid references public.campanhas_fidelidade(id) on delete cascade not null,
  cliente_id uuid references public.profiles(id) on delete cascade not null,
  quantidade int not null default 0,
  premio_resgatado boolean not null default false,
  premio_resgatado_em timestamptz,
  updated_at timestamptz not null default now(),
  unique(campanha_id, cliente_id)
);

-- ============================================================
-- TABELA: codigos_carimbo (códigos aleatórios para dar carimbos)
-- ============================================================
create table public.codigos_carimbo (
  id uuid primary key default uuid_generate_v4(),
  campanha_id uuid references public.campanhas_fidelidade(id) on delete cascade not null,
  codigo text not null unique,
  usado boolean not null default false,
  usado_por uuid references public.profiles(id),
  usado_em timestamptz,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null default (now() + interval '10 minutes')
);

-- ============================================================
-- RLS (Row Level Security) - SEGURANÇA
-- ============================================================
alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.agendamentos enable row level security;
alter table public.produtos enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_itens enable row level security;
alter table public.cupons enable row level security;
alter table public.cupons_uso enable row level security;
alter table public.campanhas_fidelidade enable row level security;
alter table public.carimbos enable row level security;
alter table public.codigos_carimbo enable row level security;

-- ============================================================
-- FUNÇÃO HELPER: pegar role do usuário atual
-- ============================================================
create or replace function public.get_my_role()
returns text
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- POLICIES: profiles
-- ============================================================
create policy "Usuário vê seu próprio perfil"
  on public.profiles for select
  using (id = auth.uid());

create policy "Admin/funcionário vê todos"
  on public.profiles for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Usuário atualiza seu perfil"
  on public.profiles for update
  using (id = auth.uid());

create policy "Admin atualiza qualquer perfil"
  on public.profiles for update
  using (public.get_my_role() = 'admin');

create policy "Admin insere perfis"
  on public.profiles for insert
  with check (public.get_my_role() = 'admin' or id = auth.uid());

create policy "Admin deleta perfis"
  on public.profiles for delete
  using (public.get_my_role() = 'admin');

-- ============================================================
-- POLICIES: pets
-- ============================================================
create policy "Dono vê seus pets"
  on public.pets for select
  using (dono_id = auth.uid());

create policy "Admin/funcionário vê todos pets"
  on public.pets for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Dono gerencia seus pets"
  on public.pets for all
  using (dono_id = auth.uid());

-- ============================================================
-- POLICIES: agendamentos
-- ============================================================
create policy "Cliente vê seus agendamentos"
  on public.agendamentos for select
  using (cliente_id = auth.uid());

create policy "Admin/funcionário vê todos agendamentos"
  on public.agendamentos for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Cliente cria agendamento"
  on public.agendamentos for insert
  with check (cliente_id = auth.uid() and status = 'agendado');

create policy "Cliente cancela seu agendamento (>24h)"
  on public.agendamentos for update
  using (
    cliente_id = auth.uid() and
    status = 'agendado' and
    data_hora > now() + interval '24 hours'
  );

create policy "Admin/funcionário gerencia todos agendamentos"
  on public.agendamentos for all
  using (public.get_my_role() in ('admin','funcionario'));

-- Todos podem ler horários ocupados (sem dados pessoais - feito no código)
create policy "Todos veem horários ocupados"
  on public.agendamentos for select
  using (true);

-- ============================================================
-- POLICIES: produtos
-- ============================================================
create policy "Todos veem produtos ativos"
  on public.produtos for select
  using (ativo = true);

create policy "Admin/funcionário vê todos produtos"
  on public.produtos for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Admin/funcionário gerencia produtos"
  on public.produtos for all
  using (public.get_my_role() in ('admin','funcionario'));

-- ============================================================
-- POLICIES: reservas
-- ============================================================
create policy "Cliente vê suas reservas"
  on public.reservas for select
  using (cliente_id = auth.uid());

create policy "Admin/funcionário vê todas reservas"
  on public.reservas for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Cliente cria reserva"
  on public.reservas for insert
  with check (cliente_id = auth.uid());

create policy "Admin/funcionário atualiza reservas"
  on public.reservas for update
  using (public.get_my_role() in ('admin','funcionario'));

-- ============================================================
-- POLICIES: reserva_itens
-- ============================================================
create policy "Cliente vê seus itens de reserva"
  on public.reserva_itens for select
  using (
    exists (
      select 1 from public.reservas r 
      where r.id = reserva_id and r.cliente_id = auth.uid()
    )
  );

create policy "Admin/funcionário vê todos itens"
  on public.reserva_itens for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Cliente insere itens em sua reserva"
  on public.reserva_itens for insert
  with check (
    exists (
      select 1 from public.reservas r 
      where r.id = reserva_id and r.cliente_id = auth.uid()
    )
  );

-- ============================================================
-- POLICIES: cupons
-- ============================================================
create policy "Clientes veem cupons ativos e não arquivados"
  on public.cupons for select
  using (ativo = true and secao_arquivada = false and validade > now());

create policy "Admin vê todos cupons"
  on public.cupons for select
  using (public.get_my_role() = 'admin');

create policy "Admin gerencia cupons"
  on public.cupons for all
  using (public.get_my_role() = 'admin');

-- ============================================================
-- POLICIES: cupons_uso
-- ============================================================
create policy "Cliente vê seu uso de cupons"
  on public.cupons_uso for select
  using (cliente_id = auth.uid());

create policy "Admin vê todos usos"
  on public.cupons_uso for select
  using (public.get_my_role() = 'admin');

create policy "Cliente registra uso de cupom"
  on public.cupons_uso for insert
  with check (cliente_id = auth.uid());

-- ============================================================
-- POLICIES: campanhas_fidelidade
-- ============================================================
create policy "Clientes veem campanhas ativas e não arquivadas"
  on public.campanhas_fidelidade for select
  using (ativa = true and secao_arquivada = false and validade > now());

create policy "Admin vê todas campanhas"
  on public.campanhas_fidelidade for select
  using (public.get_my_role() = 'admin');

create policy "Admin gerencia campanhas"
  on public.campanhas_fidelidade for all
  using (public.get_my_role() = 'admin');

-- ============================================================
-- POLICIES: carimbos
-- ============================================================
create policy "Cliente vê seus carimbos"
  on public.carimbos for select
  using (cliente_id = auth.uid());

create policy "Admin/funcionário vê todos carimbos"
  on public.carimbos for select
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Cliente insere/atualiza seus carimbos"
  on public.carimbos for all
  using (cliente_id = auth.uid());

create policy "Admin/funcionário gerencia carimbos"
  on public.carimbos for all
  using (public.get_my_role() in ('admin','funcionario'));

-- ============================================================
-- POLICIES: codigos_carimbo
-- ============================================================
create policy "Admin/funcionário gera códigos"
  on public.codigos_carimbo for all
  using (public.get_my_role() in ('admin','funcionario'));

create policy "Cliente lê código para validar"
  on public.codigos_carimbo for select
  using (not usado and expira_em > now());

create policy "Cliente marca código como usado"
  on public.codigos_carimbo for update
  using (not usado and expira_em > now());

-- ============================================================
-- POLICIES: push_subscriptions
-- ============================================================
create policy "Usuário gerencia suas próprias subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid());

create policy "Admin lê todas subscriptions (para enviar push)"
  on public.push_subscriptions for select
  using (public.get_my_role() = 'admin');

-- ============================================================
-- STORAGE BUCKET: fotos de produtos
-- ============================================================
insert into storage.buckets (id, name, public) 
values ('produtos', 'produtos', true)
on conflict do nothing;

create policy "Qualquer um vê fotos de produtos"
  on storage.objects for select
  using (bucket_id = 'produtos');

create policy "Admin/funcionário sobe fotos"
  on storage.objects for insert
  with check (
    bucket_id = 'produtos' and
    public.get_my_role() in ('admin','funcionario')
  );

create policy "Admin/funcionário deleta fotos"
  on storage.objects for delete
  using (
    bucket_id = 'produtos' and
    public.get_my_role() in ('admin','funcionario')
  );

-- ============================================================
-- STORAGE BUCKET: logo
-- ============================================================
insert into storage.buckets (id, name, public) 
values ('assets', 'assets', true)
on conflict do nothing;

create policy "Qualquer um vê assets"
  on storage.objects for select
  using (bucket_id = 'assets');

create policy "Admin sobe assets"
  on storage.objects for insert
  with check (bucket_id = 'assets' and public.get_my_role() = 'admin');

-- ============================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger trg_agendamentos_updated_at
  before update on public.agendamentos
  for each row execute function public.handle_updated_at();

create trigger trg_produtos_updated_at
  before update on public.produtos
  for each row execute function public.handle_updated_at();

create trigger trg_reservas_updated_at
  before update on public.reservas
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: criar profile ao registrar usuário
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Usuário'),
    new.raw_user_meta_data->>'telefone',
    coalesce(new.raw_user_meta_data->>'role', 'cliente')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
