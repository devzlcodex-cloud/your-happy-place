import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db, friendlyError, useRpc, useTeam } from './data';
import { BASES, ROLE_LABEL, isEmail, type PageProps, type Role, type Row } from './lib';
import { Avatar, DetailSheet, EmptyState, ErrorState, Field, FormSheet, ListSkeleton, NativeSelect, PageHeader, Panel, Pill, SearchBox, Segmented } from './ui';

const ACCESS_STATUS: Record<string, string> = { active: 'Ativo', ativo: 'Ativo', invited: 'Convite enviado', pending: 'Convite enviado', pendente: 'Convite enviado' };

export function EquipePage({ intent, clearIntent }: PageProps) {
  const { data: team = [], isLoading, error, refetch } = useTeam();
  const [q, setQ] = useState('');
  const [base, setBase] = useState<'all' | 'GRU' | 'VCP'>('all');
  const [newOpen, setNewOpen] = useState(false);
  const [roleFor, setRoleFor] = useState<Row | null>(null);
  const [link, setLink] = useState('');

  useEffect(() => {
    if (intent === 'member') {
      setNewOpen(true);
      clearIntent();
    }
  }, [intent]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return team.filter((m: Row) => (base === 'all' || m.base === base) && (!term || [m.name, m.job_title, m.login_email].join(' ').toLowerCase().includes(term)));
  }, [team, q, base]);

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Colaboradores por base, idiomas e perfis de acesso ao sistema."
        actions={<Button onClick={() => setNewOpen(true)}><Plus className="mr-2 size-4" />Novo colaborador</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nome, função ou email" />
        <Segmented label="Base" value={base} onChange={setBase} options={[{ value: 'all', label: 'Todas' }, { value: 'GRU', label: 'GRU' }, { value: 'VCP', label: 'VCP' }]} />
        <span className="ml-auto text-sm text-slate-500">{list.length} {list.length === 1 ? 'colaborador' : 'colaboradores'}</span>
      </div>

      <Panel>
        {isLoading ? <ListSkeleton /> : error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : list.length === 0 ? (
          <EmptyState icon={UsersRound} title={team.length ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador cadastrado'} description={team.length ? 'Ajuste a busca ou a base.' : 'Cadastre os colaboradores para designá-los aos atendimentos.'} action={!team.length ? <Button onClick={() => setNewOpen(true)}>Novo colaborador</Button> : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-4">Colaborador</TableHead>
                <TableHead>Base</TableHead>
                <TableHead className="hidden lg:table-cell">Idiomas</TableHead>
                <TableHead>Acesso ao sistema</TableHead>
                <TableHead className="pr-4 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m: Row) => (
                <TableRow key={m.id}>
                  <TableCell className="py-3 pl-4">
                    <span className="flex items-center gap-3">
                      <Avatar name={m.name} />
                      <span><span className="block font-medium text-slate-900">{m.name}</span><span className="block text-xs text-slate-500">{m.job_title}{m.accessible_support ? ' • apoio a acessibilidade' : ''}</span></span>
                    </span>
                  </TableCell>
                  <TableCell><Pill tone="brand">{m.base}</Pill></TableCell>
                  <TableCell className="hidden text-sm text-slate-600 lg:table-cell">{(m.languages || []).join(', ') || '—'}</TableCell>
                  <TableCell>
                    {m.login_email ? (
                      <span className="flex flex-col items-start gap-1">
                        <Pill tone={m.access_status === 'active' || m.access_status === 'ativo' ? 'success' : 'warn'} dot>{ROLE_LABEL[m.access_role as Role] || m.access_role || 'Sem perfil'}</Pill>
                        <span className="text-xs text-slate-500">{m.login_email}</span>
                      </span>
                    ) : <span className="text-sm text-slate-400">Sem acesso</span>}
                    {m.login_email && m.access_status && !['active', 'ativo'].includes(String(m.access_status)) && <span className="mt-1 block text-xs text-amber-700">{ACCESS_STATUS[String(m.access_status)] || String(m.access_status)}</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-right">{m.login_email && <Button variant="ghost" size="sm" onClick={() => setRoleFor(m)}>Alterar perfil</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <NewMemberSheet open={newOpen} onOpenChange={setNewOpen} onLink={setLink} />
      <RoleSheet member={roleFor} onClose={() => setRoleFor(null)} />
      <DetailSheet open={!!link} onOpenChange={(o) => !o && setLink('')} title="Acesso criado" description="Compartilhe o link abaixo diretamente com o colaborador, por um canal privado.">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="font-medium text-emerald-900">O link é de uso único e serve para definir a senha.</div>
          <div className="mt-3 break-all rounded-md bg-white p-3 text-xs text-slate-700">{link}</div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { void navigator.clipboard.writeText(link).then(() => toast.success('Link copiado.')); }}>Copiar link</Button>
            <Button size="sm" variant="outline" onClick={() => setLink('')}>Concluir</Button>
          </div>
        </div>
      </DetailSheet>
    </>
  );
}

function NewMemberSheet({ open, onOpenChange, onLink }: { open: boolean; onOpenChange: (o: boolean) => void; onLink: (l: string) => void }) {
  const rpc = useRpc();
  const qc = useQueryClient();
  const [withAccess, setWithAccess] = useState<'no' | 'yes'>('no');
  const [f, setF] = useState({ name: '', base: 'GRU', job: '', langs: 'Português', accessible: false, email: '', role: 'campo' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setWithAccess('no');
      setF({ name: '', base: 'GRU', job: '', langs: 'Português', accessible: false, email: '', role: 'campo' });
      setErrors({});
    }
  }, [open]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  async function submit() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Informe o nome do colaborador.';
    if (withAccess === 'yes' && !isEmail(f.email.trim())) e.email = 'Informe um email válido para o acesso.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    if (withAccess === 'no') {
      const ok = await rpc('create_team_member', { _name: f.name.trim(), _base: f.base, _job_title: f.job.trim(), _languages: f.langs.split(',').map((x) => x.trim()).filter(Boolean), _accessible: f.accessible }, 'Colaborador cadastrado.', ['team']);
      setBusy(false);
      if (ok) onOpenChange(false);
      return;
    }
    const { data, error } = await db.functions.invoke('create-member-account', { body: { name: f.name.trim(), base: f.base, email: f.email.trim(), role: f.role } });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error.message) + ' Verifique se a função create-member-account está publicada no Lovable Cloud.');
      return;
    }
    toast.success(data?.message || 'Colaborador e acesso criados.');
    await qc.invalidateQueries({ queryKey: ['team'] });
    onOpenChange(false);
    if (data?.action_link) onLink(data.action_link);
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Novo colaborador" description="Cadastre quem pode ser designado aos atendimentos e, se necessário, libere o acesso ao sistema." onSubmit={() => void submit()} submitLabel={withAccess === 'yes' ? 'Cadastrar e criar acesso' : 'Cadastrar colaborador'} busy={busy}>
      <Segmented label="Tipo de cadastro" value={withAccess} onChange={setWithAccess} options={[{ value: 'no', label: 'Somente cadastro' }, { value: 'yes', label: 'Com acesso ao sistema' }]} />
      <Field label="Nome completo" id="m-name" required error={errors.name}><Input id="m-name" maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Base" id="m-base"><NativeSelect id="m-base" value={f.base} onChange={(e) => set('base', e.target.value)}>{BASES.map((b) => <option key={b}>{b}</option>)}</NativeSelect></Field>
        {withAccess === 'no' ? (
          <Field label="Função" id="m-job" hint="Padrão: Agente de atendimento."><Input id="m-job" maxLength={80} value={f.job} onChange={(e) => set('job', e.target.value)} /></Field>
        ) : (
          <Field label="Perfil de acesso" id="m-role"><NativeSelect id="m-role" value={f.role} onChange={(e) => set('role', e.target.value)}><option value="campo">Equipe de campo</option><option value="financeiro">Financeiro</option></NativeSelect></Field>
        )}
      </div>
      {withAccess === 'no' ? (
        <>
          <Field label="Idiomas" id="m-langs" hint="Separe por vírgula. Ex.: Português, Inglês, Espanhol."><Input id="m-langs" value={f.langs} onChange={(e) => set('langs', e.target.value)} /></Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm">
            <input type="checkbox" className="size-4 accent-primary" checked={f.accessible} onChange={(e) => set('accessible', e.target.checked)} />
            <span><span className="block font-medium">Apto a apoio de acessibilidade</span><span className="block text-xs text-slate-500">Indica quem pode acompanhar passageiros com necessidades específicas.</span></span>
          </label>
        </>
      ) : (
        <Field label="Email de acesso" id="m-email" required error={errors.email} hint="O colaborador receberá um link de uso único para definir a senha."><Input id="m-email" type="email" inputMode="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
      )}
    </FormSheet>
  );
}

