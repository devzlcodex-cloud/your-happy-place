-- Synthetic demonstration data only. No auth users, personal identifiers, bank details,
-- passenger names, or health details are inserted by this seed.

begin;

insert into public.airports (iata_code, name, city)
values
  ('GRU', 'Aeroporto Internacional de São Paulo/Guarulhos', 'Guarulhos'),
  ('VCP', 'Aeroporto Internacional de Viracopos', 'Campinas')
on conflict (iata_code) do nothing;

insert into public.clients (client_code, company_name)
values
  ('DEMO-AEROLUX', 'AeroLux Executive'),
  ('DEMO-ORBIT', 'Orbit Charter'),
  ('DEMO-VALE', 'Vale Azul Aviação')
on conflict (client_code) do nothing;

insert into public.employees (employee_code, display_name, job_title, primary_airport_id, can_support_accessibility)
values
  ('DEMO-EMP-ANA', 'Ana Monteiro', 'Agente de atendimento', (select id from public.airports where iata_code = 'GRU'), true),
  ('DEMO-EMP-BRUNO', 'Bruno Vieira', 'Supervisor de pátio', (select id from public.airports where iata_code = 'GRU'), false),
  ('DEMO-EMP-CAIO', 'Caio Nunes', 'Agente de atendimento', (select id from public.airports where iata_code = 'VCP'), true)
on conflict (employee_code) do nothing;

insert into public.service_catalog (service_code, name, description, default_price_cents, supports_accessibility)
values
  ('MEET-ASSIST', 'Meet & Assist', 'Recepção e acompanhamento operacional.', 25000, false),
  ('AIRCRAFT-RECEPTION', 'Receptivo de aeronave', 'Recepção operacional da aeronave.', 75000, false),
  ('QTU-QTA-CLEANING', 'Limpeza QTU/QTA', 'Limpeza de preparação e liberação.', 45000, false),
  ('PUSHBACK', 'Pushback', 'Apoio de pátio para pushback.', 90000, false),
  ('ACCESSIBILITY-SUPPORT', 'Apoio de acessibilidade', 'Apoio operacional com equipe habilitada.', 28000, true)
on conflict (service_code) do nothing;

insert into public.pay_periods (period_reference, starts_at, ends_at, status)
values
  ('DEMO-2026-09-B', '2026-09-16 00:00:00+00', '2026-09-30 23:59:59+00', 'closed'),
  ('DEMO-2026-10-A', '2026-10-01 00:00:00+00', '2026-10-15 23:59:59+00', 'open')
on conflict (period_reference) do nothing;

-- Twenty-two completed individual attendances at R$ 80,00 each for the documented close.
insert into public.bookings (
  booking_reference, client_id, airport_id, scheduled_start_at, scheduled_end_at, status, operational_note
)
select
  'DEMO-HIST-' || lpad(series.n::text, 2, '0'),
  (select id from public.clients where client_code = 'DEMO-AEROLUX'),
  (select id from public.airports where iata_code = case when series.n % 2 = 0 then 'VCP' else 'GRU' end),
  '2026-09-16 08:00:00+00'::timestamptz + (series.n - 1) * interval '6 hours',
  '2026-09-16 09:00:00+00'::timestamptz + (series.n - 1) * interval '6 hours',
  'completed',
  'Atendimento histórico sintético para fechamento demonstrativo.'
from generate_series(1, 22) as series(n)
on conflict (booking_reference) do nothing;

insert into public.booking_line_items (
  booking_id, service_catalog_id, service_name_snapshot, quantity, applied_unit_price_cents
)
select b.id, s.id, s.name, 1, s.default_price_cents
from public.bookings as b
cross join public.service_catalog as s
where b.booking_reference like 'DEMO-HIST-%'
  and s.service_code = 'MEET-ASSIST'
on conflict (booking_id, service_catalog_id) do nothing;

insert into public.attendances (
  booking_id, employee_id, assignment_role, status, payout_rate_cents, checked_in_at, completed_at, checkout_note
)
select
  b.id,
  (select id from public.employees where employee_code = 'DEMO-EMP-ANA'),
  'lead',
  'completed',
  8000,
  b.scheduled_start_at,
  b.scheduled_end_at,
  'Conclusão sintética para demonstração de fechamento.'
from public.bookings as b
where b.booking_reference like 'DEMO-HIST-%'
on conflict (booking_id, employee_id) do nothing;

insert into public.payouts (attendance_id, employee_id, pay_period_id, amount_cents, status)
select
  attendance.id,
  attendance.employee_id,
  (select id from public.pay_periods where period_reference = 'DEMO-2026-09-B'),
  8000,
  'paid'
from public.attendances as attendance
join public.bookings as booking on booking.id = attendance.booking_id
where booking.booking_reference like 'DEMO-HIST-%'
on conflict (attendance_id) do nothing;

