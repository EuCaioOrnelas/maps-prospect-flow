import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { call2FA } from "@/hooks/use2FA";

/**
 * Visão do owner sobre o 2FA de um subusuário.
 * O owner NUNCA vê o segredo nem os códigos — apenas o status e a opção de reset.
 */
export function MemberSecurityCard({ memberUserId, memberName }: { memberUserId: string; memberName?: string | null }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{ two_factor_enabled: boolean; enabled_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_2fa_status", { _user_id: memberUserId } as any);
    setStatus((data as any) || null);
    setLoading(false);
  }, [memberUserId]);

  useEffect(() => { load(); }, [load]);

  const doReset = async () => {
    setResetting(true);
    const { error } = await call2FA("admin_reset_member", { member_user_id: memberUserId, password });
    setResetting(false);
    if (error) {
      toast({
        title: error === "invalid_password" ? "Senha incorreta" : "Não foi possível resetar",
        description: error === "forbidden"
          ? "Este usuário não pertence à sua conta."
          : "Confirme sua senha de owner e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "2FA resetado", description: "O usuário poderá configurar novamente no próximo acesso." });
    setPassword("");
    setResetOpen(false);
    load();
  };

  return (
    <div className="rounded-lg border border-border/50 bg-muted/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          {status?.two_factor_enabled ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          )}
          <span className="font-medium">Autenticação de dois fatores</span>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant={status?.two_factor_enabled ? "default" : "secondary"}>
              {status?.two_factor_enabled ? "Ativado" : "Desativado"}
            </Badge>
          )}
        </div>
        {status?.two_factor_enabled && (
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Resetar 2FA
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        O 2FA é pessoal: você não tem acesso ao segredo nem aos códigos de recuperação do usuário.
      </p>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resetar 2FA de {memberName || "usuário"}</DialogTitle>
            <DialogDescription>
              O segundo fator será desativado e todos os códigos de recuperação invalidados.
              A ação é registrada na auditoria. Confirme com a sua senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="owner-pass">Sua senha</Label>
            <Input id="owner-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doReset} disabled={resetting || !password} className="gap-2">
              {resetting && <Loader2 className="h-4 w-4 animate-spin" />}
              Resetar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
