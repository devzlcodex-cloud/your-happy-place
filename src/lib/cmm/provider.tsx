import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { createSeed, type DemoState } from './domain';
import { browserRepository, STORAGE_KEY, type DemoRepository } from './repository';

type Context = { state: DemoState; ready: boolean; update: (fn: (state: DemoState) => DemoState) => boolean; storageError: string };
const DemoContext = createContext<Context | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createSeed);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const repository = useRef<DemoRepository | null>(null);
  useEffect(() => {
    repository.current = browserRepository();
    try { setState(repository.current.read()); } catch { setStorageError('Não foi possível ler os dados salvos. A demonstração está disponível apenas para consulta.'); }
    setReady(true);
    const sync = (e: StorageEvent) => { if (e.key === STORAGE_KEY) { try { const next = repository.current?.read(); if (next) setState(next); } catch { setStorageError('Falha ao sincronizar os dados deste navegador.'); } } };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  function update(fn: (s: DemoState) => DemoState) {
    if (!ready || storageError || !repository.current) { toast.error('Armazenamento indisponível. Nenhuma alteração foi salva.'); return false; }
    try { const next = fn(repository.current.read()); repository.current.write(next); setState(next); return true; } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a alteração.'); return false; }
  }
  return <DemoContext.Provider value={{ state, ready, update, storageError }}>{children}</DemoContext.Provider>;
}
export function useDemo() { const ctx = useContext(DemoContext); if (!ctx) throw new Error('DemoProvider ausente'); return ctx; }