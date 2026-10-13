import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Camera, CloudOff, History, Plane, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { db, friendlyError } from './data';
import { fmtDate, fmtDateTime, money, type Booking, type Row } from './lib';
import { Field, NativeSelect, Pill, SectionTitle } from './ui';

/* ---------- Flight ---------- */
type FS = { label: string; tone: 'neutral' | 'info' | 'success' | 'warn' | 'danger' };
const FLIGHT_DEFAULT: FS = { label: 'Previsto', tone: 'neutral' };
export const FLIGHT_STATUS: Record<string, FS> = {
  previsto: FLIGHT_DEFAULT,
  no_horario: { label: 'No horário', tone: 'success' },
  atrasado: { label: 'Atrasado', tone: 'warn' },
  pousou: { label: 'Pousou', tone: 'info' },
  decolou: { label: 'Decolou', tone: 'info' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
};
export const flightStatus = (k: unknown): FS => FLIGHT_STATUS[String(k)] ?? FLIGHT_DEFAULT;
export const TERMINALS: Record<string, string[]> = { GRU: ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Aviação geral'], VCP: ['Terminal 1', 'Aviação geral'] };

export function FlightBadge({ flight }: { flight?: Row | null }) {
  if (!flight) return null;
  const st = flightStatus(flight['flight_status']);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Plane className="size-3" />
      {flight.flight_number || 'Voo'}{flight.terminal ? ` • ${flight.terminal}` : ''}{flight.gate ? ` • Portão ${flight.gate}` : ''}
      <Pill tone={st.tone}>{st.label}</Pill>
    </span>
  );
}

export function FlightSection({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const fl = (booking as Row).flight as Row | null;
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ flight: '', airline: '', terminal: '', gate: '', status: 'previsto', eta: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setF({ flight: fl?.flight_number || '', airline: fl?.airline || '', terminal: fl?.terminal || '', gate: fl?.gate || '', status: fl?.flight_status || 'previsto', eta: fl?.eta ? String(fl.eta).slice(0, 5) : '' });
  }, [booking.id, fl?.updated_at]);

  async function save() {
    setBusy(true);
    const { error } = await db.rpc('set_flight_info', { _booking_id: booking.id, _flight: f.flight, _airline: f.airline, _terminal: f.terminal, _gate: f.gate, _status: f.status, _eta: f.eta || null });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    toast.success('Dados do voo atualizados.');
    setEdit(false);
    await Promise.all([qc.invalidateQueries({ queryKey: ['bookings'] }), qc.invalidateQueries({ queryKey: ['events'] })]);
  }

  return (
    <section>
      <SectionTitle aside={!edit && <Button size="sm" variant="outline" onClick={() => setEdit(true)}>{fl ? 'Atualizar' : 'Informar voo'}</Button>}>Voo e posição</SectionTitle>
      {edit ? (
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
          <Field label="Número do voo" id="fl-n"><Input id="fl-n" value={f.flight} maxLength={12} placeholder="Ex.: XY 1234" onChange={(e) => setF({ ...f, flight: e.target.value })} /></Field>
          <Field label="Companhia / operador" id="fl-a"><Input id="fl-a" value={f.airline} maxLength={60} onChange={(e) => setF({ ...f, airline: e.target.value })} /></Field>
          <Field label="Terminal" id="fl-t">
            <NativeSelect id="fl-t" value={f.terminal} onChange={(e) => setF({ ...f, terminal: e.target.value })}>
              <option value="">Não informado</option>
              {(TERMINALS[booking.base] || []).map((t) => <option key={t} value={t}>{t}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Portão / posição" id="fl-g"><Input id="fl-g" value={f.gate} maxLength={12} placeholder="Ex.: 305 ou remota R4" onChange={(e) => setF({ ...f, gate: e.target.value })} /></Field>
          <Field label="Status do voo" id="fl-s">
            <NativeSelect id="fl-s" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {Object.entries(FLIGHT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Horário estimado" id="fl-e"><Input id="fl-e" type="time" value={f.eta} onChange={(e) => setF({ ...f, eta: e.target.value })} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => setEdit(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={() => void save()}>{busy ? 'Salvando…' : 'Salvar'}</Button>
          </div>
        </div>
      ) : fl ? (
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Voo</dt><dd className="mt-0.5 font-medium">{fl.flight_number || '—'}{fl.airline ? ` · ${fl.airline}` : ''}</dd></div>
          <div><dt className="text-xs text-slate-500">Terminal / portão</dt><dd className="mt-0.5 font-medium">{fl.terminal || '—'}{fl.gate ? ` · ${fl.gate}` : ''}</dd></div>
          <div><dt className="text-xs text-slate-500">Status</dt><dd className="mt-0.5"><Pill tone={flightStatus(fl['flight_status']).tone} dot>{flightStatus(fl['flight_status']).label}</Pill>{fl.eta && <span className="ml-2 text-xs text-slate-500">ETA {String(fl.eta).slice(0, 5)}</span>}</dd></div>
          {fl.updated_by_name && <div className="text-xs text-slate-500 sm:col-span-3">Atualizado por {fl.updated_by_name} em {fmtDateTime(fl.updated_at)}</div>}
        </dl>
      ) : <div className="text-sm text-slate-500">Nenhum voo informado.</div>}
    </section>
  );
}

/* ---------- Evidence ---------- */
export function EvidenceSection({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['evidence', bookingId],
    queryFn: async () => {
      const { data, error } = await db.from('booking_evidence').select('id,storage_path,caption,author_name,created_at').eq('booking_id', bookingId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      const paths = (data || []).map((x: Row) => x.storage_path);
      const signed = paths.length ? (await db.storage.from('evidencias').createSignedUrls(paths, 3600)).data || [] : [];
      return (data || []).map((x: Row, i: number) => ({ ...x, url: signed[i]?.signedUrl }));
    },
  });

  async function upload(file: File) {
    if (!file.type.startsWith('image/')) return void toast.error('Envie uma imagem (foto do comprovante ou etiqueta).');
    if (file.size > 10 * 1024 * 1024) return void toast.error('A imagem deve ter até 10 MB.');
    setBusy(true);
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${bookingId}/${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from('evidencias').upload(path, file, { contentType: file.type });
    if (up.error) { setBusy(false); toast.error(friendlyError(up.error.message)); return; }
    const { error } = await db.rpc('add_evidence', { _booking_id: bookingId, _path: path, _caption: null });
    setBusy(false);
    if (error) { toast.error(friendlyError(error.message)); return; }
    toast.success('Evidência anexada.');
    await Promise.all([qc.invalidateQueries({ queryKey: ['evidence', bookingId] }), qc.invalidateQueries({ queryKey: ['events'] })]);
  }

  return (
    <section>
      <SectionTitle aside={<Button size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}><Camera className="mr-2 size-4" />{busy ? 'Enviando…' : 'Anexar foto'}</Button>}>Evidências do atendimento</SectionTitle>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }} />
      <div className="text-xs text-slate-500">Fotografe apenas comprovantes, etiquetas de bagagem ou o local. Não registre rostos nem documentos de passageiros.</div>
      {data.length ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {data.map((x: Row) => (
            <a key={x.id} href={x.url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-lg border">
              {x.url ? <img src={x.url} alt={`Evidência enviada por ${x.author_name}`} className="aspect-square w-full object-cover" loading="lazy" /> : <div className="aspect-square bg-slate-100" />}
              <span className="block truncate px-2 py-1 text-[11px] text-slate-500">{x.author_name} · {fmtDateTime(x.created_at)}</span>
            </a>
          ))}
        </div>
      ) : <div className="mt-2 text-sm text-slate-500">Nenhuma evidência anexada.</div>}
    </section>
  );
}

/* ---------- Event trail ---------- */
export const useEvents = (bookingId?: string | null, limit = 40) =>
  useQuery({
    queryKey: ['events', bookingId || 'all'],
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = db.from('booking_events').select('id,booking_id,scope,kind,message,actor_name,created_at').order('created_at', { ascending: false }).limit(limit);
      if (bookingId) q = q.eq('booking_id', bookingId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data || []) as Row[];
    },
  });

export function EventTimeline({ bookingId }: { bookingId: string }) {
  const { data = [] } = useEvents(bookingId);
  return (
    <section>
      <SectionTitle>Histórico de eventos</SectionTitle>
      {data.length ? (
        <ol className="space-y-2.5 border-l pl-4">
          {data.map((e) => (
            <li key={e.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
              <div className="text-slate-800">{e.message}</div>
              <div className="text-xs text-slate-500">{e.actor_name} · {fmtDateTime(e.created_at)}</div>
            </li>
          ))}
        </ol>
      ) : <div className="text-sm text-slate-500"><History className="mr-1 inline size-4" />Sem eventos registrados ainda.</div>}
    </section>
  );
}

/* ---------- Notifications ---------- */
const SEEN_KEY = 'cmm-notifications-seen';
export function NotificationsBell() {
  const { data = [] } = useEvents(null, 25);
  const [seen, setSeen] = useState('');
  useEffect(() => setSeen(localStorage.getItem(SEEN_KEY) || ''), []);
  const unread = data.filter((e) => e.created_at > seen).length;
  return (
    <Popover onOpenChange={(o) => { if (o && data[0]) { localStorage.setItem(SEEN_KEY, data[0].created_at); setSeen(data[0].created_at); } }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Notificações${unread ? `, ${unread} novas` : ''}`} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <Bell className="size-5" />
          {unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">{unread > 9 ? '9+' : unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2.5 text-sm font-semibold">Atividade recente</div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {data.map((e) => (
            <li key={e.id} className="px-4 py-2.5 text-sm">
              <div className="text-slate-800">{e.message}</div>
              <div className="text-xs text-slate-500">{e.actor_name} · {fmtDateTime(e.created_at)}</div>
            </li>
          ))}
          {!data.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nenhuma atividade ainda.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Offline queue for field actions ---------- */
const QUEUE_KEY = 'cmm-offline-queue-v1';
type Queued = { fn: 'check_in' | 'check_out'; args: Row; label: string; at: string };
const readQueue = (): Queued[] => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
const writeQueue = (q: Queued[]) => { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); window.dispatchEvent(new Event('cmm-queue')); };
const isNetwork = (m: string) => /failed to fetch|network|load failed/i.test(m);

export function useFieldAction() {
  const qc = useQueryClient();
  return async function run(fn: Queued['fn'], args: Row, success: string, label: string) {
    const enqueue = () => {
      const q = readQueue();
      if (!q.some((x) => x.fn === fn && JSON.stringify(x.args) === JSON.stringify(args))) writeQueue([...q, { fn, args, label, at: new Date().toISOString() }]);
      toast.info('Sem conexão. A ação foi guardada e será enviada automaticamente quando o sinal voltar.');
      return true;
    };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return enqueue();
    try {
      const { error } = await db.rpc(fn, args);
      if (error) {
        if (isNetwork(error.message)) return enqueue();
        toast.error(friendlyError(error.message));
        return false;
      }
    } catch {
      return enqueue();
    }
    toast.success(success);
    await Promise.all(['bookings', 'month-summary', 'events'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    return true;
  };
}

export function OfflineSync() {
  const qc = useQueryClient();
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const refresh = () => { setCount(readQueue().length); setOnline(navigator.onLine); };
    const flush = async () => {
      refresh();
      const q = readQueue();
      if (!q.length || !navigator.onLine) return;
      const left: Queued[] = [];
      for (const item of q) {
        try {
          const { error } = await db.rpc(item.fn, item.args);
          if (error && isNetwork(error.message)) left.push(item);
          else if (error) toast.error(`${item.label}: ${friendlyError(error.message)}`);
        } catch { left.push(item); }
      }
      writeQueue(left);
      if (left.length < q.length) {
        toast.success(`${q.length - left.length} ${q.length - left.length === 1 ? 'ação sincronizada' : 'ações sincronizadas'}.`);
        await Promise.all(['bookings', 'month-summary', 'events'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      }
      refresh();
    };
    refresh();
    void flush();
    window.addEventListener('online', flush);
    window.addEventListener('offline', refresh);
    window.addEventListener('cmm-queue', refresh);
    const t = setInterval(flush, 30_000);
    return () => { window.removeEventListener('online', flush); window.removeEventListener('offline', refresh); window.removeEventListener('cmm-queue', refresh); clearInterval(t); };
  }, []);
  if (online && !count) return null;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <CloudOff className="size-4 shrink-0" />
      {!online ? 'Você está sem conexão.' : 'Conexão restabelecida, sincronizando.'} {count > 0 && `${count} ${count === 1 ? 'ação aguardando' : 'ações aguardando'} envio.`}
    </div>
  );
}

/* ---------- Settlement dialog ---------- */
export function SettleDialog({ open, label, title, onOpenChange, onConfirm }: { open: boolean; label: string; title: string; onOpenChange: (o: boolean) => void; onConfirm: (method: string, reference: string) => Promise<void> }) {
  const [method, setMethod] = useState('PIX');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMethod('PIX'); setReference(''); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Registrar a baixa de {label}. A data, a forma de pagamento e o seu usuário ficam gravados.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Field label="Forma de pagamento" id="st-m">
            <NativeSelect id="st-m" value={method} onChange={(e) => setMethod(e.target.value)}>
              {['PIX', 'TED', 'Boleto', 'Outro'].map((m) => <option key={m} value={m}>{m}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Código da transação (opcional)" id="st-r"><Input id="st-r" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} placeholder="Identificador do comprovante" /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={busy} onClick={async () => { setBusy(true); await onConfirm(method, reference); setBusy(false); onOpenChange(false); }}>{busy ? 'Registrando…' : 'Registrar baixa'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Printable report (save as PDF) ---------- */
export function printReport(title: string, head: string[], rows: (string | number)[][], totalCents: number) {
  const esc = (v: unknown) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { toast.error('Permita janelas pop-up para gerar o PDF.'); return; }
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    body{font-family:Manrope,system-ui,sans-serif;color:#143B40;margin:32px}h1{font-size:20px;margin:0}small{color:#64748b}
    .brand{font-weight:800;letter-spacing:.04em}.brand b{color:#0e9fb0}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}
    th,td{border-bottom:1px solid #e2e8f0;padding:6px 8px;text-align:left}th{background:#f4f8f7}td.n{text-align:right}tfoot td{font-weight:700}
  </style></head><body><div class="brand"><b>CMM</b> AVIATION</div><h1>${esc(title)}</h1><small>Gerado em ${esc(fmtDateTime(new Date().toISOString()))}</small>
  <table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === r.length - 1 ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  <tfoot><tr><td colspan="${head.length - 1}">Total (${rows.length} lançamentos)</td><td class="n">${esc(money(totalCents))}</td></tr></tfoot></table>
  <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
export { fmtDate };
