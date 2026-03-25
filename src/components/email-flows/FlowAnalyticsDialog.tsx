import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, CheckCircle, XCircle, Clock, ShoppingCart, TrendingUp, Eye, MousePointerClick } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
}

interface UserDetail {
  user_id: string;
  email: string;
  name: string;
  status: string;
  entered_at: string;
  completed_at: string | null;
  emails_sent: string[];
  emails_opened: string[];
  emails_clicked: string[];
}

export function FlowAnalyticsDialog({ open, onOpenChange, flowId }: Props) {
  const [metrics, setMetrics] = useState({
    total_enrolled: 0,
    active: 0,
    completed: 0,
    exited: 0,
    emails_sent: 0,
    emails_opened: 0,
    emails_clicked: 0,
    emails_purchased: 0,
  });
  const [nodeMetrics, setNodeMetrics] = useState<any[]>([]);
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);

  useEffect(() => {
    if (open && flowId) loadMetrics();
  }, [open, flowId]);

  const loadMetrics = async () => {
    const { data: enrollments } = await supabase
      .from("email_flow_enrollments")
      .select("id, user_id, status, entered_at, completed_at")
      .eq("flow_id", flowId);

    const e = enrollments || [];
    const totalEnrolled = e.length;
    const completed = e.filter(x => x.status === "completed").length;

    const { data: logs } = await supabase
      .from("email_flow_execution_logs")
      .select("node_id, action_type, status, user_id, details, enrollment_id")
      .eq("flow_id", flowId);

    const l = logs || [];
    const emailsSent = l.filter(x => x.action_type === "email_sent").length;
    const emailsOpened = l.filter(x => x.action_type === "email_opened").length;
    const emailsClicked = l.filter(x => x.action_type === "email_clicked").length;
    const emailsPurchased = l.filter(x => x.action_type === "email_purchased").length;

    setMetrics({
      total_enrolled: totalEnrolled,
      active: e.filter(x => x.status === "active").length,
      completed,
      exited: e.filter(x => x.status === "exited").length,
      emails_sent: emailsSent,
      emails_opened: emailsOpened,
      emails_clicked: emailsClicked,
      emails_purchased: emailsPurchased,
    });

    // Per-node metrics
    const nodeMap: Record<string, { passed: number; sent: number; opened: number; clicked: number; purchased: number }> = {};
    l.forEach(log => {
      if (!log.node_id) return;
      if (!nodeMap[log.node_id]) nodeMap[log.node_id] = { passed: 0, sent: 0, opened: 0, clicked: 0, purchased: 0 };
      nodeMap[log.node_id].passed++;
      if (log.action_type === "email_sent") nodeMap[log.node_id].sent++;
      if (log.action_type === "email_opened") nodeMap[log.node_id].opened++;
      if (log.action_type === "email_clicked") nodeMap[log.node_id].clicked++;
      if (log.action_type === "email_purchased") nodeMap[log.node_id].purchased++;
    });

    const { data: nodes } = await supabase.from("email_flow_nodes").select("id, name, node_type").eq("flow_id", flowId);
    setNodeMetrics((nodes || []).map(n => ({ ...n, ...(nodeMap[n.id] || { passed: 0, sent: 0, opened: 0, clicked: 0, purchased: 0 }) })));

    // Build user details
    const userIds = [...new Set(e.map(en => en.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name")
        .in("id", userIds);

      const profileMap: Record<string, { email: string; name: string }> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = { email: p.email || "", name: p.name || "" }; });

      const nodeNameMap: Record<string, string> = {};
      (nodes || []).forEach(n => { nodeNameMap[n.id] = n.name; });

      const details: UserDetail[] = e.map(en => {
        const profile = profileMap[en.user_id] || { email: "—", name: "—" };
        const userLogs = l.filter(log => log.user_id === en.user_id && log.enrollment_id === en.id);

        const sent = userLogs.filter(log => log.action_type === "email_sent").map(log => nodeNameMap[log.node_id || ""] || "Email");
        const opened = userLogs.filter(log => log.action_type === "email_opened").map(log => nodeNameMap[log.node_id || ""] || "Email");
        const clicked = userLogs.filter(log => log.action_type === "email_clicked").map(log => {
          const url = (log.details as any)?.url || "";
          return `${nodeNameMap[log.node_id || ""] || "Email"}${url ? ` (${url.substring(0, 40)})` : ""}`;
        });

        return {
          user_id: en.user_id,
          email: profile.email,
          name: profile.name,
          status: en.status,
          entered_at: en.entered_at,
          completed_at: en.completed_at,
          emails_sent: sent,
          emails_opened: opened,
          emails_clicked: clicked,
        };
      });

      setUserDetails(details);
    } else {
      setUserDetails([]);
    }
  };

  const pct = (a: number, b: number) => b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
      active: { label: "Ativo", variant: "default" },
      completed: { label: "Concluído", variant: "secondary" },
      exited: { label: "Saiu", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas do Fluxo</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1">Visão Geral</TabsTrigger>
            <TabsTrigger value="nodes" className="flex-1">Por Bloco</TabsTrigger>
            <TabsTrigger value="users" className="flex-1">Usuários ({userDetails.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard icon={<Users size={16} />} label="Entraram" value={metrics.total_enrolled} />
              <MetricCard icon={<Clock size={16} />} label="Ativos" value={metrics.active} color="text-blue-400" />
              <MetricCard icon={<CheckCircle size={16} />} label="Concluídos" value={metrics.completed} color="text-primary" />
              <MetricCard icon={<XCircle size={16} />} label="Saíram" value={metrics.exited} color="text-destructive" />
              <MetricCard icon={<TrendingUp size={16} />} label="Conversão" value={metrics.emails_purchased} subtitle={pct(metrics.emails_purchased, metrics.total_enrolled)} color="text-primary" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={<Mail size={16} />} label="Emails Enviados" value={metrics.emails_sent} />
              <MetricCard label="Taxa Abertura" value={pct(metrics.emails_opened, metrics.emails_sent)} />
              <MetricCard label="Taxa Clique" value={pct(metrics.emails_clicked, metrics.emails_sent)} />
              <MetricCard icon={<ShoppingCart size={16} />} label="Compras" value={metrics.emails_purchased} subtitle={pct(metrics.emails_purchased, metrics.emails_sent)} color="text-primary" />
            </div>
          </TabsContent>

          <TabsContent value="nodes" className="mt-3">
            {nodeMetrics.length > 0 ? (
              <div className="space-y-2">
                {nodeMetrics.map(n => (
                  <div key={n.id} className="bg-muted/50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium">{n.name} <span className="text-xs text-muted-foreground">({n.node_type})</span></span>
                      <span className="text-xs text-muted-foreground">Passaram: {n.passed}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {n.node_type === "email" && (
                        <>
                          <span>Enviados: <span className="text-foreground font-medium">{n.sent}</span></span>
                          <span>Abertos: <span className="text-foreground font-medium">{n.opened}</span> <span className="text-muted-foreground/70">({pct(n.opened, n.sent)})</span></span>
                          <span>Clicados: <span className="text-foreground font-medium">{n.clicked}</span> <span className="text-muted-foreground/70">({pct(n.clicked, n.sent)})</span></span>
                          <span className="text-primary">Conversão: <span className="font-medium">{n.purchased}</span> <span className="text-primary/70">({pct(n.purchased, metrics.total_enrolled)})</span></span>
                        </>
                      )}
                      {n.node_type !== "email" && (
                        <span>Passaram: <span className="text-foreground font-medium">{n.passed}</span> <span className="text-muted-foreground/70">({pct(n.passed, metrics.total_enrolled)})</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma métrica registrada ainda.</p>
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-3">
            {userDetails.length > 0 ? (
              <div className="space-y-3">
                {userDetails.map((u, i) => (
                  <div key={`${u.user_id}-${i}`} className="bg-muted/50 rounded-lg p-3 text-sm border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{u.name || u.email}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(u.status)}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(u.entered_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Mail size={10} /> Enviados ({u.emails_sent.length})
                        </div>
                        {u.emails_sent.length > 0 ? (
                          u.emails_sent.map((s, j) => <p key={j} className="text-foreground truncate">• {s}</p>)
                        ) : <p className="text-muted-foreground/60 italic">Nenhum</p>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Eye size={10} /> Abertos ({u.emails_opened.length})
                        </div>
                        {u.emails_opened.length > 0 ? (
                          u.emails_opened.map((s, j) => <p key={j} className="text-foreground truncate">• {s}</p>)
                        ) : <p className="text-muted-foreground/60 italic">Nenhum</p>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <MousePointerClick size={10} /> Cliques ({u.emails_clicked.length})
                        </div>
                        {u.emails_clicked.length > 0 ? (
                          u.emails_clicked.map((s, j) => <p key={j} className="text-foreground truncate">• {s}</p>)
                        ) : <p className="text-muted-foreground/60 italic">Nenhum</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário passou pelo fluxo ainda.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ icon, label, value, color, subtitle }: { icon?: React.ReactNode; label: string; value: number | string; color?: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col items-center text-center">
        {icon && <div className={`mb-1 ${color || "text-muted-foreground"}`}>{icon}</div>}
        <p className="text-lg font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-[10px] font-medium text-primary">{subtitle}</p>}
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}