insert into public.receivables (booking_id, client_id, amount_cents, status, issued_at)
select booking.id, booking.client_id, 25000, 'paid', booking.scheduled_end_at
from public.bookings as booking
where booking.booking_reference like 'DEMO-HIST-%'
on conflict (booking_id) do nothing;

-- The two adjustments reconcile the closed demonstration period to R$ 1.820,00.
insert into public.adjustments (
  pay_period_id, employee_id, kind, amount_cents, reason, recorded_by_label
)
select
  (select id from public.pay_periods where period_reference = 'DEMO-2026-09-B'),
  (select id from public.employees where employee_code = 'DEMO-EMP-ANA'),
  adjustment.kind::public.adjustment_kind,
  adjustment.amount_cents,
  adjustment.reason,
  'Financeiro demonstrativo'
from (
  values
    ('bonus', 10000, 'Bonificação operacional demonstrativa'),
    ('deduction', 4000, 'Desconto operacional demonstrativo')
) as adjustment(kind, amount_cents, reason)
where not exists (
  select 1 from public.adjustments as existing
  where existing.pay_period_id = (select id from public.pay_periods where period_reference = 'DEMO-2026-09-B')
    and existing.employee_id = (select id from public.employees where employee_code = 'DEMO-EMP-ANA')
    and existing.kind = adjustment.kind::public.adjustment_kind
    and existing.reason = adjustment.reason
);

-- Open examples for the operational flows. No receivable exists until every attendance is completed through the RPC.
insert into public.bookings (
  booking_reference, client_id, airport_id, scheduled_start_at, scheduled_end_at, aircraft_reference,
  requires_accessible_service, status, operational_note
)
values
  ('DEMO-GRU-MA-001', (select id from public.clients where client_code = 'DEMO-ORBIT'),
   (select id from public.airports where iata_code = 'GRU'), '2026-10-11 13:00:00+00', '2026-10-11 15:00:00+00',
   null, false, 'scheduled', 'Meet & Assist sintético para o fluxo de campo.'),
  ('DEMO-GRU-AIRCRAFT-001', (select id from public.clients where client_code = 'DEMO-VALE'),
   (select id from public.airports where iata_code = 'GRU'), '2026-10-11 16:00:00+00', '2026-10-11 18:00:00+00',
   'PR-DEMO', false, 'scheduled', 'Operação sintética de aeronave com três serviços.'),
  ('DEMO-VCP-ACCESS-001', (select id from public.clients where client_code = 'DEMO-AEROLUX'),
   (select id from public.airports where iata_code = 'VCP'), '2026-10-11 18:30:00+00', '2026-10-11 20:00:00+00',
   null, true, 'scheduled', 'Planejamento de acessibilidade; sem dados de passageiro.')
on conflict (booking_reference) do nothing;

insert into public.booking_line_items (booking_id, service_catalog_id, service_name_snapshot, quantity, applied_unit_price_cents)
select b.id, s.id, s.name, 1, s.default_price_cents
from public.bookings as b
join public.service_catalog as s on (
  (b.booking_reference = 'DEMO-GRU-MA-001' and s.service_code = 'MEET-ASSIST')
  or (b.booking_reference = 'DEMO-GRU-AIRCRAFT-001' and s.service_code in ('AIRCRAFT-RECEPTION', 'QTU-QTA-CLEANING', 'PUSHBACK'))
  or (b.booking_reference = 'DEMO-VCP-ACCESS-001' and s.service_code = 'ACCESSIBILITY-SUPPORT')
)
where b.booking_reference in ('DEMO-GRU-MA-001', 'DEMO-GRU-AIRCRAFT-001', 'DEMO-VCP-ACCESS-001')
on conflict (booking_id, service_catalog_id) do nothing;

insert into public.attendances (booking_id, employee_id, assignment_role, status, payout_rate_cents)
values
  ((select id from public.bookings where booking_reference = 'DEMO-GRU-MA-001'),
   (select id from public.employees where employee_code = 'DEMO-EMP-ANA'), 'lead', 'scheduled', 8000),
  ((select id from public.bookings where booking_reference = 'DEMO-GRU-AIRCRAFT-001'),
   (select id from public.employees where employee_code = 'DEMO-EMP-BRUNO'), 'lead', 'scheduled', 8000),
  ((select id from public.bookings where booking_reference = 'DEMO-GRU-AIRCRAFT-001'),
   (select id from public.employees where employee_code = 'DEMO-EMP-ANA'), 'support', 'scheduled', 8000),
  ((select id from public.bookings where booking_reference = 'DEMO-VCP-ACCESS-001'),
   (select id from public.employees where employee_code = 'DEMO-EMP-CAIO'), 'lead', 'scheduled', 8000)
on conflict (booking_id, employee_id) do nothing;

commit;

-- Expected closed-period reconciliation: 22 * 8,000 + 10,000 - 4,000 = 182,000 cents (R$ 1.820,00).

