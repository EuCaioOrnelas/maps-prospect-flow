import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2, UserPlus, MoreHorizontal, ShieldAlert, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { ROLE_LABEL } from "@/lib/accountPermissions";
import { getPlanDisplayName } from "@/lib/planAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return "—"; }
};

export default function Users() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { role, loading: roleLoading } = useAccountRole();
  const { members, seat, loading, refresh } = useAccountMembers();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (roleLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (role !== "owner" && role !== "admin") {
    navigate("/acesso-negado", { replace: true });
    return null;
  }

  const planLabel = getPlanDisplayName(profile as any);
  const canAdd = seat.remaining > 0;

  const handleAction = async (action: "deactivate" | "reactivate" | "reset" | "delete", member: any) => {
    if (member.role === "owner") return;
    setBusyId(member.id);
    try {
      if (action === "reset") {
        const { data, error } = await supabase.functions.invoke("account-reset-member-password", {
          body: { user_id: member.user_id },
        });
        if (error) throw error;
        toast({ title: "Senha redefinida", description: `Nova senha enviada para ${member.email}` });
      } else {
        const { error } = await supabase.functions.invoke("account-update-member", {
          body: {
            user_id: member.user_id,
            action,
          },
        });
        if (error) throw error;
        toast({ title: "Ação concluída" });
      }
      await refresh();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Helmet><title>Usuários · Wiize</title></Helmet>
      <div className="min-h-screen bg-background relative">
        <BackgroundGlow />
        <AppSidebar profile={profile as any} />
        <div className="lg:pl-[72px]">
          <div className="lg:hidden">
            <AppHeader profile={profile as any} />
          </div>
          <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Usuários</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Gerencie quem tem acesso à sua conta Wiize.
                </p>
              </div>
              <Button onClick={() => setAddOpen(true)} disabled={!canAdd} className="w-full sm:w-auto">
                <UserPlus size={16} className="mr-2" /> Adicionar Usuário
              </Button>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">Plano atual</div>
              <div className="text-lg font-semibold mt-1">{planLabel}</div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">Usuários utilizados</div>
              <div className="text-lg font-semibold mt-1">
                {seat.used} {seat.unlimited ? "" : `/ ${seat.limit}`}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="text-xs text-muted-foreground">Vagas disponíveis</div>
              <div className="text-lg font-semibold mt-1">
                {seat.unlimited ? "Ilimitado" : seat.remaining}
              </div>
              {!canAdd && !seat.unlimited && (
                <Button variant="link" className="px-0 h-auto" onClick={() => navigate("/upgrade")}>
                  Fazer upgrade →
                </Button>
              )}
            </div>
          </div>

          {!canAdd && !seat.unlimited && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-3 text-sm">
              <ShieldAlert size={16} className="text-amber-600 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-amber-700">Você atingiu o limite de usuários do seu plano.</div>
                <div className="text-amber-700/80">Faça upgrade para adicionar mais usuários.</div>
              </div>
              <Button size="sm" onClick={() => navigate("/upgrade")}>Fazer Upgrade</Button>
            </div>
          )}

          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Último login</TableHead>
                  <TableHead className="w-[60px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                )}
                {!loading && members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {m.role === "owner" && <Crown size={14} className="text-amber-500" />}
                      {m.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.email}</TableCell>
                    <TableCell><Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge></TableCell>
                    <TableCell>
                      {m.status === "active"
                        ? <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Ativo</Badge>
                        : <Badge variant="outline">Inativo</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.created_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(m.last_login_at)}</TableCell>
                    <TableCell className="text-right">
                      {m.role !== "owner" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={busyId === m.id}>
                              {busyId === m.id ? <Loader2 className="animate-spin" size={14} /> : <MoreHorizontal size={16} />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAction("reset", m)}>Redefinir Senha</DropdownMenuItem>
                            {m.status === "active"
                              ? <DropdownMenuItem onClick={() => handleAction("deactivate", m)}>Desativar</DropdownMenuItem>
                              : <DropdownMenuItem onClick={() => handleAction("reactivate", m)}>Reativar</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleAction("delete", m)}>Remover</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        canAdd={canAdd}
        remaining={seat.remaining}
        planLabel={planLabel}
        onCreated={refresh}
      />
    </>
  );
}
