import { Users, Clock, Flame, AlertTriangle, Trophy, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface OperatorStats {
  userId: string;
  name: string;
  email: string;
  totalLeads: number;
  hotLeads: number;
  atRiskLeads: number;
  avgScore: number;
  avgResponseMinutes: number;
  hotResponseRate: number;
  performanceScore: number;
}

const useTeamPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-team-performance", user?.id],
    queryFn: async () => {
      // Get all leads with assigned operators
      const { data: leads, error: leadsErr } = await supabase
        .from("revenue_leads")
        .select("assigned_to_user_id, status_bucket, risk_state, score_total");
      if (leadsErr) throw leadsErr;

      // Get conversations for response times
      const { data: convs, error: convsErr } = await supabase
        .from("revenue_conversations")
        .select("lead_id, avg_response_time_seconds, unreplied_inbound_count");
      if (convsErr) throw convsErr;

      // Build lead-to-conversation map
      const convMap = new Map<string, { avgResponse: number; unreplied: number }>();
      for (const c of convs || []) {
        convMap.set(c.lead_id, {
          avgResponse: c.avg_response_time_seconds || 0,
          unreplied: c.unreplied_inbound_count || 0,
        });
      }

      // Group by operator
      const operatorMap = new Map<string, {
        totalLeads: number;
        hotLeads: number;
        atRiskLeads: number;
        scores: number[];
        responseTimes: number[];
        hotOk: number;
        hotTotal: number;
      }>();

      for (const lead of (leads || []) as any[]) {
        const opId = lead.assigned_to_user_id || "unassigned";
        if (!operatorMap.has(opId)) {
          operatorMap.set(opId, { totalLeads: 0, hotLeads: 0, atRiskLeads: 0, scores: [], responseTimes: [], hotOk: 0, hotTotal: 0 });
        }
        const op = operatorMap.get(opId)!;
        op.totalLeads++;
        op.scores.push(lead.score_total);
        if (lead.status_bucket === "HOT" || lead.status_bucket === "VERY_HOT") {
          op.hotLeads++;
          op.hotTotal++;
          if (lead.risk_state === "OK") op.hotOk++;
        }
        if (lead.risk_state !== "OK") op.atRiskLeads++;

        const conv = convMap.get(lead.id);
        if (conv && conv.avgResponse > 0) {
          op.responseTimes.push(conv.avgResponse);
        }
      }

      // Get operator names
      const opIds = Array.from(operatorMap.keys()).filter((id) => id !== "unassigned");
      let profilesMap = new Map<string, { name: string; email: string }>();
      if (opIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", opIds);
        for (const p of profiles || []) {
          profilesMap.set(p.id, { name: p.name || p.email, email: p.email });
        }
      }

      const results: OperatorStats[] = [];
      for (const [opId, data] of operatorMap) {
        const avgScore = data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0;
        const avgResponseSec = data.responseTimes.length > 0
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
          : 0;
        const hotResponseRate = data.hotTotal > 0 ? Math.round((data.hotOk / data.hotTotal) * 100) : 0;

        // Simple performance composite
        const responseScore = data.responseTimes.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - (avgResponseSec - 300) / 30));
        const performanceScore = Math.round(responseScore * 0.3 + hotResponseRate * 0.4 + Math.max(0, 100 - (data.atRiskLeads / Math.max(data.totalLeads, 1)) * 100) * 0.3);

        const profile = profilesMap.get(opId);
        results.push({
          userId: opId,
          name: opId === "unassigned" ? "Não atribuído" : (profile?.name || opId.slice(0, 8)),
          email: profile?.email || "",
          totalLeads: data.totalLeads,
          hotLeads: data.hotLeads,
          atRiskLeads: data.atRiskLeads,
          avgScore,
          avgResponseMinutes: Math.round(avgResponseSec / 60),
          hotResponseRate,
          performanceScore: Math.max(0, Math.min(100, performanceScore)),
        });
      }

      results.sort((a, b) => b.performanceScore - a.performanceScore);
      return results;
    },
    enabled: !!user,
  });
};

const performanceColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-destructive";
};

const RevenueTeam = () => {
  const { data: team, isLoading } = useTeamPerformance();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const operators = (team || []).filter((t) => t.userId !== "unassigned");
  const unassigned = (team || []).find((t) => t.userId === "unassigned");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users size={24} /> Performance por Operador
        </h1>
        <p className="text-sm text-muted-foreground">
          Ranking de performance baseado em tempo de resposta, atendimento a leads quentes e gestão de risco
        </p>
      </div>

      {operators.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum operador com leads atribuídos.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              O campo assigned_to_user_id nos leads precisa estar preenchido para esta análise.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {operators.map((op, idx) => (
            <Card key={op.userId} className="bg-card border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      idx === 1 ? "bg-gray-400/20 text-gray-400" :
                      idx === 2 ? "bg-orange-600/20 text-orange-500" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {idx < 3 ? <Trophy size={18} /> : idx + 1}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{op.name}</p>
                      {op.email && <p className="text-xs text-muted-foreground">{op.email}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", performanceColor(op.performanceScore))}>
                      {op.performanceScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Performance</p>
                  </div>
                </div>

                <Progress value={op.performanceScore} className="h-2 mb-4" />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                    <p className="text-lg font-bold text-foreground">{op.totalLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Flame size={12} /> Quentes</p>
                    <p className="text-lg font-bold text-foreground">{op.hotLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle size={12} /> Em Risco</p>
                    <p className="text-lg font-bold text-destructive">{op.atRiskLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock size={12} /> Resp. Média</p>
                    <p className="text-lg font-bold text-foreground">{op.avgResponseMinutes}min</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Score Médio</p>
                    <p className="text-lg font-bold text-foreground">{op.avgScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {unassigned && unassigned.totalLeads > 0 && (
        <Card className="bg-card border-border/50 opacity-60">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              ⚠️ {unassigned.totalLeads} lead(s) sem operador atribuído (score médio: {unassigned.avgScore})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RevenueTeam;
