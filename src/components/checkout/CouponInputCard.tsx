import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Tag, Check, X, Sparkles } from "lucide-react";
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
  const [open, setOpen] = useState(false);

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
      setOpen(false);
    } catch (e: any) {
      setError(e?.message || "Erro ao validar cupom");
    } finally {
      setLoading(false);
    }
  };

  // Estado: cupom aplicado
  if (applied) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Cupom aplicado</p>
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">
                {applied.code}
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label="Remover cupom"
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="rounded-lg bg-background/60 border border-emerald-500/20 px-3 py-2.5 flex items-start gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-foreground leading-relaxed">{applied.description}</p>
        </div>
      </div>
    );
  }

  // Estado: aberto para inserir cupom
  if (open) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Cupom de desconto</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
              setCode("");
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
        </div>
        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="DIGITE O CÓDIGO"
            className={cn("uppercase font-mono tracking-wider", error && "border-destructive")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                validate();
              }
            }}
            autoFocus
            disabled={loading}
          />
          <Button
            onClick={validate}
            disabled={loading || !code.trim()}
            size="default"
            className="shrink-0"
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

  // Estado: fechado (CTA discreto)
  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full rounded-2xl border border-dashed border-border/60 bg-card hover:border-primary/40 hover:bg-primary/[0.03] transition-all p-4 flex items-center justify-center gap-2 group"
    >
      <Tag className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Tenho um cupom de desconto
      </span>
    </button>
  );
}
