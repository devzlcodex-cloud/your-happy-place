import { useMemo, useState } from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookings, useMonthSummary } from './data';
import { EvidenceSection, FlightBadge, FlightSection, OfflineSync, useFieldAction } from './ops-extras';
import { STATUS, bookingStatus, dayParts, fmtDateTime, fmtTime, money, type Booking, type PageProps, type Row } from './lib';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, Kpi, ListSkeleton, PageHeader, Pill, SectionTitle } from './ui';

export function CampoPage({ profile }: PageProps) {
  const act = useFieldAction();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: bookings = [], isLoading, error, refetch } = useBookings();
  const { data: summary } = useMonthSummary(profile);
  const [finish, setFinish] = useState<{ sessionId: string; label: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const mine = useMemo(
    () =>
      bookings
        .map((b) => ({ b, own: b.sessions.find((s: Row) => s.team_member_id === profile.team_member_id) as Row | undefined }))
        .filter((x) => x.own)
        .map((x) => ({ ...x, st: bookingStatus(x.b, [x.own as Row]) })),
    [bookings, profile.team_member_id],
  );
  const active = mine.filter((x) => x.own?.check_in_at && !x.own?.check_out_at);
  const upcoming = mine.filter((x) => !x.own?.check_in_at);
  const done = mine.filter((x) => x.own?.check_out_at).slice().reverse().slice(0, 8);

  async function checkIn(sessionId: string) {
    setBusyId(sessionId);
    await act('check_in', { _session_id: sessionId }, 'Check-in registrado.', 'Check-in');
    setBusyId(null);
  }

  const card = ({ b, own, st }: { b: Booking; own?: Row; st: ReturnType<typeof bookingStatus> }) => {
    const d = dayParts(b.scheduled_date);
    const mates = b.sessions.filter((s: Row) => s.id !== own?.id);
    return (
      <article key={b.id} className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-slate-500">{d.rel}, {d.full} • Base {b.base}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{fmtTime(b.scheduled_time)}</div>
          </div>
          <Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill>
        </div>
        <div role="heading" aria-level={3} className="mt-3 text-[15px] font-semibold text-slate-900">{b.client_name}</div>
        <div className="text-sm text-slate-600">{b.service_summary}</div>
        {b.flight && <div className="mt-2"><FlightBadge flight={b.flight} /></div>}
        {b.details && (b.details.aircraft || b.details.accessibility || b.details.note) && (
          <dl className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-sm">
            {b.details.aircraft && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Aeronave</dt><dd className="font-medium">{b.details.aircraft}</dd></div>}
            {b.details.accessibility && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Acessibilidade</dt><dd>{b.details.accessibility}</dd></div>}
            {b.details.note && <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">Observação</dt><dd>{b.details.note}</dd></div>}
          </dl>
        )}
        {mates.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500"><span className="flex -space-x-2">{mates.map((s: Row) => <Avatar key={s.id} name={s.collaborator_name} size="sm" ring />)}</span>Com {mates.map((s: Row) => s.collaborator_name).join(', ')}</div>
        )}
        {own?.check_in_at && <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Clock className="size-3" />Entrada {fmtDateTime(own.check_in_at)}{own.check_out_at ? ` • Saída ${fmtDateTime(own.check_out_at)}` : ''}</div>}
        {own && !own.check_out_at && (
          <Button variant="ghost" className="mt-3 h-10 w-full" onClick={() => setOpenId(openId === b.id ? null : b.id)}>{openId === b.id ? 'Ocultar voo e evidências' : 'Voo, portão e evidências'}</Button>
        )}
        {openId === b.id && <div className="mt-3 space-y-5 border-t pt-4"><FlightSection booking={b} /><EvidenceSection bookingId={b.id} /></div>}
        {own && !own.check_in_at && <Button className="mt-4 h-12 w-full text-base" disabled={busyId === own.id} onClick={() => void checkIn(own.id)}>{busyId === own.id ? 'Registrando…' : 'Registrar check-in'}</Button>}
        {own && own.check_in_at && !own.check_out_at && <Button className="mt-4 h-12 w-full text-base" variant="outline" onClick={() => setFinish({ sessionId: own.id, label: `${b.client_name} (${b.code})` })}>Finalizar atendimento</Button>}
      </article>
    );
  };

  return (
    <>
      <PageHeader title="Meus atendimentos" description="Seus atendimentos designados. Registre a entrada ao iniciar e a saída ao concluir." />
      <OfflineSync />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Concluídos no mês" value={summary?.completed_count ?? '—'} />
        <Kpi label="Próximos atendimentos" value={summary?.upcoming_count ?? '—'} />
        <Kpi label="Repasse acumulado" value={summary ? money(summary.completed_cents) : '—'} />
        <Kpi label="Projeção do mês" value={summary ? money(summary.projected_cents) : '—'} />
      </div>
      {isLoading ? <ListSkeleton rows={3} /> : error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : mine.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhum atendimento designado" description="Quando a coordenação designar você a um atendimento, ele aparecerá aqui." />
      ) : (
        <div className="space-y-8">
          {active.length > 0 && <section><SectionTitle>Em andamento</SectionTitle><div className="grid gap-3 lg:grid-cols-2">{active.map(card)}</div></section>}
          {upcoming.length > 0 && <section><SectionTitle>Próximos</SectionTitle><div className="grid gap-3 lg:grid-cols-2">{upcoming.map(card)}</div></section>}
          {done.length > 0 && <section><SectionTitle>Concluídos recentemente</SectionTitle><div className="grid gap-3 lg:grid-cols-2">{done.map(card)}</div></section>}
        </div>
      )}
      <ConfirmDialog
        open={!!finish}
        onOpenChange={(o) => !o && setFinish(null)}
        title="Finalizar atendimento"
        description={finish ? `Registrar a saída do atendimento ${finish.label}? O horário fica gravado e gera o repasse correspondente.` : ''}
        confirmLabel="Registrar saída"
        onConfirm={async () => {
          if (finish) await act('check_out', { _session_id: finish.sessionId }, 'Atendimento finalizado.', `Checkout ${finish.label}`);
        }}
      />
    </>
  );
}
