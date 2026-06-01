import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserPlus, ArrowUpRight } from "lucide-react";
import {
  AccountRole,
  ROLE_PERMISSIONS,
  ROLE_LABEL,
  PERMISSION_LABEL,
  AccountPermission,
} from "@/lib/accountPermissions";
import { UserCreatedSuccessDialog } from "./UserCreatedSuccessDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  canAdd: boolean;
  remaining: number;
  planLabel: string;
}

const PERMISSION_ORDER: AccountPermission[] = [
  "dashboard_main",
  "dashboard_meta",
  "prospeccao",
  "crm",
  "atendimento",
  "usuarios",
  "assinaturas",
  "faturamento",
  "configuracoes",
  "integracoes",
];

export const AddUserDialog = ({ open, onOpenChange, onCreated, canAdd, remaining, planLabel }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<Exclude<AccountRole, "owner">>("operational");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const plan = ((profile as any)?.plan || "").toLowerCase();

  // Atendimento (start) → upgrade pra Growth; Growth → Enterprise sob medida; demais → Enterprise
  const upgradeTarget = plan === "start"
    ? { label: "Fazer upgrade para Growth IA", href: "/upgrade?to=growth" }
    : { label: "Falar com Enterprise (plano sob medida)", href: "/enterprise" };


  useEffect(() => {
    if (!open) {
      setName(""); setEmail(""); setPassword(""); setConfirm(""); setRole("operational");
    }
  }, [open]);

  const permissions = useMemo(() => ROLE_PERMISSIONS[role], [role]);

  const handleSubmit = async () => {
    if (!canAdd) {
      toast({ title: "Limite de usuários atingido", variant: "destructive" });
      return;
    }
    if (!name.trim() || !email.trim()) {
      toast({ title: "Preencha nome e email", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Senha muito curta", description: "Use no mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-create-member", {
        body: { name: name.trim(), email: email.trim().toLowerCase(), password, role },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setSuccess({ email: email.trim().toLowerCase(), password });
      onCreated();
    } catch (e: any) {
      toast({ title: "Erro ao criar usuário", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <DialogTitle>Adicionar Usuário</DialogTitle>
                <DialogDescription>
                  Plano {planLabel} · {remaining === Number.MAX_SAFE_INTEGER ? "ilimitado" : `${remaining} vaga(s) restante(s)`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!canAdd && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
              <div className="flex-1 text-sm">
                <div className="font-semibold text-destructive mb-1">Limite de usuários atingido</div>
                <p className="text-muted-foreground">
                  Seu plano <span className="font-medium text-foreground">{planLabel}</span> não permite mais vagas.{" "}
                  {plan === "start"
                    ? "Atualize para o Growth IA e libere até 5 usuários da conta."
                    : "Vamos montar um plano sob medida com usuários ilimitados no Enterprise."}
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => { onOpenChange(false); window.location.href = upgradeTarget.href; }}
              >
                {upgradeTarget.label}
                <ArrowUpRight size={14} />
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar Senha</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Cargo</Label>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABEL.admin}</SelectItem>
                  <SelectItem value="operational">{ROLE_LABEL.operational}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border border-border/60 rounded-xl p-4 bg-muted/30">
            <div className="text-sm font-medium mb-3">Permissões deste cargo</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
              {PERMISSION_ORDER.map((p) => {
                const allowed = permissions.includes(p);
                return (
                  <div key={p} className="flex items-center justify-between text-sm py-1">
                    <span className="text-foreground">{PERMISSION_LABEL[p]}</span>
                    <Switch checked={allowed} disabled />
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              As permissões são definidas pelo cargo e não podem ser alteradas individualmente.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            {canAdd ? (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Criar usuário"}
              </Button>
            ) : (
              <Button className="gap-1.5" onClick={() => { onOpenChange(false); window.location.href = upgradeTarget.href; }}>
                {upgradeTarget.label}
                <ArrowUpRight size={14} />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserCreatedSuccessDialog
        open={!!success}
        onClose={() => { setSuccess(null); onOpenChange(false); }}
        email={success?.email || ""}
        password={success?.password || ""}
      />
    </>
  );
};
