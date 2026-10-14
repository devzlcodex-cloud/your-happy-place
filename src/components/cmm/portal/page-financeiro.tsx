import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useFinance, useRpc, useTeam } from './data';
import { SettleDialog, printReport } from './ops-extras';
import { downloadCsv, fmtDate, fmtDateTime, money, todayIso, type PageProps, type Row } from './lib';
import { ConfirmDialog, EmptyState, ErrorState, Field, FormSheet, Kpi, ListSkeleton, MoneyInput, NativeSelect, PageHeader, Panel, Pill, SearchBox, Segmented } from './ui';

type Tab = 'receivables' | 'payouts' | 'adjustments';
type Filter = 'all' | 'pending' | 'paid';

export function FinanceiroPage({ profile, intent, clearIntent }: PageProps) {
  const isGestor = profile.role === 'gestor';
  const rpc = useRpc();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useFinance();
  const [tab, setTab] = useState<Tab>('receivables');
  const [filter, setFilter] = useState<Filter>('pending');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[]; label: string } | null>(null);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjEdit, setAdjEdit] = useState<Row | null>(null);
  const [act, setAct] = useState<{ title: string; description: string; label: string; danger?: boolean; run: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (intent === 'adjustment') {
      setAdjOpen(true);
      clearIntent();
    }
  }, [intent]);
  useEffect(() => setSelected([]), [tab, filter, q]);

  const receivables = data?.receivables || [];
  const payouts = data?.payouts || [];
  const adjustments = data?.adjustments || [];
  const month = todayIso().slice(0, 7);
  const sum = (rows: Row[]) => rows.reduce((s, r) => s + Number(r.amount_cents || 0), 0);
  const pendingR = receivables.filter((r) => r.status === 'pending');
  const pendingP = payouts.filter((r) => r.status === 'pending');
  const paidR = receivables.filter((r) => r.status === 'paid' && String(r.paid_at || '').startsWith(month));
  const paidP = payouts.filter((r) => r.status === 'paid' && String(r.paid_at || '').startsWith(month));

  const settlement = tab === 'receivables' ? receivables : payouts;
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (tab === 'adjustments') return adjustments.filter((r) => !term || [r.collaborator_name, r.reason].join(' ').toLowerCase().includes(term));
    return settlement.filter((r) => (filter === 'all' || r.status === filter) && (!term || [r.booking_code, r.client_name, r.collaborator_name].join(' ').toLowerCase().includes(term)));
  }, [tab, filter, q, settlement, adjustments]);
  const selectable = tab === 'adjustments' ? [] : rows.filter((r) => r.status === 'pending');
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.includes(r.id));
  const selectedTotal = sum(rows.filter((r) => selected.includes(r.id)));

  async function settle(ids: string[], method: string, reference: string) {
    const fn = tab === 'receivables' ? 'settle_receivable' : 'settle_payout';
    let failed = 0;
    for (const id of ids) {
      const ok = await rpc(fn, { _id: id, _method: method, _reference: reference }, '', ['events'], true);
      if (!ok) failed += 1;
    }
    await qc.invalidateQueries({ queryKey: ['finance'] });
    setSelected([]);
    if (failed) toast.error(failed === ids.length ? 'Não foi possível registrar a baixa. Tente novamente.' : `${ids.length - failed} baixas registradas e ${failed} com falha.`);
    else toast.success(ids.length === 1 ? 'Baixa registrada.' : `${ids.length} baixas registradas.`);
  }

  function exportCsv() {
    if (tab === 'adjustments') {
      downloadCsv(`ajustes-${todayIso()}.csv`, [['Colaborador', 'Motivo', 'Valor', 'Registrado por', 'Data'], ...rows.map((r) => [r.collaborator_name, r.reason, (r.amount_cents / 100).toFixed(2).replace('.', ','), r.author_name, fmtDateTime(r.created_at)])]);
      return;
    }
    downloadCsv(`${tab === 'receivables' ? 'recebiveis' : 'repasses'}-${todayIso()}.csv`, [
      ['Código', tab === 'receivables' ? 'Cliente' : 'Colaborador', 'Data do serviço', 'Valor', 'Status', 'Pago em', 'Forma', 'Transação'],
      ...rows.map((r) => [r.booking_code, r.client_name || r.collaborator_name, fmtDate(r.service_date), (r.amount_cents / 100).toFixed(2).replace('.', ','), r.status === 'paid' ? 'Pago' : 'Pendente', r.paid_at ? fmtDateTime(r.paid_at) : '', r.payment_method || '', r.payment_reference || '']),
    ]);
  }

  function exportPdf() {
    if (tab === 'adjustments') {
      printReport('Ajustes financeiros', ['Colaborador', 'Motivo', 'Registrado por', 'Valor'], rows.map((r) => [r.collaborator_name, r.reason, r.author_name, money(r.amount_cents)]), sum(rows));
      return;
    }
    printReport(
      tab === 'receivables' ? 'Fechamento de recebíveis' : 'Fechamento de repasses',
      ['Código', tab === 'receivables' ? 'Cliente' : 'Colaborador', 'Data', 'Situação', 'Pagamento', 'Valor'],
      rows.map((r) => [r.booking_code, r.client_name || r.collaborator_name, fmtDate(r.service_date), r.status === 'paid' ? 'Pago' : 'Pendente', r.payment_method ? `${r.payment_method}${r.payment_reference ? ` ${r.payment_reference}` : ''}` : '—', money(r.amount_cents)]),
      sum(rows),
    );
  }

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Recebíveis de clientes, repasses a colaboradores e ajustes, com baixa individual ou em lote."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="mr-2 size-4" />Planilha</Button>
            <Button variant="outline" onClick={exportPdf} disabled={!rows.length}><Download className="mr-2 size-4" />PDF</Button>
            <Button onClick={() => setAdjOpen(true)}><Plus className="mr-2 size-4" />Novo ajuste</Button>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="A receber" value={money(sum(pendingR))} hint={`${pendingR.length} ${pendingR.length === 1 ? 'recebível pendente' : 'recebíveis pendentes'}`} tone={pendingR.length ? 'warn' : undefined} />
        <Kpi label="Recebido no mês" value={money(sum(paidR))} hint={`${paidR.length} ${paidR.length === 1 ? 'baixa' : 'baixas'}`} />
        <Kpi label="Repasses a pagar" value={money(sum(pendingP))} hint={`${pendingP.length} ${pendingP.length === 1 ? 'repasse pendente' : 'repasses pendentes'}`} tone={pendingP.length ? 'warn' : undefined} />
        <Kpi label="Repasses pagos no mês" value={money(sum(paidP))} hint={`${paidP.length} ${paidP.length === 1 ? 'pagamento' : 'pagamentos'}`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Tipo" value={tab} onChange={setTab} options={[{ value: 'receivables', label: `Recebíveis (${receivables.length})` }, { value: 'payouts', label: `Repasses (${payouts.length})` }, { value: 'adjustments', label: `Ajustes (${adjustments.length})` }]} />
        {tab !== 'adjustments' && <Segmented label="Situação" value={filter} onChange={setFilter} options={[{ value: 'pending', label: 'Pendentes' }, { value: 'paid', label: 'Pagos' }, { value: 'all', label: 'Todos' }]} />}
        <SearchBox value={q} onChange={setQ} placeholder={tab === 'receivables' ? 'Buscar por código ou cliente' : 'Buscar por código ou colaborador'} className="sm:ml-auto" />
      </div>

      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-brand-soft px-4 py-3 text-sm">
          <span className="text-primary"><strong>{selected.length}</strong> {selected.length === 1 ? 'item selecionado' : 'itens selecionados'} no valor de <strong className="tabular-nums">{money(selectedTotal)}</strong></span>
          <span className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-white" onClick={() => setSelected([])}>Limpar seleção</Button>
            <Button size="sm" onClick={() => setConfirm({ ids: selected, label: `${selected.length} ${selected.length === 1 ? 'item' : 'itens'}` })}>Dar baixa nos selecionados</Button>
          </span>
        </div>
      )}

      <Panel>
        {isLoading ? <ListSkeleton /> : error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : rows.length === 0 ? (
          <EmptyState icon={Wallet} title={tab === 'adjustments' ? 'Nenhum ajuste lançado' : filter === 'pending' ? 'Nada pendente por aqui' : 'Nenhum lançamento encontrado'} description={tab === 'adjustments' ? 'Acréscimos e descontos aplicados a colaboradores aparecem nesta lista.' : 'Recebíveis e repasses são gerados automaticamente quando o atendimento é concluído com check-out.'} />
        ) : tab === 'adjustments' ? (
          <Table>
            <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead className="pl-4">Colaborador</TableHead><TableHead>Motivo</TableHead><TableHead className="hidden md:table-cell">Registrado por</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="pr-4 text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="py-3 pl-4 font-medium">{r.collaborator_name}</TableCell>
                  <TableCell className="text-slate-700">{r.reason}</TableCell>
                  <TableCell className="hidden text-sm text-slate-500 md:table-cell">{r.author_name}<span className="block text-xs">{fmtDateTime(r.created_at)}</span></TableCell>
                  <TableCell className={cn('text-right font-medium tabular-nums', r.amount_cents < 0 ? 'text-rose-700' : 'text-emerald-700')}>{r.amount_cents > 0 ? '+' : ''}{money(r.amount_cents)}</TableCell>
                  <TableCell className="pr-4 text-right"><span className="inline-flex gap-1"><Button size="sm" variant="ghost" onClick={() => setAdjEdit(r)}>Editar</Button>{isGestor && <Button size="sm" variant="ghost" className="text-rose-700 hover:text-rose-800" onClick={() => setAct({ title: 'Excluir ajuste', description: `O ajuste de ${money(r.amount_cents)} para ${r.collaborator_name} será removido definitivamente.`, label: 'Excluir ajuste', danger: true, run: async () => { await rpc('delete_adjustment', { _id: r.id }, 'Ajuste excluído.', ['finance']); } })}>Excluir</Button>}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-10 pl-4"><input type="checkbox" aria-label="Selecionar todos os pendentes" className="size-4 accent-primary" checked={allSelected} disabled={!selectable.length} onChange={() => setSelected(allSelected ? [] : selectable.map((r) => r.id))} /></TableHead>
                <TableHead>Atendimento</TableHead>
                <TableHead>{tab === 'receivables' ? 'Cliente' : 'Colaborador'}</TableHead>
                <TableHead className="hidden md:table-cell">Data do serviço</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead className="pr-4 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} data-state={selected.includes(r.id) ? 'selected' : undefined}>
                  <TableCell className="py-3 pl-4">{r.status === 'pending' && <input type="checkbox" aria-label={`Selecionar ${r.booking_code}`} className="size-4 accent-primary" checked={selected.includes(r.id)} onChange={() => setSelected((s) => (s.includes(r.id) ? s.filter((x) => x !== r.id) : [...s, r.id]))} />}</TableCell>
                  <TableCell className="font-medium tabular-nums">{r.booking_code}</TableCell>
                  <TableCell>{r.client_name || r.collaborator_name}</TableCell>
                  <TableCell className="hidden text-slate-600 md:table-cell">{fmtDate(r.service_date)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{money(r.amount_cents)}</TableCell>
                  <TableCell>
                    {r.status === 'paid' ? <span><Pill tone="success" dot>Pago</Pill><span className="mt-1 block text-xs text-slate-500">{fmtDateTime(r.paid_at)}{r.payment_method ? ` · ${r.payment_method}` : ''}{r.payment_reference ? ` ${r.payment_reference}` : ''}</span></span> : <Pill tone="warn" dot>Pendente</Pill>}
                  </TableCell>
                  <TableCell className="pr-4 text-right">{r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => setConfirm({ ids: [r.id], label: r.booking_code })}>Dar baixa</Button>}{r.status === 'paid' && isGestor && <Button size="sm" variant="ghost" onClick={() => setAct({ title: 'Estornar baixa', description: `A baixa de ${r.booking_code} será desfeita e o lançamento voltará a ficar pendente. O estorno fica registrado no histórico do atendimento.`, label: 'Estornar baixa', run: async () => { await rpc(tab === 'receivables' ? 'reopen_receivable' : 'reopen_payout', { _id: r.id }, 'Baixa estornada.', ['finance', 'events']); } })}>Estornar</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableCell colSpan={4} className="pl-4 text-sm text-slate-600">{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'} na lista</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum(rows))}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Panel>

      <SettleDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={tab === 'receivables' ? 'Confirmar recebimento' : 'Confirmar pagamento do repasse'}
        label={confirm?.label || ''}
        onConfirm={async (m, ref) => { if (confirm) await settle(confirm.ids, m, ref); }}
      />
      <ConfirmDialog open={!!act} onOpenChange={(o) => !o && setAct(null)} danger={act?.danger} title={act?.title || ''} description={act?.description || ''} confirmLabel={act?.label || 'Confirmar'} onConfirm={() => (act ? act.run() : undefined)} />
      <AdjustmentSheet open={adjOpen || !!adjEdit} onOpenChange={(o) => { if (!o) { setAdjOpen(false); setAdjEdit(null); } }} isGestor={isGestor} payouts={payouts} editing={adjEdit} />
    </>
  );
}

function AdjustmentSheet({ open, onOpenChange, isGestor, payouts, editing }: { open: boolean; onOpenChange: (o: boolean) => void; isGestor: boolean; payouts: Row[]; editing: Row | null }) {
  const rpc = useRpc();
  const { data: team = [] } = useTeam(isGestor);
  const [member, setMember] = useState('');
  const [kind, setKind] = useState<'credit' | 'debit'>('credit');
  const [cents, setCents] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setMember(editing ? String(editing.team_member_id || '') : '');
      setKind(editing && Number(editing.amount_cents) < 0 ? 'debit' : 'credit');
      setCents(editing ? Math.abs(Number(editing.amount_cents)) : null);
      setReason(editing ? String(editing.reason) : '');
      setErrors({});
    }
  }, [open, editing]);

  const people: { id: string; name: string }[] = isGestor
    ? team.filter((m: Row) => m.active).map((m: Row) => ({ id: m.id, name: m.name }))
    : Array.from(new Map(payouts.map((p) => [p.team_member_id as string, { id: p.team_member_id as string, name: p.collaborator_name as string }])).values());

  async function submit() {
    const e: Record<string, string> = {};
    if (!member) e.member = 'Selecione o colaborador.';
    if (!cents) e.cents = 'Informe um valor maior que zero.';
    else if (cents > 1000000) e.cents = 'O valor máximo por ajuste é R$ 10.000,00.';
    if (reason.trim().length < 5) e.reason = 'Descreva o motivo (mínimo de 5 caracteres).';
    setErrors(e);
    if (Object.keys(e).length || !cents) return;
    setBusy(true);
    const amount = kind === 'debit' ? -cents : cents;
    const ok = editing
      ? await rpc('update_adjustment', { _id: editing.id, _amount_cents: amount, _reason: reason.trim() }, 'Ajuste atualizado.', ['finance'])
      : await rpc('add_adjustment', { _team_member_id: member, _amount_cents: amount, _reason: reason.trim() }, 'Ajuste lançado.', ['finance']);
    setBusy(false);
    if (ok) onOpenChange(false);
  }

  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title={editing ? 'Editar ajuste financeiro' : 'Novo ajuste financeiro'} description={editing ? 'Corrija o valor ou o motivo. O colaborador do lançamento não pode ser alterado.' : 'Acréscimos e descontos aplicados a um colaborador. O lançamento fica registrado com autor e data.'} onSubmit={() => void submit()} submitLabel={editing ? 'Salvar alterações' : 'Lançar ajuste'} busy={busy}>
      <Field label="Colaborador" id="a-member" required error={errors.member} hint={!isGestor ? 'Você pode ajustar colaboradores que já constam em repasses.' : undefined}>
        <NativeSelect id="a-member" value={member} disabled={!!editing} onChange={(e) => setMember(e.target.value)}>
          <option value="">Selecione o colaborador</option>
          {editing && !people.some((p) => p.id === member) && <option value={member}>{String(editing.collaborator_name)}</option>}
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
      </Field>
      <Segmented label="Tipo de ajuste" value={kind} onChange={setKind} options={[{ value: 'credit', label: 'Acréscimo' }, { value: 'debit', label: 'Desconto' }]} />
      <Field label="Valor" id="a-value" required error={errors.cents}><MoneyInput id="a-value" cents={cents} onChange={setCents} /></Field>
      <Field label="Motivo" id="a-reason" required error={errors.reason}><Input id="a-reason" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: horas extras no turno da noite" /></Field>
    </FormSheet>
  );
}
