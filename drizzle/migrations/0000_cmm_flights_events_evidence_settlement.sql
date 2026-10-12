-- Flight / terminal information
create table public.booking_flights (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  flight_number text,
  airline text,
  terminal text,
  gate text,
  flight_status text not null default 'previsto' check (flight_status in ('previsto','no_horario','atrasado','pousou','decolou','cancelado')),
  eta time,
  updated_at timestamptz not null default now(),
  updated_by_name text
);
grant select on public.booking_flights to authenticated;
grant all on public.booking_flights to service_role;
alter table public.booking_flights enable row level security;
create policy "gestor or assigned flights" on public.booking_flights for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(booking_id));

-- Operational event trail
create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  scope text not null default 'operacao' check (scope in ('operacao','financeiro')),
  kind text not null,
  message text not null,
  actor_id uuid,
  actor_name text not null,
  created_at timestamptz not null default now()
);
create index booking_events_created_idx on public.booking_events (created_at desc);
grant select on public.booking_events to authenticated;
grant all on public.booking_events to service_role;
alter table public.booking_events enable row level security;
create policy "events by role" on public.booking_events for select to authenticated
  using (
    private.has_current_role('gestor')
    or (scope = 'financeiro' and private.has_current_role('financeiro'))
    or (scope = 'operacao' and booking_id is not null and private.is_assigned(booking_id))
  );

-- Evidence photos
create table public.booking_evidence (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  author_id uuid,
  author_name text not null,
  created_at timestamptz not null default now()
);
grant select on public.booking_evidence to authenticated;
grant all on public.booking_evidence to service_role;
alter table public.booking_evidence enable row level security;
create policy "gestor or assigned evidence" on public.booking_evidence for select to authenticated
  using (private.has_current_role('gestor') or private.is_assigned(booking_id));

-- Settlement details
alter table public.payouts add column payment_method text, add column payment_reference text;
alter table public.receivables add column payment_method text, add column payment_reference text;

-- Event helper
create or replace function private.log_event(_booking uuid, _scope text, _kind text, _message text)
returns void language sql security definer set search_path to '' as $$
  insert into public.booking_events (booking_id, scope, kind, message, actor_id, actor_name)
  values (_booking, _scope, _kind, _message, auth.uid(), public.actor_label());
$$;

create or replace function public.trg_booking_events()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if tg_table_name = 'bookings' then
    perform private.log_event(new.id, 'operacao', 'criado', 'Agendamento ' || new.code || ' criado para ' || new.client_name || ' em ' || to_char(new.scheduled_date, 'DD/MM') || ' às ' || to_char(new.scheduled_time, 'HH24:MI') || '.');
  elsif tg_table_name = 'booking_sessions' then
    if old.check_in_at is null and new.check_in_at is not null then
      perform private.log_event(new.booking_id, 'operacao', 'check_in', new.collaborator_name || ' realizou check-in.');
    end if;
    if old.check_out_at is null and new.check_out_at is not null then
      perform private.log_event(new.booking_id, 'operacao', 'check_out', new.collaborator_name || ' concluiu o checkout.');
    end if;
  elsif tg_table_name = 'booking_observations' then
    perform private.log_event(new.booking_id, 'operacao', 'observacao', new.author_name || ' registrou uma observação.');
  elsif tg_table_name = 'booking_evidence' then
    perform private.log_event(new.booking_id, 'operacao', 'evidencia', new.author_name || ' anexou uma evidência.');
  elsif tg_table_name = 'payouts' then
    if tg_op = 'INSERT' then
      perform private.log_event(new.booking_id, 'financeiro', 'repasse', 'Repasse de ' || new.collaborator_name || ' gerado (' || new.booking_code || ').');
    elsif old.status = 'pending' and new.status = 'paid' then
      perform private.log_event(new.booking_id, 'financeiro', 'repasse_pago', 'Repasse de ' || new.collaborator_name || ' liquidado via ' || coalesce(new.payment_method, '—') || '.');
    end if;
  elsif tg_table_name = 'receivables' then
    if tg_op = 'INSERT' then
      perform private.log_event(new.booking_id, 'financeiro', 'cobranca', 'Cobrança de ' || new.client_name || ' gerada (' || new.booking_code || ').');
    elsif old.status = 'pending' and new.status = 'paid' then
      perform private.log_event(new.booking_id, 'financeiro', 'cobranca_paga', 'Cobrança ' || new.booking_code || ' recebida via ' || coalesce(new.payment_method, '—') || '.');
    end if;
  end if;
  return null;
end $$;

