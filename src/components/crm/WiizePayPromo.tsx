import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CreditCard, Gauge, LayoutDashboard, QrCode, RefreshCw, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAllWiizePayCharges } from "@/hooks/useWiizePayCharges";
import { cn } from "@/lib/utils";

export type WiizePayPromoVariant = "banner" | "strip" | "card";

const DISMISS_KEY = "wiize-pay-promo-dismissed-v2";
const DISMISS_DAYS = 30;
const CONNECT_PATH = "/configuracoes/integracoes/wiize-pay";

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return !!raw && Date.now() - Number(raw) < DISMISS_DAYS * 86_400_000;
  } catch { return false; }
}

const BENEFITS = [
  { Icon: Zap, title: "Recebimento simples", text: "Venda e cobrança no mesmo fluxo" },
  { Icon: QrCode, title: "PIX automático", text: "Cobrança pronta para enviar" },
  { Icon: LayoutDashboard, title: "Painel do cliente", text: "Tudo organizado em um só lugar" },
  { Icon: RefreshCw, title: "Cobranças automáticas", text: "Recorrências sem trabalho manual" },
];

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
    <Button type="button" variant="ghost" size="icon" onClick={dismiss} aria-label="Dispensar recomendação" title="Dispensar" className="absolute right-3 top-3 z-10 h-8 w-8 text-muted-foreground">
      <X className="h-4 w-4" />
    </Button>
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
      <div className="flex flex-col gap-3 p-4 pr-12 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><Gauge className="h-5 w-5" /></div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase text-primary">WiizePay para prestadores de serviços</p>
            <h3 className="truncate font-display text-base font-semibold text-foreground">Receba com a mesma simplicidade que você vende</h3>
          </div>
        </div>
        <ul className="hidden shrink-0 items-center gap-x-4 lg:flex xl:gap-x-5">
          {BENEFITS.map(({ Icon, title }) => (
            <li key={title} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="whitespace-nowrap">{title}</span>
            </li>
          ))}
        </ul>
        <div className="flex shrink-0 items-center gap-3">
          {/* Espaço da imagem (formato 3:1, ex.: 480 × 160 px). Substituir pela arte final quando enviada. */}
          <div className="hidden h-14 w-44 items-center justify-center overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent md:flex">
            <QrCode className="h-6 w-6 text-primary/40" aria-hidden="true" />
          </div>
          <Button onClick={go} className="shrink-0">Conhecer a WiizePay <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
        </div>
      </div>
    </section>
  );
}
