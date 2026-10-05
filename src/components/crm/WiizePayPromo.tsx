import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, QrCode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllWiizePayCharges } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";
import wiizePayBanner from "@/assets/wiizepay-banner-4x1.png.asset.json";

export type WiizePayPromoVariant = "banner" | "strip" | "card";

const DISMISS_KEY = "wiize-pay-promo-dismissed-v3";
const DISMISS_DAYS = 7;
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
  if (isConnected || hidden) return null;

  const go = () => navigate(CONNECT_PATH);
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setHidden(true);
  };

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

  return (
    <section className={cn("relative overflow-hidden rounded-lg border border-border bg-card shadow-sm", className)} aria-label="Conheça a WiizePay">
      {closeBtn}
      {/* Banner inteiro é a imagem, na proporção real da arte (3:1), clicável até o site da WiizePay. */}
      <a
        href={WIIZEPAY_SITE}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full w-full focus-visible:outline-2 focus-visible:outline-primary"
        aria-label="Conhecer a WiizePay — wiizepay.com.br"
      >
        <img
          src={wiizePayBanner.url}
          alt="WiizePay — Receba seus pagamentos de forma simples e automática. Cobranças, clientes, contratos e recebimentos em um só lugar."
          className="block h-auto w-full"
          loading="lazy"
        />
      </a>
    </section>
  );
}
