-- CMM Aviation: autenticação por perfil, operação e financeiro com RLS e RPCs.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
revoke create on schema public from public, anon, authenticated;

create type public.app_role as enum ('gestor', 'financeiro', 'campo');
create type public.base_code as enum ('GRU', 'VCP');
create type public.settlement_status as enum ('pending', 'paid');

-- Papéis (um por usuário) e trilha de auditoria
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  assigned_by uuid,
  assigned_at timestamptz not null default now()
);
create table public.role_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  previous_role public.app_role,
  new_role public.app_role,
  actor_id uuid,
  actor_label text not null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  initials text not null check (length(initials) between 1 and 3),
  base public.base_code not null,
  job_title text not null default 'Agente de atendimento' check (length(job_title) <= 80),
  languages text[] not null default '{}',
  accessible_support boolean not null default false,
  login_email text unique check (login_email is null or login_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  access_role public.app_role check (access_role is null or access_role in ('financeiro', 'campo')),
  access_status text not null default 'sem_acesso' check (access_status in ('sem_acesso', 'acesso_criado')),
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 2 and 120),
  initials text not null check (length(initials) between 1 and 3),
  category text not null default 'Aviação executiva' check (length(category) <= 80),
  created_by uuid,
  created_at timestamptz not null default now()
);
create table public.client_contacts (
  client_id uuid primary key references public.clients(id) on delete cascade,
  contact_name text check (length(contact_name) <= 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (length(phone) <= 40)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 2 and 80),
  price_cents integer not null check (price_cents > 0 and price_cents <= 10000000),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create sequence public.booking_code_seq start 1001;
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CMM-' || nextval('public.booking_code_seq')),
  client_id uuid not null references public.clients(id),
  client_name text not null,
  base public.base_code not null,
  scheduled_date date not null,
  scheduled_time time not null,
  service_summary text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index bookings_date_idx on public.bookings (scheduled_date, base);

-- Campos sensíveis em tabela separada (gestor e campo atribuído)
create table public.booking_details (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  aircraft text check (length(aircraft) <= 20),
  note text check (length(note) <= 500),
  accessibility text not null default 'Sem apoio específico sinalizado.' check (length(accessibility) <= 200)
);

-- Preços congelados: somente gestor
create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id),
  service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  unique (booking_id, service_id)
);

create table public.booking_sessions (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id),
  collaborator_name text not null,
  is_lead boolean not null default false,
  check_in_at timestamptz,
  check_in_by uuid,
  check_out_at timestamptz,
  check_out_by uuid,
  unique (booking_id, team_member_id),
  check (check_out_at is null or (check_in_at is not null and check_out_at >= check_in_at))
);
create unique index booking_sessions_one_lead on public.booking_sessions (booking_id) where is_lead;
create index booking_sessions_member_idx on public.booking_sessions (team_member_id);

create table public.booking_observations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 1000),
  author_id uuid,
  author_name text not null,
  created_at timestamptz not null default now()
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  booking_code text not null,
  client_name text not null,
  service_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  status public.settlement_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid,
  paid_by_name text
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.booking_sessions(id),
  booking_id uuid not null references public.bookings(id),
  booking_code text not null,
  team_member_id uuid not null references public.team_members(id),
  collaborator_name text not null,
  service_date date not null,
  amount_cents integer not null check (amount_cents = 8000),
  status public.settlement_status not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by uuid,
  paid_by_name text
);

create table public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id),
  collaborator_name text not null,
  amount_cents integer not null check (amount_cents <> 0 and abs(amount_cents) <= 1000000),
  reason text not null check (length(btrim(reason)) between 5 and 300),
  author_id uuid,
  author_name text not null,
  created_at timestamptz not null default now()
);

-- Leitura somente; toda escrita via RPC
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant select on public.user_roles, public.role_audit, public.team_members, public.clients, public.client_contacts,
  public.services, public.bookings, public.booking_details, public.booking_services, public.booking_sessions,
  public.booking_observations, public.receivables, public.payouts, public.financial_adjustments to authenticated;
grant all on public.user_roles, public.role_audit, public.team_members, public.clients, public.client_contacts,
  public.services, public.bookings, public.booking_details, public.booking_services, public.booking_sessions,
  public.booking_observations, public.receivables, public.payouts, public.financial_adjustments to service_role;

alter table public.user_roles enable row level security;
alter table public.role_audit enable row level security;
alter table public.team_members enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_details enable row level security;
alter table public.booking_services enable row level security;
alter table public.booking_sessions enable row level security;
alter table public.booking_observations enable row level security;
alter table public.receivables enable row level security;
alter table public.payouts enable row level security;
alter table public.financial_adjustments enable row level security;

-- Helpers
create function private.has_current_role(_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = _role and is_active)
$$;

create function private.user_has_role(_user_id uuid, _role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role and is_active)
$$;

