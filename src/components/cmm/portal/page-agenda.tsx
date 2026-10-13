import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { CalendarDays, ChevronRight, Clock, Download, LogIn, LogOut, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { db, friendlyError, useBookingExtra, useBookings, useClients, useRpc, useServices, useTeam } from './data';
import { BASES, STATUS, bookingStatus, dayParts, downloadCsv, fmtDate, fmtDateTime, fmtTime, money, nowLocalInput, todayIso, type Booking, type BookingStatus, type PageProps, type Row } from './lib';
import { EventTimeline, EvidenceSection, FlightBadge, FlightSection } from './ops-extras';
import { Avatar, ConfirmDialog, DetailSheet, EmptyState, ErrorState, Field, FormSheet, ListSkeleton, NativeSelect, Panel, PageHeader, Pill, SearchBox, SectionTitle, Segmented } from './ui';

type Period = 'today' | 'week' | 'month' | 'all';
const REFRESH = ['bookings', 'booking-extra', 'events', 'evidence', 'finance', 'month-summary'];

export function AgendaPage({ profile, intent, clearIntent }: PageProps) {
  const isGestor = profile.role === 'gestor';
  const { data: bookings = [], isLoading, error, refetch } = useBookings();
  const [q, setQ] = useState('');
  const [base, setBase] = useState<'all' | 'GRU' | 'VCP'>('all');
  const [period, setPeriod] = useState<Period>('week');
  const [status, setStatus] = useState<'all' | BookingStatus>('all');
  const [sheet, setSheet] = useState<{ editing: Booking | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (intent === 'booking' && isGestor) {
      setSheet({ editing: null });
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
            {isGestor && <Button onClick={() => setSheet({ editing: null })}><Plus className="mr-2 size-4" />Novo agendamento</Button>}
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
            action={isGestor && !bookings.length ? <Button onClick={() => setSheet({ editing: null })}>Novo agendamento</Button> : undefined}
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
                      {b.flight && <span className="mt-0.5 block"><FlightBadge flight={b.flight} /></span>}
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

      <BookingDetail
        id={openId}
        booking={bookings.find((b) => b.id === openId) || null}
        isGestor={isGestor}
        onClose={() => setOpenId(null)}
        onEdit={(b) => {
          setOpenId(null);
          setSheet({ editing: b });
        }}
      />
      {isGestor && <BookingSheet open={!!sheet} onOpenChange={(o) => !o && setSheet(null)} bookings={bookings} editing={sheet?.editing || null} />}
    </>
  );
}

function BookingDetail({ id, booking, isGestor, onClose, onEdit }: { id: string | null; booking: Booking | null; isGestor: boolean; onClose: () => void; onEdit: (b: Booking) => void }) {
  const rpc = useRpc();
  const { data, isLoading } = useBookingExtra(id, isGestor);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [presence, setPresence] = useState<{ kind: 'in' | 'out'; sessions: Row[] } | null>(null);
  const [undo, setUndo] = useState<Row | null>(null);
  const [del, setDel] = useState(false);
  useEffect(() => setNote(''), [id]);
  const st = booking ? bookingStatus(booking, booking.sessions) : 'agendado';
  const total = (data?.services || []).reduce((s: number, x: Row) => s + Number(x.price_cents || 0), 0);
  const pendingIn = booking ? booking.sessions.filter((s: Row) => !s.check_in_at) : [];
  const pendingOut = booking ? booking.sessions.filter((s: Row) => s.check_in_at && !s.check_out_at) : [];

  async function addNote() {
    if (!id || note.trim().length < 2) return;
    setBusy(true);
    const ok = await rpc('add_observation', { _booking_id: id, _body: note.trim() }, 'Observação registrada.', ['booking-extra', 'events']);
    setBusy(false);
    if (ok) setNote('');
  }

  const bulk =
    isGestor && pendingIn.length > 1 ? (
      <Button size="sm" variant="outline" onClick={() => setPresence({ kind: 'in', sessions: pendingIn })}><LogIn className="mr-1.5 size-3.5" />Check-in de todos</Button>
    ) : isGestor && pendingIn.length === 0 && pendingOut.length > 1 ? (
      <Button size="sm" variant="outline" onClick={() => setPresence({ kind: 'out', sessions: pendingOut })}><LogOut className="mr-1.5 size-3.5" />Check-out de todos</Button>
    ) : undefined;

  return (
    <>
      <DetailSheet
        open={!!id}
        onOpenChange={(o) => !o && onClose()}
        wide
        title={booking ? <span className="flex items-center gap-3">{booking.client_name}<Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill></span> : 'Atendimento'}
        description={booking ? `${booking.code} • ${dayParts(booking.scheduled_date).rel}, ${fmtDate(booking.scheduled_date)} às ${fmtTime(booking.scheduled_time)} • Base ${booking.base}` : undefined}
      >
        {booking && (
          <>
            {isGestor && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => onEdit(booking)}><Pencil className="mr-2 size-3.5" />Editar agendamento</Button>
                <Button size="sm" variant="outline" className="text-rose-700 hover:text-rose-800" onClick={() => setDel(true)}><Trash2 className="mr-2 size-3.5" />Excluir</Button>
              </div>
            )}

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
              <SectionTitle aside={bulk}>Equipe e registro de presença</SectionTitle>
              {booking.sessions.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Nenhum colaborador designado para este atendimento.</div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {booking.sessions.map((s: Row) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Avatar name={s.collaborator_name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{s.collaborator_name}</div>
                        <div className="text-xs text-slate-500">{s.is_lead ? 'Responsável' : 'Apoio'}</div>
                      </div>
                      <div className="text-right text-xs text-slate-600">
                        <div className="flex items-center justify-end gap-1"><Clock className="size-3" />Entrada: {s.check_in_at ? fmtDateTime(s.check_in_at) : 'pendente'}</div>
                        <div className="mt-0.5">Saída: {s.check_out_at ? fmtDateTime(s.check_out_at) : 'pendente'}</div>
                      </div>
                      {isGestor && !s.check_in_at && <Button size="sm" onClick={() => setPresence({ kind: 'in', sessions: [s] })}><LogIn className="mr-1.5 size-3.5" />Check-in</Button>}
                      {isGestor && s.check_in_at && !s.check_out_at && (
                        <span className="flex gap-1.5">
                          <Button size="sm" onClick={() => setPresence({ kind: 'out', sessions: [s] })}><LogOut className="mr-1.5 size-3.5" />Check-out</Button>
                          <Button size="sm" variant="ghost" onClick={() => setUndo(s)}>Desfazer entrada</Button>
                        </span>
                      )}
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

            <FlightSection booking={booking} />
            <EvidenceSection bookingId={booking.id} />

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

            <EventTimeline bookingId={booking.id} />
          </>
        )}
      </DetailSheet>

      <PresenceSheet state={presence} onClose={() => setPresence(null)} />
      <ConfirmDialog
        open={!!undo}
        onOpenChange={(o) => !o && setUndo(null)}
        title="Desfazer check-in"
        description={undo ? `O check-in de ${undo.collaborator_name} será removido e o colaborador voltará a aguardar o início do atendimento.` : ''}
        confirmLabel="Desfazer check-in"
        onConfirm={async () => {
          if (undo) await rpc('gestor_undo_check_in', { _session_id: undo.id }, 'Check-in desfeito.', REFRESH);
        }}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        danger
        title="Excluir agendamento"
        description={booking ? `O agendamento ${booking.code} de ${booking.client_name} será removido definitivamente, junto com observações e histórico. Só é possível excluir atendimentos ainda não iniciados e sem lançamentos financeiros.` : ''}
        confirmLabel="Excluir agendamento"
        onConfirm={async () => {
          if (!booking) return;
          const ok = await rpc('delete_booking', { _id: booking.id }, 'Agendamento excluído.', REFRESH);
          if (ok) onClose();
        }}
      />
    </>
  );
}

function PresenceSheet({ state, onClose }: { state: { kind: 'in' | 'out'; sessions: Row[] } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [when, setWhen] = useState(nowLocalInput());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (state) {
      setWhen(nowLocalInput());
      setError('');
    }
  }, [state]);

  async function submit() {
    if (!state) return;
    const date = new Date(when);
    if (!when || Number.isNaN(date.getTime())) {
      setError('Informe a data e o horário.');
      return;
    }
    if (date.getTime() > Date.now() + 5 * 60 * 1000) {
      setError('O horário não pode estar no futuro.');
      return;
    }
    setError('');
    setBusy(true);
    const fn = state.kind === 'in' ? 'gestor_check_in' : 'gestor_check_out';
    let done = 0;
    for (const s of state.sessions) {
      const { error: e } = await db.rpc(fn, { _session_id: s.id, _at: date.toISOString() });
      if (e) {
        toast.error(friendlyError(e.message));
        break;
      }
      done += 1;
    }
    setBusy(false);
    if (done) {
      await Promise.all(REFRESH.map((k) => qc.invalidateQueries({ queryKey: [k] })));
      toast.success(state.kind === 'in' ? (done === 1 ? 'Check-in registrado.' : `${done} check-ins registrados.`) : done === 1 ? 'Check-out registrado.' : `${done} check-outs registrados.`);
    }
    if (done === state.sessions.length) onClose();
  }

  const names = state ? state.sessions.map((s) => s.collaborator_name).join(', ') : '';
  return (
    <FormSheet
      open={!!state}
      onOpenChange={(o) => !o && onClose()}
      title={state?.kind === 'out' ? 'Registrar check-out' : 'Registrar check-in'}
      description={state ? `${names}. O registro fica gravado com o seu usuário no histórico do atendimento.` : undefined}
      onSubmit={() => void submit()}
      submitLabel={state?.kind === 'out' ? 'Confirmar check-out' : 'Confirmar check-in'}
      busy={busy}
    >
      <Field label="Data e horário" id="p-when" required error={error} hint="Já preenchido com o horário atual. Altere se o registro estiver sendo feito depois do ocorrido.">
        <Input id="p-when" type="datetime-local" value={when} max={nowLocalInput()} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      {state?.kind === 'out' && <div className="rounded-lg border border-primary/20 bg-brand-soft px-4 py-3 text-sm text-primary">Ao concluir o check-out de toda a equipe, o recebível do atendimento e os repasses são gerados automaticamente.</div>}
    </FormSheet>
  );
}

const EMPTY = { clientId: '', base: 'GRU', day: '', time: '', picked: [] as string[], lead: '', support: '', aircraft: '', accessibility: '', note: '' };

function BookingSheet({ open, onOpenChange, bookings, editing }: { open: boolean; onOpenChange: (o: boolean) => void; bookings: Booking[]; editing: Booking | null }) {
  const rpc = useRpc();
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: team = [] } = useTeam();
  const { data: extra } = useBookingExtra(editing ? editing.id : null, true);
  const [f, setF] = useState(EMPTY);
  const [initFor, setInitFor] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const started = !!editing && editing.sessions.some((s: Row) => s.check_in_at);

  useEffect(() => {
    if (!open) {
      setInitFor('');
      return;
    }
    if (!editing) {
      if (initFor !== 'new') {
        setF({ ...EMPTY, day: todayIso() });
        setErrors({});
        setInitFor('new');
      }
      return;
    }
    if (extra && initFor !== editing.id) {
      const lead = editing.sessions.find((s: Row) => s.is_lead);
      const support = editing.sessions.find((s: Row) => !s.is_lead);
      setF({
        clientId: editing.client_id,
        base: editing.base,
        day: editing.scheduled_date,
        time: fmtTime(editing.scheduled_time),
        picked: extra.services.map((x: Row) => String(x.service_id)),
        lead: lead?.team_member_id || '',
        support: support?.team_member_id || '',
        aircraft: editing.details?.aircraft || '',
        accessibility: editing.details?.accessibility || '',
        note: editing.details?.note || '',
      });
      setErrors({});
      setInitFor(editing.id);
    }
  }, [open, editing, extra]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((s) => ({ ...s, [k]: v }));
  const attached = new Map<string, number>((extra?.services || []).map((x: Row): [string, number] => [String(x.service_id), Number(x.price_cents)]));
  const listServices = services.filter((s: Row) => s.active || attached.has(s.id));
  const people = team.filter((m: Row) => m.active);
  const total = listServices.filter((s: Row) => f.picked.includes(s.id)).reduce((sum: number, s: Row) => sum + (attached.get(s.id) ?? Number(s.price_cents)), 0);
  const conflicts = useMemo(() => {
    if (!f.day || !f.time) return [] as string[];
    const out: string[] = [];
    [f.lead, f.support].filter(Boolean).forEach((id) => {
      const hit = bookings.find((b) => b.id !== editing?.id && b.scheduled_date === f.day && fmtTime(b.scheduled_time) === f.time && b.sessions.some((s: Row) => s.team_member_id === id));
      const person = team.find((m: Row) => m.id === id);
      if (hit && person) out.push(`${person.name} já tem o atendimento ${hit.code} neste horário.`);
    });
    return out;
  }, [f.day, f.time, f.lead, f.support, bookings, team, editing]);

  const baseTeam = people.filter((m: Row) => m.base === f.base);
  const options = (placeholder: string) => (
    <>
      <option value="">{placeholder}</option>
      {(started ? team : baseTeam).map((m: Row) => <option key={m.id} value={m.id}>{m.name}{m.job_title ? ` (${m.job_title})` : ''}</option>)}
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
    const common = { _base: f.base, _date: f.day, _time: f.time, _service_ids: f.picked, _lead_id: f.lead || null, _support_id: f.support || null, _aircraft: f.aircraft.trim(), _note: f.note.trim(), _accessibility: f.accessibility.trim() };
    const ok = editing
      ? await rpc('update_booking', { _id: editing.id, ...common }, 'Agendamento atualizado.', REFRESH)
      : await rpc('create_booking', { _client_id: f.clientId, ...common }, 'Agendamento criado.', ['bookings']);
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  const lock = started ? 'pointer-events-none opacity-60' : '';
  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      wide
      title={editing ? `Editar agendamento ${editing.code}` : 'Novo agendamento'}
      description={editing ? 'Reagende, ajuste serviços e equipe ou atualize os detalhes operacionais.' : 'Defina cliente, horário, serviços e equipe. O código é gerado automaticamente.'}
      onSubmit={() => void submit()}
      submitLabel={editing ? 'Salvar alterações' : 'Criar agendamento'}
      busy={busy}
    >
      {started && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Este atendimento já foi iniciado. Apenas aeronave, acessibilidade e observação podem ser alteradas.</div>}
      {editing && !extra && <div className="text-sm text-slate-500">Carregando dados do agendamento…</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" id="b-client" required error={errors.clientId} hint={editing ? 'Para trocar o cliente, exclua o agendamento e crie outro.' : !clients.length ? 'Cadastre um cliente na aba Clientes antes de agendar.' : undefined} className="sm:col-span-2">
          <NativeSelect id="b-client" value={f.clientId} disabled={!!editing} onChange={(e) => set('clientId', e.target.value)}>
            <option value="">Selecione o cliente</option>
            {clients.map((c: Row) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Data" id="b-day" required error={errors.day}><Input id="b-day" type="date" value={f.day} disabled={started} onChange={(e) => set('day', e.target.value)} /></Field>
        <Field label="Horário" id="b-time" required error={errors.time}><Input id="b-time" type="time" value={f.time} disabled={started} onChange={(e) => set('time', e.target.value)} /></Field>
        <Field label="Base" id="b-base" className="sm:col-span-2">
          <div className={lock}><Segmented label="Base" value={f.base as 'GRU' | 'VCP'} onChange={(v) => setF((s) => ({ ...s, base: v, lead: '', support: '' }))} options={BASES.map((b) => ({ value: b, label: b }))} /></div>
        </Field>
      </div>

      <div>
        <SectionTitle aside={<span className="text-sm font-semibold tabular-nums text-slate-900">Total {money(total)}</span>}>Serviços</SectionTitle>
        {listServices.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-5 text-sm text-slate-500">Nenhum serviço ativo. Cadastre serviços na aba Serviços.</div>
        ) : (
          <div className={cn('divide-y rounded-lg border', lock)}>
            {listServices.map((s: Row) => {
              const on = f.picked.includes(s.id);
              return (
                <label key={s.id} className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors', on ? 'bg-brand-soft/60' : 'hover:bg-slate-50')}>
                  <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={() => set('picked', on ? f.picked.filter((x) => x !== s.id) : [...f.picked, s.id])} />
                  <span className="flex-1">{s.name}{!s.active && <span className="ml-2 text-xs text-slate-400">inativo</span>}</span>
                  <span className="tabular-nums text-slate-600">{money(attached.get(s.id) ?? s.price_cents)}</span>
                </label>
              );
            })}
          </div>
        )}
        {errors.picked && <div role="alert" className="mt-1.5 text-xs text-rose-600">{errors.picked}</div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Responsável" id="b-lead" required error={errors.lead} hint={!started && !baseTeam.length ? `Nenhum colaborador ativo na base ${f.base}.` : undefined}>
          <NativeSelect id="b-lead" value={f.lead} disabled={started} onChange={(e) => set('lead', e.target.value)}>{options('Selecione o responsável')}</NativeSelect>
        </Field>
        <Field label="Apoio" id="b-support" error={errors.support} hint="Opcional. Apenas colaboradores da base escolhida.">
          <NativeSelect id="b-support" value={f.support} disabled={started} onChange={(e) => set('support', e.target.value)}>{options('Sem apoio')}</NativeSelect>
        </Field>
        {conflicts.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:col-span-2">
            {conflicts.map((c) => <div key={c} className="flex items-start gap-2"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{c}</div>)}
          </div>
        )}
        <Field label="Aeronave" id="b-aircraft" hint="Prefixo, até 20 caracteres."><Input id="b-aircraft" maxLength={20} value={f.aircraft} onChange={(e) => set('aircraft', e.target.value)} placeholder="Ex.: PT-MUA" /></Field>
        <Field label="Acessibilidade" id="b-access"><Input id="b-access" maxLength={200} value={f.accessibility} onChange={(e) => set('accessibility', e.target.value)} placeholder="Ex.: cadeira de rodas até o portão" /></Field>
        <Field label="Observações" id="b-note" className="sm:col-span-2"><Textarea id="b-note" maxLength={500} value={f.note} onChange={(e) => set('note', e.target.value)} className="min-h-[80px]" /></Field>
      </div>
    </FormSheet>
  );
}
