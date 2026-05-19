import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OrderBumpsCard } from "@/components/checkout/OrderBumpsCard";
import {
  emptyBumpSelection,
  profileToBumpSelection,
  calcBumpsMonthlyCents,
  type OrderBumpSelection,
} from "@/config/orderBumps";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planKey: string;
  /** Profile do usuário (lemos extra_*) */
  profile: any;
  /** Chamado após salvar com sucesso (refetch profile). */
  onSaved?: () => void;
}

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ManageAddonsDialog({ open, onOpenChange, planKey, profile, onSaved }: Props) {
  const [selection, setSelection] = useState<OrderBumpSelection>(emptyBumpSelection());
  const [saving, setSaving] = useState(false);
  const initial = profileToBumpSelection(profile);

  useEffect(() => {
    if (open) setSelection(profileToBumpSelection(profile));
  }, [open, profile]);

  const monthlyCents = calcBumpsMonthlyCents(selection);
  const changed =
    selection.numbers !== initial.numbers ||
    selection.contacts !== initial.contacts ||
    selection.opportunities !== initial.opportunities;

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-subscription-bumps", {
        body: { bumps: selection },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Add-ons atualizados!",
        description: "Sua assinatura foi ajustada com sucesso.",
      });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não foi possível atualizar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background border-border/60">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Gerenciar add-ons
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova expansões. Ajustes são cobrados proporcionalmente no
            próximo ciclo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <OrderBumpsCard
            planKey={planKey}
            billingPeriod="monthly"
            selection={selection}
            onChange={setSelection}
          />

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-snug">
              Add-ons são <strong className="text-foreground">recorrentes mensais</strong> e
              acompanham sua assinatura. Disponíveis apenas em planos mensais.
              Se um pagamento falhar, o add-on é removido automaticamente.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/40 p-3">
            <span className="text-sm text-muted-foreground">Total extra mensal</span>
            <span className="text-base font-bold text-foreground tabular-nums">
              {formatCurrency(monthlyCents)}/mês
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!changed || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Atualizar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
