import { useEffect, useMemo, useState } from "react";
import { Flame, TrendingUp, Heart, Snowflake, Sparkles, Clock, ArrowUpRight, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  email: string | null;
  name: string | null;
  plan: string | null;
  searches_used: number | null;
  searches_limit: number | null;
  trial_end_at: string | null;
  created_at: string;
  updated_at: string;
  total_score?: number;
  score_band?: string;
  purchase_intent_score?: number;
  churn_risk_score?: number;
  engagement_score?: number;
}

const PLAN_VALUE: Record<string, number> = { start: 296, growth: 696, scale: 1990 };
const UPGRADE_TARGET: Record<string, { plan: string; value: number }> = {
  start: { plan: "growth", value: 696 - 296 },
  growth: { plan: "scale", value: 1990 - 696 },
};

export default function AdminGrowthIntelligence() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Profiles + score join (manual since no FK)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name, plan, searches_used, searches_limit, trial_end_at, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(500);

      const { data: scores } = await supabase
        .from("user_scores")
        .select("user_id, total_score, score_band, purchase_intent_score, churn_risk_score, engagement_score");

      const scoreMap = new Map((scores || []).map((s: any) => [s.user_id, s]));
      const merged: UserRow[] = (profiles || []).map((p: any) => ({
        ...p,
        ...(scoreMap.get(p.id) || {}),
      }));
      setUsers(merged);
      setLoading(false);
    };
    load();
  }, []);

  const insights = useMemo(() => {
    const now = Date.now();

    // Trials quentes: free com trial ativo + (uso ≥ 60% OU score alto OU intenção alta)
    const hotTrials = users
      .filter(u => u.plan === "free" && u.trial_end_at && new Date(u.trial_end_at).getTime() > now)
      .map(u => {
        const trialEnd = new Date(u.trial_end_at!).getTime();
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / 86400000));
        const usagePct = Math.round(((u.searches_used || 0) / (u.searches_limit || 120)) * 100);
        const intent = Number(u.purchase_intent_score || 0);
        const score = Number(u.total_score || 0);
        // Heat composto: uso + intenção + score normalizado
        const heat = Math.min(100, Math.round(usagePct * 0.5 + intent * 0.3 + (score / 10) * 0.2));
        const temp: "hot" | "warm" | "cold" = heat >= 60 ? "hot" : heat >= 30 ? "warm" : "cold";
        return { ...u, daysLeft, usagePct, heat, temp, intent, score };
      })
      .filter(t => t.heat >= 30)
      .sort((a, b) => b.heat - a.heat);

    // Upgrade candidates: pagantes com uso alto OU intenção alta
    const upgradeCandidates = users
      .filter(u => u.plan && ["start", "growth"].includes(u.plan))
      .map(u => {
        const usagePct = Math.round(((u.searches_used || 0) / (u.searches_limit || 1000)) * 100);
        const intent = Number(u.purchase_intent_score || 0);
        const score = Number(u.total_score || 0);
        const upgradeScore = Math.min(100, Math.round(usagePct * 0.6 + intent * 0.25 + (score / 10) * 0.15));
        const target = UPGRADE_TARGET[u.plan!];
        return { ...u, usagePct, intent, score, upgradeScore, target };
      })
      .filter(u => u.upgradeScore >= 40)
      .sort((a, b) => b.upgradeScore - a.upgradeScore);

    // Recuperáveis: pagantes inativos 14-60d OU churn_risk alto
    const recoverable = users
      .filter(u => u.plan && u.plan !== "free")
      .map(u => {
        const daysInactive = Math.round((now - new Date(u.updated_at).getTime()) / 86400000);
        const churnRisk = Number(u.churn_risk_score || 0);
        return { ...u, daysInactive, churnRisk };
      })
      .filter(u => (u.daysInactive >= 14 && u.daysInactive <= 60) || u.churnRisk >= 60)
      .sort((a, b) => b.churnRisk - a.churnRisk || b.daysInactive - a.daysInactive);

    // Receita potencial estimada
    const trialRevenue = hotTrials.filter(t => t.temp === "hot").length * PLAN_VALUE.start;
    const upgradeRevenue = upgradeCandidates.reduce((sum, u) => sum + (u.target?.value || 0), 0);
    const recoveryRevenue = recoverable.reduce((sum, u) => sum + (PLAN_VALUE[u.plan || "start"] || 0), 0);

    return { hotTrials, upgradeCandidates, recoverable, trialRevenue, upgradeRevenue, recoveryRevenue };
  }, [users]);

  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles size={20} className="text-violet-500" /> Growth Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Oportunidades reais de receita identificadas via score, uso e intenção de compra dos usuários
        </p>
      </div>

      {/* Summary KPIs com receita projetada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={14} className="text-red-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trials Quentes</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{insights.hotTrials.filter(t => t.temp === "hot").length}</p>
                <p className="text-xs text-muted-foreground mt-1">Heat ≥ 60% — alta conversão</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">+ {fmtBRL(insights.trialRevenue)} potencial</p>
              </CardContent>
            </Card>
            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-violet-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upgrade</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{insights.upgradeCandidates.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Pagantes com uso/intenção alta</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">+ {fmtBRL(insights.upgradeRevenue)} expansão</p>
              </CardContent>
            </Card>
            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={14} className="text-amber-500" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recuperáveis</p>
                </div>
                <p className="text-3xl font-bold text-foreground">{insights.recoverable.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Risco churn ou inativos 14-60d</p>
                <p className="text-xs text-emerald-600 font-medium mt-2">{fmtBRL(insights.recoveryRevenue)} em risco</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Hot trials */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame size={16} className="text-red-500" /> Trials com Alto Potencial
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{insights.hotTrials.length} leads</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : insights.hotTrials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Heat Score</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Intenção</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.hotTrials.slice(0, 20).map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{t.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{t.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={t.heat} className="w-20 h-1.5" />
                        <span className={cn("text-xs font-bold", t.temp === "hot" ? "text-red-500" : "text-amber-500")}>{t.heat}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{t.usagePct}%</span></TableCell>
                    <TableCell><span className="text-sm">{t.intent.toFixed(0)}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={t.daysLeft <= 2 ? "text-red-500" : "text-muted-foreground"} />
                        <span className={cn("text-sm", t.daysLeft <= 2 && "text-red-500 font-medium")}>{t.daysLeft}d</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Snowflake size={20} className="mx-auto mb-2 opacity-50" />
              Nenhum trial quente no momento — usuários ainda não atingiram engajamento mínimo
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade candidates */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpRight size={16} className="text-violet-500" /> Candidatos a Upgrade
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{insights.upgradeCandidates.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : insights.upgradeCandidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano Atual</TableHead>
                  <TableHead>Sugestão</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Score Upgrade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.upgradeCandidates.slice(0, 20).map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs uppercase">{u.plan}</Badge></TableCell>
                    <TableCell>
                      {u.target ? (
                        <Badge className="text-xs bg-violet-500/10 text-violet-600 border-0 uppercase">→ {u.target.plan}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={u.usagePct} className="w-16 h-1.5" />
                        <span className="text-xs">{u.usagePct}%</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm font-bold text-violet-500">{u.upgradeScore}</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum candidato a upgrade identificado</div>
          )}
        </CardContent>
      </Card>

      {/* Recoverable */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" /> Contas em Risco / Recuperáveis
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{insights.recoverable.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : insights.recoverable.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Risco Churn</TableHead>
                  <TableHead>Dias Inativo</TableHead>
                  <TableHead>MRR em risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.recoverable.slice(0, 20).map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{u.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs uppercase">{u.plan}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={u.churnRisk} className="w-16 h-1.5" />
                        <span className={cn("text-xs font-medium", u.churnRisk >= 60 ? "text-red-500" : "text-amber-500")}>{u.churnRisk.toFixed(0)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn("text-sm", u.daysInactive > 30 ? "text-red-500 font-medium" : "text-amber-500")}>{u.daysInactive}d</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{fmtBRL(PLAN_VALUE[u.plan || "start"] || 0)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conta em risco identificada — base saudável</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
