import { useEffect, useState, type ComponentType, type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown, Inbox, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { Tone } from './lib';

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
  success: 'bg-success-soft text-success ring-success/20',
  warn: 'bg-warning-soft text-warning ring-warning/25',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  brand: 'bg-brand-soft text-primary ring-primary/20',
};
const DOTS: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-sky-500',
  success: 'bg-success',
  warn: 'bg-warning',
  danger: 'bg-rose-500',
  brand: 'bg-primary',
};

export function Pill({ tone = 'neutral', dot, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone])}>
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

const AVATAR_TONES = ['bg-brand-soft text-primary', 'bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-900', 'bg-violet-100 text-violet-800', 'bg-rose-100 text-rose-800', 'bg-emerald-100 text-emerald-800'];

export function Avatar({ name, size = 'md', ring }: { name: string; size?: 'sm' | 'md' | 'lg'; ring?: boolean }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const tone = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const dim = size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-11 text-sm' : 'size-9 text-xs';
  return (
    <span title={name} className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold', dim, tone, ring && 'ring-2 ring-white')}>
      {initials}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 650, lineHeight: 1.2, letterSpacing: '-0.01em' }} className="text-slate-900">{title}</h1>
        {description && <div className="mt-1 max-w-2xl text-sm text-slate-500">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <div className={cn('relative min-w-[220px] flex-1 sm:max-w-sm', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-10 bg-white pl-9" />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg bg-slate-200/60 p-0.5 text-[13px] font-medium">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        style={{ height: 40, paddingLeft: 12, paddingRight: 36, fontSize: 14, borderRadius: 6, ...props.style }}
        className={cn(
          'h-10 w-full appearance-none rounded-md border border-input bg-white pl-3 pr-9 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

export function Field({ label, id, error, hint, required, className, children }: { label: string; id?: string; error?: string; hint?: string; required?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-slate-800">
        {label}
        {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <div role="alert" className="mt-1.5 text-xs text-rose-600">{error}</div>
      ) : hint ? (
        <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function MoneyInput({ id, cents, onChange }: { id?: string; cents: number | null; onChange: (v: number | null) => void }) {
  const display = cents === null ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
      <Input
        id={id}
        inputMode="numeric"
        value={display}
        placeholder="0,00"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
          onChange(digits ? parseInt(digits, 10) : null);
        }}
        className="pl-10 tabular-nums"
      />
    </div>
  );
}

export function FormSheet({ open, onOpenChange, title, description, onSubmit, submitLabel, busy, wide, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: () => void;
  submitLabel: string;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('flex w-full flex-col gap-0 p-0', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title}</SheetDescription>}
        </SheetHeader>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>
          <div className="flex items-center justify-end gap-2 border-t bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy} className="min-w-28">
              {busy ? 'Salvando…' : submitLabel}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function DetailSheet({ open, onOpenChange, title, description, children, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: ReactNode; description?: string; children: ReactNode; wide?: boolean }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn('flex w-full flex-col gap-0 p-0', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className={description ? undefined : 'sr-only'}>{description || 'Detalhes do registro'}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div role="heading" aria-level={3} className="text-sm font-semibold text-slate-900">{children}</div>
      {aside}
    </div>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, danger, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button
            disabled={busy}
            variant={danger ? 'destructive' : 'default'}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                onOpenChange(false);
              }
            }}
          >
            {busy ? 'Processando…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: Tone }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4">
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className={cn('mt-2 text-2xl font-semibold tabular-nums tracking-tight', tone === 'danger' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-slate-900')}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500"><Icon className="size-5" /></span>
      <div role="heading" aria-level={3} className="mt-4 text-sm font-semibold text-slate-900">{title}</div>
      {description && <div className="mt-1 max-w-sm text-sm text-slate-500">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-4 last:border-0">
          <div className="h-4 w-12 animate-pulse rounded bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={RefreshCw}
      title="Não foi possível carregar os dados"
      description={message}
      action={<Button variant="outline" onClick={onRetry}>Tentar novamente</Button>}
    />
  );
}

export const Panel = ({ className, children }: { className?: string; children: ReactNode }) => (
  <div className={cn('overflow-clip rounded-xl border border-slate-200/80 bg-white', className)}>{children}</div>
);
