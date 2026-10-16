import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Booking, Profile, Row } from './lib';

export const db = supabase as unknown as SupabaseClient<any>;

export function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes('permission') || m.includes('not authorized') || m.includes('forbidden') || m.includes('row-level security'))
    return 'Seu perfil não tem permissão para esta ação.';
  if (m.includes('duplicate') || m.includes('unique')) return 'Já existe um registro com estes dados.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Tente novamente.';
  return message;
}

export function useRpc() {
  const qc = useQueryClient();
  return async function rpc(fn: string, args: Row, success: string, invalidate: string[] = [], silent = false) {
    const { error } = await db.rpc(fn, args);
    if (error) {
      if (!silent) toast.error(friendlyError(error.message));
      return false;
    }
    if (!silent) toast.success(success);
    await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: [key] })));
    return true;
  };
}

type PageResult = { data: any; error: { message: string } | null; count?: number | null };

function rows(res: { data: any; error: { message: string } | null }): Row[] {
  if (res.error) throw new Error(res.error.message);
  return res.data || [];
}

/* O banco devolve no máximo 1.000 linhas por consulta. Para não haver limite de registros,
   buscamos em lotes (em paralelo, 4 por vez) até trazer o total. A ordenação de cada consulta
   termina sempre em uma coluna única para que nenhuma linha seja pulada ou repetida entre lotes. */
const PAGE = 1000;
const cnt = (withCount: boolean) => (withCount ? { count: 'exact' as const } : undefined);

async function fetchAll(page: (from: number, to: number, withCount: boolean) => PromiseLike<PageResult>): Promise<Row[]> {
  const first = await page(0, PAGE - 1, true);
  const head = rows(first);
  const total = typeof first.count === 'number' ? first.count : head.length;
  if (head.length === 0 || head.length >= total) return head;
  const step = head.length;
  const starts: number[] = [];
  for (let from = step; from < total; from += step) starts.push(from);
  const out = [...head];
  for (let i = 0; i < starts.length; i += 4) {
    const batch = await Promise.all(starts.slice(i, i + 4).map((from) => page(from, from + step - 1, false)));
    batch.forEach((r) => out.push(...rows(r)));
  }
  return out;
}

export const useBookings = () =>
  useQuery({
    queryKey: ['bookings'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Booking[]> => {
      const [b, s, d, f] = await Promise.all([
        fetchAll((from, to, c) => db.from('bookings').select('id,code,client_id,client_name,base,scheduled_date,scheduled_time,service_summary,created_at', cnt(c)).order('scheduled_date').order('scheduled_time').order('id').range(from, to)),
        fetchAll((from, to, c) => db.from('booking_sessions').select('id,booking_id,team_member_id,collaborator_name,is_lead,check_in_at,check_out_at', cnt(c)).order('id').range(from, to)),
        fetchAll((from, to, c) => db.from('booking_details').select('booking_id,aircraft,note,accessibility', cnt(c)).order('booking_id').range(from, to)),
        fetchAll((from, to, c) => db.from('booking_flights').select('booking_id,flight_number,airline,terminal,gate,flight_status,eta,updated_at,updated_by_name', cnt(c)).order('booking_id').range(from, to)),
      ]);
      const flights = new Map<string, Row>();
      f.forEach((x) => flights.set(x.booking_id, x));
      const sessions = new Map<string, Row[]>();
      s.forEach((x) => sessions.set(x.booking_id, [...(sessions.get(x.booking_id) || []), x]));
      const details = new Map<string, Row>();
      d.forEach((x) => details.set(x.booking_id, x));
      return b.map((x) => ({ ...x, sessions: sessions.get(x.id) || [], details: details.get(x.id) || null, flight: flights.get(x.id) || null }));
    },
  });

export const useBookingExtra = (id: string | null, withPrices: boolean) =>
  useQuery({
    queryKey: ['booking-extra', id],
    enabled: !!id,
    queryFn: async () => {
      const [o, s] = await Promise.all([
        db.from('booking_observations').select('id,body,author_name,created_at').eq('booking_id', id).order('created_at', { ascending: false }),
        withPrices
          ? db.from('booking_services').select('id,service_id,service_name,price_cents').eq('booking_id', id)
          : Promise.resolve({ data: [], error: null }),
      ]);
      return { observations: rows(o), services: rows(s) };
    },
  });

export const useClients = (enabled = true) =>
  useQuery({
    queryKey: ['clients'],
    enabled,
    queryFn: async () => {
      const [c, k] = await Promise.all([
        fetchAll((from, to, w) => db.from('clients').select('id,name,initials,category,created_at', cnt(w)).order('name').order('id').range(from, to)),
        fetchAll((from, to, w) => db.from('client_contacts').select('client_id,contact_name,email,phone', cnt(w)).order('client_id').range(from, to)),
      ]);
      const contacts = new Map<string, Row>();
      k.forEach((x) => contacts.set(x.client_id, x));
      return c.map((x): Row => ({ ...x, contact_name: contacts.get(x.id)?.contact_name || null, email: contacts.get(x.id)?.email || null, phone: contacts.get(x.id)?.phone || null }));
    },
  });

export const useServices = (enabled = true) =>
  useQuery({
    queryKey: ['services'],
    enabled,
    queryFn: () => fetchAll((from, to, c) => db.from('services').select('id,name,price_cents,active,created_at', cnt(c)).order('name').order('id').range(from, to)),
  });

export const useTeam = (enabled = true) =>
  useQuery({
    queryKey: ['team'],
    enabled,
    queryFn: () =>
      fetchAll((from, to, c) => db.from('team_members').select('id,name,initials,base,job_title,languages,accessible_support,login_email,access_role,access_status,active', cnt(c)).order('name').order('id').range(from, to)),
  });

export const useFinance = (enabled = true) =>
  useQuery({
    queryKey: ['finance'],
    enabled,
    queryFn: async () => {
      const [r, p, a] = await Promise.all([
        fetchAll((from, to, c) => db.from('receivables').select('id,booking_code,client_name,service_date,amount_cents,status,paid_at,paid_by_name,payment_method,payment_reference', cnt(c)).order('service_date', { ascending: false }).order('id').range(from, to)),
        fetchAll((from, to, c) => db.from('payouts').select('id,booking_code,team_member_id,collaborator_name,service_date,amount_cents,status,paid_at,paid_by_name,payment_method,payment_reference', cnt(c)).order('service_date', { ascending: false }).order('id').range(from, to)),
        fetchAll((from, to, c) => db.from('financial_adjustments').select('id,team_member_id,collaborator_name,amount_cents,reason,author_name,created_at', cnt(c)).order('created_at', { ascending: false }).order('id').range(from, to)),
      ]);
      return { receivables: r, payouts: p, adjustments: a };
    },
  });

export const useMonthSummary = (profile: Profile) =>
  useQuery({
    queryKey: ['month-summary', profile.user_id],
    enabled: profile.role === 'campo',
    queryFn: async (): Promise<Row | null> => {
      const { data, error } = await db.rpc('my_month_summary', { _month: format(startOfMonth(new Date()), 'yyyy-MM-dd') });
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data[0] || null : data || null;
    },
  });
