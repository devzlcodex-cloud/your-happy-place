import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Row = Record<string, any>;
type Call = (fn: string, args: Row, ok: string, reset?: () => void) => Promise<void>;
type FormProps = { call: Call; busy: boolean; notify: (message: string) => void };
type Props = {
  page: string;
  role: string;
  db: SupabaseClient<any>;
  refresh: () => Promise<void>;
  setNotice: (message: string) => void;
};

const selectCls = 'mt-2 block h-10 w-full rounded-md border bg-white px-3 text-sm';
const areaCls = 'mt-2 block min-h-[72px] w-full rounded-md border bg-white px-3 py-2 text-sm';
const money = (cents: unknown) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents ?? 0) / 100);

function Card({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border bg-white p-4">
      <h3 className="text-sm font-semibold text-[#075e61]">{title}</h3>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function ClientForm({ call, busy }: FormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    void call(
      'create_client',
      { _name: name.trim(), _category: category.trim(), _contact_name: contact.trim(), _email: email.trim(), _phone: phone.trim() },
      'Cliente cadastrado.',
      () => { setName(''); setCategory(''); setContact(''); setEmail(''); setPhone(''); },
    );
  }
  return (
    <Card title="Novo cliente">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Nome do cliente"><Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></Field>
        <Field label="Categoria"><Input required maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} className="mt-2" placeholder="Ex.: Companhia aérea" /></Field>
        <Field label="Pessoa de contato"><Input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} className="mt-2" /></Field>
        <Field label="Email"><Input type="email" maxLength={160} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2" /></Field>
        <Field label="Telefone"><Input maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2" /></Field>
        <Button type="submit" disabled={busy} className="self-end">Cadastrar cliente</Button>
      </form>
    </Card>
  );
}

function ServiceForm({ call, busy, services }: FormProps & { services: Row[] }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [active, setActive] = useState(true);
  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(price) * 100);
    if (!Number.isFinite(cents) || cents < 0) return;
    void call('upsert_service', { _name: name.trim(), _price_cents: cents, _active: active }, 'Serviço salvo.', () => { setName(''); setPrice(''); setActive(true); });
  }
  return (
    <Card title="Serviços e preços" hint="Cadastre os serviços antes de criar agendamentos. Para alterar o preço ou ativar/desativar, clique em Editar e salve.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nome do serviço"><Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></Field>
        <Field label="Preço (R$)"><Input required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-2" /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />Ativo</label>
        <Button type="submit" disabled={busy} className="self-end">Salvar serviço</Button>
      </form>
      {services.length > 0 && (
        <ul className="mt-4 divide-y rounded-xl border text-sm">
          {services.map((s) => (
            <li key={String(s.id)} className="flex items-center justify-between gap-3 p-3">
              <span>{String(s.name)} · {money(s.price_cents)}{s.active ? '' : ' · inativo'}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => { setName(String(s.name)); setPrice(String(Number(s.price_cents) / 100)); setActive(Boolean(s.active)); }}>Editar</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function BookingForm({ call, busy, notify, clients, services, members }: FormProps & { clients: Row[]; services: Row[]; members: Row[] }) {
  const [clientId, setClientId] = useState('');
  const [base, setBase] = useState('GRU');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [lead, setLead] = useState('');
  const [support, setSupport] = useState('');
  const [aircraft, setAircraft] = useState('');
  const [note, setNote] = useState('');
  const [access, setAccess] = useState('');
  const activeServices = services.filter((s) => s.active);
  const team = members.filter((m) => m.active);
  function toggle(id: string) { setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id])); }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!picked.length) { notify('Selecione pelo menos um serviço.'); return; }
    void call(
      'create_booking',
      { _client_id: clientId, _base: base, _date: day, _time: time, _service_ids: picked, _lead_id: lead || null, _support_id: support || null, _aircraft: aircraft.trim(), _note: note.trim(), _accessibility: access.trim() },
      'Agendamento criado.',
      () => { setClientId(''); setDay(''); setTime(''); setPicked([]); setLead(''); setSupport(''); setAircraft(''); setNote(''); setAccess(''); },
    );
  }
  return (
    <Card title="Novo agendamento" hint={!clients.length ? 'Cadastre um cliente na aba Clientes antes de agendar.' : !activeServices.length ? 'Cadastre ao menos um serviço ativo acima para agendar.' : undefined}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cliente">
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className={selectCls}>
            <option value="">Selecione…</option>
            {clients.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
          </select>
        </Field>
        <Field label="Base">
          <select value={base} onChange={(e) => setBase(e.target.value)} className={selectCls}><option>GRU</option><option>VCP</option></select>
        </Field>
        <Field label="Data"><Input required type="date" value={day} onChange={(e) => setDay(e.target.value)} className="mt-2" /></Field>
        <Field label="Horário"><Input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2" /></Field>
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-xs font-medium text-slate-700">Serviços</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeServices.length ? activeServices.map((s) => (
              <label key={String(s.id)} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
                <input type="checkbox" checked={picked.includes(String(s.id))} onChange={() => toggle(String(s.id))} />
                {String(s.name)} · {money(s.price_cents)}
              </label>
            )) : <span className="text-xs text-slate-500">Nenhum serviço ativo cadastrado.</span>}
          </div>
        </div>
        <Field label="Responsável">
          <select value={lead} onChange={(e) => setLead(e.target.value)} className={selectCls}>
            <option value="">Sem responsável</option>
            {team.map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.name)} ({String(m.base)})</option>)}
          </select>
        </Field>
        <Field label="Apoio">
          <select value={support} onChange={(e) => setSupport(e.target.value)} className={selectCls}>
            <option value="">Sem apoio</option>
            {team.map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.name)} ({String(m.base)})</option>)}
          </select>
        </Field>
        <Field label="Aeronave"><Input maxLength={80} value={aircraft} onChange={(e) => setAircraft(e.target.value)} className="mt-2" /></Field>
        <Field label="Acessibilidade"><Input maxLength={160} value={access} onChange={(e) => setAccess(e.target.value)} className="mt-2" /></Field>
        <div className="sm:col-span-2 lg:col-span-3">
          <Field label="Observação"><textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={areaCls} /></Field>
        </div>
        <Button type="submit" disabled={busy} className="self-end">Criar agendamento</Button>
      </form>
    </Card>
  );
}

