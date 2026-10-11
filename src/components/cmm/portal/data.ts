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

function rows(res: { data: any; error: { message: string } | null }): Row[] {
  if (res.error) throw new Error(res.error.message);
  return res.data || [];
}

export const useBookings = () =>
  useQuery({
    queryKey: ['bookings'],
    refetchInterval: 60_000,
    queryFn: async (): Promise<Booking[]> => {
      const [b, s, d] = await Promise.all([
        db.from('bookings').select('id,code,client_id,client_name,base,scheduled_date,scheduled_time,service_summary,created_at').order('scheduled_date').order('scheduled_time'),
        db.from('booking_sessions').select('id,booking_id,team_member_id,collaborator_name,is_lead,check_in_at,check_out_at'),
        db.from('booking_details').select('booking_id,aircraft,note,accessibility'),
      ]);
      const sessions = new Map<string, Row[]>();
      rows(s).forEach((x) => sessions.set(x.booking_id, [...(sessions.get(x.booking_id) || []), x]));
      const details = new Map<string, Row>();
      rows(d).forEach((x) => details.set(x.booking_id, x));
      return rows(b).map((x) => ({ ...x, sessions: sessions.get(x.id) || [], details: details.get(x.id) || null }));
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
          ? db.from('booking_services').select('id,service_name,price_cents').eq('booking_id', id)
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
        db.from('clients').select('id,name,initials,category,created_at').order('name'),
        db.from('client_contacts').select('client_id,contact_name,email,phone'),
      ]);
      const contacts = new Map<string, Row>();
      rows(k).forEach((x) => contacts.set(x.client_id, x));
      return rows(c).map((x) => ({ ...x, contact_name: contacts.get(x.id)?.contact_name || null, email: contacts.get(x.id)?.email || null, phone: contacts.get(x.id)?.phone || null }));
    },
  });

export const useServices = (enabled = true) =>
  useQuery({
    queryKey: ['services'],
    enabled,
    queryFn: async () => rows(await db.from('services').select('id,name,price_cents,active,created_at').order('name')),
  });

export const useTeam = (enabled = true) =>
  useQuery({
    queryKey: ['team'],
    enabled,
    queryFn: async () =>
      rows(await db.from('team_members').select('id,name,initials,base,job_title,languages,accessible_support,login_email,access_role,access_status,active').order('name')),
  });

export const useFinance = (enabled = true) =>
  useQuery({
    queryKey: ['finance'],
    enabled,
    queryFn: async () => {
      const [r, p, a] = await Promise.all([
        db.from('receivables').select('id,booking_code,client_name,service_date,amount_cents,status,paid_at,paid_by_name').order('service_date', { ascending: false }),
        db.from('payouts').select('id,booking_code,collaborator_name,service_date,amount_cents,status,paid_at,paid_by_name').order('service_date', { ascending: false }),
        db.from('financial_adjustments').select('id,collaborator_name,amount_cents,reason,author_name,created_at').order('created_at', { ascending: false }),
      ]);
      return { receivables: rows(r), payouts: rows(p), adjustments: rows(a) };
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
