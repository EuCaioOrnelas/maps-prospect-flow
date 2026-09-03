import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { brl, brlForTokens, tokensForAmount } from "@/data/wiizeApi";
import { useUpdateWalletPrefs, type ApiWallet } from "@/hooks/useWiizeApi";

export function AutoReloadDialog({
  open,
  onOpenChange,
  wallet,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  wallet: ApiWallet | null | undefined;
}) {
  const { toast } = useToast();
  const update = useUpdateWalletPrefs();

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState("5");
  const [topupTo, setTopupTo] = useState("50");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState("500");

  useEffect(() => {
    if (!wallet || !open) return;
    setEnabled(wallet.auto_topup_enabled);
    setThreshold(String(brlForTokens(wallet.auto_topup_threshold_tokens ?? 500)));
    setTopupTo(String(wallet.auto_topup_amount_brl ?? 50));
    setMonthlyLimit(String(wallet.auto_topup_monthly_limit_brl ?? 500));
    setLimitEnabled((wallet.auto_topup_monthly_limit_brl ?? 0) > 0);
  }, [wallet, open]);

  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const save = async () => {
    try {
      await update.mutateAsync({
        auto_topup_enabled: enabled,
        auto_topup_threshold_tokens: tokensForAmount(num(threshold)),
        auto_topup_amount_brl: num(topupTo),
        auto_topup_monthly_limit_brl: limitEnabled ? num(monthlyLimit) : 0,
      });
      toast({ title: "Recarga automática atualizada" });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recarga automática</DialogTitle>
          <DialogDescription>
            Adicione saldo automaticamente quando os créditos estiverem acabando.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Usar recarga automática</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A cobrança é gerada via PIX e creditada após a confirmação.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ar-threshold" className="text-sm font-normal">
                Quando meu saldo chegar em:
              </Label>
              <Input
                id="ar-threshold"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                inputMode="decimal"
                disabled={!enabled}
                className="max-w-[140px]"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ar-topup" className="text-sm font-normal">
                Recarregar até:
              </Label>
              <Input
                id="ar-topup"
                value={topupTo}
                onChange={(e) => setTopupTo(e.target.value)}
                inputMode="decimal"
                disabled={!enabled}
                className="max-w-[140px]"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Valor cobrado por recarga</span>
              <span className="tabular-nums text-foreground">{brl(num(topupTo))}</span>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Definir limite mensal</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A recarga automática para ao atingir o limite do mês.
                </p>
              </div>
              <Switch checked={limitEnabled} onCheckedChange={setLimitEnabled} disabled={!enabled} />
            </div>
            <Input
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              inputMode="decimal"
              disabled={!enabled || !limitEnabled}
              placeholder="500"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={update.isPending} className="gap-2">
            {update.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