function ObservationForm({ call, busy, bookings }: FormProps & { bookings: Row[] }) {
  const [bookingId, setBookingId] = useState('');
  const [body, setBody] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    void call('add_observation', { _booking_id: bookingId, _body: body.trim() }, 'Observação adicionada.', () => { setBookingId(''); setBody(''); });
  }
  if (!bookings.length) return null;
  return (
    <Card title="Adicionar observação a um agendamento">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
        <Field label="Agendamento">
          <select required value={bookingId} onChange={(e) => setBookingId(e.target.value)} className={selectCls}>
            <option value="">Selecione…</option>
            {bookings.map((b) => <option key={String(b.id)} value={String(b.id)}>{String(b.code)} · {String(b.scheduled_date)}</option>)}
          </select>
        </Field>
        <Field label="Observação"><Input required maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} className="mt-2" /></Field>
        <Button type="submit" disabled={busy} className="self-end">Adicionar</Button>
      </form>
    </Card>
  );
}

function MemberForm({ call, busy }: FormProps) {
  const [name, setName] = useState('');
  const [base, setBase] = useState('GRU');
  const [job, setJob] = useState('');
  const [langs, setLangs] = useState('Português');
  const [accessible, setAccessible] = useState(false);
  function submit(e: FormEvent) {
    e.preventDefault();
    const languages = langs.split(',').map((x) => x.trim()).filter(Boolean);
    void call('create_team_member', { _name: name.trim(), _base: base, _job_title: job.trim(), _languages: languages, _accessible: accessible }, 'Colaborador cadastrado.', () => { setName(''); setJob(''); setLangs('Português'); setAccessible(false); });
  }
  return (
    <Card title="Cadastrar colaborador (sem login)" hint="Para criar também o acesso ao sistema, use o formulário Criar acesso acima.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Nome"><Input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-2" /></Field>
        <Field label="Base"><select value={base} onChange={(e) => setBase(e.target.value)} className={selectCls}><option>GRU</option><option>VCP</option></select></Field>
        <Field label="Função"><Input required maxLength={80} value={job} onChange={(e) => setJob(e.target.value)} className="mt-2" /></Field>
        <Field label="Idiomas (separe por vírgula)"><Input value={langs} onChange={(e) => setLangs(e.target.value)} className="mt-2" /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-xs font-medium"><input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} />Apoio a acessibilidade</label>
        <Button type="submit" disabled={busy} className="self-end">Cadastrar</Button>
      </form>
    </Card>
  );
}

