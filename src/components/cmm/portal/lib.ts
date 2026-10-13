import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Role = 'gestor' | 'financeiro' | 'campo';
export type Profile = { user_id: string; role: Role; display_name: string; team_member_id: string | null; base: string | null };
export type Row = Record<string, any>;
export type Booking = Row & { sessions: Row[]; details: Row | null };
export type PageKey = 'inicio' | 'agenda' | 'clientes' | 'servicos' | 'equipe' | 'financeiro';
export type PageProps = { profile: Profile; intent: string | null; clearIntent: () => void; go: (page: PageKey) => void };
export type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger' | 'brand';
export type BookingStatus = 'agendado' | 'andamento' | 'concluido' | 'atrasado';

export const BASES = ['GRU', 'VCP'] as const;
export const ROLE_LABEL: Record<Role, string> = { gestor: 'Gestor', financeiro: 'Financeiro', campo: 'Equipe de campo' };

export const money = (cents: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents ?? 0) / 100);

export const fmtTime = (t?: string | null) => (t ? String(t).slice(0, 5) : '—');
export const fmtDate = (v?: string | null) => (v ? format(parseISO(v), 'dd/MM/yyyy') : '—');
export const fmtDateTime = (v?: string | null) => (v ? format(parseISO(v), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—');
export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

export function dayParts(iso: string) {
  const d = parseISO(iso);
  const rel = isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : isYesterday(d) ? 'Ontem' : format(d, 'EEEE', { locale: ptBR });
  return { rel: rel.charAt(0).toUpperCase() + rel.slice(1), full: format(d, "d 'de' MMMM", { locale: ptBR }) };
}

export function bookingStatus(b: Row, sessions: Row[], now = new Date()): BookingStatus {
  if (sessions.length && sessions.every((s) => s.check_out_at)) return 'concluido';
  if (sessions.some((s) => s.check_in_at)) return 'andamento';
  const at = parseISO(`${b.scheduled_date}T${fmtTime(b.scheduled_time)}:00`);
  return at.getTime() + 15 * 60 * 1000 < now.getTime() ? 'atrasado' : 'agendado';
}

export const STATUS: Record<BookingStatus, { label: string; tone: Tone }> = {
  agendado: { label: 'Agendado', tone: 'neutral' },
  andamento: { label: 'Em andamento', tone: 'info' },
  concluido: { label: 'Concluído', tone: 'success' },
  atrasado: { label: 'Atrasado', tone: 'danger' },
};

export function maskPhone(value: string) {
  if (value.trim().startsWith('+')) return value.replace(/[^\d+\s()-]/g, '').slice(0, 24);
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = '\ufeff' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
