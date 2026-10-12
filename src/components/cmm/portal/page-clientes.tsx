import { useEffect, useMemo, useState } from 'react';
import { Mail, Pencil, Phone, Plus, Trash2, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBookings, useClients, useRpc } from './data';
import { STATUS, bookingStatus, fmtDate, fmtTime, isEmail, maskPhone, type PageProps, type Row } from './lib';
import { Avatar, ConfirmDialog, DetailSheet, EmptyState, ErrorState, Field, FormSheet, ListSkeleton, NativeSelect, PageHeader, Panel, Pill, SearchBox, SectionTitle } from './ui';

const SUGGESTED = ['Aviação executiva', 'Operador de aeronaves', 'Fretamento', 'Companhia aérea', 'Empresa corporativa', 'Órgão governamental'];

export function ClientesPage({ intent, clearIntent }: PageProps) {
  const rpc = useRpc();
  const { data: clients = [], isLoading, error, refetch } = useClients();
  const { data: bookings = [] } = useBookings();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [delClient, setDelClient] = useState<Row | null>(null);

  useEffect(() => {
    if (intent === 'client') {
      setNewOpen(true);
      clearIntent();
    }
  }, [intent]);

  const categories = useMemo(() => Array.from(new Set(clients.map((c: Row) => String(c.category)))).sort(), [clients]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    bookings.forEach((b) => m.set(b.client_id, (m.get(b.client_id) || 0) + 1));
    return m;
  }, [bookings]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c: Row) => (cat === 'all' || c.category === cat) && (!term || [c.name, c.category, c.contact_name, c.email].join(' ').toLowerCase().includes(term)));
  }, [clients, q, cat]);
  const current = clients.find((c: Row) => c.id === selected) || null;

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Companhias, operadoras e empresas atendidas, com contatos e histórico de atendimentos."
        actions={<Button onClick={() => setNewOpen(true)}><Plus className="mr-2 size-4" />Novo cliente</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Buscar por nome, categoria ou contato" />
        <div className="w-56">
          <NativeSelect aria-label="Categoria" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">Todas as categorias</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
        </div>
        <span className="ml-auto text-sm text-slate-500">{list.length} {list.length === 1 ? 'cliente' : 'clientes'}</span>
      </div>

      <Panel>
        {isLoading ? <ListSkeleton /> : error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : list.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={clients.length ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            description={clients.length ? 'Tente outro termo de busca ou categoria.' : 'Cadastre o primeiro cliente para começar a criar agendamentos.'}
            action={!clients.length ? <Button onClick={() => setNewOpen(true)}>Novo cliente</Button> : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="pl-4">Cliente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="hidden pr-4 text-right lg:table-cell">Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c: Row) => (
                <TableRow key={c.id} tabIndex={0} onClick={() => setSelected(c.id)} onKeyDown={(e) => e.key === 'Enter' && setSelected(c.id)} className="cursor-pointer">
                  <TableCell className="py-3 pl-4"><span className="flex items-center gap-3"><Avatar name={c.name} /><span className="font-medium text-slate-900">{c.name}</span></span></TableCell>
                  <TableCell><Pill tone="brand">{c.category}</Pill></TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {c.contact_name || c.email ? <><span className="block text-slate-800">{c.contact_name || '—'}</span><span className="block text-xs text-slate-500">{c.email || c.phone || ''}</span></> : <span className="text-slate-400">Sem contato</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{counts.get(c.id) || 0}</TableCell>
                  <TableCell className="hidden pr-4 text-right text-sm text-slate-500 lg:table-cell">{fmtDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      <ClientSheet open={newOpen || !!editing} onOpenChange={(o) => { if (!o) { setNewOpen(false); setEditing(null); } }} categories={categories} editing={editing} />
      <DetailSheet open={!!current} onOpenChange={(o) => !o && setSelected(null)} title={current ? <span className="flex items-center gap-3"><Avatar name={current.name} size="lg" />{current.name}</span> : 'Cliente'} description={current?.category}>
        {current && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(current)}><Pencil className="mr-2 size-3.5" />Editar cliente</Button>
              <Button size="sm" variant="outline" className="text-rose-700 hover:text-rose-800" disabled={(counts.get(current.id) || 0) > 0} title={(counts.get(current.id) || 0) > 0 ? 'Cliente com atendimentos não pode ser excluído' : undefined} onClick={() => setDelClient(current)}><Trash2 className="mr-2 size-3.5" />Excluir</Button>
            </div>
            {(counts.get(current.id) || 0) > 0 && <div className="text-xs text-slate-500">Clientes com atendimentos não podem ser excluídos, pois o histórico financeiro depende deles.</div>}
            <section>
              <SectionTitle>Contato</SectionTitle>
              <dl className="space-y-2.5 rounded-lg border p-4 text-sm">
                <div className="flex items-center gap-3"><UsersRound className="size-4 text-slate-400" /><span>{current.contact_name || 'Pessoa de contato não informada'}</span></div>
                <div className="flex items-center gap-3"><Mail className="size-4 text-slate-400" />{current.email ? <a className="text-primary underline-offset-2 hover:underline" href={`mailto:${current.email}`}>{current.email}</a> : <span className="text-slate-500">Email não informado</span>}</div>
                <div className="flex items-center gap-3"><Phone className="size-4 text-slate-400" />{current.phone ? <a className="text-primary underline-offset-2 hover:underline" href={`tel:${String(current.phone).replace(/[^\d+]/g, '')}`}>{current.phone}</a> : <span className="text-slate-500">Telefone não informado</span>}</div>
              </dl>
            </section>
            <section>
              <SectionTitle aside={<span className="text-xs text-slate-500">{counts.get(current.id) || 0} no total</span>}>Atendimentos</SectionTitle>
              <div className="divide-y rounded-lg border">
                {bookings.filter((b) => b.client_id === current.id).slice().reverse().slice(0, 8).map((b) => {
                  const st = bookingStatus(b, b.sessions);
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0"><div className="truncate font-medium">{b.service_summary}</div><div className="text-xs text-slate-500">{b.code} • {fmtDate(b.scheduled_date)} às {fmtTime(b.scheduled_time)}</div></div>
                      <Pill tone={STATUS[st].tone} dot>{STATUS[st].label}</Pill>
                    </div>
                  );
                })}
                {!(counts.get(current.id) || 0) && <div className="px-4 py-6 text-center text-sm text-slate-500">Nenhum atendimento para este cliente.</div>}
              </div>
            </section>
          </>
        )}
      </DetailSheet>
      <ConfirmDialog
        open={!!delClient}
        onOpenChange={(o) => !o && setDelClient(null)}
        danger
        title="Excluir cliente"
        description={delClient ? `O cliente ${delClient.name} e seus contatos serão removidos definitivamente.` : ''}
        confirmLabel="Excluir cliente"
        onConfirm={async () => {
          if (!delClient) return;
          const ok = await rpc('delete_client', { _id: delClient.id }, 'Cliente excluído.', ['clients']);
          if (ok) setSelected(null);
        }}
      />
    </>
  );
}

function ClientSheet({ open, onOpenChange, categories, editing }: { open: boolean; onOpenChange: (o: boolean) => void; categories: string[]; editing: Row | null }) {
  const rpc = useRpc();
  const [f, setF] = useState({ name: '', category: '', contact: '', email: '', phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF(editing ? { name: String(editing.name), category: String(editing.category || ''), contact: String(editing.contact_name || ''), email: String(editing.email || ''), phone: String(editing.phone || '') } : { name: '', category: '', contact: '', email: '', phone: '' });
      setErrors({});
    }
  }, [open, editing]);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));
  const suggestions = Array.from(new Set([...SUGGESTED, ...categories]));

  async function submit() {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Informe o nome do cliente.';
    if (f.email.trim() && !isEmail(f.email.trim())) e.email = 'Email inválido.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const args = { _name: f.name.trim(), _category: f.category.trim() || 'Aviação executiva', _contact_name: f.contact.trim() || null, _email: f.email.trim() || null, _phone: f.phone.trim() || null };
    const ok = editing
      ? await rpc('update_client', { _id: editing.id, ...args }, 'Cliente atualizado.', ['clients', 'bookings', 'finance'])
      : await rpc('create_client', args, 'Cliente cadastrado.', ['clients']);
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={editing ? 'Editar cliente' : 'Novo cliente'} description={editing ? 'As alterações de nome também são refletidas nos agendamentos e recebíveis deste cliente.' : 'Cadastre a empresa e o contato principal para os agendamentos.'} onSubmit={() => void submit()} submitLabel={editing ? 'Salvar alterações' : 'Cadastrar cliente'} busy={busy}>
      <Field label="Nome do cliente" id="c-name" required error={errors.name}><Input id="c-name" maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} autoFocus /></Field>
      <Field label="Categoria" id="c-cat" error={errors.category} hint="Se deixar em branco, será usada Aviação executiva.">
        <Input id="c-cat" list="c-cat-list" maxLength={80} value={f.category} onChange={(e) => set('category', e.target.value)} />
        <datalist id="c-cat-list">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pessoa de contato" id="c-contact" className="sm:col-span-2"><Input id="c-contact" maxLength={120} value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        <Field label="Email" id="c-email" error={errors.email}><Input id="c-email" type="email" inputMode="email" maxLength={160} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@empresa.com" /></Field>
        <Field label="Telefone" id="c-phone"><Input id="c-phone" inputMode="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} placeholder="(11) 90000-0000" /></Field>
      </div>
    </FormSheet>
  );
}
