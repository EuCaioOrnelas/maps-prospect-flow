import { useState, useEffect, useMemo } from "react";
import { Heart, TrendingUp, TrendingDown, Search, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface UserHealth {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  score: number;
  factors: { login: number; usage: number; campaigns: number; ai: number };
  lastLogin: string | null;
  riskLevel: "low" | "medium" | "high";
}

export default function AdminHealthScore() {
  const [users, setUsers] = useState<UserHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortField, setSortField] = useState<"score" | "name">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const load = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name, plan, searches_used, searches_limit, last_login_at, created_at")
        .neq("plan", "free")
        .order("created_at", { ascending: false })
        .limit(200);

      if (!profiles) { setLoading(false); return; }

      // Get agents count per user
      const { data: agents } = await supabase
        .from("ai_agents")
        .select("user_id");

      const agentCountMap = new Map<string, number>();
      agents?.forEach(a => {
        agentCountMap.set(a.user_id, (agentCountMap.get(a.user_id) || 0) + 1);
      });

      const now = Date.now();
      const scored: UserHealth[] = profiles.map(p => {
        // Login recency: 30 = logged in last 3 days, 20 = last 7d, 10 = last 30d, 0 = older
        const lastLogin = p.last_login_at ? new Date(p.last_login_at).getTime() : 0;
        const daysSinceLogin = lastLogin ? (now - lastLogin) / 86400000 : 999;
        const loginScore = daysSinceLogin <= 3 ? 30 : daysSinceLogin <= 7 ? 20 : daysSinceLogin <= 30 ? 10 : 0;

        // Usage: based on searches_used / searches_limit
        const usageRatio = (p.searches_used || 0) / (p.searches_limit || 120);
        const usageScore = Math.min(30, Math.round(usageRatio * 30));

        // Campaigns: placeholder - would need campaign data
        const campaignScore = usageRatio > 0.3 ? 20 : usageRatio > 0.1 ? 10 : 0;

        // AI usage
        const hasAgent = agentCountMap.has(p.id);
        const aiScore = hasAgent ? 20 : 0;

        const total = loginScore + usageScore + campaignScore + aiScore;
        const riskLevel: "low" | "medium" | "high" = total >= 60 ? "low" : total >= 30 ? "medium" : "high";

        return {
          id: p.id,
          email: p.email || "",
          name: p.name,
          plan: p.plan || "free",
          score: total,
          factors: { login: loginScore, usage: usageScore, campaigns: campaignScore, ai: aiScore },
          lastLogin: p.last_login_at,
          riskLevel,
        };
      });

      setUsers(scored);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = users.filter(u => {
      const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.name?.toLowerCase().includes(search.toLowerCase());
      const matchRisk = riskFilter === "all" || u.riskLevel === riskFilter;
      return matchSearch && matchRisk;
    });
    result.sort((a, b) => {
      if (sortField === "score") return sortDir === "desc" ? b.score - a.score : a.score - b.score;
      return sortDir === "desc" ? (b.name || "").localeCompare(a.name || "") : (a.name || "").localeCompare(b.name || "");
    });
    return result;
  }, [users, search, riskFilter, sortField, sortDir]);

  const avgScore = users.length > 0 ? Math.round(users.reduce((s, u) => s + u.score, 0) / users.length) : 0;
  const highRisk = users.filter(u => u.riskLevel === "high").length;
  const healthy = users.filter(u => u.riskLevel === "low").length;

  const riskColors = { low: "bg-emerald-500/10 text-emerald-600", medium: "bg-amber-500/10 text-amber-600", high: "bg-red-500/10 text-red-600" };
  const riskLabels = { low: "Saudável", medium: "Atenção", high: "Risco" };

  const ScoreBar = ({ value, max, color }: { value: number; max: number; color: string }) => (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Health Score</h1>
        <p className="text-sm text-muted-foreground mt-1">Saúde dos clientes pagantes baseada em engajamento</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score Médio</p>
            <p className="text-3xl font-bold text-foreground mt-1">{loading ? "—" : avgScore}</p>
            <p className="text-xs text-muted-foreground mt-1">de 100 pontos</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saudáveis</p>
            <p className="text-3xl font-bold text-emerald-500 mt-1">{loading ? "—" : healthy}</p>
            <p className="text-xs text-muted-foreground mt-1">score ≥ 60</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Em Risco</p>
            <p className="text-3xl font-bold text-red-500 mt-1">{loading ? "—" : highRisk}</p>
            <p className="text-xs text-muted-foreground mt-1">score &lt; 30</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Analisados</p>
            <p className="text-3xl font-bold text-foreground mt-1">{loading ? "—" : users.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Score Breakdown Legend */}
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Composição do Score (0-100)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Login Recente</span><span className="font-medium">30 pts</span></div>
              <ScoreBar value={30} max={30} color="bg-blue-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Uso de Recursos</span><span className="font-medium">30 pts</span></div>
              <ScoreBar value={30} max={30} color="bg-violet-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Campanhas</span><span className="font-medium">20 pts</span></div>
              <ScoreBar value={20} max={20} color="bg-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">IA Utilizada</span><span className="font-medium">20 pts</span></div>
              <ScoreBar value={20} max={20} color="bg-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email ou nome..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risco" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="low">Saudável</SelectItem>
            <SelectItem value="medium">Atenção</SelectItem>
            <SelectItem value="high">Risco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>
                    <button onClick={() => { setSortField("score"); setSortDir(d => d === "asc" ? "desc" : "asc"); }} className="flex items-center gap-1">
                      Score <ArrowUpDown size={12} />
                    </button>
                  </TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Campanhas</TableHead>
                  <TableHead>IA</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{user.plan}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-2 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full", user.score >= 60 ? "bg-emerald-500" : user.score >= 30 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${user.score}%` }} />
                        </div>
                        <span className="text-sm font-bold">{user.score}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs">{user.factors.login}/30</span></TableCell>
                    <TableCell><span className="text-xs">{user.factors.usage}/30</span></TableCell>
                    <TableCell><span className="text-xs">{user.factors.campaigns}/20</span></TableCell>
                    <TableCell><span className="text-xs">{user.factors.ai}/20</span></TableCell>
                    <TableCell>
                      <Badge className={cn("border-0 text-[10px]", riskColors[user.riskLevel])}>
                        {riskLabels[user.riskLevel]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
