import { Minus, Plus, Sparkles, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBumpsForPlan,
  bumpsAllowedForCycle,
  calcBumpsMonthlyCents,
  type OrderBumpSelection,
  type OrderBumpId,
} from "@/config/orderBumps";

interface Props {
  planKey: string;
  billingPeriod: "monthly" | "annual" | string;
  selection: OrderBumpSelection;
  onChange: (next: OrderBumpSelection) => void;
  /** Variante visual. `sidebar` (default) = compacto, `modal` = mais arejado. */
  variant?: "sidebar" | "modal";
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function OrderBumpsCard({ planKey, billingPeriod, selection, onChange, variant = "sidebar" }: Props) {
  const bumps = getBumpsForPlan(planKey);
  if (bumps.length === 0) return null;

  const isAnnual = billingPeriod === "annual";
  const allowed = bumpsAllowedForCycle(billingPeriod);

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Turbine seu plano
        </p>
        <div className="flex items-start gap-2 rounded-lg border border-border/40 bg-muted/40 px-3 py-2.5">
          <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Add-ons (números, contatos e oportunidades extras) estão disponíveis apenas no{" "}
            <strong className="text-foreground">plano mensal</strong>. Você pode adicioná-los
            depois pela área de assinatura.
          </p>
        </div>
      </div>
    );
  }

  const setQty = (id: OrderBumpId, qty: number) => {
    const safe = Math.max(0, Math.min(99, qty));
    onChange({ ...selection, [id]: safe });
  };

  const totalMonthly = calcBumpsMonthlyCents(selection);
  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-card overflow-hidden",
        isModal ? "p-0" : "p-4",
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2.5", isModal ? "px-5 pt-5 pb-3" : "pb-3")}>
        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-emerald-600" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Turbine seu plano</p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            Extras opcionais, cobrados junto com a mensalidade.
          </p>
        </div>
      </div>

      {/* Items */}
      <div className={cn("space-y-2", isModal && "px-5")}>
        {bumps.map((bump) => {
          const qty = selection[bump.id] || 0;
          const active = qty > 0;
          const Icon = bump.icon;
          const monthlyTotal = bump.monthlyPriceCents * qty;
          const unitLabel =
            bump.step === 1
              ? `${formatCurrency(bump.monthlyPriceCents)}/mês por ${bump.unit}`
              : `${formatCurrency(bump.monthlyPriceCents)}/mês por ${bump.step.toLocaleString("pt-BR")} ${bump.unit}`;

          return (
            <motion.button
              key={bump.id}
              layout
              type="button"
              onClick={() => !active && setQty(bump.id, 1)}
              className={cn(
                "w-full text-left rounded-xl border transition-all duration-200 group",
                active
                  ? "border-emerald-500/40 bg-emerald-500/[0.04] ring-1 ring-emerald-500/20"
                  : "border-border/50 bg-background hover:border-emerald-500/30 hover:bg-emerald-500/[0.02]",
                active && "cursor-default",
              )}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Green rounded square icon — Wiize style */}
                <div
                  className={cn(
                    "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center transition-colors",
                    "bg-emerald-500/10 text-emerald-600",
                    active && "bg-emerald-500/15",
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {bump.shortLabel}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
                    {unitLabel}
                  </p>
                </div>

                {/* Right side — toggle / stepper */}
                <div className="shrink-0">
                  {active ? (
                    <div
                      className="flex items-center gap-1 rounded-full border border-border/60 bg-background p-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setQty(bump.id, qty - 1)}
                        className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                        aria-label="Diminuir"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-[2rem] text-center text-xs font-bold tabular-nums text-foreground">
                        {bump.step === 1 ? qty : (qty * bump.step).toLocaleString("pt-BR")}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(bump.id, qty + 1)}
                        className="h-7 w-7 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center transition-colors"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-8 px-3 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1 group-hover:bg-emerald-500/10 transition-colors">
                      <Plus className="h-3 w-3" strokeWidth={2.5} />
                      Adicionar
                    </div>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {active && monthlyTotal > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 px-3 py-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-600" strokeWidth={3} />
                          Adicionado à sua assinatura
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                          +{formatCurrency(monthlyTotal)}/mês
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Total footer */}
      {totalMonthly > 0 && (
        <div className={cn("mt-3", isModal ? "px-5 pb-5" : "")}>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/40 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Total dos extras</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatCurrency(totalMonthly)}
              <span className="text-xs text-muted-foreground font-medium">/mês</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
