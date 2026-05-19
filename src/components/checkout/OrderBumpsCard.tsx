import { Minus, Plus, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getBumpsForPlan,
  type OrderBumpSelection,
  type OrderBumpId,
  type OrderBumpDef,
} from "@/config/orderBumps";

interface Props {
  planKey: string;
  billingPeriod: "monthly" | "annual" | string;
  selection: OrderBumpSelection;
  onChange: (next: OrderBumpSelection) => void;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const accentClasses = {
  primary: {
    ring: "border-primary/40 bg-primary/5",
    icon: "bg-primary/10 text-primary",
    chip: "bg-primary/10 text-primary",
    btn: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  emerald: {
    ring: "border-emerald-500/40 bg-emerald-500/5",
    icon: "bg-emerald-500/10 text-emerald-600",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    btn: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  amber: {
    ring: "border-amber-500/40 bg-amber-500/5",
    icon: "bg-amber-500/10 text-amber-600",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    btn: "bg-amber-600 text-white hover:bg-amber-700",
  },
} as const;

export function OrderBumpsCard({ planKey, billingPeriod, selection, onChange }: Props) {
  const bumps = getBumpsForPlan(planKey);
  if (bumps.length === 0) return null;

  const isAnnual = billingPeriod === "annual";

  const setQty = (id: OrderBumpId, qty: number) => {
    const safe = Math.max(0, Math.min(99, qty));
    onChange({ ...selection, [id]: safe });
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Turbine seu plano
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Adicione recursos extras à sua assinatura. Cobrado junto com o plano,{" "}
            {isAnnual ? "anualmente" : "todo mês"}.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {bumps.map((bump) => {
          const qty = selection[bump.id] || 0;
          const active = qty > 0;
          const a = accentClasses[bump.accent];
          const Icon = bump.icon;
          const monthlyTotal = bump.monthlyPriceCents * qty;
          const cycleTotal = isAnnual ? monthlyTotal * 12 : monthlyTotal;
          const priceLabel =
            bump.monthlyPriceCents > 0
              ? `${formatCurrency(bump.monthlyPriceCents)}/mês`
              : "Em breve";

          return (
            <motion.div
              key={bump.id}
              layout
              className={cn(
                "rounded-xl border p-3 transition-colors",
                active ? a.ring : "border-border/40 bg-muted/20 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox / toggle */}
                <button
                  type="button"
                  onClick={() => setQty(bump.id, active ? 0 : 1)}
                  disabled={bump.monthlyPriceCents === 0}
                  className={cn(
                    "mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-all",
                    active
                      ? "bg-primary border-primary"
                      : "border-border bg-background hover:border-primary/50",
                    bump.monthlyPriceCents === 0 && "opacity-40 cursor-not-allowed",
                  )}
                  aria-label={`Selecionar ${bump.title}`}
                >
                  {active && <Check className="h-3.5 w-3.5 text-primary-foreground stroke-[3]" />}
                </button>

                {/* Icon */}
                <div
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-lg flex items-center justify-center",
                    a.icon,
                  )}
                >
                  <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {bump.title}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                        a.chip,
                      )}
                    >
                      {bump.shortLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-1">
                    {bump.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-foreground">
                      <span className="font-bold tabular-nums">{priceLabel}</span>
                      <span className="text-muted-foreground"> · por {bump.unit === "número" ? "número" : `pacote de ${bump.step.toLocaleString("pt-BR")}`}</span>
                    </p>

                    <AnimatePresence mode="popLayout">
                      {active && (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex items-center gap-1 rounded-full border border-border/60 bg-background p-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => setQty(bump.id, qty - 1)}
                            className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                            aria-label="Diminuir"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[2rem] text-center text-xs font-bold tabular-nums">
                            {bump.step === 1
                              ? qty
                              : (qty * bump.step).toLocaleString("pt-BR")}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(bump.id, qty + 1)}
                            className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                              a.btn,
                            )}
                            aria-label="Aumentar"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {active && cycleTotal > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                          Você está adicionando{" "}
                          <strong className="text-foreground">
                            {bump.step === 1
                              ? `${qty} ${qty === 1 ? bump.unit : bump.unit + "s"}`
                              : `${(qty * bump.step).toLocaleString("pt-BR")} ${bump.unit}`}
                          </strong>
                          {" "}·{" "}
                          <strong className="text-foreground">
                            +{formatCurrency(cycleTotal)}
                          </strong>
                          {isAnnual ? "/ano" : "/mês"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
