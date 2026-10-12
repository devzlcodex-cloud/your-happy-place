import { useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { CalendarDays, ChevronRight, Clock, Download, Plus, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useBookingExtra, useBookings, useClients, useRpc, useServices, useTeam } from './data';
import { BASES, STATUS, bookingStatus, dayParts, downloadCsv, fmtDate, fmtDateTime, fmtTime, money, todayIso, type Booking, type BookingStatus, type PageProps, type Row } from './lib';
import { Avatar, DetailSheet, EmptyState, ErrorState, Field, FormSheet, ListSkeleton, NativeSelect, Panel, PageHeader, Pill, SearchBox, SectionTitle, Segmented } from './ui';

type Period = 'today' | 'week' | 'month' | 'all';

export function AgendaPage({ profile, intent, clearIntent }: PageProps) {
  const isGestor = profile.role === 'gestor';
  const { data: bookings = [], isLoading, error, refetch } = useBookings();
  const [q, setQ] = useState('');
  const [base, setBase] = useState<'all' | 'GRU' | 'VCP'>('all');
  const [period, setPeriod] = useState<Period>('week');
  const [status, setStatus] = useState<'all' | BookingStatus>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (intent === 'booking' && isGestor) {
      setNewOpen(true);
      clearIntent();
    }
  }, [intent]);

  const now = new Date();
  const enriched = useMemo(() => bookings.map((b) => ({ b, st: bookingStatus(b, b.sessions, now) })), [bookings]);
  const overdue = enriched.filter((x) => x.st === 'atrasado').length;

  const filtered = useMemo(() => {
    const today = todayIso();
    const weekEnd = format(addDays(new Date(), 6), 'yyyy-MM-dd');
    const monthKey = today.slice(0, 7);
    const term = q.trim().toLowerCase();
    return enriched.filter(({ b, st }) => {
      if (base !== 'all' && b.base !== base) return false;
      if (status !== 'all' && st !== status) return false;
      if (period === 'today' && b.scheduled_date !== today) return false;
      if (period === 'week' && (b.scheduled_date < today || b.scheduled_date > weekEnd)) return false;
      if (period === 'month' && !String(b.scheduled_date).startsWith(monthKey)) return false;
      if (term) {
        const hay = [b.code, b.client_name, b.service_summary, ...b.sessions.map((s: Row) => s.collaborator_name)].join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [enriched, q, base, status, period]);

  const groups = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    filtered.forEach((x) => m.set(x.b.scheduled_date, [...(m.get(x.b.scheduled_date) || []), x]));
    return [...m.entries()];
  }, [filtered]);

  function exportCsv() {
    downloadCsv(`agenda-${todayIso()}.csv`, [
      ['Código', 'Data', 'Horário', 'Base', 'Cliente', 'Serviços', 'Equipe', 'Status'],
      ...filtered.map(({ b, st }) => [b.code, fmtDate(b.scheduled_date), fmtTime(b.scheduled_time), b.base, b.client_name, b.service_summary, b.sessions.map((s: Row) => s.collaborator_name).join(', '), STATUS[st].label]),
    ]);
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Atendimentos por data, base e equipe, com acompanhamento de check-in em tempo real."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-2 size-4" />Exportar</Button>
            {isGestor && <Button onClick={() => setNewOpen(true)}><Plus className="mr-2 size-4" />Novo agendamento</Button>}
          </>
        }
      />

      {overdue > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <span className="flex items-center gap-2"><TriangleAlert className="size-4 shrink-0" />{overdue === 1 ? '1 atendimento passou do horário sem check-in.' : `${overdue} atendimentos passaram do horário sem check-in.`}</span>
          <Button size="sm" variant="outline" className="border-rose-300 bg-white" onClick={() => { setPeriod('all'); setStatus('atrasado'); }}>Ver atrasados</Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por código, cliente, serviço ou colaborador" />
        <Segmented label="Período" value={period} onChange={setPeriod} options={[{ value: 'today', label: 'Hoje' }, { value: 'week', label: '7 dias' }, { value: 'month', label: 'Mês' }, { value: 'all', label: 'Tudo' }]} />
        <Segmented label="Base" value={base} onChange={setBase} options={[{ value: 'all', label: 'Todas' }, { value: 'GRU', label: 'GRU' }, { value: 'VCP', label: 'VCP' }]} />
        <div className="w-44">
          <NativeSelect aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as 'all' | BookingStatus)}>
            <option value="all">Todos os status</option>
            {(Object.keys(STATUS) as BookingStatus[]).map((k) => <option key={k} value={k}>{STATUS[k].label}</option>)}
          </NativeSelect>
        </div>
      </div>

      <Panel>
        {isLoading ? (
          <ListSkeleton />
        ) : error ? (
          <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={bookings.length ? 'Nenhum atendimento com estes filtros' : 'Nenhum atendimento agendado'}
            description={bookings.length ? 'Ajuste o período, a base ou o status para ver outros atendimentos.' : isGestor ? 'Cadastre clientes e serviços e crie o primeiro agendamento.' : 'Quando a coordenação designar você a um atendimento, ele aparecerá aqui.'}
            action={isGestor && !bookings.length ? <Button onClick={() => setNewOpen(true)}>Novo agendamento</Button> : undefined}
          />
        ) : (
          groups.map(([date, items]) => {
            const d = dayParts(date);
            return (
              <section key={date}>
                <header className="sticky top-14 z-[1] flex items-baseline gap-2 border-b bg-slate-50/95 px-4 py-2 backdrop-blur">
                  <span className="text-sm font-semibold text-slate-900">{d.rel}</span>
                  <span className="text-xs text-slate-500">{d.full}</span>
                  <span className="ml-auto text-xs text-slate-500">{items.length} {items.length === 1 ? 'atendimento' : 'atendimentos'}</span>
                </header>
                {items.map(({ b, st }) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setOpenId(b.id)}
                    className="grid w-full grid-cols-[56px_1fr_auto] items-center gap-3 border-b px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none sm:grid-cols-[64px_1.6fr_1fr_64px_120px_20px] sm:gap-4"
                  >
                    <span className="text-[15px] font-semibold tabular-nums text-slate-900">{fmtTime(b.scheduled_time)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">{b.client_name}</span>
                      <span className="block truncate text-xs text-slate-500">{b.service_summary}</span>
                    </span>
                    <span className="hidden items-center sm:flex">
                      {b.sessions.length ? (
                        <span className="flex -space-x-2">
                          {b.sessions.slice(0, 3).map((s: Row) => <Avatar key={s.id} name={s.collaborator_name} size="sm" ring />)}
                          {b.sessions.length > 3 && <span className="grid size-7 place-items-center rounded-full bg-slate-100 text-[11px] font-medium text-slate-600 ring-2 ring-white">+{b.sessions.length - 3}</span>}
                        </span>
                      ) : <span className="text-xs text-amber-700">Sem equipe</span>}
                    </span>
                    <span className="hidden sm:block"><Pill tone="brand">{b.base}</Pill></span>
                    <span className="justify-self-end sm:justify-self-start"><Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill></span>
                    <ChevronRight className="hidden size-4 text-slate-300 sm:block" />
                  </button>
                ))}
              </section>
            );
          })
        )}
      </Panel>

      <BookingDetail id={openId} booking={bookings.find((b) => b.id === openId) || null} isGestor={isGestor} onClose={() => setOpenId(null)} />
      {isGestor && <NewBookingSheet open={newOpen} onOpenChange={setNewOpen} bookings={bookings} />}
    </>
  );
}

