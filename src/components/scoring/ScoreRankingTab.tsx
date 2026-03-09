import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ScoreUserDetailDialog } from "./ScoreUserDetailDialog";

export const ScoreRankingTab = () => {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("total_score");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadRanking();
  }, [sortBy]);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-processor", {
        body: { action: "get_ranking", limit: 50, sort_by: sortBy },
      });
      if (error) throw error;
      setRanking(data?.ranking || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="w-5 text-center text-sm text-muted-foreground font-medium">{index + 1}</span>;
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

  const LABEL_COLORS: Record<string, string> = {
    "Frio": "bg-red-500/20 text-red-400 border-red-500/30",
    "Baixo engajamento": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Engajado": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Alto valor": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Pronto para upgrade": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Ranking de Usuários
          </CardTitle>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="total_score">Maior Score Total</SelectItem>
              <SelectItem value="purchase_intent">Intenção de Compra</SelectItem>
              <SelectItem value="engagement">Engajamento</SelectItem>
              <SelectItem value="value">Uso de Features</SelectItem>
              <SelectItem value="activation">Ativação</SelectItem>
              <SelectItem value="churn_risk">Risco de Churn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : ranking.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum dado de ranking disponível.</p>
        ) : (
          <div className="space-y-2">
            {ranking.map((user: any, index: number) => (
              <div
                key={user.id}
                onClick={() => setSelectedUserId(user.user_id)}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer border border-transparent hover:border-border/50"
              >
                <div className="w-8 flex justify-center">{getMedalIcon(index)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user.profiles?.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.profiles?.email}</p>
                </div>
                <Badge variant="outline" className={LABEL_COLORS[user.score_label] || ""}>
                  {user.score_label}
                </Badge>
                <TrendIcon trend={user.trend} />
                <div className="text-right min-w-[60px]">
                  <p className={`text-xl font-bold ${getScoreColor(Number(user.total_score))}`}>
                    {Number(user.total_score).toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
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
