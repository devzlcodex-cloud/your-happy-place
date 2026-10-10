import { describe, it, expect } from 'vitest';
import { createSeed, createBooking, checkIn, checkOut, bookingTotal, catalog, type BookingInput } from '@/lib/cmm/domain';
const input: BookingInput = { clientId:'c1', base:'GRU', date:'2026-10-11', time:'12:00', serviceIds:['s1','s3'], responsible:'t1', support:'t2', aircraft:'', note:'' };
describe('CMM business invariants', () => {
 it('freezes prices and creates one aggregated charge only when everyone completes', () => {
  let state = createBooking(createSeed(),input,'new'); const b = state.bookings.find(b => b.id === 'new'); expect(b && bookingTotal(b)).toBe(40000);
  const service = catalog[0]; if (!service) throw new Error("Missing service"); const original = service.price; service.price = 99999; expect(b && bookingTotal(b)).toBe(40000); service.price = original;
  state = checkOut(state,'new','t1','now'); expect(state.payouts.some(p => p.bookingId === 'new')).toBe(false);
  state = checkIn(state,'new','t1','in'); expect(state.bookings.find(b => b.id === 'new')?.sessions[1]?.checkIn).toBeUndefined();
  state = checkOut(state,'new','t1','out'); state = checkOut(state,'new','t1','out-again');
  expect(state.payouts.filter(p => p.bookingId === 'new')).toHaveLength(1); expect(state.receivables.filter(r => r.bookingId === 'new')).toHaveLength(0);
  state = checkIn(state,'new','t2','in'); state = checkOut(state,'new','t2','out'); state = checkOut(state,'new','t2','out-again');
  expect(state.payouts.filter(p => p.bookingId === 'new')).toHaveLength(2); expect(state.payouts.filter(p => p.bookingId === 'new').every(p => p.amount === 8000)).toBe(true);
  expect(state.receivables.filter(r => r.bookingId === 'new')).toHaveLength(1); expect(state.receivables.find(r => r.bookingId === 'new')?.amount).toBe(40000);
 });
 it('validates assignments and required services', () => { expect(() => createBooking(createSeed(),{...input,serviceIds:[]},'a')).toThrow(); expect(() => createBooking(createSeed(),{...input,support:'t1'},'a')).toThrow(); expect(() => createBooking(createSeed(),{...input,responsible:'t3'},'a')).toThrow(); });
 it('concludes bookings with one collaborator', () => { let state = createBooking(createSeed(),{...input,support:''},'one'); state = checkIn(state,'one','t1','in'); state = checkOut(state,'one','t1','out'); expect(state.receivables.filter(r => r.bookingId === 'one')).toHaveLength(1); });
});
