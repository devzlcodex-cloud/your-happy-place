import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRpc, useServices } from './data';
import { money, type PageProps, type Row } from './lib';
import { EmptyState, ErrorState, Field, FormSheet, ListSkeleton, MoneyInput, PageHeader, Panel, Pill, SearchBox, Segmented } from './ui';

export function ServicosPage({ intent, clearIntent }: PageProps) {
  const rpc = useRpc();
  const { data: services = [], isLoading, error, refetch } = useServices();
  const [q, setQ] = useState('');
  const [show, setShow] = useState<'all' | 'active' | 'inactive'>('all');
  const [editing, setEditing] = useState<Row | 'new' | null>(null);

  useEffect(() => {
    if (intent === 'service') {
      setEditing('new');
      clearIntent();
    }
  }, [intent]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return services.filter((s: Row) => (show === 'all' || (show === 'active') === !!s.active) && (!term || String(s.name).toLowerCase().includes(term)));
  }, [services, q, show]);

  return (
    <>
      <PageHeader
        title="Serviços"
        description="Catálogo de serviços e preços usado nos agendamentos e no cálculo financeiro."
        actions={<Button onClick={() => setEditing('new')}><Plus className="mr-2 size-4" />Novo serviço</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar serviço" />
        <Segmented label="Situação" value={show} onChange={setShow} options={[{ value: 'all', label: 'Todos' }, { value: 'active', label: 'Ativos' }, { value: 'inactive', label: 'Inativos' }]} />
      </div>
      <Panel>
        {isLoading ? <ListSkeleton rows={4} /> : error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : list.length === 0 ? (
          <EmptyState icon={Briefcase} title={services.length ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'} description={services.length ? 'Ajuste a busca ou o filtro de situação.' : 'Cadastre os serviços e preços antes de criar agendamentos.'} action={!services.length ? <Button onClick={() => setEditing('new')}>Novo serviço</Button> : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-4">Serviço</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="pr-4 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s: Row) => (
                <TableRow key={s.id}>
                  <TableCell className="py-3 pl-4 font-medium text-slate-900">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.price_cents)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <Switch
                        checked={!!s.active}
                        aria-label={`${s.active ? 'Desativar' : 'Ativar'} ${s.name}`}
                        onCheckedChange={(v) => void rpc('upsert_service', { _name: s.name, _price_cents: s.price_cents, _active: v }, v ? 'Serviço ativado.' : 'Serviço desativado.', ['services'])}
                      />
                      <Pill tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Ativo' : 'Inativo'}</Pill>
                    </span>
                  </TableCell>
                  <TableCell className="pr-4 text-right"><Button variant="ghost" size="sm" onClick={() => setEditing(s)}><Pencil className="mr-1.5 size-3.5" />Editar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>
      <ServiceSheet editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function ServiceSheet({ editing, onClose }: { editing: Row | 'new' | null; onClose: () => void }) {
  const rpc = useRpc();
  const [name, setName] = useState('');
  const [cents, setCents] = useState<number | null>(null);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const isEdit = !!editing && editing !== 'new';

  useEffect(() => {
    if (editing === 'new') {
      setName('');
      setCents(null);
      setActive(true);
    } else if (editing) {
      setName(String(editing.name));
      setCents(Number(editing.price_cents));
      setActive(!!editing.active);
    }
    setErrors({});
  }, [editing]);

  async function submit() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = 'Informe o nome do serviço.';
    if (cents === null) e.price = 'Informe o preço.';
    setErrors(e);
    if (Object.keys(e).length || cents === null) return;
    setBusy(true);
    const ok = await rpc('upsert_service', { _name: name.trim(), _price_cents: cents, _active: active }, isEdit ? 'Serviço atualizado.' : 'Serviço cadastrado.', ['services']);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <FormSheet open={!!editing} onOpenChange={(o) => !o && onClose()} title={isEdit ? 'Editar serviço' : 'Novo serviço'} description={isEdit ? 'O nome identifica o serviço. Para renomear, cadastre um novo e desative este.' : 'Defina o nome e o preço cobrado do cliente.'} onSubmit={() => void submit()} submitLabel={isEdit ? 'Salvar alterações' : 'Cadastrar serviço'} busy={busy}>
      <Field label="Nome do serviço" id="s-name" required error={errors.name}><Input id="s-name" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={isEdit} autoFocus={!isEdit} /></Field>
      <Field label="Preço" id="s-price" required error={errors.price}><MoneyInput id="s-price" cents={cents} onChange={setCents} /></Field>
      <label className="flex items-center justify-between rounded-lg border px-4 py-3">
        <span><span className="block text-sm font-medium">Disponível para agendamento</span><span className="block text-xs text-slate-500">Serviços inativos não aparecem em novos agendamentos.</span></span>
        <Switch checked={active} onCheckedChange={setActive} />
      </label>
    </FormSheet>
  );
}
