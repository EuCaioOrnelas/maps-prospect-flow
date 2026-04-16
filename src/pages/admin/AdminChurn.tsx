import { useEffect, useState } from "react";
import { TrendingDown, Users, AlertTriangle, Percent, Calendar, UserX, Eye } from "lucide-react";
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
  user_id: string | null;
  email: string | null;
  provider: string | null;
  cancelled_at: string;
  active_until: string | null;
  billing_type: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  usage_level: string | null;
  additional_comments: string | null;
  intends_to_return: string | null;
  details: string | null;
  feedback_provider: string | null;
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
  Outro: "Outro",
};

const returnLabels: Record<string, string> = {
  yes: "Sim",
  maybe: "Talvez",
  no: "Não",
};

const getProviderLabel = (provider: string | null, billingType?: string | null) => {
  if (provider === "stripe") return "Stripe";
  if (provider === "pix" || provider === "abacate_pay") return "PIX";
  if (provider === "asaas" && billingType === "PIX") return "PIX";
  if (provider === "asaas") return "Asaas Cartão";
  return provider || "—";
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
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-churn", {
        body: {},
      });

      if (error) throw error;

      const cancellations = data?.cancellations || [];
      const feedbacks = data?.feedbacks || [];
      const subEvents = data?.subEvents || [];
      const profiles = data?.profiles || [];
      const expiredProfiles = data?.expiredProfiles || [];
      const failedPixCheckouts = data?.failedPixCheckouts || [];

      setTotalUsers(profiles.length || 0);

      const profileMap = new Map<string, any>();
      profiles.forEach((profile: any) => profileMap.set(profile.id, profile));

      const feedbackMap = new Map<string, any>();
      feedbacks.forEach((feedback: any) => {
        if (!feedbackMap.has(feedback.user_id)) feedbackMap.set(feedback.user_id, feedback);
      });

      const addedUserIds = new Set<string>();
      const merged: ChurnRecord[] = [];

      cancellations.forEach((cancellation: any) => {
        const feedback = feedbackMap.get(cancellation.user_id);
        const profile = profileMap.get(cancellation.user_id);
        addedUserIds.add(cancellation.user_id);

        merged.push({
          id: cancellation.id,
          user_id: cancellation.user_id,
          email: profile?.email || null,
          provider: cancellation.provider,
          cancelled_at: cancellation.cancelled_at,
          active_until: cancellation.active_until,
          billing_type: cancellation.billing_type,
          notes: cancellation.notes,
          cancellation_reason: feedback?.cancellation_reason || null,
          usage_level: feedback?.usage_level || null,
          additional_comments: feedback?.additional_comments || null,
          intends_to_return: feedback?.intends_to_return || null,
          details: feedback?.details || null,
          feedback_provider: feedback?.provider || null,
          plan: profile?.plan || null,
          name: profile?.name || null,
        });
      });

      subEvents.forEach((event: any) => {
        if (!event.user_id || addedUserIds.has(event.user_id)) return;

        addedUserIds.add(event.user_id);
        const feedback = feedbackMap.get(event.user_id);
        const profile = profileMap.get(event.user_id);
        const isPixChurn = event.event_type === "pix_not_renewed";

        merged.push({
          id: event.id,
          user_id: event.user_id,
          email: event.email || profile?.email || null,
          provider: isPixChurn ? "pix" : profile?.payment_provider || (event.event_source === "stripe-webhook" ? "stripe" : event.event_source || null),
          cancelled_at: event.created_at,
          active_until: profile?.subscription_current_period_end || null,
          billing_type: isPixChurn ? "PIX" : null,
          notes: isPixChurn
            ? `PIX não renovado — Plano anterior: ${event.previous_plan || "—"}`
            : `${event.event_type} — Plano anterior: ${event.previous_plan || "—"}`,
          cancellation_reason: feedback?.cancellation_reason || null,
          usage_level: feedback?.usage_level || null,
          additional_comments: feedback?.additional_comments || null,
          intends_to_return: feedback?.intends_to_return || null,
          details: feedback?.details || null,
          feedback_provider: feedback?.provider || null,
          plan: profile?.plan || null,
          name: profile?.name || event.email || null,
        });
      });

      expiredProfiles.forEach((profile: any) => {
        if (addedUserIds.has(profile.id)) return;

        addedUserIds.add(profile.id);
        const feedback = feedbackMap.get(profile.id);
        const isPix = profile.payment_provider === "abacate_pay";

        merged.push({
          id: `expired-${profile.id}`,
          user_id: profile.id,
          email: profile.email || null,
          provider: isPix ? "pix" : profile.payment_provider || null,
          cancelled_at: profile.subscription_current_period_end,
          active_until: profile.subscription_current_period_end,
          billing_type: isPix ? "PIX" : null,
          notes: isPix
            ? "PIX expirado por falta de pagamento — fallback do sistema"
            : "Assinatura expirada sem log de cancelamento — fallback do sistema",
          cancellation_reason: feedback?.cancellation_reason || null,
          usage_level: feedback?.usage_level || null,
          additional_comments: feedback?.additional_comments || null,
          intends_to_return: feedback?.intends_to_return || null,
          details: feedback?.details || null,
          feedback_provider: feedback?.provider || null,
          plan: profile.plan || null,
          name: profile.name || null,
        });
      });

      failedPixCheckouts.forEach((checkout: any) => {
        if (checkout.user_id && addedUserIds.has(checkout.user_id)) return;

        if (checkout.user_id) {
          addedUserIds.add(checkout.user_id);
        }

        const profile = checkout.user_id ? profileMap.get(checkout.user_id) : null;
        const feedback = checkout.user_id ? feedbackMap.get(checkout.user_id) : null;

        merged.push({
          id: `failed-pix-${checkout.id}`,
          user_id: checkout.user_id || null,
          email: checkout.email || profile?.email || null,
          provider: "pix",
          cancelled_at: checkout.created_at || checkout.checkout_started_at,
          active_until: null,
          billing_type: "PIX",
          notes: "PIX gerado e não pago — checkout não concluído",
          cancellation_reason: feedback?.cancellation_reason || null,
          usage_level: feedback?.usage_level || null,
          additional_comments: feedback?.additional_comments || null,
          intends_to_return: feedback?.intends_to_return || null,
          details: feedback?.details || null,
          feedback_provider: feedback?.provider || "pix",
          plan: profile?.plan || checkout.plan_attempted || null,
          name: profile?.name || checkout.email || null,
        });
      });

      feedbacks.forEach((feedback: any) => {
        if (addedUserIds.has(feedback.user_id)) return;

        addedUserIds.add(feedback.user_id);
        const profile = profileMap.get(feedback.user_id);

        merged.push({
          id: feedback.id,
          user_id: feedback.user_id,
          email: feedback.email || profile?.email || null,
          provider: feedback.provider || null,
          cancelled_at: feedback.created_at,
          active_until: null,
          billing_type: null,
          notes: null,
          cancellation_reason: feedback.cancellation_reason,
          usage_level: feedback.usage_level,
          additional_comments: feedback.additional_comments,
          intends_to_return: feedback.intends_to_return || null,
          details: feedback.details || null,
          feedback_provider: feedback.provider || null,
          plan: profile?.plan || null,
          name: profile?.name || null,
        });
      });

      merged.sort((a, b) => new Date(b.cancelled_at).getTime() - new Date(a.cancelled_at).getTime());
      setRecords(merged);
    } catch (err) {
      console.error("Error loading churn data:", err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const now = Date.now();
  const last30d = records.filter((record) => new Date(record.cancelled_at).getTime() > now - 30 * 86400000);
  const last7d = records.filter((record) => new Date(record.cancelled_at).getTime() > now - 7 * 86400000);
  const last30dRate = totalUsers > 0 ? ((last30d.length / totalUsers) * 100).toFixed(1) : "0";
  const last7dRate = totalUsers > 0 ? ((last7d.length / totalUsers) * 100).toFixed(1) : "0";
  const churnRateTotal = totalUsers > 0 ? ((records.length / totalUsers) * 100).toFixed(1) : "0";

  const reasonCounts: Record<string, number> = {};
  records.forEach((record) => {
    if (!record.cancellation_reason) return;
    const key = reasonLabels[record.cancellation_reason] || record.cancellation_reason;
    reasonCounts[key] = (reasonCounts[key] || 0) + 1;
  });
  const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];

  const returnYes = records.filter((record) => record.intends_to_return === "yes").length;
  const returnMaybe = records.filter((record) => record.intends_to_return === "maybe").length;

  const kpis = [
    { label: "Total Cancelamentos", value: records.length, subtext: `${churnRateTotal}% da base`, icon: UserX, color: "text-red-500" },
    { label: "Churns 30 dias", value: `${last30dRate}%`, subtext: `(${last30d.length} usuários)`, icon: Calendar, color: "text-amber-500" },
    { label: "Churns 7 dias", value: `${last7dRate}%`, subtext: `(${last7d.length} usuários)`, icon: TrendingDown, color: "text-orange-500" },
    { label: "Taxa Churn Total", value: `${churnRateTotal}%`, icon: Percent, color: "text-red-500" },
    { label: "Principal Motivo", value: topReason ? topReason[0] : "—", icon: AlertTriangle, color: "text-primary", small: true },
    { label: "Pretendem Voltar", value: returnYes + returnMaybe, subtext: `${returnYes} sim · ${returnMaybe} talvez`, icon: Users, color: "text-emerald-500" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Churn Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Análise de cancelamentos reais — Stripe, Asaas e PIX</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/40 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-tight">{kpi.label}</p>
              </div>
              <p className={`${kpi.small ? "text-sm" : "text-xl"} font-bold text-foreground`}>{kpi.value}</p>
              {kpi.subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.subtext}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Cancelamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
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
                  {records.map((record) => (
                    <TableRow key={record.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSelectedRecord(record)}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{record.name || record.email || "—"}</p>
                          {record.name && record.email && <p className="text-[11px] text-muted-foreground">{record.email}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {getProviderLabel(record.provider, record.billing_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.cancellation_reason ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {reasonLabels[record.cancellation_reason] || record.cancellation_reason}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem feedback</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.intends_to_return ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              record.intends_to_return === "yes"
                                ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/25"
                                : record.intends_to_return === "maybe"
                                  ? "text-amber-600 bg-amber-500/10 border-amber-500/25"
                                  : "text-red-600 bg-red-500/10 border-red-500/25"
                            }`}
                          >
                            {returnLabels[record.intends_to_return] || record.intends_to_return}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-xs text-muted-foreground truncate">{record.details || record.notes || "—"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(record.cancelled_at).toLocaleDateString("pt-BR")}
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

      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
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
                  <p className="text-sm font-semibold text-foreground mt-0.5">{getProviderLabel(selectedRecord.provider, selectedRecord.billing_type)}</p>
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

              {selectedRecord.user_id && (
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
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => {
            if (!open) setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
}
