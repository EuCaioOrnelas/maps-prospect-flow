import { useState, useEffect } from "react";
import { Rocket, TrendingUp, Users, Zap, ArrowRight, Star, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface TrialLead {
  id: string;
  email: string;
  name: string | null;
  searches_used: number;
  searches_limit: number;
  trial_end_at: string | null;
  created_at: string;
  daysLeft: number;
  usagePercent: number;
  temperature: "hot" | "warm" | "cold";
}

interface UpgradeCandidate {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  searches_used: number;
  searches_limit: number;
  usagePercent: number;
}

export default function AdminGrowthIntelligence() {
  const [hotTrials, setHotTrials] = useState<TrialLead[]>([]);
  const [upgradeCandidates, setUpgradeCandidates] = useState<UpgradeCandidate[]>([]);
  const [inactiveRecoverable, setInactiveRecoverable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const now = Date.now();

      // Hot trials: free users with trial still active and high usage
      const { data: freeUsers } = await supabase
        .from("profiles")
        .select("id, email, name, searches_used, searches_limit, trial_end_at, created_at")
        .eq("plan", "free")
        .gte("trial_end_at", new Date().toISOString())
        .order("searches_used", { ascending: false })
        .limit(50);

      const trials: TrialLead[] = (freeUsers || []).map(u => {
        const trialEnd = u.trial_end_at ? new Date(u.trial_end_at).getTime() : now;
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / 86400000));
        const usagePercent = Math.round(((u.searches_used || 0) / (u.searches_limit || 120)) * 100);
        const temperature: "hot" | "warm" | "cold" = usagePercent >= 60 ? "hot" : usagePercent >= 30 ? "warm" : "cold";
        return { ...u, daysLeft, usagePercent, temperature, email: u.email || "", searches_used: u.searches_used || 0, searches_limit: u.searches_limit || 120 };
      });
      setHotTrials(trials.filter(t => t.temperature !== "cold"));

      // Upgrade candidates: start users with high usage
      const { data: startUsers } = await supabase
        .from("profiles")
        .select("id, email, name, plan, searches_used, searches_limit")
        .eq("plan", "start")
        .order("searches_used", { ascending: false })
        .limit(30);

      const candidates: UpgradeCandidate[] = (startUsers || [])
        .map(u => ({
          ...u,
          email: u.email || "",
          plan: u.plan || "start",
          searches_used: u.searches_used || 0,
          searches_limit: u.searches_limit || 1000,
          usagePercent: Math.round(((u.searches_used || 0) / (u.searches_limit || 1000)) * 100),
        }))
        .filter(u => u.usagePercent >= 50);
      setUpgradeCandidates(candidates);

      // Inactive recoverable: paid users inactive > 14d but < 60d
      const fourteenDaysAgo = new Date(now - 14 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString();
      const { data: inactive } = await supabase
        .from("profiles")
        .select("id, email, name, plan, last_login_at")
        .neq("plan", "free")
        .lt("last_login_at", fourteenDaysAgo)
        .gt("last_login_at", sixtyDaysAgo)
        .order("last_login_at", { ascending: true })
        .limit(20);
      setInactiveRecoverable(inactive || []);

      setLoading(false);
    };
    load();
  }, []);

  const tempColors = { hot: "bg-red-500/10 text-red-600", warm: "bg-amber-500/10 text-amber-600", cold: "bg-blue-500/10 text-blue-600" };
  const tempLabels = { hot: "🔥 Quente", warm: "⚡ Morno", cold: "❄️ Frio" };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Growth Intelligence</h1>
        <p className="text-sm text-muted-foreground mt-1">Oportunidades de crescimento e receita identificadas por IA</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-gradient-to-br from-red-500/5 to-transparent">
          <CardContent className="p-5">
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Trials Quentes</p>
                <p className="text-3xl font-bold text-foreground mt-1">{hotTrials.filter(t => t.temperature === "hot").length}</p>
                <p className="text-xs text-red-500 mt-1">Uso ≥ 60% — alto potencial de conversão</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardContent className="p-5">
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prontos p/ Upgrade</p>
                <p className="text-3xl font-bold text-foreground mt-1">{upgradeCandidates.length}</p>
                <p className="text-xs text-violet-500 mt-1">Start users com uso ≥ 50%</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="p-5">
            {loading ? <Skeleton className="h-16 w-full" /> : (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recuperáveis</p>
                <p className="text-3xl font-bold text-foreground mt-1">{inactiveRecoverable.length}</p>
                <p className="text-xs text-amber-500 mt-1">Inativos 14-60d — chance de reativação</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hot Trials */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Star size={16} className="text-amber-500" /> Trials com Alto Potencial
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{hotTrials.length} leads</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : hotTrials.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Dias Restantes</TableHead>
                  <TableHead>Temperatura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotTrials.slice(0, 15).map(trial => (
                  <TableRow key={trial.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{trial.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{trial.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", trial.usagePercent >= 80 ? "bg-red-500" : trial.usagePercent >= 50 ? "bg-amber-500" : "bg-blue-500")} style={{ width: `${Math.min(100, trial.usagePercent)}%` }} />
                        </div>
                        <span className="text-xs font-medium">{trial.usagePercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={trial.daysLeft <= 2 ? "text-red-500" : "text-muted-foreground"} />
                        <span className={cn("text-sm font-medium", trial.daysLeft <= 2 && "text-red-500")}>{trial.daysLeft}d</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-[10px]", tempColors[trial.temperature])}>
                        {tempLabels[trial.temperature]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum trial quente no momento</div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Candidates */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-500" /> Candidatos a Upgrade
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{upgradeCandidates.length} leads</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : upgradeCandidates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano Atual</TableHead>
                  <TableHead>Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upgradeCandidates.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{u.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{u.plan}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, u.usagePercent)}%` }} />
                        </div>
                        <span className="text-xs font-medium">{u.usagePercent}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum candidato identificado</div>
          )}
        </CardContent>
      </Card>

      {/* Recoverable Accounts */}
      <Card className="border-border/40 bg-card/80">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap size={16} className="text-amber-500" /> Contas Recuperáveis
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{inactiveRecoverable.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : inactiveRecoverable.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Último Login</TableHead>
                  <TableHead>Dias Inativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveRecoverable.map(u => {
                  const daysInactive = Math.round((Date.now() - new Date(u.last_login_at).getTime()) / 86400000);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{u.name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{u.plan}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.last_login_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm font-medium", daysInactive > 30 ? "text-red-500" : "text-amber-500")}>{daysInactive}d</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma conta recuperável identificada</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