create trigger booking_events_bookings after insert on public.bookings for each row execute function public.trg_booking_events();
create trigger booking_events_sessions after update on public.booking_sessions for each row execute function public.trg_booking_events();
create trigger booking_events_obs after insert on public.booking_observations for each row execute function public.trg_booking_events();
create trigger booking_events_evidence after insert on public.booking_evidence for each row execute function public.trg_booking_events();
create trigger booking_events_payouts after insert or update on public.payouts for each row execute function public.trg_booking_events();
create trigger booking_events_receivables after insert or update on public.receivables for each row execute function public.trg_booking_events();
revoke execute on function public.trg_booking_events() from public, anon, authenticated;

-- RPC: flight info (gestor full; assigned field team may update status/gate)
create or replace function public.set_flight_info(_booking_id uuid, _flight text, _airline text, _terminal text, _gate text, _status text, _eta time default null)
returns void language plpgsql security definer set search_path to '' as $$
declare _prev text;
begin
  if not (private.has_current_role('gestor') or private.is_assigned(_booking_id)) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _status not in ('previsto','no_horario','atrasado','pousou','decolou','cancelado') then raise exception 'Status de voo inválido'; end if;
  select flight_status into _prev from public.booking_flights where booking_id = _booking_id;
  insert into public.booking_flights (booking_id, flight_number, airline, terminal, gate, flight_status, eta, updated_at, updated_by_name)
  values (_booking_id, nullif(upper(btrim(_flight)), ''), nullif(btrim(_airline), ''), nullif(btrim(_terminal), ''), nullif(upper(btrim(_gate)), ''), _status, _eta, now(), public.actor_label())
  on conflict (booking_id) do update set flight_number = excluded.flight_number, airline = excluded.airline, terminal = excluded.terminal,
    gate = excluded.gate, flight_status = excluded.flight_status, eta = excluded.eta, updated_at = now(), updated_by_name = excluded.updated_by_name;
  perform private.log_event(_booking_id, 'operacao', 'voo',
    case when _prev is distinct from _status then 'Status do voo alterado para ' || _status || '.' else 'Dados do voo atualizados.' end);
end $$;

-- RPC: evidence registration
create or replace function public.add_evidence(_booking_id uuid, _path text, _caption text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (private.has_current_role('gestor') or private.is_assigned(_booking_id)) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if split_part(_path, '/', 1) <> _booking_id::text then raise exception 'Caminho inválido'; end if;
  insert into public.booking_evidence (booking_id, storage_path, caption, author_id, author_name)
  values (_booking_id, _path, nullif(btrim(_caption), ''), auth.uid(), public.actor_label());
end $$;

-- RPC: settlement with method and reference
create or replace function public.settle_payout(_id uuid, _method text, _reference text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (private.has_current_role('gestor') or private.has_current_role('financeiro')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _method not in ('PIX','TED','Boleto','Outro') then raise exception 'Forma de pagamento inválida'; end if;
  update public.payouts set status = 'paid', paid_at = now(), paid_by = auth.uid(), paid_by_name = public.actor_label(),
    payment_method = _method, payment_reference = nullif(btrim(_reference), '')
  where id = _id and status = 'pending';
end $$;

create or replace function public.settle_receivable(_id uuid, _method text, _reference text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not (private.has_current_role('gestor') or private.has_current_role('financeiro')) then raise exception 'Sem permissão' using errcode = '42501'; end if;
  if _method not in ('PIX','TED','Boleto','Outro') then raise exception 'Forma de pagamento inválida'; end if;
  update public.receivables set status = 'paid', paid_at = now(), paid_by = auth.uid(), paid_by_name = public.actor_label(),
    payment_method = _method, payment_reference = nullif(btrim(_reference), '')
  where id = _id and status = 'pending';
end $$;

revoke execute on function public.set_flight_info(uuid,text,text,text,text,text,time) from public, anon;
revoke execute on function public.add_evidence(uuid,text,text) from public, anon;
revoke execute on function public.settle_payout(uuid,text,text) from public, anon;
revoke execute on function public.settle_receivable(uuid,text,text) from public, anon;
grant execute on function public.set_flight_info(uuid,text,text,text,text,text,time) to authenticated;
grant execute on function public.add_evidence(uuid,text,text) to authenticated;
grant execute on function public.settle_payout(uuid,text,text) to authenticated;
grant execute on function public.settle_receivable(uuid,text,text) to authenticated;

-- Storage policies for private evidence bucket (bucket created separately)
create policy "evidence read" on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and (private.has_current_role('gestor') or private.is_assigned(((storage.foldername(name))[1])::uuid)));
create policy "evidence upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias' and (private.has_current_role('gestor') or private.is_assigned(((storage.foldername(name))[1])::uuid)));