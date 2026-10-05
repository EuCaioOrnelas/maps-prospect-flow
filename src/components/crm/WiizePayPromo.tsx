import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAllWiizePayCharges } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";
import wiizePayEntry from "@/assets/wiizepay-entrada.png.asset.json";

export type WiizePayPromoVariant = "modal" | "strip" | "card";

const DISMISS_KEY = "wiizepay-entry-promo-dismissed-v1";
const DISMISS_DAYS = 30;
const CONNECT_PATH = "/configuracoes/integracoes/wiize-pay";
const WIIZEPAY_SITE = "https://wiizepay.com.br";

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return !!raw && Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000;
  } catch { return false; }
}

interface Props {
  variant: WiizePayPromoVariant;
  /** Quando já se sabe o status de conexão (evita nova consulta). */
  connected?: boolean | null;
  dismissible?: boolean;
  className?: string;
}

/** Recomenda a WiizePay só para quem ainda não conectou. */
export function WiizePayPromo({ variant, connected, dismissible = false, className }: Props) {
  const navigate = useNavigate();
  const own = useAllWiizePayCharges();
  const [hidden, setHidden] = useState(dismissible ? dismissedRecently() : false);

  const isConnected = connected !== undefined ? connected : own.data?.connected === true;
  const statusResolved = connected !== undefined || own.isSuccess || own.isError;
  if (!statusResolved || isConnected || hidden) return null;

  const go = () => navigate(CONNECT_PATH);
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setHidden(true);
  };

  if (variant === "modal") {
    return (
      <Dialog open={!hidden} onOpenChange={(open) => { if (!open) dismiss(); }}>
        <DialogContent
          hideCloseButton
          overlayClassName="bg-black/70 backdrop-blur-sm"
          className={cn("w-[calc(100%-2rem)] max-w-5xl overflow-visible border-0 bg-transparent p-0 shadow-2xl", className)}
        >
          <DialogTitle className="sr-only">Conheça a WiizePay</DialogTitle>
          <DialogDescription className="sr-only">
            Receba seus pagamentos de forma simples e automática com a WiizePay.
          </DialogDescription>
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={dismiss}
              aria-label="Fechar anúncio da WiizePay"
              title="Fechar"
              className="!absolute -right-3 -top-3 z-10 h-10 w-10 rounded-full border border-border shadow-lg"
            >
              <X className="h-5 w-5" />
            </Button>
            <a
              href={WIIZEPAY_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Conhecer a WiizePay — abre wiizepay.com.br em uma nova aba"
            >
              <img
                src={wiizePayEntry.url}
                alt="WiizePay — receba seus pagamentos de forma simples e automática"
                className="block h-auto max-h-[78vh] w-full object-contain"
                loading="eager"
              />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const closeBtn = dismissible && (
    <div className="absolute right-2 top-2 z-10">
      <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Dispensar recomendação" title="Dispensar" className="h-8 w-8 bg-background/80 text-muted-foreground">
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  if (variant === "strip") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm", className)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><QrCode className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Receba com simplicidade pela WiizePay</p>
          <p className="text-xs text-muted-foreground">PIX automático e cobranças recorrentes, com tudo acompanhado na Wiize.</p>
        </div>
        <Button type="button" size="sm" onClick={go}>Conhecer a WiizePay <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("relative overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm", className)}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Transforme a venda em recebimento</p>
            <p className="text-xs leading-relaxed text-muted-foreground">Com a WiizePay, você cria PIX e cobranças automáticas e oferece um painel organizado ao cliente.</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={go}>Conhecer a WiizePay <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    );
  }

  return closeBtn;
}
