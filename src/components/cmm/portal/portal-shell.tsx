import { Component, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Briefcase, CalendarDays, ContactRound, LayoutDashboard, LogOut, Plane, Plus, Search, UsersRound, Wallet } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { db } from './data';
import { ROLE_LABEL, type PageKey, type Profile } from './lib';
import { Avatar } from './ui';
import { NotificationsBell } from './ops-extras';
import { InicioPage } from './page-inicio';
import { AgendaPage } from './page-agenda';
import { ClientesPage } from './page-clientes';
import { ServicosPage } from './page-servicos';
import { EquipePage } from './page-equipe';
import { FinanceiroPage } from './page-financeiro';
import { CampoPage } from './page-campo';

type Icon = ComponentType<{ className?: string }>;
type NavItem = { key: PageKey; label: string; icon: Icon; group: string };

const GESTOR_NAV: NavItem[] = [
  { key: 'inicio', label: 'Visão geral', icon: LayoutDashboard, group: 'Operação' },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays, group: 'Operação' },
  { key: 'clientes', label: 'Clientes', icon: ContactRound, group: 'Operação' },
  { key: 'servicos', label: 'Serviços', icon: Briefcase, group: 'Gestão' },
  { key: 'equipe', label: 'Equipe', icon: UsersRound, group: 'Gestão' },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet, group: 'Gestão' },
];

class PageBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  override componentDidCatch(error: unknown) {
    console.error(error);
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <div role="heading" aria-level={2} className="text-lg font-semibold">Não foi possível exibir esta tela</div>
        <div className="mt-2 text-sm text-slate-500">Ocorreu um erro inesperado. Seus dados não foram alterados.</div>
        <Button className="mt-5" variant="outline" onClick={() => this.setState({ failed: false })}>Tentar novamente</Button>
      </div>
    );
  }
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function PortalShell({ profile }: { profile: Profile }) {
  const role = profile.role;
  const nav = useMemo<NavItem[]>(
    () =>
      role === 'gestor'
        ? GESTOR_NAV
        : role === 'financeiro'
          ? [{ key: 'financeiro', label: 'Financeiro', icon: Wallet, group: 'Gestão' }]
          : [{ key: 'agenda', label: 'Meus atendimentos', icon: CalendarDays, group: 'Operação' }],
    [role],
  );
  const [page, setPage] = useState<PageKey>(() => {
    try {
      const saved = typeof window !== 'undefined' ? (window.sessionStorage.getItem('cmm-page') as PageKey | null) : null;
      if (saved && nav.some((n) => n.key === saved)) return saved;
    } catch {
      /* armazenamento indisponível */
    }
    return nav[0]!.key;
  });
  const [intent, setIntent] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const now = useNow(30_000);

  const go = (p: PageKey) => {
    setPage(p);
    try {
      window.sessionStorage.setItem('cmm-page', p);
    } catch {
      /* ignorar */
    }
    window.scrollTo({ top: 0 });
  };
  const start = (p: PageKey, i: string) => {
    go(p);
    setIntent(i);
    setPalette(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = Array.from(new Set(nav.map((n) => n.group)));
  const current = nav.find((n) => n.key === page) || nav[0]!;
  const props = { profile, intent, clearIntent: () => setIntent(null), go };

  const navButton = (item: NavItem) => (
    <button
      key={item.key}
      type="button"
      onClick={() => go(item.key)}
      aria-current={page === item.key ? 'page' : undefined}
      className={cn(
        'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60',
        page === item.key ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      )}
    >
      {page === item.key && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-brand" />}
      <item.icon className="size-[18px]" />
      {item.label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-sidebar px-4 pt-9 pb-4 text-sidebar-foreground md:flex">
        <div className="wordmark"><span>CMM</span><small>AVIATION</small></div>
        <nav className="flex-1 space-y-6 text-sm font-medium" aria-label="Navegação principal">
          {groups.map((g) => (
            <div key={g}>
              {nav.length > 1 && <div className="mb-2 px-3 text-xs font-medium text-sidebar-foreground/50">{g}</div>}
              <div className="space-y-1">{nav.filter((n) => n.group === g).map(navButton)}</div>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-3">
          <Avatar name={profile.display_name || 'Usuário'} />
          <span className="min-w-0 flex-1 leading-tight"><strong className="block truncate text-sm text-sidebar-accent-foreground">{profile.display_name || 'Colaborador'}</strong><span className="block truncate text-xs text-sidebar-foreground/60">{ROLE_LABEL[role]}{profile.base ? `, base ${profile.base}` : ''}</span></span>
          <button type="button" aria-label="Sair da conta" title="Sair da conta" onClick={() => void db.auth.signOut()} className="rounded-md p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"><LogOut className="size-4" /></button>
        </div>
      </aside>

      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3 text-sm">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar text-brand md:hidden"><Plane className="size-4" /></span>
            <span className="hidden text-slate-400 sm:inline">CMM Aviation</span>
            <span className="hidden text-slate-300 sm:inline">/</span>
            <span className="font-semibold">{current.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {role === 'gestor' && (
              <button type="button" onClick={() => setPalette(true)} className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-500 transition-colors hover:border-slate-300 sm:flex">
                <Search className="size-4" />Buscar ou criar<kbd className="ml-6 rounded border bg-slate-50 px-1.5 py-0.5 text-[11px] text-slate-500">Ctrl K</kbd>
              </button>
            )}
            <NotificationsBell />
            <span className="hidden text-right text-xs leading-tight text-slate-500 lg:block"><span className="block font-semibold tabular-nums text-slate-800">{format(now, 'HH:mm')}</span>{format(now, "dd 'de' MMM", { locale: ptBR })}</span>
            <button type="button" aria-label="Sair da conta" onClick={() => void db.auth.signOut()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"><LogOut className="size-5" /></button>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-8 md:pb-12 md:pt-8">
          <PageBoundary resetKey={page}>
            {page === 'inicio' && role === 'gestor' && <InicioPage {...props} />}
            {page === 'agenda' && (role === 'campo' ? <CampoPage {...props} /> : <AgendaPage {...props} />)}
            {page === 'clientes' && role === 'gestor' && <ClientesPage {...props} />}
            {page === 'servicos' && role === 'gestor' && <ServicosPage {...props} />}
            {page === 'equipe' && role === 'gestor' && <EquipePage {...props} />}
            {page === 'financeiro' && (role === 'gestor' || role === 'financeiro') && <FinanceiroPage {...props} />}
          </PageBoundary>
        </main>
      </div>

      {nav.length > 1 && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-white/95 pb-[env(safe-area-inset-bottom)] text-[11px] font-medium backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }} aria-label="Navegação">
          {nav.map((n) => (
            <button key={n.key} type="button" onClick={() => go(n.key)} aria-current={page === n.key ? 'page' : undefined} className={cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium', page === n.key ? 'text-primary' : 'text-slate-500')}>
              <n.icon className="size-5" />{n.label}
            </button>
          ))}
        </nav>
      )}

      {role === 'gestor' && (
        <CommandDialog open={palette} onOpenChange={setPalette}>
          <CommandInput placeholder="Para onde deseja ir ou o que deseja criar?" />
          <CommandList>
            <CommandEmpty>Nada encontrado.</CommandEmpty>
            <CommandGroup heading="Criar">
              <CommandItem onSelect={() => start('agenda', 'booking')}><Plus className="mr-2 size-4" />Novo agendamento</CommandItem>
              <CommandItem onSelect={() => start('clientes', 'client')}><Plus className="mr-2 size-4" />Novo cliente</CommandItem>
              <CommandItem onSelect={() => start('servicos', 'service')}><Plus className="mr-2 size-4" />Novo serviço</CommandItem>
              <CommandItem onSelect={() => start('equipe', 'member')}><Plus className="mr-2 size-4" />Novo colaborador</CommandItem>
              <CommandItem onSelect={() => start('financeiro', 'adjustment')}><Plus className="mr-2 size-4" />Novo ajuste financeiro</CommandItem>
            </CommandGroup>
            <CommandGroup heading="Ir para">
              {nav.map((n) => <CommandItem key={n.key} onSelect={() => { go(n.key); setPalette(false); }}><n.icon className="mr-2 size-4" />{n.label}</CommandItem>)}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}
      <Toaster position="top-right" />
    </div>
  );
}
