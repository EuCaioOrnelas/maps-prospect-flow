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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${enabled ? "bg-emerald-500/10" : "bg-muted"}`}>
          {enabled
            ? <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            : <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <span className="text-sm font-medium leading-none">Dois fatores</span>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : enabled ? (
          <Badge variant="secondary" className="bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
            Ativado
          </Badge>
        ) : (
          <Badge className="gap-1 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shadow-none hover:bg-primary/10">
            <Star className="h-3 w-3 fill-current" />
            Recomendado
          </Badge>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground/90">
        {enabled
          ? `Sua conta pede um código do aplicativo autenticador a cada novo acesso. ${status?.recovery_codes_left ?? 0} código(s) de recuperação disponível(is).`
          : "Adicione uma camada extra: além da senha, será pedido um código do seu aplicativo autenticador."}
      </p>

      {enabled ? (
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-normal" onClick={() => setRecoveryOpen(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            Códigos de recuperação
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 font-normal text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDisableOpen(true)}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Desativar dois fatores
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary font-normal" onClick={() => setSetupOpen(true)} disabled={loading}>
          <ShieldCheck className="h-3.5 w-3.5" />
          Ativar dois fatores
        </Button>
      )}


      <TwoFactorSetupDialog open={setupOpen} onOpenChange={(v) => { setSetupOpen(v); if (!v) refresh(); }} onEnabled={refresh} />
      <TwoFactorDisableDialog open={disableOpen} onOpenChange={setDisableOpen} onDisabled={refresh} />
      <TwoFactorRecoveryDialog open={recoveryOpen} onOpenChange={setRecoveryOpen} onDone={refresh} />
    </div>
  );
}
