import { beforeEach, describe, expect, it } from 'vitest';
import { browserRepository, STORAGE_KEY } from '@/lib/cmm/repository';
import { checkIn } from '@/lib/cmm/domain';
describe('Demo persistence boundary', () => {
 beforeEach(() => window.localStorage.clear());
 it('persists updates and reads them through a new adapter', () => { const repo = browserRepository(); const state = checkIn(repo.read(),'CMM-1044','t5','demo-time'); repo.write(state); expect(browserRepository().read().bookings.find(b => b.id === 'CMM-1044')?.sessions[0]?.checkIn).toBe('demo-time'); });
 it('rejects corrupted and incompatible data without overwriting it', () => { window.localStorage.setItem(STORAGE_KEY,'invalid'); expect(() => browserRepository().read()).toThrow(); expect(window.localStorage.getItem(STORAGE_KEY)).toBe('invalid'); window.localStorage.setItem(STORAGE_KEY,'{"version":2}'); expect(() => browserRepository().read()).toThrow(); });
});
