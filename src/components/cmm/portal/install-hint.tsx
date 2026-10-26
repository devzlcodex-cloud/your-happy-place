import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const KEY = 'cmm-install-hint-dismissed';
type Prompt = Event & { prompt: () => Promise<void> };

/** Dica de instalação na tela inicial, só no celular e fora do app instalado. */
export function InstallHint() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);
  const [deferred, setDeferred] = useState<Prompt | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    if (standalone || !mobile || localStorage.getItem(KEY)) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setShow(true);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as Prompt); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!show) return null;
  const close = () => { localStorage.setItem(KEY, '1'); setShow(false); };
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-brand/30 bg-card p-4 text-sm">
      <Smartphone className="mt-0.5 size-5 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <strong className="block">Instale o app CMM no celular</strong>
        <span className="text-muted-foreground">
          {ios ? 'No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".' : deferred ? 'Abra a CMM direto da tela inicial, em tela cheia.' : 'No menu do navegador (⋮), toque em "Adicionar à tela inicial".'}
        </span>
        {deferred && <Button className="mt-3 h-11 w-full" onClick={() => void deferred.prompt().finally(close)}>Instalar agora</Button>}
      </div>
      <button type="button" aria-label="Fechar dica" onClick={close} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
    </div>
  );
}