create function private.is_assigned(_booking_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_current_role('campo') and exists (
    select 1 from public.booking_sessions s join public.team_members t on t.id = s.team_member_id
    where s.booking_id = _booking_id and t.auth_user_id = auth.uid() and t.active)
$$;

create function public.actor_label() returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select name from public.team_members where auth_user_id = auth.uid() limit 1),
    (select email from auth.users where id = auth.uid()),
    'Administração do banco')
$$;

-- Políticas de leitura
create policy "own role or gestor" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or private.has_current_role('gestor'));
create policy "gestor audit" on public.role_audit for select to authenticated
  using (private.has_current_role('gestor'));
create policy "gestor or self member" on public.team_members for select to authenticated
  using (private.has_current_role('gestor') or auth_user_id = auth.uid());
create policy "gestor or assigned client" on public.clients for select to authenticated
  using (private.has_current_role('gestor') or exists (
    select 1 from public.bookings b where b.client_id = clients.id and private.is_assigned(b.id)));
create policy "gestor contacts" on public.client_contacts for select to authenticated
  using (private.has_current_role('gestor'));
create policy "gestor services" on public.services for select to authenticated
  using (private.has_current_role('gestor'));
create policy "gestor or assigned booking" on public.bookings for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(id));
create policy "gestor or assigned details" on public.booking_details for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(booking_id));
create policy "gestor booking prices" on public.booking_services for select to authenticated
  using (private.has_current_role('gestor'));
create policy "gestor or assigned sessions" on public.booking_sessions for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(booking_id));
create policy "gestor or assigned observations" on public.booking_observations for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(booking_id));
create policy "finance receivables" on public.receivables for select to authenticated
  using (private.has_current_role('gestor') or private.has_current_role('financeiro'));
create policy "finance payouts" on public.payouts for select to authenticated
  using (private.has_current_role('gestor') or private.has_current_role('financeiro'));
create policy "finance adjustments" on public.financial_adjustments for select to authenticated
  using (private.has_current_role('gestor') or private.has_current_role('financeiro'));

-- Proteção contra autoatribuição e auditoria de papéis
create function public.guard_user_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and coalesce(new.user_id, old.user_id) = auth.uid() then
    raise exception 'Não é permitido alterar o próprio perfil de acesso' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
create trigger user_roles_guard before insert or update or delete on public.user_roles
  for each row execute function public.guard_user_roles();

create function public.audit_user_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.role_audit (target_user_id, previous_role, new_role, actor_id, actor_label)
  values (coalesce(new.user_id, old.user_id),
          case when tg_op = 'INSERT' then null else old.role end,
          case when tg_op = 'DELETE' then null else new.role end,
          auth.uid(), public.actor_label());
  return null;
end $$;
create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_user_roles();

-- Perfil da sessão atual
create function public.get_my_profile() returns table (user_id uuid, role public.app_role, display_name text, team_member_id uuid, base public.base_code)
language sql stable security definer set search_path = '' as $$
  select auth.uid(), r.role, public.actor_label(), t.id, t.base
  from public.user_roles r left join public.team_members t on t.auth_user_id = r.user_id and t.active
  where r.user_id = auth.uid()
$$;

