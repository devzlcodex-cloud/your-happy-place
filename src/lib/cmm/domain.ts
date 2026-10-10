import { z } from 'zod';

export const DEMO_DATE = '2026-10-10';
export const money = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
export const clients = [
  { id: 'c1', name: 'Aurora Executive', contact: 'Marina Vale', email: 'operacoes@aurora.example', initials: 'AE', category: 'Aviação executiva' },
  { id: 'c2', name: 'Horizonte Air', contact: 'Pedro Nunes', email: 'central@horizonte.example', initials: 'HA', category: 'Operador aéreo' },
  { id: 'c3', name: 'Atlas Corporate', contact: 'Lara Costa', email: 'viagens@atlas.example', initials: 'AC', category: 'Corporativo' },
  { id: 'c4', name: 'Ventura Aviation', contact: 'Caio Reis', email: 'voos@ventura.example', initials: 'VA', category: 'Aviação executiva' },
];
export const team = [
  { id: 't1', name: 'Camila Duarte', initials: 'CD', base: 'GRU', role: 'Agente de atendimento', languages: 'Português, inglês', accessible: true },
  { id: 't2', name: 'Rafael Monteiro', initials: 'RM', base: 'GRU', role: 'Agente de atendimento', languages: 'Português, espanhol', accessible: false },
  { id: 't3', name: 'Bianca Freitas', initials: 'BF', base: 'VCP', role: 'Supervisora de campo', languages: 'Português, inglês', accessible: true },
  { id: 't4', name: 'Lucas Azevedo', initials: 'LA', base: 'VCP', role: 'Agente de atendimento', languages: 'Português, inglês, espanhol', accessible: false },
  { id: 't5', name: 'Isabela Tavares', initials: 'IT', base: 'GRU', role: 'Supervisora de campo', languages: 'Português, inglês', accessible: true },
];
export const catalog = [
  { id: 's1', name: 'Meet & Assist', price: 28000 },
  { id: 's2', name: 'Recepção e embarque', price: 22000 },
  { id: 's3', name: 'Apoio de bagagens', price: 12000 },
  { id: 's4', name: 'Conexão assistida', price: 35000 },
];
const sessionSchema = z.object({ collaboratorId: z.string(), checkIn: z.string().optional(), checkOut: z.string().optional() });
const bookingSchema = z.object({ id: z.string(), clientId: z.string(), base: z.enum(['GRU', 'VCP']), date: z.string(), time: z.string(), aircraft: z.string(), note: z.string(), accessibility: z.string(), services: z.array(z.object({ id: z.string(), name: z.string(), price: z.number().int().nonnegative() })), sessions: z.array(sessionSchema), observations: z.array(z.object({ id: z.string(), text: z.string(), author: z.string(), at: z.string() })) });
export const stateSchema = z.object({ version: z.literal(1), bookings: z.array(bookingSchema), payouts: z.array(z.object({ id: z.string(), bookingId: z.string(), collaboratorId: z.string(), amount: z.number().int(), status: z.enum(['pending', 'paid']), at: z.string() })), receivables: z.array(z.object({ id: z.string(), bookingId: z.string(), amount: z.number().int(), status: z.enum(['pending', 'paid']), at: z.string() })), adjustments: z.array(z.object({ id: z.string(), collaboratorId: z.string(), amount: z.number().int(), reason: z.string(), author: z.string(), at: z.string() })) });
export type DemoState = z.infer<typeof stateSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type BookingInput = { clientId: string; base: 'GRU' | 'VCP'; date: string; time: string; serviceIds: string[]; responsible: string; support: string; aircraft: string; note: string };
export const bookingStatus = (b: Booking) => b.sessions.every(s => s.checkOut) ? 'Concluído' : b.sessions.some(s => s.checkIn) ? 'Em atendimento' : 'Agendado';
export const bookingTotal = (b: Booking) => b.services.reduce((sum, s) => sum + s.price, 0);
export function createBooking(state: DemoState, input: BookingInput, id: string): DemoState {
  if (!clients.some(c => c.id === input.clientId) || !['GRU', 'VCP'].includes(input.base) || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date)) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error('Preencha cliente, base, data e horário válidos.');
  const services = catalog.filter(s => input.serviceIds.includes(s.id)).map(s => ({ ...s }));
  if (!services.length) throw new Error('Selecione pelo menos um serviço.');
  const assigned = [input.responsible, input.support].filter(Boolean);
  if (!input.responsible || new Set(assigned).size !== assigned.length || assigned.some(id => !team.some(t => t.id === id && t.base === input.base))) throw new Error('Selecione uma equipe válida para a base, sem repetir colaboradores.');
  const booking: Booking = { id, clientId: input.clientId, base: input.base, date: input.date, time: input.time, services, aircraft: input.aircraft.trim(), note: input.note.trim(), accessibility: 'Sem apoio específico sinalizado.', sessions: assigned.map(collaboratorId => ({ collaboratorId })), observations: [] };
  return { ...state, bookings: [...state.bookings, booking] };
}
export function checkIn(state: DemoState, bookingId: string, collaboratorId: string, at: string): DemoState {
  return { ...state, bookings: state.bookings.map(b => b.id !== bookingId ? b : { ...b, sessions: b.sessions.map(s => s.collaboratorId === collaboratorId && !s.checkIn && !s.checkOut ? { ...s, checkIn: at } : s) }) };
}
export function checkOut(state: DemoState, bookingId: string, collaboratorId: string, at: string): DemoState {
  const booking = state.bookings.find(b => b.id === bookingId);
  const session = booking?.sessions.find(s => s.collaboratorId === collaboratorId);
  if (!booking || !session?.checkIn || session.checkOut) return state;
  const updated = { ...booking, sessions: booking.sessions.map(s => s.collaboratorId === collaboratorId ? { ...s, checkOut: at } : s) };
  const payoutId = `p-${bookingId}-${collaboratorId}`;
  return { ...state, bookings: state.bookings.map(b => b.id === bookingId ? updated : b), payouts: state.payouts.some(p => p.id === payoutId) ? state.payouts : [...state.payouts, { id: payoutId, bookingId, collaboratorId, amount: 8000, status: 'pending', at }], receivables: updated.sessions.every(s => s.checkOut) && !state.receivables.some(r => r.bookingId === bookingId) ? [...state.receivables, { id: `r-${bookingId}`, bookingId, amount: bookingTotal(updated), status: 'pending', at }] : state.receivables };
}
export function createSeed(): DemoState {
  const samples: [string, string, string, string, string, string][] = [ ['08:00','c1','GRU','t1','s1','PT-DEMO'], ['09:15','c2','VCP','t3','s2','PR-FICT'], ['10:30','c3','GRU','t2','s1','PP-TEST'], ['11:45','c4','GRU','t5','s4','PT-SIMU'], ['13:00','c1','VCP','t4','s1','PR-DEMO'], ['14:20','c2','GRU','t1','s2','PP-FICT'], ['15:30','c3','VCP','t3','s4','PT-TEST'], ['17:00','c4','GRU','t2','s2','PR-SIMU'] ];
  let state: DemoState = { version: 1, bookings: samples.map((row, i) => ({ id: `CMM-${1041+i}`, time: row[0], clientId: row[1], base: row[2] === 'VCP' ? 'VCP' : 'GRU', date: DEMO_DATE, sessions: [{ collaboratorId: row[3] }, ...(i === 2 ? [{ collaboratorId: 't5' }] : [])], services: catalog.filter(s => s.id === row[4] || (i === 2 && s.id === 's3')).map(s => ({ ...s })), aircraft: row[5], note: i === 2 ? 'Recepção no terminal 3. Confirmar ponto de encontro com a operação.' : '', accessibility: i === 2 ? 'Apoio de mobilidade no trajeto. Equipe capacitada designada.' : 'Sem apoio específico sinalizado.', observations: [] })), payouts: [], receivables: [], adjustments: [] };
  for (const b of state.bookings.slice(0, 2)) { const session = b.sessions[0]; if (!session) continue; state = checkIn(state, b.id, session.collaboratorId, `${DEMO_DATE}T08:00:00-03:00`); state = checkOut(state, b.id, session.collaboratorId, `${DEMO_DATE}T09:00:00-03:00`); }
  state = checkIn(state, 'CMM-1043', 't2', `${DEMO_DATE}T10:20:00-03:00`);
  return state;
}