function RoleForm({ call, busy, members }: FormProps & { members: Row[] }) {
  const [memberId, setMemberId] = useState('');
  const [role, setRole] = useState('campo');
  function submit(e: FormEvent) {
    e.preventDefault();
    void call('change_member_role', { _member_id: memberId, _role: role }, 'Perfil alterado.', () => { setMemberId(''); });
  }
  if (!members.length) return null;
  return (
    <Card title="Alterar perfil de acesso">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field label="Colaborador">
          <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={selectCls}>
            <option value="">Selecione…</option>
            {members.map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.name)}{m.access_role ? ' · ' + String(m.access_role) : ''}</option>)}
          </select>
        </Field>
        <Field label="Novo perfil">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={selectCls}><option value="campo">Campo</option><option value="financeiro">Financeiro</option><option value="gestor">Gestor</option></select>
        </Field>
        <Button type="submit" disabled={busy} className="self-end">Alterar</Button>
      </form>
    </Card>
  );
}

function AdjustmentForm({ call, busy, notify, members }: FormProps & { members: Row[] }) {
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents === 0) { notify('Informe um valor diferente de zero.'); return; }
    void call('add_adjustment', { _team_member_id: memberId, _amount_cents: cents, _reason: reason.trim() }, 'Ajuste lançado.', () => { setMemberId(''); setAmount(''); setReason(''); });
  }
  return (
    <Card title="Lançar ajuste financeiro" hint="Use valor negativo para desconto. O ajuste é vinculado ao colaborador.">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Colaborador">
          <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={selectCls}>
            <option value="">Selecione…</option>
            {members.map((m) => <option key={String(m.id)} value={String(m.id)}>{String(m.name)}</option>)}
          </select>
        </Field>
        <Field label="Valor (R$)"><Input required type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-2" /></Field>
        <Field label="Motivo"><Input required maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2" /></Field>
        <Button type="submit" disabled={busy} className="self-end">Lançar ajuste</Button>
      </form>
    </Card>
  );
}

export function GestorForms({ page, role, db, refresh, setNotice }: Props) {
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState<Row[]>([]);
  const [clients, setClients] = useState<Row[]>([]);
  const [members, setMembers] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Row[]>([]);

  async function loadOptions() {
    const [s, c, m, b] = await Promise.all([
      db.from('services').select('id,name,price_cents,active').order('name'),
      db.from('clients').select('id,name').order('name'),
      db.from('team_members').select('id,name,base,access_role,active').order('name'),
      db.from('bookings').select('id,code,scheduled_date').order('scheduled_date', { ascending: false }),
    ]);
    setServices(s.data || []);
    setClients(c.data || []);
    setMembers(m.data || []);
    setBookings(b.data || []);
  }

  useEffect(() => { void loadOptions(); }, [page]);

  const call: Call = async (fn, args, ok, reset) => {
    setBusy(true);
    setNotice('');
    const { error } = await db.rpc(fn, args);
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    reset?.();
    await Promise.all([refresh(), loadOptions()]);
    setNotice(ok);
  };
  const shared = { call, busy, notify: setNotice };

  if (role === 'gestor' && page === 'clientes') return <ClientForm {...shared} />;
  if (role === 'gestor' && page === 'agenda') {
    return (
      <>
        <ServiceForm {...shared} services={services} />
        <BookingForm {...shared} clients={clients} services={services} members={members} />
        <ObservationForm {...shared} bookings={bookings} />
      </>
    );
  }
  if (role === 'gestor' && page === 'equipe') {
    return (
      <>
        <MemberForm {...shared} />
        <RoleForm {...shared} members={members} />
      </>
    );
  }
  if ((role === 'gestor' || role === 'financeiro') && page === 'financeiro') return <AdjustmentForm {...shared} members={members} />;
  return null;
}
