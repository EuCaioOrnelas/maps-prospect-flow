import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X, Minus, Plus, Check, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  calcBumpsMonthlyCents,
  emptyBumpSelection,
  getBumpsForPlan,
  type OrderBumpId,
  type OrderBumpSelection,
} from "@/config/orderBumps";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planKey: string;
  planName: string;
  billingPeriod: "monthly" | "annual" | string;
  selection: OrderBumpSelection;
  onChange: (next: OrderBumpSelection) => void;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Copy específica por plano para o popup de upsell. */
function getPlanCopy(planKey: string, planName: string) {
  const k = (planKey || "").toLowerCase();
  if (k === "growth") {
    return {
      eyebrow: "Maximize seu Growth IA",
      title: `Pronto para escalar ainda mais o ${planName}?`,
      subtitle:
        "Some expansões opcionais agora e tenha mais números, contatos e oportunidades já no primeiro ciclo. Tudo em uma única cobrança.",
    };
  }
  if (k === "start") {
    return {
      eyebrow: "Potencialize seu Atendimento",
      title: `Quer atender mais clientes no ${planName}?`,
      subtitle:
        "Adicione mais um número de WhatsApp ou amplie seu CRM antes de finalizar. Tudo cobrado junto na mesma assinatura.",
    };
  }
  return {
    eyebrow: "Oferta exclusiva no checkout",
    title: `Antes de finalizar, turbine seu ${planName}`,
    subtitle:
      "Adicione expansões opcionais agora. Tudo cobrado em uma única assinatura.",
  };
}

/** Limites base por plano para cada recurso. */
function getPlanBase(planKey: string) {
  const k = (planKey || "").toLowerCase();
  if (k === "growth") return { numbers: 5, contacts: 10000, opportunities: 3000 };
  if (k === "start") return { numbers: 2, contacts: 1000, opportunities: 0 };
  return { numbers: 0, contacts: 0, opportunities: 0 };
}

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

export function CheckoutBumpsUpsellDialog({
  open,
  onOpenChange,
  planKey,
  planName,
  billingPeriod,
  selection,
  onChange,
}: Props) {
  const bumps = getBumpsForPlan(planKey);
  const total = calcBumpsMonthlyCents(selection);
  const hasSelection = total > 0;
  const copy = getPlanCopy(planKey, planName);

  const [snapshot, setSnapshot] = useState<OrderBumpSelection>(emptyBumpSelection());
  useEffect(() => {
    if (open) setSnapshot({ ...selection });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const setQty = (id: OrderBumpId, qty: number) => {
    const safe = Math.max(0, Math.min(99, qty));
    onChange({ ...selection, [id]: safe });
  };

  if (bumps.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-border/50 bg-card max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500/12 via-emerald-500/5 to-transparent px-6 pt-6 pb-5 border-b border-border/40">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-emerald-600" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 pr-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {copy.eyebrow}
              </p>
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight mt-0.5">
                {copy.title}
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{copy.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Lista de bumps — SEM card aninhado, itens diretos */}
        <div className="px-5 py-4 space-y-2.5">
          {bumps.map((bump) => {
            const qty = selection[bump.id] || 0;
            const active = qty > 0;
            const Icon = bump.icon;
            const monthlyTotal = bump.monthlyPriceCents * qty;
            const unitLabel =
              bump.step === 1
                ? `${formatCurrency(bump.monthlyPriceCents)}/mês por ${bump.unit}`
                : `${formatCurrency(bump.monthlyPriceCents)}/mês por pacote`;

            return (
              <motion.div
                key={bump.id}
                layout
                className={cn(
                  "rounded-xl border transition-all duration-200",
                  active
                    ? "border-emerald-500/50 bg-emerald-500/[0.05] ring-1 ring-emerald-500/25"
                    : "border-border/50 bg-background hover:border-emerald-500/30",
                )}
              >
                <div className="flex items-center gap-3 p-3">
                  <div
                    className={cn(
                      "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center",
                      "bg-emerald-500/10 text-emerald-600",
                      active && "bg-emerald-500/20",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-tight">
                      {bump.shortLabel}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                      {unitLabel}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {active ? (
                      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background p-0.5">
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
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setQty(bump.id, 1)}
                        className="h-9 px-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 transition-all"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" strokeWidth={2.5} />
                        ADICIONAR
                      </motion.button>
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
                        <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 px-3 py-2">
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
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-3 pt-3 mb-3">
            <span className="text-xs text-muted-foreground">Extras selecionados</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {hasSelection ? `+${formatCurrency(total)}/mês` : "Nenhum"}
            </span>
          </div>

          {hasSelection ? (
            <Button
              variant="default"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              onClick={() => onOpenChange(false)}
            >
              Adicionar e continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => onOpenChange(false)}
            >
              Continuar sem extras
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground text-center mt-2.5">
            Você pode ajustar os extras a qualquer momento no resumo do pedido.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
