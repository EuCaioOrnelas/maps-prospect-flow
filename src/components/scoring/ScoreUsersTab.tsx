import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { ScoreUserDetailDialog } from "./ScoreUserDetailDialog";

interface UserScore {
  id: string;
  user_id: string;
  total_score: number;
  activation_score: number;
  engagement_score: number;
  value_score: number;
  purchase_intent_score: number;
  churn_risk_score: number;
  score_label: string;
  trend: string;
  last_event_at: string | null;
  last_calculated_at: string;
  profiles: { name: string | null; email: string; plan: string } | null;
}

const LABEL_COLORS: Record<string, string> = {
  "Frio": "bg-red-500/20 text-red-400 border-red-500/30",
  "Baixo engajamento": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Engajado": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Alto valor": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Pronto para upgrade": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export const ScoreUsersTab = () => {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLabel, setFilterLabel] = useState("all");
  const [filterTrend, setFilterTrend] = useState("all");
  const [sortBy, setSortBy] = useState("total_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_scores")
        .select("*, profiles!inner(name, email, plan)")
        .order(sortBy as any, { ascending: sortAsc })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filterLabel !== "all") {
        query = query.eq("score_label", filterLabel);
      }
      if (filterTrend !== "all") {
        query = query.eq("trend", filterTrend);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data as any[]) || [];
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.profiles?.name?.toLowerCase().includes(s) ||
            u.profiles?.email?.toLowerCase().includes(s)
        );
      }
      setUsers(filtered);
    } catch (err) {
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortAsc, page, filterLabel, filterTrend, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "rising") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 81) return "text-purple-400";
    if (score >= 61) return "text-emerald-400";
    if (score >= 41) return "text-blue-400";
    if (score >= 21) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Usuários por Score</CardTitle>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterLabel} onValueChange={setFilterLabel}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Classificação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas classificações</SelectItem>
              <SelectItem value="Frio">Frio</SelectItem>
              <SelectItem value="Baixo engajamento">Baixo engajamento</SelectItem>
              <SelectItem value="Engajado">Engajado</SelectItem>
              <SelectItem value="Alto valor">Alto valor</SelectItem>
              <SelectItem value="Pronto para upgrade">Pronto para upgrade</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTrend} onValueChange={setFilterTrend}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tendência" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tendências</SelectItem>
              <SelectItem value="rising">Em alta</SelectItem>
              <SelectItem value="stable">Estável</SelectItem>
              <SelectItem value="falling">Em queda</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Ordenar por" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="total_score">Maior Score</SelectItem>
              <SelectItem value="purchase_intent_score">Intenção Compra</SelectItem>
              <SelectItem value="churn_risk_score">Risco Churn</SelectItem>
              <SelectItem value="engagement_score">Engajamento</SelectItem>
              <SelectItem value="activation_score">Ativação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum usuário com score encontrado.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Classificação</TableHead>
                    <TableHead className="text-center">Tendência</TableHead>
                    <TableHead className="text-center">Ativação</TableHead>
                    <TableHead className="text-center">Engajamento</TableHead>
                    <TableHead className="text-center">Valor</TableHead>
                    <TableHead className="text-center">Intenção</TableHead>
                    <TableHead className="text-center">Risco</TableHead>
                    <TableHead className="text-center">Plano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => setSelectedUserId(u.user_id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{u.profiles?.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{u.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-lg ${getScoreColor(Number(u.total_score))}`}>
                          {Number(u.total_score).toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={LABEL_COLORS[u.score_label] || ""}>
                          {u.score_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center"><TrendIcon trend={u.trend} /></TableCell>
                      <TableCell className="text-center text-sm">{Number(u.activation_score).toFixed(1)}</TableCell>
                      <TableCell className="text-center text-sm">{Number(u.engagement_score).toFixed(1)}</TableCell>
                      <TableCell className="text-center text-sm">{Number(u.value_score).toFixed(1)}</TableCell>
                      <TableCell className="text-center text-sm">{Number(u.purchase_intent_score).toFixed(1)}</TableCell>
                      <TableCell className="text-center text-sm text-destructive">{Number(u.churn_risk_score).toFixed(1)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="text-[10px]">{u.profiles?.plan || "free"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{users.length} resultado(s)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm flex items-center px-2">Página {page + 1}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={users.length < pageSize}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {selectedUserId && (
        <ScoreUserDetailDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}
    </Card>
  );
};
