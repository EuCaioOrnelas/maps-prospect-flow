import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, ShieldAlert, KeyRound, Star } from "lucide-react";
import { use2FAStatus } from "@/hooks/use2FA";
import { TwoFactorSetupDialog } from "@/components/security/TwoFactorSetupDialog";
import { TwoFactorDisableDialog } from "@/components/security/TwoFactorDisableDialog";
import { TwoFactorRecoveryDialog } from "@/components/security/TwoFactorRecoveryDialog";

/**
 * Bloco compacto de 2FA — pensado para viver dentro do card "Segurança" do perfil.
 */
export function TwoFactorPanel() {
  const { status, loading, refresh } = use2FAStatus();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const enabled = !!status?.two_factor_enabled;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
          {enabled
            ? <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            : <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        </div>
        <span className="font-medium leading-none">Dois fatores</span>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : enabled ? (
          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">Ativado</Badge>
        ) : (
          <Badge className="gap-1 bg-primary px-2 py-0.5 text-[10px] text-primary-foreground shadow-sm hover:bg-primary">
            <Star className="h-3 w-3 fill-current" />
            Recomendado
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {enabled
          ? `Sua conta pede um código do aplicativo autenticador a cada novo acesso. ${status?.recovery_codes_left ?? 0} código(s) de recuperação disponível(is).`
          : "Adicione uma camada extra: além da senha, será pedido um código do seu aplicativo autenticador."}
      </p>

      {enabled ? (
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="w-full gap-2" onClick={() => setRecoveryOpen(true)}>
            <KeyRound className="h-4 w-4" />
            Códigos de recuperação
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDisableOpen(true)}
          >
            <ShieldAlert className="h-4 w-4" />
            Desativar dois fatores
          </Button>
        </div>
      ) : (
        <Button className="w-full gap-2" onClick={() => setSetupOpen(true)} disabled={loading}>
          <ShieldCheck className="h-4 w-4" />
          Ativar dois fatores
        </Button>
      )}

      <TwoFactorSetupDialog open={setupOpen} onOpenChange={(v) => { setSetupOpen(v); if (!v) refresh(); }} onEnabled={refresh} />
      <TwoFactorDisableDialog open={disableOpen} onOpenChange={setDisableOpen} onDisabled={refresh} />
      <TwoFactorRecoveryDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} onDone={refresh} />
    </div>
  );
}
