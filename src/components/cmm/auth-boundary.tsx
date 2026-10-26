import logo from "@/assets/cmm-logo.png.asset.json";
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PortalShell } from './portal/portal-shell';
import { db } from './portal/data';
import type { Profile } from './portal/lib';

export function AuthBoundary(_props: { children?: ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);

  async function loadProfile(next: any) {
    setSession(next);
    if (!next) {
      setProfile(null);
      setReady(true);
      return;
    }
    setReady(false);
    setError('');
    try {
      const { data, error: profileError } = await db.rpc('get_my_profile');
      const record = Array.isArray(data) ? data[0] : data;
      if (profileError || !record?.role || !['gestor', 'financeiro', 'campo'].includes(record.role)) {
        setProfile(null);
        setError(profileError?.message || 'Sua conta ainda não tem um perfil ativo. Solicite acesso à coordenação.');
      } else setProfile(record as Profile);
    } catch {
      setProfile(null);
      setError('Não foi possível validar seu perfil. Verifique a conexão e tente novamente.');
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    let alive = true;
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) setRecovery(true);
    db.auth.getSession().then(({ data }: any) => {
      if (alive) void loadProfile(data.session);
    });
    const { data: listener } = db.auth.onAuthStateChange((event: string, next: any) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (alive) void loadProfile(next);
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Verificando acesso seguro…</div>;
  if (session && recovery)
    return (
      <PasswordSetup
        onDone={() => {
          setRecovery(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  if (session) return profile ? <PortalShell profile={profile} /> : <AccessDenied error={error} onLogout={() => db.auth.signOut()} />;
  return <LoginScreen onLogin={loadProfile} />;
}

function LoginScreen({ onLogin }: { onLogin: (session: any) => Promise<void> }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: authError } = await db.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) setError('Não foi possível entrar. Confira email e senha ou solicite suporte à coordenação.');
    else await onLogin(data.session);
  }

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="brand-logo" style={{ margin: 0, maxWidth: 260 }}><img src={logo.url} alt="CMM Aviation"/></div>
        <div className="max-w-md">
          <div role="heading" aria-level={1} className="text-[34px] font-semibold leading-[1.2] tracking-tight text-sidebar-accent-foreground">Atendimento coordenado em cada operação.</div>
          <div className="mt-5 text-[15px] leading-7 text-sidebar-foreground/75">Agenda, equipe e financeiro das bases de Guarulhos (GRU) e Viracopos (VCP) em um só lugar, com acesso de acordo com a função de cada pessoa.</div>
        </div>
        <div className="text-xs text-sidebar-foreground/55">Acesso restrito a colaboradores autorizados.</div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><div style={{ maxWidth: 220 }}><img src={logo.url} alt="CMM Aviation"/></div></div>
          <h1 style={{ fontSize: 28, fontWeight: 650, lineHeight: 1.2, letterSpacing: '-0.01em' }}>Entrar no sistema</h1>
          <div className="mt-2 text-sm text-muted-foreground">Use as credenciais fornecidas pela coordenação.</div>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-[13px] font-medium">Email</label>
              <Input id="login-email" required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-white" placeholder="nome@empresa.com" />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-[13px] font-medium">Senha</label>
              <Input id="login-password" required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-white" />
            </div>
            {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</div>}
            <Button disabled={busy} className="h-11 w-full text-[15px]">{busy ? 'Validando acesso…' : 'Entrar'}</Button>
          </form>
          <div className="mt-8 border-t pt-6">
            <div className="text-xs leading-5 text-muted-foreground">Ainda sem credenciais? A coordenação precisa cadastrar sua conta e atribuir um perfil antes do primeiro acesso.</div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PasswordSetup({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 12) {
      setError('Use pelo menos 12 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: saveError } = await db.auth.updateUser({ password });
    setBusy(false);
    if (saveError) setError('Não foi possível definir a senha. Solicite um novo acesso à coordenação.');
    else onDone();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm sm:p-10">
        <h1 style={{ fontSize: 24, fontWeight: 650, lineHeight: 1.2 }}>Defina sua senha</h1>
        <div className="mt-2 text-sm text-muted-foreground">Primeiro acesso ao CMM Aviation. Escolha uma senha com pelo menos 12 caracteres.</div>
        <div className="mt-6">
          <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-medium">Nova senha</label>
          <Input id="new-password" type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <div className="mt-4">
          <label htmlFor="confirm-password" className="mb-1.5 block text-[13px] font-medium">Confirmar senha</label>
          <Input id="confirm-password" type="password" required minLength={12} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
        </div>
        {error && <div role="alert" className="mt-4 text-sm text-rose-700">{error}</div>}
        <Button disabled={busy} className="mt-6 h-11 w-full">{busy ? 'Salvando…' : 'Salvar senha e entrar'}</Button>
      </form>
    </main>
  );
}

function AccessDenied({ error, onLogout }: { error: string; onLogout: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-5">
      <section className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
        <ShieldCheck className="mx-auto size-10 text-warning" />
        <div role="heading" aria-level={1} className="mt-4 text-xl font-semibold">Acesso ainda não configurado</div>
        <div className="mt-2 text-sm text-muted-foreground">{error}</div>
        <Button className="mt-6" variant="outline" onClick={onLogout}>Sair da conta</Button>
      </section>
    </div>
  );
}
