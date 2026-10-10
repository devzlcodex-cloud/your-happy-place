import { createSeed, stateSchema, type DemoState } from './domain';

export interface DemoRepository { read(): DemoState; write(state: DemoState): void; }
export const STORAGE_KEY = 'cmm-aviation-demo-v1';
export function browserRepository(): DemoRepository {
  return {
    read() { const raw = window.localStorage.getItem(STORAGE_KEY); if (!raw) return createSeed(); const parsed = stateSchema.safeParse(JSON.parse(raw)); if (!parsed.success) throw new Error('Os dados deste navegador não são compatíveis com esta versão.'); return parsed.data; },
    write(state) { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateSchema.parse(state))); },
  };
}