import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { OrderBumpsCard } from "@/components/checkout/OrderBumpsCard";
import {
  calcBumpsMonthlyCents,
  emptyBumpSelection,
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

export function CheckoutBumpsUpsellDialog({
  open,
  onOpenChange,
  planKey,
  planName,
  billingPeriod,
  selection,
  onChange,
}: Props) {
  // Snapshot inicial — para permitir "cancelar e voltar"
  const [snapshot, setSnapshot] = useState<OrderBumpSelection>(emptyBumpSelection());
  useEffect(() => {
    if (open) setSnapshot({ ...selection });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = calcBumpsMonthlyCents(selection);
  const hasSelection = total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden border-border/50 bg-card max-h-[90vh] overflow-y-auto"
      >
        {/* Header com banner verde */}
        <div className="relative bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent px-6 pt-6 pb-4 border-b border-border/40">
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
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Oferta exclusiva no checkout
              </p>
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight mt-0.5">
                Antes de finalizar, turbine seu {planName}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Adicione expansões opcionais agora. Tudo cobrado em uma única assinatura — você
                pode remover quando quiser.
              </p>
            </div>
          </div>
        </div>

        {/* Bumps */}
        <div className="p-5">
          <OrderBumpsCard
            planKey={planKey}
            billingPeriod={billingPeriod}
            selection={selection}
            onChange={onChange}
            variant="modal"
          />
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 border-t border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-3 pt-3 mb-3">
            <span className="text-xs text-muted-foreground">Extras selecionados</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {hasSelection ? `+${formatCurrency(total)}/mês` : "Nenhum"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => {
                onChange({ numbers: 0, contacts: 0, opportunities: 0 });
                onOpenChange(false);
              }}
            >
              Continuar sem extras
            </Button>
            <Button
              variant="default"
              className="sm:flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => onOpenChange(false)}
            >
              {hasSelection ? "Adicionar e continuar" : "Continuar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2.5">
            Você pode ajustar os extras a qualquer momento no resumo do pedido.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
