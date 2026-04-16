import { useState } from "react";
import { CreditCard, X, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Card mostrado no dashboard nos últimos 1-2 dias do trial com cartão cadastrado.
 * Avisa o usuário que a cobrança vai acontecer automaticamente, sem botão de "renovar"
 * (pois é automático). Para cancelar, deve ir no Perfil.
 */
export const TrialAutoChargeBanner = () => {
  const { profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const isFreeTrial = !profile?.plan || profile.plan === "free";
  const p = profile as unknown as Record<string, unknown> | null;
  const willCharge = p?.trial_will_charge_at as string | undefined;
  const cancelled = p?.trial_auto_charge_cancelled as boolean | undefined;
  const last4 = p?.trial_card_last4 as string | undefined;
  const planChosen = p?.trial_plan_chosen as string | undefined;

  if (!isFreeTrial || !willCharge || cancelled || dismissed) return null;

  const chargeDate = new Date(willCharge);
  const daysLeft = differenceInDays(chargeDate, new Date());

  // Show only in last 2 days
  if (daysLeft < 0 || daysLeft > 2) return null;

  const planLabel = planChosen === "growth" ? "Wiize Growth" : planChosen === "scale" ? "Wiize Scale" : "Wiize Start";
  const planValue = planChosen === "growth" ? "R$ 696" : planChosen === "scale" ? "R$ 1.496" : "R$ 296";

  return (
    <div className="relative rounded-xl border border-primary/30 bg-primary/10 p-4 flex items-start gap-3">
      <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">
          {daysLeft === 0
            ? `Sua cobrança automática acontece hoje (${format(chargeDate, "dd 'de' MMMM", { locale: ptBR })})`
            : daysLeft === 1
              ? `Sua cobrança automática acontece amanhã (${format(chargeDate, "dd 'de' MMMM", { locale: ptBR })})`
              : `Sua cobrança automática acontece em ${daysLeft} dias (${format(chargeDate, "dd/MM/yyyy")})`}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Vamos cobrar automaticamente <strong>{planValue}</strong> no seu cartão final{" "}
          <strong>**** {last4 || "----"}</strong> e ativar o plano <strong>{planLabel}</strong>. Caso não queira
          continuar usando o Wiize, é necessário ir em <strong>Perfil → Cancelar ativação da assinatura</strong>{" "}
          antes da data acima.
        </p>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
          <CreditCard size={12} /> Cobrança via Asaas, fatura emitida no seu cartão de crédito.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
