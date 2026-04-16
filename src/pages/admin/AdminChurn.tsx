import { useState, useEffect } from "react";
import { TrendingDown, Users, AlertTriangle, Percent, Calendar, UserX, BarChart3, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";

interface ChurnRecord {
  id: string;
  user_id: string;
  email: string | null;
  provider: string | null;
  cancelled_at: string;
  active_until: string | null;
  billing_type: string | null;
  notes: string | null;
  // feedback fields (joined)
  cancellation_reason: string | null;
  usage_level: string | null;
  additional_comments: string | null;
  intends_to_return: string | null;
  details: string | null;
  feedback_provider: string | null;
  // profile
  plan: string | null;
  name: string | null;
}

const reasonLabels: Record<string, string> = {
  expensive: "Custo alto",
  not_using: "Não estava usando",
  no_results: "Sem resultado",
  bug: "Problemas técnicos",
  competitor: "Migrou para concorrente",
  missing_feature: "Falta recurso",
  no_time: "Sem tempo",
  other: "Outro",
  "Não entendi como usar": "Não entendeu",
  "Não tive tempo para implementar": "Sem tempo",
  "Não vi resultado": "Sem resultado",
  "Custo / investimento": "Custo alto",
  "Tive problemas técnicos": "Problemas técnicos",
  "Não era o que eu esperava": "Expectativa",
  "Outro": "Outro",
};

const returnLabels: Record<string, string> = {
  yes: "Sim",
  maybe: "Talvez",
  no: "Não",
};

export default function AdminChurn() {
  const [records, setRecords] = useState<ChurnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<ChurnRecord | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Get all subscription cancellations
    const { data: cancellations } = await supabase
      .from("subscription_cancellations")
      .select("*")
      .order("cancelled_at", { ascending: false });

    // Get all cancellation feedback
    const { data: feedbacks } = await supabase
      .from("cancellation_feedback")
      .select("*")
      .order("created_at", { ascending: false });

    // Get profiles for names/plans
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name, plan");

    setTotalUsers(profiles?.length || 0);

    const profileMap = new Map<string, any>();
    profiles?.forEach(p => profileMap.set(p.id, p));

    // Build feedback map by user_id
    const feedbackMap = new Map<string, any>();
    feedbacks?.forEach(f => {
      if (!feedbackMap.has(f.user_id)) feedbackMap.set(f.user_id, f);
    });

    // Merge cancellations with feedback
    const merged: ChurnRecord[] = (cancellations || []).map(c => {
      const fb = feedbackMap.get(c.user_id);
      const profile = profileMap.get(c.user_id);
      return {
        id: c.id,
        user_id: c.user_id,
        email: profile?.email || null,
        provider: c.provider,
        cancelled_at: c.cancelled_at,
        active_until: c.active_until,
        billing_type: c.billing_type,
        notes: c.notes,
        cancellation_reason: fb?.cancellation_reason || null,
        usage_level: fb?.usage_level || null,
        additional_comments: fb?.additional_comments || null,
        intends_to_return: (fb as any)?.intends_to_return || null,
        details: (fb as any)?.details || null,
        feedback_provider: (fb as any)?.provider || null,
        plan: profile?.plan || null,
        name: profile?.name || null,
      };
    });

    // Also add feedbacks that don't have a cancellation record
    feedbacks?.forEach(f => {
      const exists = merged.some(m => m.user_id === f.user_id);
      if (!exists) {
        const profile = profileMap.get(f.user_id);
        merged.push({
          id: f.id,
          user_id: f.user_id,
          email: f.email || profile?.email || null,
          provider: (f as any)?.provider || null,
          cancelled_at: f.created_at,
          active_until: null,
          billing_type: null,
          notes: null,
          cancellation_reason: f.cancellation_reason,
          usage_level: f.usage_level,
          additional_comments: f.additional_comments,
          intends_to_return: (f as any)?.intends_to_return || null,
          details: (f as any)?.details || null,
          feedback_provider: (f as any)?.provider || null,
          plan: profile?.plan || null,
          name: profile?.name || null,
        });
      }
    });

    // Sort by date
    merged.sort((a, b) => new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime());

    setRecords(merged);
    setLoading(false);
  };

  const now = Date.now();
  const last30d = records.filter(r => new Date(r.cancelled_at).getTime() > now - 30 * 86400000);
  const last7d = records.filter(r => new Date(r.cancelled_at).getTime() > now - 7 * 86400000);
  const churnRate30d = totalUsers > 0 ? ((last30d.length / totalUsers) * 100).toFixed(1) : "0";
  const churnRateTotal = totalUsers > 0 ? ((records.length / totalUsers) * 100).toFixed(1) : "0";

  // Top reason
  const reasonCounts: Record<string, number> = {};
  records.forEach(r => {
    if (r.cancellation_reason) {
      const key = reasonLabels[r.cancellation_reason] || r.cancellation_reason;
      reasonCounts[key] = (reasonCounts[key] || 0) + 1;
    }
  });
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  // Provider breakdown
  const stripeChurns = records.filter(r => r.provider === "stripe").length;
  const asaasChurns = records.filter(r => r.provider === "asaas" || r.feedback_provider === "asaas").length;
  const pixChurns = records.filter(r => r.provider === "pix" || r.feedback_provider === "pix").length;

  // Intends to return
  const returnYes = records.filter(r => r.intends_to_return === "yes").length;
  const returnMaybe = records.filter(r => r.intends_to_return === "maybe").length;

  const kpis = [
    { label: "Total Cancelamentos", value: records.length, icon: UserX, color: "text-red-500" },
    { label: "Churns 30 dias", value: last30d.length, icon: Calendar, color: "text-amber-500" },
    { label: "Churns 7 dias", value: last7d.length, icon: TrendingDown, color: "text-orange-500" },
    { label: "Taxa Churn Total", value: `${churnRateTotal}%`, icon: Percent, color: "text-red-500" },
    { label: "Taxa Churn 30d", value: `${churnRate30d}%`, icon: BarChart3, color: "text-amber-500" },
    { label: "Principal Motivo", value: topReason ? topReason[0] : "—", icon: AlertTriangle, color: "text-primary", small: true },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Churn Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Análise de cancelamentos reais — Stripe, Asaas e PIX
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/40 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{kpi.label}</p>
              </div>
              <p className={`${kpi.small ? "text-sm" : "text-xl"} font-bold text-foreground`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Provider breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stripe</p>
            <p className="text-lg font-bold text-foreground mt-1">{stripeChurns}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Asaas Cartão</p>
            <p className="text-lg font-bold text-foreground mt-1">{asaasChurns}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">PIX</p>
            <p className="text-lg font-bold text-foreground mt-1">{pixChurns}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-4">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pretendem voltar</p>
            <p className="text-lg font-bold text-foreground mt-1">{returnYes + returnMaybe}</p>
            <p className="text-[10px] text-muted-foreground">{returnYes} sim · {returnMaybe} talvez</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cancelamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cancelamento registrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Pretende voltar</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedRecord(r)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.name || r.email || "—"}</p>
                          {r.name && r.email && <p className="text-[11px] text-muted-foreground">{r.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.provider === "stripe" ? "Stripe" : r.provider === "asaas" ? "Asaas" : r.provider === "pix" ? "PIX" : r.feedback_provider || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.cancellation_reason ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {reasonLabels[r.cancellation_reason] || r.cancellation_reason}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem feedback</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.intends_to_return ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              r.intends_to_return === "yes"
                                ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25"
                                : r.intends_to_return === "maybe"
                                ? "text-amber-600 bg-amber-500/10 border-amber-500/25"
                                : "text-red-600 bg-red-500/10 border-red-500/25"
                            }`}
                          >
                            {returnLabels[r.intends_to_return] || r.intends_to_return}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{r.details || r.notes || "—"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.cancelled_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={(o) => !o && setSelectedRecord(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">Detalhes do Cancelamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuário</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{selectedRecord.name || selectedRecord.email || "—"}</p>
                  {selectedRecord.email && <p className="text-[11px] text-muted-foreground">{selectedRecord.email}</p>}
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{new Date(selectedRecord.cancelled_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Provedor</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{selectedRecord.provider || selectedRecord.feedback_provider || "—"}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plano</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{selectedRecord.plan || "—"}</p>
                </div>
                {selectedRecord.active_until && (
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Ativo até</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{new Date(selectedRecord.active_until).toLocaleDateString("pt-BR")}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-border/40 pt-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Feedback do Cancelamento</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Motivo</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {selectedRecord.cancellation_reason
                        ? reasonLabels[selectedRecord.cancellation_reason] || selectedRecord.cancellation_reason
                        : "Não informado"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pretende voltar</span>
                    <span className="text-xs font-medium text-foreground">
                      {selectedRecord.intends_to_return
                        ? returnLabels[selectedRecord.intends_to_return] || selectedRecord.intends_to_return
                        : "Não informado"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Nível de uso</span>
                    <span className="text-xs font-medium text-foreground">{selectedRecord.usage_level || "Não informado"}</span>
                  </div>
                </div>

                {(selectedRecord.details || selectedRecord.additional_comments || selectedRecord.notes) && (
                  <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Observações</p>
                    <p className="text-xs text-foreground">{selectedRecord.details || selectedRecord.additional_comments || selectedRecord.notes}</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setSelectedRecord(null);
                  setSelectedUserId(selectedRecord.user_id);
                }}
              >
                Ver perfil completo do usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => { if (!open) setSelectedUserId(null); }}
        />
      )}
    </div>
  );
}
