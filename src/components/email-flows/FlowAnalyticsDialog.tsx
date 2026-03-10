import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, CheckCircle, XCircle, Clock, ShoppingCart, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
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

  useEffect(() => {
    if (open && flowId) loadMetrics();
  }, [open, flowId]);

  const loadMetrics = async () => {
    const { data: enrollments } = await supabase
      .from("email_flow_enrollments")
      .select("status")
      .eq("flow_id", flowId);

    const e = enrollments || [];
    const totalEnrolled = e.length;
    const completed = e.filter(x => x.status === "completed").length;

    const { data: logs } = await supabase
      .from("email_flow_execution_logs")
      .select("node_id, action_type, status")
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
  };

  const pct = (a: number, b: number) => b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas do Fluxo</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <MetricCard icon={<Users size={16} />} label="Entraram" value={metrics.total_enrolled} />
          <MetricCard icon={<Clock size={16} />} label="Ativos" value={metrics.active} color="text-blue-400" />
          <MetricCard icon={<CheckCircle size={16} />} label="Concluídos" value={metrics.completed} color="text-primary" />
          <MetricCard icon={<XCircle size={16} />} label="Saíram" value={metrics.exited} color="text-destructive" />
          <MetricCard
            icon={<TrendingUp size={16} />}
            label="Conversão"
            value={metrics.emails_purchased}
            subtitle={pct(metrics.emails_purchased, metrics.total_enrolled)}
            color="text-primary"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <MetricCard icon={<Mail size={16} />} label="Emails Enviados" value={metrics.emails_sent} />
          <MetricCard label="Taxa Abertura" value={pct(metrics.emails_opened, metrics.emails_sent)} />
          <MetricCard label="Taxa Clique" value={pct(metrics.emails_clicked, metrics.emails_sent)} />
          <MetricCard icon={<ShoppingCart size={16} />} label="Compras" value={metrics.emails_purchased} subtitle={pct(metrics.emails_purchased, metrics.emails_sent)} color="text-primary" />
        </div>

        {nodeMetrics.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Performance por Bloco</h4>
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
          </div>
        )}
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