function BookingDetail({ id, booking, isGestor, onClose }: { id: string | null; booking: Booking | null; isGestor: boolean; onClose: () => void }) {
  const rpc = useRpc();
  const { data, isLoading } = useBookingExtra(id, isGestor);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setNote(''), [id]);
  const st = booking ? bookingStatus(booking, booking.sessions) : 'agendado';
  const total = (data?.services || []).reduce((s: number, x: Row) => s + Number(x.price_cents || 0), 0);

  async function addNote() {
    if (!id || note.trim().length < 2) return;
    setBusy(true);
    const ok = await rpc('add_observation', { _booking_id: id, _body: note.trim() }, 'Observação registrada.', ['booking-extra']);
    setBusy(false);
    if (ok) setNote('');
  }

  return (
    <DetailSheet
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      wide
      title={booking ? <span className="flex items-center gap-3">{booking.client_name}<Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill></span> : 'Atendimento'}
      description={booking ? `${booking.code} • ${dayParts(booking.scheduled_date).rel}, ${fmtDate(booking.scheduled_date)} às ${fmtTime(booking.scheduled_time)} • Base ${booking.base}` : undefined}
    >
      {booking && (
        <>
          <section>
            <SectionTitle>Serviços</SectionTitle>
            {isGestor ? (
              isLoading ? <div className="text-sm text-slate-500">Carregando…</div> : (
                <div className="divide-y rounded-lg border">
                  {(data?.services || []).map((s: Row) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><span>{s.service_name}</span><span className="tabular-nums text-slate-700">{money(s.price_cents)}</span></div>
                  ))}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 text-sm font-semibold"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
                </div>
              )
            ) : <div className="text-sm text-slate-700">{booking.service_summary}</div>}
          </section>

          <section>
            <SectionTitle>Equipe e registro de presença</SectionTitle>
            {booking.sessions.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Nenhum colaborador designado para este atendimento.</div>
            ) : (
              <div className="divide-y rounded-lg border">
                {booking.sessions.map((s: Row) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={s.collaborator_name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.collaborator_name}</div>
                      <div className="text-xs text-slate-500">{s.is_lead ? 'Responsável' : 'Apoio'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <div className="flex items-center justify-end gap-1"><Clock className="size-3" />Entrada: {s.check_in_at ? fmtDateTime(s.check_in_at) : 'pendente'}</div>
                      <div className="mt-0.5">Saída: {s.check_out_at ? fmtDateTime(s.check_out_at) : 'pendente'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {booking.details && (booking.details.aircraft || booking.details.accessibility || booking.details.note) && (
            <section>
              <SectionTitle>Informações operacionais</SectionTitle>
              <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
                {booking.details.aircraft && <div><dt className="text-xs text-slate-500">Aeronave</dt><dd className="mt-0.5 font-medium">{booking.details.aircraft}</dd></div>}
                {booking.details.accessibility && <div><dt className="text-xs text-slate-500">Acessibilidade</dt><dd className="mt-0.5 font-medium">{booking.details.accessibility}</dd></div>}
                {booking.details.note && <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Observação do agendamento</dt><dd className="mt-0.5">{booking.details.note}</dd></div>}
              </dl>
            </section>
          )}

          <section>
            <SectionTitle>Observações</SectionTitle>
            <div className="flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Registre uma ocorrência ou orientação para a equipe" className="min-h-[72px] bg-white" />
              <Button onClick={() => void addNote()} disabled={busy || note.trim().length < 2} className="self-end">Registrar</Button>
            </div>
            <ul className="mt-4 space-y-3">
              {(data?.observations || []).map((o: Row) => (
                <li key={o.id} className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <div className="text-slate-800">{o.body}</div>
                  <div className="mt-1.5 text-xs text-slate-500">{o.author_name} em {fmtDateTime(o.created_at)}</div>
                </li>
              ))}
              {!isLoading && !(data?.observations || []).length && <li className="text-sm text-slate-500">Nenhuma observação registrada.</li>}
            </ul>
          </section>
        </>
      )}
    </DetailSheet>
  );
}

const EMPTY = { clientId: '', base: 'GRU', day: '', time: '', picked: [] as string[], lead: '', support: '', aircraft: '', accessibility: '', note: '' };

function NewBookingSheet({ open, onOpenChange, bookings }: { open: boolean; onOpenChange: (o: boolean) => void; bookings: Booking[] }) {
  const rpc = useRpc();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: team = [] } = useTeam();
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF({ ...EMPTY, day: todayIso() });
      setErrors({});
    }
  }, [open]);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((s) => ({ ...s, [k]: v }));

  const activeServices = services.filter((s: Row) => s.active);
  const people = team.filter((m: Row) => m.active);
  const total = activeServices.filter((s: Row) => f.picked.includes(s.id)).reduce((sum: number, s: Row) => sum + Number(s.price_cents), 0);
  const conflicts = useMemo(() => {
    if (!f.day || !f.time) return [] as string[];
    const out: string[] = [];
    [f.lead, f.support].filter(Boolean).forEach((id) => {
      const hit = bookings.find((b) => b.scheduled_date === f.day && fmtTime(b.scheduled_time) === f.time && b.sessions.some((s: Row) => s.team_member_id === id));
      const person = people.find((m: Row) => m.id === id);
      if (hit && person) out.push(`${person.name} já tem o atendimento ${hit.code} neste horário.`);
    });
    return out;
  }, [f.day, f.time, f.lead, f.support, bookings, people]);

  const baseTeam = people.filter((m: Row) => m.base === f.base);
  const options = (placeholder: string) => (
    <>
      <option value="">{placeholder}</option>
      {baseTeam.map((m: Row) => <option key={m.id} value={m.id}>{m.name}{m.job_title ? ` (${m.job_title})` : ''}</option>)}
    </>
  );

  async function submit() {
    const e: Record<string, string> = {};
    if (!f.clientId) e.clientId = 'Selecione o cliente.';
    if (!f.day) e.day = 'Informe a data.';
    if (!f.time) e.time = 'Informe o horário.';
    if (!f.picked.length) e.picked = 'Selecione pelo menos um serviço.';
    if (!f.lead) e.lead = 'Selecione o responsável pelo atendimento.';
    if (f.lead && f.lead === f.support) e.support = 'O apoio deve ser diferente do responsável.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await rpc(
      'create_booking',
      { _client_id: f.clientId, _base: f.base, _date: f.day, _time: f.time, _service_ids: f.picked, _lead_id: f.lead || null, _support_id: f.support || null, _aircraft: f.aircraft.trim(), _note: f.note.trim(), _accessibility: f.accessibility.trim() },
      'Agendamento criado.',
      ['bookings'],
    );
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} wide title="Novo agendamento" description="Defina cliente, horário, serviços e equipe. O código é gerado automaticamente." onSubmit={() => void submit()} submitLabel="Criar agendamento" busy={busy}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" id="b-client" required error={errors.clientId} hint={!clients.length ? 'Cadastre um cliente na aba Clientes antes de agendar.' : undefined} className="sm:col-span-2">
          <NativeSelect id="b-client" value={f.clientId} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clients.map((c: Row) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Data" id="b-day" required error={errors.day}><Input id="b-day" type="date" value={f.day} onChange={(e) => set('day', e.target.value)} /></Field>
        <Field label="Horário" id="b-time" required error={errors.time}><Input id="b-time" type="time" value={f.time} onChange={(e) => set('time', e.target.value)} /></Field>
        <Field label="Base" id="b-base" className="sm:col-span-2">
          <Segmented label="Base" value={f.base as 'GRU' | 'VCP'} onChange={(v) => setF((s) => ({ ...s, base: v, lead: '', support: '' }))} options={BASES.map((b) => ({ value: b, label: b }))} />
        </Field>
      </div>

      <div>
        <SectionTitle aside={<span className="text-sm font-semibold tabular-nums text-slate-900">Total {money(total)}</span>}>Serviços</SectionTitle>
        {activeServices.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-slate-500">Nenhum serviço ativo. Cadastre serviços na aba Serviços.</div>
        ) : (
          <div className="divide-y rounded-lg border">
            {activeServices.map((s: Row) => {
              const on = f.picked.includes(s.id);
              return (
                <label key={s.id} className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors', on ? 'bg-brand-soft/60' : 'hover:bg-slate-50')}>
                  <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={() => set('picked', on ? f.picked.filter((x) => x !== s.id) : [...f.picked, s.id])} />
                  <span className="flex-1">{s.name}</span>
                  <span className="tabular-nums text-slate-600">{money(s.price_cents)}</span>
                </label>
              );
            })}
          </div>
        )}
        {errors.picked && <div role="alert" className="mt-1.5 text-xs text-rose-600">{errors.picked}</div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsável" id="b-lead" required error={errors.lead} hint={!baseTeam.length ? `Nenhum colaborador ativo na base ${f.base}.` : undefined}>
          <NativeSelect id="b-lead" value={f.lead} onChange={(e) => set('lead', e.target.value)}>{options('Selecione o responsável')}</NativeSelect>
        </Field>
        <Field label="Apoio" id="b-support" error={errors.support} hint="Opcional. Apenas colaboradores da base escolhida.">
          <NativeSelect id="b-support" value={f.support} onChange={(e) => set('support', e.target.value)}>{options('Sem apoio')}</NativeSelect>
        </Field>
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-2">
            {conflicts.map((c) => <div key={c} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{c}</div>)}
          </div>
        )}
        <Field label="Aeronave" id="b-aircraft"><Input id="b-aircraft" maxLength={80} value={f.aircraft} onChange={(e) => set('aircraft', e.target.value)} placeholder="Prefixo ou modelo. Ex.: PT-MUA" /></Field>
        <Field label="Acessibilidade" id="b-access"><Input id="b-access" maxLength={160} value={f.accessibility} onChange={(e) => set('accessibility', e.target.value)} placeholder="Ex.: cadeira de rodas até o portão" /></Field>
        <Field label="Observações" id="b-note" className="sm:col-span-2"><Textarea id="b-note" maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} className="min-h-[80px]" /></Field>
      </div>
    </FormSheet>
  );
}
