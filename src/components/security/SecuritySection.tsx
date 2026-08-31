import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck, ShieldAlert, KeyRound, Copy, Download } from "lucide-react";
import { use2FAStatus, call2FA } from "@/hooks/use2FA";
import { TwoFactorSetupDialog } from "@/components/security/TwoFactorSetupDialog";
import { TwoFactorDisableDialog } from "@/components/security/TwoFactorDisableDialog";
import { useToast } from "@/hooks/use-toast";

export function SecuritySection() {
  const { status, loading, refresh } = use2FAStatus();
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenCode, setRegenCode] = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const enabled = !!status?.two_factor_enabled;

  const regenerate = async () => {
    setRegenLoading(true);
    const { data, error } = await call2FA<{ recovery_codes: string[] }>("regenerate_recovery", { code: regenCode });
    setRegenLoading(false);
    if (error || !data) {
      toast({ title: "Código inválido", description: "Digite o código atual do aplicativo autenticador.", variant: "destructive" });
      return;
    }
    setNewCodes(data.recovery_codes);
    setRegenCode("");
    refresh();
  };

  return (
    <Card className="border-border/50" id="seguranca">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Segurança
        </CardTitle>
        <CardDescription>
          Proteja seus dados pessoais e sua conta ativando a autenticação de dois fatores
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {enabled ? (
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                  )}
                  <span className="font-medium">Autenticação de dois fatores</span>
                  <Badge variant={enabled ? "default" : "secondary"}>
                    {enabled ? "Ativado" : "Desativado"}
                  </Badge>
                  {!enabled && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                      Recomendado
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {enabled
                    ? `Ativada em ${status?.enabled_at ? new Date(status.enabled_at).toLocaleDateString("pt-BR") : "—"} · ${status?.recovery_codes_left ?? 0} código(s) de recuperação disponível(is)`
                    : "Adicione uma camada extra de segurança à sua conta ativando a autenticação de dois fatores."}
                </p>
              </div>
              {enabled ? (
                <Button variant="outline" onClick={() => setDisableOpen(true)}>Desativar</Button>
              ) : (
                <Button onClick={() => setSetupOpen(true)} className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ativar autenticação de dois fatores
                </Button>
              )}
            </div>

            {enabled && (
              <div className="space-y-3 rounded-lg border border-border/50 p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Códigos de recuperação</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Gerar novos códigos invalida imediatamente os anteriores. Confirme com o código atual do app.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Código de 6 dígitos"
                    value={regenCode}
                    onChange={(e) => setRegenCode(e.target.value.replace(/\D/g, ""))}
                    className="sm:max-w-[200px]"
                  />
                  <Button variant="outline" onClick={regenerate} disabled={regenLoading || regenCode.length !== 6}>
                    {regenLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerar novos códigos
                  </Button>
                </div>
                {newCodes.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 font-mono text-sm">
                      {newCodes.map((c) => <span key={c}>{c}</span>)}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(newCodes.join("\n")); toast({ title: "Códigos copiados" }); }}>
                        <Copy className="h-4 w-4" /> Copiar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => {
                        const blob = new Blob([newCodes.join("\n")], { type: "text/plain" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url; a.download = "wiize-codigos-recuperacao.txt"; a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        <Download className="h-4 w-4" /> Baixar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <TwoFactorSetupDialog open={setupOpen} onOpenChange={(v) => { setSetupOpen(v); if (!v) refresh(); }} onEnabled={refresh} />
      <TwoFactorDisableDialog open={disableOpen} onOpenChange={setDisableOpen} onDisabled={refresh} />
    </Card>
  );
}
