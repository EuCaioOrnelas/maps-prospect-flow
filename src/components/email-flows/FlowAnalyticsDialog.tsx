import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, CheckCircle, XCircle, Clock } from "lucide-react";

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
    setMetrics(prev => ({
      ...prev,
      total_enrolled: e.length,
      active: e.filter(x => x.status === "active").length,
      completed: e.filter(x => x.status === "completed").length,
      exited: e.filter(x => x.status === "exited").length,
    }));

    const { data: logs } = await supabase
      .from("email_flow_execution_logs")
      .select("node_id, action_type, status")
      .eq("flow_id", flowId);

    const l = logs || [];
    setMetrics(prev => ({
      ...prev,
      emails_sent: l.filter(x => x.action_type === "email_sent").length,
      emails_opened: l.filter(x => x.action_type === "email_opened").length,
      emails_clicked: l.filter(x => x.action_type === "email_clicked").length,
    }));

    // Per-node metrics
    const nodeMap: Record<string, { passed: number; sent: number; opened: number; clicked: number }> = {};
    l.forEach(log => {
      if (!log.node_id) return;
      if (!nodeMap[log.node_id]) nodeMap[log.node_id] = { passed: 0, sent: 0, opened: 0, clicked: 0 };
      nodeMap[log.node_id].passed++;
      if (log.action_type === "email_sent") nodeMap[log.node_id].sent++;
      if (log.action_type === "email_opened") nodeMap[log.node_id].opened++;
      if (log.action_type === "email_clicked") nodeMap[log.node_id].clicked++;
    });

    const { data: nodes } = await supabase.from("email_flow_nodes").select("id, name, node_type").eq("flow_id", flowId);
    setNodeMetrics((nodes || []).map(n => ({ ...n, ...(nodeMap[n.id] || { passed: 0, sent: 0, opened: 0, clicked: 0 }) })));
  };

  const pct = (a: number, b: number) => b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Métricas do Fluxo</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MetricCard icon={<Users size={16} />} label="Entraram" value={metrics.total_enrolled} />
          <MetricCard icon={<Clock size={16} />} label="Ativos" value={metrics.active} color="text-blue-400" />
          <MetricCard icon={<CheckCircle size={16} />} label="Concluídos" value={metrics.completed} color="text-emerald-400" />
          <MetricCard icon={<XCircle size={16} />} label="Saíram" value={metrics.exited} color="text-red-400" />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <MetricCard icon={<Mail size={16} />} label="Emails Enviados" value={metrics.emails_sent} />
          <MetricCard label="Taxa Abertura" value={pct(metrics.emails_opened, metrics.emails_sent)} />
          <MetricCard label="Taxa Clique" value={pct(metrics.emails_clicked, metrics.emails_sent)} />
        </div>

        {nodeMetrics.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Performance por Bloco</h4>
            <div className="space-y-2">
              {nodeMetrics.map(n => (
                <div key={n.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between text-sm">
                  <span className="font-medium">{n.name} <span className="text-xs text-muted-foreground">({n.node_type})</span></span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Passaram: {n.passed}</span>
                    {n.node_type === "email" && (
                      <>
                        <span>Enviados: {n.sent}</span>
                        <span>Abertos: {n.opened}</span>
                        <span>Clicados: {n.clicked}</span>
                      </>
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

function MetricCard({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: number | string; color?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex flex-col items-center text-center">
        {icon && <div className={`mb-1 ${color || "text-muted-foreground"}`}>{icon}</div>}
        <p className="text-lg font-bold text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
