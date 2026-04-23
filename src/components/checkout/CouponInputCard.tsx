import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Tag, Check, X, Sparkles, TicketPercent } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppliedCoupon {
  code: string;
  promotionCodeId?: string;
  couponId?: string;
  percentOff?: number | null;
  amountOff?: number | null;
  currency?: string | null;
  duration: "once" | "repeating" | "forever";
  durationInMonths?: number | null;
  description: string;
}

interface CouponInputCardProps {
  planKey: string;
  billingPeriod: string;
  applied: AppliedCoupon | null;
  onApply: (coupon: AppliedCoupon) => void;
  onRemove: () => void;
}

export function CouponInputCard({
  planKey,
  billingPeriod,
  applied,
  onApply,
  onRemove,
}: CouponInputCardProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "validate-stripe-coupon",
        { body: { code: code.trim(), planKey, billingPeriod } },
      );

      if (fnError) {
        setError("Não foi possível validar o cupom. Tente novamente.");
        return;
      }

      if (!data?.valid) {
        setError(data?.error || "Cupom inválido");
        return;
      }

      onApply({
        code: data.code || code.trim(),
        promotionCodeId: data.promotionCodeId,
        couponId: data.couponId,
        percentOff: data.percentOff,
        amountOff: data.amountOff,
        currency: data.currency,
        duration: data.duration,
        durationInMonths: data.durationInMonths,
        description: data.description,
      });
      setCode("");
    } catch (e: any) {
      setError(e?.message || "Erro ao validar cupom");
    } finally {
      setLoading(false);
    }
  };

  // Estado: cupom aplicado
  if (applied) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Cupom aplicado</p>
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                {applied.code}
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label="Remover cupom"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="rounded-lg bg-background/60 border border-emerald-500/20 px-3 py-2.5 flex items-start gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-foreground leading-relaxed">{applied.description}</p>
        </div>
      </div>
    );
  }

  // Card de cupom — sempre visível e destacado
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <TicketPercent className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Cupom de desconto</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tem um código promocional? Aplique aqui.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="DIGITE O CÓDIGO"
          className={cn(
            "uppercase tracking-wider font-sans font-medium text-foreground placeholder:text-muted-foreground/50 placeholder:font-normal placeholder:tracking-normal",
            error && "border-destructive",
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              validate();
            }
          }}
          disabled={loading}
        />
        <Button
          onClick={validate}
          disabled={loading || !code.trim()}
          size="default"
          className="shrink-0 px-5"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
