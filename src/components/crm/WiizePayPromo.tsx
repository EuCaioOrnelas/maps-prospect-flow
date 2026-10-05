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
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="p-5 pr-12 sm:p-6 sm:pr-12">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary"><Gauge className="h-6 w-6" /></div>
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold uppercase text-primary">WiizePay para prestadores de serviços</p>
              <h3 className="font-display text-xl font-semibold text-foreground">Receba com a mesma simplicidade que você vende</h3>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Crie cobranças, automatize seus recebimentos e dê ao cliente uma experiência profissional — sem sair da Wiize.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
            {BENEFITS.map(({ Icon, title, text }) => (
              <div key={title} className="flex min-w-0 gap-3 bg-card p-3.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0"><p className="text-xs font-semibold text-foreground">{title}</p><p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{text}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-border bg-muted/20 p-5 lg:w-72 lg:border-l lg:border-t-0">
          {/* Espaço da imagem (formato 4:3). Substituir pelo arte final quando enviada. */}
          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md border border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <QrCode className="h-10 w-10 text-primary/40" aria-hidden="true" />
          </div>
          <div className="w-full space-y-3">
            <p className="text-xs leading-relaxed text-muted-foreground">Ative uma conta de pagamentos conectada ao seu processo comercial.</p>
            <Button onClick={go} className="w-full">Conhecer a WiizePay <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