-- Gestor: cadastros
create function public.create_client(_name text, _category text, _contact_name text default null, _email text default null, _phone text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.clients (name, initials, category, created_by)
  values (btrim(_name), upper(left(regexp_replace(btrim(_name), '(\w)\w*\s*', '\1', 'g'), 2)), coalesce(nullif(btrim(_category), ''), 'Aviação executiva'), auth.uid())
  returning id into _id;
  insert into public.client_contacts values (_id, nullif(btrim(_contact_name), ''), nullif(lower(btrim(_email)), ''), nullif(btrim(_phone), ''));
  return _id;
end $$;

create function public.upsert_service(_name text, _price_cents integer, _active boolean default true) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.services (name, price_cents, active) values (btrim(_name), _price_cents, _active)
  on conflict (name) do update set price_cents = excluded.price_cents, active = excluded.active
  returning id into _id;
  return _id;
end $$;

create function public.create_team_member(_name text, _base public.base_code, _job_title text, _languages text[], _accessible boolean) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid;
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.team_members (name, initials, base, job_title, languages, accessible_support, created_by)
  values (btrim(_name), upper(left(regexp_replace(btrim(_name), '(\w)\w*\s*', '\1', 'g'), 2)), _base,
          coalesce(nullif(btrim(_job_title), ''), 'Agente de atendimento'), coalesce(_languages, '{}'), coalesce(_accessible, false), auth.uid())
  returning id into _id;
  return _id;
end $$;

-- Vincula um usuário Auth já criado (pela função de servidor) ao colaborador e define o perfil
create function public.grant_member_access(_member_id uuid, _auth_user_id uuid, _email text, _role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _role not in ('financeiro', 'campo') then raise exception 'Perfil inválido para cadastro pela aplicação'; end if;
  if _auth_user_id = auth.uid() then raise exception 'Não é permitido alterar o próprio acesso' using errcode = '42501'; end if;
  if not exists (select 1 from auth.users where id = _auth_user_id and lower(email) = lower(btrim(_email))) then raise exception 'Usuário de acesso inexistente ou email divergente'; end if;
  if exists (select 1 from public.user_roles where user_id = _auth_user_id) then raise exception 'Usuário já possui perfil'; end if;
  update public.team_members set auth_user_id = _auth_user_id, login_email = lower(btrim(_email)), access_role = _role, access_status = 'acesso_criado'
  where id = _member_id and auth_user_id is null and active;
  if not found then raise exception 'Colaborador inexistente ou já vinculado'; end if;
  insert into public.user_roles (user_id, role, assigned_by) values (_auth_user_id, _role, auth.uid());
end $$;

create function public.change_member_role(_member_id uuid, _role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare _uid uuid;
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _role not in ('financeiro', 'campo') then raise exception 'Perfil inválido'; end if;
  select auth_user_id into _uid from public.team_members where id = _member_id;
  if _uid is null then raise exception 'Colaborador sem acesso'; end if;
  if _uid = auth.uid() or private.user_has_role(_uid, 'gestor') then raise exception 'Alteração não permitida' using errcode = '42501'; end if;
  update public.user_roles set role = _role, assigned_by = auth.uid(), assigned_at = now() where user_id = _uid;
  update public.team_members set access_role = _role where id = _member_id;
end $$;

-- Gestor: novo agendamento com preços congelados
create function public.create_booking(_client_id uuid, _base public.base_code, _date date, _time time, _service_ids uuid[], _lead_id uuid,
  _support_id uuid default null, _aircraft text default null, _note text default null, _accessibility text default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare _id uuid; _client text; _summary text;
begin
  if not private.has_current_role('gestor') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select name into _client from public.clients where id = _client_id;
  if _client is null then raise exception 'Cliente inválido'; end if;
  if _date is null or _time is null or _base is null then raise exception 'Informe base, data e horário'; end if;
  if coalesce(cardinality(_service_ids), 0) = 0 then raise exception 'Selecione pelo menos um serviço'; end if;
  if (select count(*) from public.services where id = any(_service_ids) and active) <> (select count(distinct x) from unnest(_service_ids) x) then
    raise exception 'Serviço inválido'; end if;
  if _lead_id is null or _lead_id = _support_id then raise exception 'Selecione responsável e apoio distintos'; end if;
  if (select count(*) from public.team_members where id in (_lead_id, _support_id) and base = _base and active)
     <> (case when _support_id is null then 1 else 2 end) then raise exception 'Equipe inválida para a base'; end if;
  select string_agg(name, ' + ' order by name) into _summary from public.services where id = any(_service_ids);
  insert into public.bookings (client_id, client_name, base, scheduled_date, scheduled_time, service_summary, created_by)
  values (_client_id, _client, _base, _date, _time, _summary, auth.uid()) returning id into _id;
  insert into public.booking_details (booking_id, aircraft, note, accessibility)
  values (_id, nullif(upper(btrim(_aircraft)), ''), nullif(btrim(_note), ''), coalesce(nullif(btrim(_accessibility), ''), 'Sem apoio específico sinalizado.'));
  insert into public.booking_services (booking_id, service_id, service_name, price_cents)
  select _id, id, name, price_cents from public.services where id = any(_service_ids);
  insert into public.booking_sessions (booking_id, team_member_id, collaborator_name, is_lead)
  select _id, id, name, id = _lead_id from public.team_members where id in (_lead_id, _support_id);
  return _id;
end $$;

create function private.can_operate_session(_session_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_current_role('gestor') or (private.has_current_role('campo') and exists (
    select 1 from public.booking_sessions s join public.team_members t on t.id = s.team_member_id
    where s.id = _session_id and t.auth_user_id = auth.uid() and t.active))
$$;

create function public.check_in(_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_operate_session(_session_id) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.booking_sessions set check_in_at = now(), check_in_by = auth.uid()
  where id = _session_id and check_in_at is null and check_out_at is null;
end $$;

-- Checkout idempotente: repasse único por sessão, cobrança única por agendamento
create function public.check_out(_session_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare _booking public.bookings; _s public.booking_sessions;
begin
  if not private.can_operate_session(_session_id) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  select b.* into _booking from public.bookings b join public.booking_sessions s on s.booking_id = b.id where s.id = _session_id for update of b;
  select * into _s from public.booking_sessions where id = _session_id for update;
  if _s.check_in_at is null then raise exception 'Faça o check-in antes do checkout'; end if;
  if _s.check_out_at is not null then return; end if;
  update public.booking_sessions set check_out_at = now(), check_out_by = auth.uid() where id = _session_id;
  insert into public.payouts (session_id, booking_id, booking_code, team_member_id, collaborator_name, service_date, amount_cents)
  values (_s.id, _booking.id, _booking.code, _s.team_member_id, _s.collaborator_name, _booking.scheduled_date, 8000)
  on conflict (session_id) do nothing;
  if not exists (select 1 from public.booking_sessions where booking_id = _booking.id and check_out_at is null) then
    insert into public.receivables (booking_id, booking_code, client_name, service_date, amount_cents)
    select _booking.id, _booking.code, _booking.client_name, _booking.scheduled_date, sum(price_cents)
    from public.booking_services where booking_id = _booking.id
    on conflict (booking_id) do nothing;
  end if;
end $$;

create function public.add_observation(_booking_id uuid, _body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_current_role('gestor') or private.is_assigned(_booking_id)) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  insert into public.booking_observations (booking_id, body, author_id, author_name) values (_booking_id, btrim(_body), auth.uid(), public.actor_label());
end $$;

-- Financeiro
create function public.mark_receivable_paid(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_current_role('gestor') or private.has_current_role('financeiro')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.receivables set status = 'paid', paid_at = now(), paid_by = auth.uid(), paid_by_name = public.actor_label() where id = _id and status = 'pending';
end $$;

create function public.mark_payout_paid(_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (private.has_current_role('gestor') or private.has_current_role('financeiro')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  update public.payouts set status = 'paid', paid_at = now(), paid_by = auth.uid(), paid_by_name = public.actor_label() where id = _id and status = 'pending';
end $$;

create function public.add_adjustment(_team_member_id uuid, _amount_cents integer, _reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare _name text;
begin
  if not (private.has_current_role('gestor') or private.has_current_role('financeiro')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if private.has_current_role('financeiro') and not exists (select 1 from public.payouts p where p.team_member_id = _team_member_id) then
    raise exception 'Financeiro só pode ajustar colaboradores já presentes em repasses' using errcode = '42501';
  end if;
  select name into _name from public.team_members where id = _team_member_id;
  if _name is null then raise exception 'Colaborador inválido'; end if;
  insert into public.financial_adjustments (team_member_id, collaborator_name, amount_cents, reason, author_id, author_name)
  values (_team_member_id, _name, _amount_cents, btrim(_reason), auth.uid(), public.actor_label());
end $$;

-- Campo: total mensal próprio
create function public.my_month_summary(_month date) returns table (completed_count integer, upcoming_count integer, completed_cents bigint, projected_cents bigint)
language plpgsql stable security definer set search_path = '' as $$
declare _member uuid; _start date := date_trunc('month', _month)::date; _end date := (date_trunc('month', _month) + interval '1 month')::date;
begin
  if not private.has_current_role('campo') then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _month is null then raise exception 'Informe um mês válido'; end if;
  select id into _member from public.team_members where auth_user_id = auth.uid() and active;
  return query
  select count(*) filter (where s.check_out_at is not null)::integer,
         count(*) filter (where s.check_out_at is null and b.scheduled_date >= (now() at time zone 'America/Sao_Paulo')::date)::integer,
         coalesce((select sum(p.amount_cents) from public.payouts p where p.team_member_id = _member and p.service_date >= _start and p.service_date < _end), 0)::bigint,
         (count(*) filter (where s.check_out_at is null and b.scheduled_date >= (now() at time zone 'America/Sao_Paulo')::date) * 8000)::bigint
  from public.booking_sessions s join public.bookings b on b.id = s.booking_id
  where s.team_member_id = _member and b.scheduled_date >= _start and b.scheduled_date < _end;
end $$;

-- Execução de funções somente para usuários autenticados
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
revoke execute on function private.has_current_role(public.app_role), private.user_has_role(uuid, public.app_role),
  private.is_assigned(uuid), private.can_operate_session(uuid) from public, anon, authenticated;
grant execute on function private.has_current_role(public.app_role), private.is_assigned(uuid) to authenticated;
grant execute on function public.get_my_profile(), public.create_client(text, text, text, text, text), public.upsert_service(text, integer, boolean),
  public.create_team_member(text, public.base_code, text, text[], boolean), public.grant_member_access(uuid, uuid, text, public.app_role),
  public.change_member_role(uuid, public.app_role),
  public.create_booking(uuid, public.base_code, date, time, uuid[], uuid, uuid, text, text, text),
  public.check_in(uuid), public.check_out(uuid), public.add_observation(uuid, text), public.mark_receivable_paid(uuid),
  public.mark_payout_paid(uuid), public.add_adjustment(uuid, integer, text), public.my_month_summary(date)
  to authenticated;
revoke execute on function public.guard_user_roles(), public.audit_user_roles() from authenticated;
