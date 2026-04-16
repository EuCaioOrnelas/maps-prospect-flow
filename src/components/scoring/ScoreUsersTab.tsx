import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";

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

const PAID_PLANS = ["start", "growth", "scale"];

export const ScoreUsersTab = () => {
  const [filteredUsers, setFilteredUsers] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLabel, setFilterLabel] = useState("all");
  const [filterTrend, setFilterTrend] = useState("all");
  const [filterPurchase, setFilterPurchase] = useState("all");
  const [sortBy, setSortBy] = useState("total_score");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const pageSize = 20;
  const paginatedUsers = filteredUsers.slice(page * pageSize, (page + 1) * pageSize);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("user_scores")
        .select("*, profiles(name, email, plan)")
        .order(sortBy as any, { ascending: sortAsc });

      if (filterLabel !== "all") {
        query = query.eq("score_label", filterLabel);
      }
      if (filterTrend !== "all") {
        query = query.eq("trend", filterTrend);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = (data as any[]) || [];

      // Apply purchase filter
      if (filterPurchase === "purchased") {
        filtered = filtered.filter(u => PAID_PLANS.includes(u.profiles?.plan));
      } else if (filterPurchase === "not_purchased") {
        filtered = filtered.filter(u => u.profiles?.plan === "free");
      }

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.profiles?.name?.toLowerCase().includes(s) ||
            u.profiles?.email?.toLowerCase().includes(s)
        );
      }

      setFilteredUsers(filtered);
    } catch (err) {
      console.error("Load users error:", err);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortAsc, filterLabel, filterTrend, filterPurchase, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const getPurchaseLabel = (plan: string) => {
    return PAID_PLANS.includes(plan) ? "Comprou" : "Não comprou";
  };

  const getPurchaseBadgeColor = (plan: string) => {
    return PAID_PLANS.includes(plan)
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : "bg-orange-500/20 text-orange-400 border-orange-500/30";
  };

  const handleExport = () => {
    if (filteredUsers.length === 0) {
      toast.error("Nenhum usuário para exportar");
      return;
    }

    const exportData = filteredUsers.map((u) => ({
      Nome: u.profiles?.name || "Sem nome",
      Email: u.profiles?.email || "",
      Plano: u.profiles?.plan || "free",
      "Comprou?": getPurchaseLabel(u.profiles?.plan || "free"),
      "Score Total": Number(u.total_score).toFixed(1),
      Classificação: u.score_label,
      Tendência: u.trend === "rising" ? "Em alta" : u.trend === "falling" ? "Em queda" : "Estável",
      "Score Ativação": Number(u.activation_score).toFixed(1),
      "Score Engajamento": Number(u.engagement_score).toFixed(1),
      "Score Valor": Number(u.value_score).toFixed(1),
      "Score Intenção Compra": Number(u.purchase_intent_score).toFixed(1),
      "Score Risco Churn": Number(u.churn_risk_score).toFixed(1),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Usuários Score");
    XLSX.writeFile(wb, `usuarios_score_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportData.length} usuários exportados`);
  };

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Usuários por Score</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          <Select value={filterLabel} onValueChange={(v) => { setFilterLabel(v); setPage(0); }}>
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
          <Select value={filterPurchase} onValueChange={(v) => { setFilterPurchase(v); setPage(0); }}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Compra" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="purchased">Compraram</SelectItem>
              <SelectItem value="not_purchased">Não compraram</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTrend} onValueChange={(v) => { setFilterTrend(v); setPage(0); }}>
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
        ) : filteredUsers.length === 0 ? (
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
                    <TableHead className="text-center">Compra</TableHead>
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
                  {paginatedUsers.map((u) => (
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
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getPurchaseBadgeColor(u.profiles?.plan || "free")}>
                          {getPurchaseLabel(u.profiles?.plan || "free")}
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
              <p className="text-sm text-muted-foreground">{filteredUsers.length} resultado(s)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm flex items-center px-2">Página {page + 1}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={(page + 1) * pageSize >= filteredUsers.length}>
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
