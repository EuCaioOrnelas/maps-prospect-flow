import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import {
  Loader2, UserPlus, MoreHorizontal, ShieldAlert, Crown,
  User, Mail, Briefcase, Activity, Calendar, Clock, Settings2, TimerReset, BarChart3, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountRole } from "@/hooks/useAccountRole";
import { useAccountMembers, type AccountMember } from "@/hooks/useAccountMembers";
import { ROLE_LABEL } from "@/lib/accountPermissions";
import { getPlanDisplayName } from "@/lib/planAccess";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddUserDialog } from "@/components/users/AddUserDialog";
import { MemberDetailDialog } from "@/components/users/MemberDetailDialog";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { downloadCsv, fmtDuration, rangeToDates, toDateInputValue, type UserMonitoringRange } from "@/lib/userMonitoring";

const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("pt-BR"); } catch { return "—"; }
};

export default function Users() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { role, loading: roleLoading } = useAccountRole();
  const { members, seat, loading, refresh } = useAccountMembers();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<AccountMember | null>(null);
  const [range, setRange] = useState<UserMonitoringRange>("30d");
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));
  const [summary, setSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const dateRange = useMemo(() => rangeToDates(range, customFrom, customTo), [range, customFrom, customTo]);

  useEffect(() => {
    if (!user?.id) return;
    setSummaryLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.rpc("account_get_members_usage_summary", {
          _from: dateRange.from.toISOString(),
          _to: dateRange.to.toISOString(),
        });
        if (!error) setSummary(data || null);
      } finally {
        setSummaryLoading(false);
      }
    })();
  }, [user?.id, dateRange.from, dateRange.to]);

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

          <div className="rounded-xl border border-border/60 bg-card p-3 space-y-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <MonitoringRangeFilter
                value={range}
                onChange={setRange}
                from={customFrom}
                to={customTo}
                onFromChange={setCustomFrom}
                onToChange={setCustomTo}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs lg:w-auto"
                onClick={() => downloadCsv(`usuarios-${toDateInputValue(dateRange.from)}_${toDateInputValue(dateRange.to)}.csv`, [
                  {
                    plano: planLabel,
                    usuarios_total: summary?.total_users ?? seat.used,
                    usuarios_ativos_periodo: summary?.active_users ?? 0,
                    tempo_total: fmtDuration(summary?.total_seconds ?? 0),
                    media_sessao: fmtDuration(summary?.avg_session_seconds ?? 0),
                    ultimo_login: summary?.last_login_at ? new Date(summary.last_login_at).toLocaleString("pt-BR") : "—",
                  },
                ])}
              >
                <Download size={14} className="mr-1.5" /> Exportar
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <MetricCard icon={<User size={16} />} label="Usuários" value={summaryLoading ? "…" : String(summary?.total_users ?? seat.used)} detail={seat.unlimited ? planLabel : `${planLabel} · ${seat.used}/${seat.limit}`} />
              <MetricCard icon={<Activity size={16} />} label="Ativos no período" value={summaryLoading ? "…" : String(summary?.active_users ?? 0)} detail="Com atividade rastreada" />
              <MetricCard icon={<TimerReset size={16} />} label="Tempo total" value={summaryLoading ? "…" : fmtDuration(summary?.total_seconds ?? 0)} detail="Soma da equipe" />
              <MetricCard icon={<BarChart3 size={16} />} label="Média por sessão" value={summaryLoading ? "…" : fmtDuration(summary?.avg_session_seconds ?? 0)} detail={summary?.last_login_at ? `Último login ${formatDate(summary.last_login_at)}` : "Sem login registrado"} />
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
                <TableRow className="hover:bg-transparent">
                  <TableHead><div className="flex items-center gap-1.5"><User size={13} /> Usuário</div></TableHead>
                  <TableHead><div className="flex items-center gap-1.5"><Mail size={13} /> Email</div></TableHead>
                  <TableHead><div className="flex items-center gap-1.5"><Briefcase size={13} /> Cargo</div></TableHead>
                  <TableHead><div className="flex items-center gap-1.5"><Activity size={13} /> Status</div></TableHead>
                  <TableHead><div className="flex items-center gap-1.5"><Calendar size={13} /> Criado em</div></TableHead>
                  <TableHead><div className="flex items-center gap-1.5"><Clock size={13} /> Último login</div></TableHead>
                  <TableHead className="w-[60px] text-right"><div className="flex items-center justify-end gap-1.5"><Settings2 size={13} /> Ações</div></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                )}
                {!loading && members.map((m) => {
                  const initials = (m.name || m.email || "?").slice(0, 2).toUpperCase();
                  return (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelected(m)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-7 w-7">
                          {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1.5">
                          {m.role === "owner" && <Crown size={13} className="text-amber-500" />}
                          <span>{m.name || "—"}</span>
                        </div>
                      </div>
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
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
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
      <MemberDetailDialog
        member={selected}
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
      />
    </>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-lg font-semibold text-foreground">{value}</div>
        </div>
      </div>
      {detail && <div className="mt-2 text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}

function MonitoringRangeFilter({
  value,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  value: UserMonitoringRange;
  onChange: (v: UserMonitoringRange) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const options: { value: UserMonitoringRange; label: string }[] = [
    { value: "7d", label: "7 dias" },
    { value: "30d", label: "30 dias" },
    { value: "90d", label: "90 dias" },
    { value: "custom", label: "Início e fim" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          className="h-8 text-xs"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
      {value === "custom" && (
        <div className="flex items-center gap-1.5">
          <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="h-8 w-[132px] text-xs" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="h-8 w-[132px] text-xs" />
        </div>
      )}
    </div>
  );
}