function RoleSheet({ member, onClose }: { member: Row | null; onClose: () => void }) {
  const rpc = useRpc();
  const [role, setRole] = useState('campo');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (member) setRole(member.access_role || 'campo');
  }, [member]);
  async function submit() {
    if (!member) return;
    setBusy(true);
    const ok = await rpc('change_member_role', { _member_id: member.id, _role: role }, 'Perfil alterado.', ['team']);
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <FormSheet open={!!member} onOpenChange={(o) => !o && onClose()} title="Alterar perfil de acesso" description={member ? `Defina o que ${member.name} pode ver e fazer no sistema. A alteração fica registrada em auditoria.` : undefined} onSubmit={() => void submit()} submitLabel="Salvar perfil" busy={busy}>
      <Field label="Perfil" id="r-role">
        <div className="space-y-2">
          {([['campo', 'Equipe de campo', 'Vê apenas os próprios atendimentos e registra check-in e check-out.'], ['financeiro', 'Financeiro', 'Acessa recebíveis, repasses e ajustes.'], ['gestor', 'Gestor', 'Acesso completo: agenda, clientes, serviços, equipe e financeiro.']] as const).map(([value, label, help]) => (
            <label key={value} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${role === value ? 'border-primary bg-brand-soft/60' : 'hover:bg-slate-50'}`}>
              <input type="radio" name="role" className="mt-1 accent-primary" checked={role === value} onChange={() => setRole(value)} />
              <span><span className="flex items-center gap-2 font-medium">{label}{role === value && <Check className="size-3.5 text-primary" />}</span><span className="block text-xs text-slate-500">{help}</span></span>
            </label>
          ))}
        </div>
      </Field>
    </FormSheet>
  );
}
