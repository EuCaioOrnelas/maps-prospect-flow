import { useEffect, useState } from "react";
import { Loader2, CreditCard, Star } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { brl, brlForTokens, tokensForAmount } from "@/data/wiizeApi";
import { useUpdateWalletPrefs, useApiPaymentMethods, useSetDefaultPaymentMethod, type ApiWallet } from "@/hooks/useWiizeApi";

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
  const { data: methods = [], isLoading: loadingMethods } = useApiPaymentMethods();
  const setDefault = useSetDefaultPaymentMethod();

  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState("5");
  const [topupTo, setTopupTo] = useState("50");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState("500");
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const defaultMethod = methods.find((m) => m.is_default) || methods[0];

  useEffect(() => {
    if (!wallet || !open) return;
    setEnabled(wallet.auto_topup_enabled);
    setThreshold(String(brlForTokens(wallet.auto_topup_threshold_tokens ?? 500)));
    setTopupTo(String(wallet.auto_topup_amount_brl ?? 50));
    setMonthlyLimit(String(wallet.auto_topup_monthly_limit_brl ?? 500));
    setLimitEnabled((wallet.auto_topup_monthly_limit_brl ?? 0) > 0);
    setSelectedMethodId(wallet.auto_topup_payment_method_id || defaultMethod?.id || null);
  }, [wallet, open, defaultMethod?.id]);

  const num = (v: string) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync(id);
      setSelectedMethodId(id);
      toast({ title: "Cartão definido como padrão" });
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const save = async () => {
    try {
      await update.mutateAsync({
        auto_topup_enabled: enabled,
        auto_topup_threshold_tokens: tokensForAmount(num(threshold)),
        auto_topup_amount_brl: num(topupTo),
        auto_topup_monthly_limit_brl: limitEnabled ? num(monthlyLimit) : 0,
        auto_topup_payment_method_id: enabled ? selectedMethodId : null,
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
                A cobrança é cobrada no cartão salvo e creditada automaticamente.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ar-threshold" className="text-sm font-normal">
                Quando meu saldo chegar em:
              </Label>
              <div className="relative max-w-[140px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="ar-threshold"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  disabled={!enabled}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="ar-topup" className="text-sm font-normal">
                Recarregar até:
              </Label>
              <div className="relative max-w-[140px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="ar-topup"
                  value={topupTo}
                  onChange={(e) => setTopupTo(e.target.value.replace(/[^\d.,]/g, ""))}
                  inputMode="decimal"
                  disabled={!enabled}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>Valor cobrado por recarga</span>
              <span className="tabular-nums text-foreground">{brl(num(topupTo))}</span>
            </div>
          </div>

          {/* Cartão padrão para recarga automática */}
          <div className="space-y-3 border-t border-border pt-4">
            <Label className="text-sm font-normal">Cartão para recarga automática</Label>
            {loadingMethods ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Carregando…
              </div>
            ) : methods.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                Nenhum cartão salvo. Adicione um cartão ao comprar créditos para ativar a recarga automática.
              </div>
            ) : (
              <div className="space-y-2">
                {methods.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                      selectedMethodId === m.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="auto-card"
                      checked={selectedMethodId === m.id}
                      onChange={() => {
                        setSelectedMethodId(m.id);
                        if (!m.is_default) handleSetDefault(m.id);
                      }}
                      disabled={!enabled}
                      className="accent-primary"
                    />
                    <CreditCard size={16} className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 text-sm text-foreground">
                      {m.brand?.toUpperCase()} •••• {m.last4}
                    </span>
                    {m.is_default && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Star size={10} /> Padrão
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
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
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value.replace(/[^\d.,]/g, ""))}
                inputMode="decimal"
                disabled={!enabled || !limitEnabled}
                placeholder="500"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={update.isPending || (enabled && !selectedMethodId)}
            className="gap-2"
          >
            {update.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
