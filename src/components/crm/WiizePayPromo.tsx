import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, QrCode, Repeat, BellRing, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllWiizePayCharges } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";

export type WiizePayPromoVariant = "banner" | "strip" | "card";

const DISMISS_KEY = "wiize-pay-promo-dismissed-v1";
const DISMISS_DAYS = 30;
const CONNECT_PATH = "/configuracoes/integracoes/wiize-pay";

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return !!raw && Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000;
  } catch { return false; }
}

const BENEFITS = [
  { Icon: QrCode, label: "PIX, boleto e cartão" },
  { Icon: Repeat, label: "Cobrança recorrente e parcelada" },
  { Icon: BellRing, label: "Status de pagamento automático" },
];

interface Props {
  variant: WiizePayPromoVariant;
  /** Quando já se sabe o status de conexão (evita nova consulta). */
  connected?: boolean | null;
  dismissible?: boolean;
  className?: string;
}

/** Recomenda o Wiize Pay só para quem ainda não conectou. */
export function WiizePayPromo({ variant, connected, dismissible = false, className }: Props) {
  const navigate = useNavigate();
  const own = useAllWiizePayCharges();
  const [hidden, setHidden] = useState(dismissible ? dismissedRecently() : false);

  const isConnected = connected !== undefined ? connected : own.data ? own.data.connected : undefined;
  if (isConnected !== false || hidden) return null;

  const go = () => navigate(CONNECT_PATH);
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setHidden(true);
  };

  const closeBtn = dismissible && (
    <button type="button" onClick={dismiss} aria-label="Dispensar" className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
      <X className="h-4 w-4" />
    </button>
  );

  if (variant === "strip") {
    return (
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3", className)}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Cobre esta venda pelo Wiize Pay</p>
          <p className="text-xs text-muted-foreground">PIX, boleto, cartão e recorrência, com status de pagamento direto na venda.</p>
        </div>
        <Button type="button" size="sm" onClick={go}>Conectar agora</Button>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={cn("relative rounded-xl border border-primary/30 bg-primary/5 p-4", className)}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CreditCard className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold text-foreground">Receba deste cliente pelo Wiize Pay</p>
            <p className="text-xs text-muted-foreground">Crie a cobrança em segundos e acompanhe se foi paga, sem sair da Wiize.</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={go}>Conectar Wiize Pay <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      {closeBtn}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CreditCard className="h-6 w-6" /></div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Wiize Pay</p>
            <h3 className="font-display text-lg font-semibold text-foreground">Receba suas vendas sem sair da Wiize</h3>
            <p className="text-sm text-muted-foreground">Nossa plataforma de pagamentos para prestadores de serviço: cobranças e assinaturas sem complicação.</p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pt-1">
              {BENEFITS.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-1.5 text-xs text-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</li>
              ))}
            </ul>
          </div>
        </div>
        <Button onClick={go} className="shrink-0 lg:mr-8">Conectar Wiize Pay <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
