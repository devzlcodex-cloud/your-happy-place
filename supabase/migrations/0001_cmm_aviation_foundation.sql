-- CMM Aviation MVP foundation. This migration is intentionally local-only.
-- It assumes a standard Supabase project with auth.users and pgcrypto available.

create schema if not exists private;
revoke all on schema private from public;

create type public.app_role as enum ('collaborator', 'operations', 'finance', 'admin');
create type public.booking_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
create type public.attendance_status as enum ('scheduled', 'checked_in', 'completed', 'cancelled');
create type public.attendance_assignment_role as enum ('lead', 'support');
create type public.receivable_status as enum ('pending', 'invoiced', 'paid', 'overdue', 'cancelled');
create type public.payout_status as enum ('pending', 'approved', 'paid', 'cancelled');
create type public.adjustment_kind as enum ('bonus', 'deduction');
create type public.pay_period_status as enum ('open', 'review', 'closed');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  role public.app_role not null default 'collaborator',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.airports (
  id uuid primary key default gen_random_uuid(),
  iata_code text not null unique check (iata_code ~ '^[A-Z]{3}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  city text not null check (char_length(trim(city)) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_code text not null unique check (client_code ~ '^[A-Z0-9-]{3,40}$'),
  company_name text not null check (char_length(trim(company_name)) between 2 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text not null unique check (employee_code ~ '^[A-Z0-9-]{3,40}$'),
  user_profile_id uuid unique references public.user_profiles(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 2 and 120),
  job_title text not null check (char_length(trim(job_title)) between 2 and 120),
  primary_airport_id uuid references public.airports(id) on delete restrict,
  can_support_accessibility boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  service_code text not null unique check (service_code ~ '^[A-Z0-9-]{3,40}$'),
  name text not null check (char_length(trim(name)) between 2 and 160),
  description text check (description is null or char_length(description) <= 500),
  default_price_cents integer not null check (default_price_cents >= 0),
  supports_accessibility boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique check (booking_reference ~ '^[A-Z0-9-]{3,60}$'),
  client_id uuid not null references public.clients(id) on delete restrict,
  airport_id uuid not null references public.airports(id) on delete restrict,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  aircraft_reference text check (aircraft_reference is null or char_length(trim(aircraft_reference)) between 2 and 40),
  requires_accessible_service boolean not null default false,
  status public.booking_status not null default 'scheduled',
  operational_note text check (operational_note is null or char_length(operational_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > scheduled_start_at)
);

comment on column public.bookings.requires_accessible_service is
  'Operational planning flag only. Do not store passenger names, health information, diagnoses, or free-text accessibility details here.';

create table public.booking_line_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_catalog_id uuid references public.service_catalog(id) on delete set null,
  service_name_snapshot text not null check (char_length(trim(service_name_snapshot)) between 2 and 160),
  quantity integer not null default 1 check (quantity > 0 and quantity <= 100),
  applied_unit_price_cents integer not null check (applied_unit_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, service_catalog_id)
);

create table public.pay_periods (
  id uuid primary key default gen_random_uuid(),
  period_reference text not null unique check (period_reference ~ '^[A-Z0-9-]{3,60}$'),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.pay_period_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.attendances (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  assignment_role public.attendance_assignment_role not null default 'support',
  status public.attendance_status not null default 'scheduled',
  payout_rate_cents integer not null check (payout_rate_cents >= 0),
  checked_in_at timestamptz,
  completed_at timestamptz,
  checkout_note text check (checkout_note is null or char_length(checkout_note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, employee_id),
  check (
    (status = 'scheduled' and checked_in_at is null and completed_at is null)
    or (status = 'checked_in' and checked_in_at is not null and completed_at is null)
    or (status = 'completed' and checked_in_at is not null and completed_at is not null and completed_at >= checked_in_at)
    or (status = 'cancelled' and completed_at is null)
  )
);

create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  status public.receivable_status not null default 'pending',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (paid_at is null or paid_at >= issued_at)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null unique references public.attendances(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  pay_period_id uuid references public.pay_periods(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  status public.payout_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.adjustments (
  id uuid primary key default gen_random_uuid(),
  pay_period_id uuid not null references public.pay_periods(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  payout_id uuid references public.payouts(id) on delete set null,
  kind public.adjustment_kind not null,
  amount_cents integer not null check (amount_cents > 0),
  reason text not null check (char_length(trim(reason)) between 3 and 300),
  recorded_by_profile_id uuid references public.user_profiles(id) on delete set null,
  recorded_by_label text not null check (char_length(trim(recorded_by_label)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bookings_airport_start_idx on public.bookings (airport_id, scheduled_start_at);
create index attendances_employee_status_idx on public.attendances (employee_id, status);
create index attendances_booking_status_idx on public.attendances (booking_id, status);
create index payouts_employee_period_idx on public.payouts (employee_id, pay_period_id);
create index adjustments_employee_period_idx on public.adjustments (employee_id, pay_period_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_profiles_set_updated_at before update on public.user_profiles for each row execute function public.set_updated_at();
create trigger airports_set_updated_at before update on public.airports for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger employees_set_updated_at before update on public.employees for each row execute function public.set_updated_at();
create trigger service_catalog_set_updated_at before update on public.service_catalog for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function public.set_updated_at();
create trigger booking_line_items_set_updated_at before update on public.booking_line_items for each row execute function public.set_updated_at();
create trigger pay_periods_set_updated_at before update on public.pay_periods for each row execute function public.set_updated_at();
create trigger attendances_set_updated_at before update on public.attendances for each row execute function public.set_updated_at();
create trigger receivables_set_updated_at before update on public.receivables for each row execute function public.set_updated_at();
create trigger payouts_set_updated_at before update on public.payouts for each row execute function public.set_updated_at();
create trigger adjustments_set_updated_at before update on public.adjustments for each row execute function public.set_updated_at();

-- This helper is SECURITY INVOKER. It can see only the caller's own profile through the profile RLS policy below.
create function private.current_app_role()
returns public.app_role
language sql
stable
security invoker
set search_path = ''
as $$
  select up.role
  from public.user_profiles as up
  where up.id = auth.uid()
    and up.is_active
$$;

create function private.is_management_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('operations', 'admin'), false)
$$;

create function private.is_finance_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(private.current_app_role() in ('finance', 'admin'), false)
$$;

-- Completing an attendance is the only client-callable financial posting path.
-- It locks the booking, so two simultaneous final check-outs cannot create two receivables.
create function private.complete_attendance_impl(
  p_attendance_id uuid,
  p_checkout_note text default null
)
returns table (attendance_id uuid, payout_id uuid, receivable_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendance public.attendances%rowtype;
  v_booking public.bookings%rowtype;
  v_payout_id uuid;
  v_receivable_id uuid;
  v_role public.app_role;
  v_employee_id uuid;
  v_pay_period_id uuid;
  v_amount_cents integer;
  v_completed_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select up.role into v_role
  from public.user_profiles as up
  where up.id = auth.uid() and up.is_active;

  if v_role is null or v_role not in ('collaborator', 'operations', 'admin') then
    raise exception 'This role cannot complete attendances';
  end if;

  select a.* into v_attendance
  from public.attendances as a
  where a.id = p_attendance_id
  for update;

  if not found then
    raise exception 'Attendance not found';
  end if;

  select b.* into v_booking
  from public.bookings as b
  where b.id = v_attendance.booking_id
  for update;

  if v_role = 'collaborator' then
    select e.id into v_employee_id
    from public.employees as e
    where e.user_profile_id = auth.uid() and e.is_active;

    if v_employee_id is null or v_employee_id <> v_attendance.employee_id then
      raise exception 'Collaborators can complete only their assigned attendance';
    end if;
  end if;

  if v_attendance.status = 'cancelled' then
    raise exception 'Cancelled attendance cannot be completed';
  end if;

  if v_attendance.status = 'scheduled' then
    raise exception 'Attendance must be checked in before completion';
  end if;

  -- Preserve idempotency even if the original pay period has subsequently been closed.
  if v_attendance.status = 'completed' then
    select p.id into v_payout_id from public.payouts as p where p.attendance_id = v_attendance.id;
    select r.id into v_receivable_id from public.receivables as r where r.booking_id = v_booking.id;
    return query select v_attendance.id, v_payout_id, v_receivable_id;
    return;
  end if;

  select pp.id into v_pay_period_id
  from public.pay_periods as pp
  where pp.status = 'open'
    and pp.starts_at <= v_completed_at
    and pp.ends_at >= v_completed_at
  order by pp.starts_at desc
  limit 1
  for share;

  if v_pay_period_id is null then
    raise exception 'No open pay period covers this completion time';
  end if;

  if v_attendance.status = 'checked_in' then
    if v_completed_at < v_attendance.checked_in_at then
      raise exception 'Completion time cannot precede check-in';
    end if;

    update public.attendances
    set status = 'completed',
        completed_at = v_completed_at,
        checkout_note = coalesce(p_checkout_note, checkout_note)
    where id = v_attendance.id;
  end if;

  insert into public.payouts (attendance_id, employee_id, pay_period_id, amount_cents, status)
  values (v_attendance.id, v_attendance.employee_id, v_pay_period_id, v_attendance.payout_rate_cents, 'pending')
  on conflict (attendance_id) do nothing
  returning id into v_payout_id;

  if v_payout_id is null then
    select p.id into v_payout_id from public.payouts as p where p.attendance_id = v_attendance.id;
  end if;

  if not exists (
    select 1 from public.attendances as a
    where a.booking_id = v_booking.id and a.status <> 'completed'
  ) then
    select coalesce(sum(li.quantity * li.applied_unit_price_cents), 0)::integer
      into v_amount_cents
    from public.booking_line_items as li
    where li.booking_id = v_booking.id;

    insert into public.receivables (booking_id, client_id, amount_cents, status)
    values (v_booking.id, v_booking.client_id, v_amount_cents, 'pending')
    on conflict (booking_id) do nothing
    returning id into v_receivable_id;

    if v_receivable_id is null then
      select r.id into v_receivable_id from public.receivables as r where r.booking_id = v_booking.id;
    end if;

    update public.bookings set status = 'completed' where id = v_booking.id and status <> 'completed';
  else
    update public.bookings set status = 'in_progress' where id = v_booking.id and status = 'scheduled';
  end if;

  return query select v_attendance.id, v_payout_id, v_receivable_id;
end;
$$;

-- Check-in uses the same narrow authorization model as completion, so a collaborator never
-- receives a direct UPDATE policy over attendances.
create function private.check_in_attendance_impl(
  p_attendance_id uuid
)
returns table (attendance_id uuid, attendance_status public.attendance_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendance public.attendances%rowtype;
  v_role public.app_role;
  v_employee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select up.role into v_role
  from public.user_profiles as up
  where up.id = auth.uid() and up.is_active;

  if v_role is null or v_role not in ('collaborator', 'operations', 'admin') then
    raise exception 'This role cannot check in attendances';
  end if;

  select a.* into v_attendance
  from public.attendances as a
  where a.id = p_attendance_id
  for update;

  if not found then
    raise exception 'Attendance not found';
  end if;

  if v_role = 'collaborator' then
    select e.id into v_employee_id
    from public.employees as e
    where e.user_profile_id = auth.uid() and e.is_active;

    if v_employee_id is null or v_employee_id <> v_attendance.employee_id then
      raise exception 'Collaborators can check in only their assigned attendance';
    end if;
  end if;

  if v_attendance.status = 'cancelled' then
    raise exception 'Cancelled attendance cannot be checked in';
  end if;

  if v_attendance.status = 'scheduled' then
    update public.attendances
    set status = 'checked_in', checked_in_at = now()
    where id = v_attendance.id;

    update public.bookings
    set status = 'in_progress'
    where id = v_attendance.booking_id and status = 'scheduled';

    v_attendance.status := 'checked_in';
  end if;

  return query select v_attendance.id, v_attendance.status;
end;
$$;

-- Keep SECURITY DEFINER implementations in the non-exposed schema. These narrow
-- SECURITY INVOKER wrappers are the only attendance RPCs exposed through the Data API.
create function public.complete_attendance(
  p_attendance_id uuid,
  p_checkout_note text default null
)
returns table (attendance_id uuid, payout_id uuid, receivable_id uuid)
language sql
security invoker
set search_path = ''
as $$
  select * from private.complete_attendance_impl(p_attendance_id, p_checkout_note)
$$;

create function public.check_in_attendance(
  p_attendance_id uuid
)
returns table (attendance_id uuid, attendance_status public.attendance_status)
language sql
security invoker
set search_path = ''
as $$
  select * from private.check_in_attendance_impl(p_attendance_id)
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function private.current_app_role() from public;
revoke all on function private.is_management_role() from public;
revoke all on function private.is_finance_role() from public;
revoke all on function private.complete_attendance_impl(uuid, text) from public;
revoke all on function private.check_in_attendance_impl(uuid) from public;
revoke all on function public.complete_attendance(uuid, text) from public;
revoke all on function public.check_in_attendance(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.is_management_role() to authenticated;
grant execute on function private.is_finance_role() to authenticated;
grant execute on function private.complete_attendance_impl(uuid, text) to authenticated;
grant execute on function private.check_in_attendance_impl(uuid) to authenticated;
grant execute on function public.complete_attendance(uuid, text) to authenticated;
grant execute on function public.check_in_attendance(uuid) to authenticated;

alter table public.user_profiles enable row level security;
alter table public.airports enable row level security;
alter table public.clients enable row level security;
alter table public.employees enable row level security;
alter table public.service_catalog enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_line_items enable row level security;
alter table public.pay_periods enable row level security;
alter table public.attendances enable row level security;
alter table public.receivables enable row level security;
alter table public.payouts enable row level security;
alter table public.adjustments enable row level security;

create policy user_profiles_select_self on public.user_profiles for select to authenticated using (id = auth.uid());

create policy airports_select_active_users on public.airports for select to authenticated using (private.current_app_role() is not null);
create policy airports_manage_operations on public.airports for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy clients_select_scoped on public.clients for select to authenticated using (
  private.is_management_role() or private.is_finance_role() or exists (
    select 1 from public.bookings as b
    join public.attendances as a on a.booking_id = b.id
    join public.employees as e on e.id = a.employee_id
    where b.client_id = clients.id and e.user_profile_id = auth.uid()
  )
);
create policy clients_manage_operations on public.clients for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy employees_select_scoped on public.employees for select to authenticated using (
  user_profile_id = auth.uid() or private.is_management_role() or private.is_finance_role()
);
create policy employees_manage_operations on public.employees for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy service_catalog_select_active_users on public.service_catalog for select to authenticated using (private.current_app_role() is not null);
create policy service_catalog_manage_operations on public.service_catalog for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy bookings_select_scoped on public.bookings for select to authenticated using (
  private.is_management_role() or exists (
    select 1 from public.attendances as a
    join public.employees as e on e.id = a.employee_id
    where a.booking_id = bookings.id and e.user_profile_id = auth.uid()
  )
);
create policy bookings_manage_operations on public.bookings for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy booking_line_items_select_scoped on public.booking_line_items for select to authenticated using (
  exists (select 1 from public.bookings as b where b.id = booking_line_items.booking_id)
);
create policy booking_line_items_manage_operations on public.booking_line_items for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy attendances_select_scoped on public.attendances for select to authenticated using (
  private.is_management_role() or exists (
    select 1 from public.employees as e where e.id = attendances.employee_id and e.user_profile_id = auth.uid()
  )
);
create policy attendances_manage_operations on public.attendances for all to authenticated using (private.is_management_role()) with check (private.is_management_role());

create policy receivables_select_finance on public.receivables for select to authenticated using (private.is_finance_role());

create policy payouts_select_scoped on public.payouts for select to authenticated using (
  private.is_finance_role() or exists (
    select 1 from public.employees as e where e.id = payouts.employee_id and e.user_profile_id = auth.uid()
  )
);

create policy adjustments_select_scoped on public.adjustments for select to authenticated using (
  private.is_finance_role() or exists (
    select 1 from public.employees as e where e.id = adjustments.employee_id and e.user_profile_id = auth.uid()
  )
);
create policy adjustments_manage_finance on public.adjustments for all to authenticated using (private.is_finance_role()) with check (private.is_finance_role());

create policy pay_periods_select_finance on public.pay_periods for select to authenticated using (private.is_finance_role());
create policy pay_periods_manage_finance on public.pay_periods for all to authenticated using (private.is_finance_role()) with check (private.is_finance_role());

-- Default-deny Data API privileges. RLS is an additional row boundary, not a substitute
-- for SQL grants. Keep all demo/product CRUD disabled until narrow, audited RPC commands
-- exist for each workflow. In particular, direct table writes could alter assignments,
-- frozen service prices, employee links, or attendance states outside the intended flow.
revoke all on public.user_profiles, public.airports, public.clients, public.employees, public.service_catalog,
  public.bookings, public.booking_line_items, public.pay_periods, public.attendances, public.receivables,
  public.payouts, public.adjustments from public, anon, authenticated;
grant select on public.user_profiles, public.airports, public.clients, public.employees, public.service_catalog,
  public.bookings, public.booking_line_items, public.pay_periods, public.attendances, public.receivables,
  public.payouts, public.adjustments to authenticated;

-- Deliberately absent: anonymous grants/policies, direct receivable/payout writes, personal identifiers,
-- bank details, CPF, passenger names, health data, and a public employee-registration route.
-- Product owners must define the protected onboarding path that creates auth.users, profiles, roles, and employee links.

