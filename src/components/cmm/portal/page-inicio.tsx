import { useMemo } from 'react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarDays, ChevronRight, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookings, useClients, useFinance, useTeam } from './data';
import { STATUS, bookingStatus, fmtTime, money, todayIso, type PageProps, type Row } from './lib';
import { Avatar, EmptyState, Kpi, ListSkeleton, Panel, Pill, SectionTitle } from './ui';

export function InicioPage({ profile, go }: PageProps) {
  const { data: bookings = [], isLoading } = useBookings();
  const { data: clients = [] } = useClients();
  const { data: team = [] } = useTeam();
  const { data: finance } = useFinance();

  const now = new Date();
  const today = todayIso();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = (profile.display_name || '').split(' ')[0] || 'equipe';

  const enriched = useMemo(() => bookings.map((b) => ({ b, st: bookingStatus(b, b.sessions, now) })), [bookings]);
  const todays = enriched.filter((x) => x.b.scheduled_date === today);
  const weekEnd = format(addDays(now, 6), 'yyyy-MM-dd');
  const week = enriched.filter((x) => x.b.scheduled_date >= today && x.b.scheduled_date <= weekEnd);
  const inProgress = enriched.filter((x) => x.st === 'andamento');
  const overdue = enriched.filter((x) => x.st === 'atrasado');
  const unstaffed = enriched.filter((x) => x.b.scheduled_date >= today && x.b.sessions.length === 0);
  const pendingR = (finance?.receivables || []).filter((r) => r.status === 'pending');
  const pendingP = (finance?.payouts || []).filter((r) => r.status === 'pending');
  const sumR = pendingR.reduce((s, r) => s + Number(r.amount_cents), 0);

  const chart = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => {
        const d = addDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        const day = bookings.filter((b) => b.scheduled_date === key);
        return { label: format(d, 'dd/MM'), weekday: format(d, 'EEE', { locale: ptBR }), GRU: day.filter((b) => b.base === 'GRU').length, VCP: day.filter((b) => b.base === 'VCP').length };
      }),
    [bookings],
  );

  const alerts: { text: string; action: string; to: () => void }[] = [];
  if (overdue.length) alerts.push({ text: `${overdue.length} ${overdue.length === 1 ? 'atendimento passou' : 'atendimentos passaram'} do horário sem check-in.`, action: 'Ver agenda', to: () => go('agenda') });
  if (unstaffed.length) alerts.push({ text: `${unstaffed.length} ${unstaffed.length === 1 ? 'agendamento sem equipe designada' : 'agendamentos sem equipe designada'}.`, action: 'Ver agenda', to: () => go('agenda') });
  if (pendingP.length) alerts.push({ text: `${pendingP.length} ${pendingP.length === 1 ? 'repasse aguardando pagamento' : 'repasses aguardando pagamento'}.`, action: 'Ver financeiro', to: () => go('financeiro') });

  return (
    <>
      <div className="mb-6">
        <h1 style={{ fontSize: 26, fontWeight: 650, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{greeting}, {first}</h1>
        <div className="mt-1 text-sm capitalize text-slate-500">{format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <div key={a.text} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <span className="flex items-center gap-2"><TriangleAlert className="size-4 shrink-0" />{a.text}</span>
              <Button size="sm" variant="outline" className="border-amber-300 bg-white" onClick={a.to}>{a.action}</Button>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Atendimentos hoje" value={todays.length} hint={`${todays.filter((x) => x.st === 'concluido').length} concluídos`} />
        <Kpi label="Próximos 7 dias" value={week.length} hint={`${clients.length} ${clients.length === 1 ? 'cliente' : 'clientes'} • ${team.filter((m: Row) => m.active).length} colaboradores ativos`} />
        <Kpi label="Em andamento agora" value={inProgress.length} hint={inProgress.length ? 'Com check-in e sem saída' : 'Nenhum atendimento em curso'} />
        <Kpi label="A receber" value={money(sumR)} hint={`${pendingR.length} ${pendingR.length === 1 ? 'recebível pendente' : 'recebíveis pendentes'}`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section>
          <SectionTitle aside={<Button variant="ghost" size="sm" onClick={() => go('agenda')}>Abrir agenda<ChevronRight className="ml-1 size-4" /></Button>}>Agenda de hoje</SectionTitle>
          <Panel>
            {isLoading ? <ListSkeleton rows={4} /> : todays.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nenhum atendimento hoje" description="Os atendimentos agendados para hoje aparecem aqui, com a situação de cada um." />
            ) : (
              todays.map(({ b, st }) => (
                <div key={b.id} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
                  <span className="w-12 text-[15px] font-semibold tabular-nums">{fmtTime(b.scheduled_time)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{b.client_name}</span><span className="block truncate text-xs text-slate-500">{b.service_summary}</span></span>
                  <span className="hidden -space-x-2 sm:flex">{b.sessions.slice(0, 3).map((s: Row) => <Avatar key={s.id} name={s.collaborator_name} size="sm" ring />)}</span>
                  <Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill>
                </div>
              ))
            )}
          </Panel>
        </section>

        <section>
          <SectionTitle aside={<span className="flex items-center gap-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary" />GRU</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brand" />VCP</span></span>}>Carga dos próximos 14 dias</SectionTitle>
          <Panel className="p-4">
            <div className="h-60" role="img" aria-label="Gráfico de atendimentos por dia nos próximos 14 dias, por base">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} labelFormatter={(l, p) => `${(p?.[0]?.payload as Row | undefined)?.weekday ?? ''}, ${l}`} />
                  <Bar dataKey="GRU" stackId="a" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="VCP" stackId="a" fill="var(--brand)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>
      </div>
    </>
  );
}
