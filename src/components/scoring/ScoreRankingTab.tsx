import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface RevenueLead {
  id: string;
  name: string | null;
  phone_e164: string;
  score_total: number;
  score_engagement: number;
  score_intent: number;
  score_risk: number;
  score_urgency: number;
  status_bucket: string;
}

interface ScoreRankingTabProps {
  leads: RevenueLead[];
}

const BUCKET_SHORT_LABELS: Record<string, string> = {
  COLD: "Frio",
  LOW_ENGAGEMENT: "Baixo engaj.",
  ENGAGED: "Engajado",
  HIGH_VALUE: "Alto valor",
  READY_TO_SELL: "Pronto p/ venda",
};

const BUCKET_BADGE_COLORS: Record<string, string> = {
  READY_TO_SELL: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  HIGH_VALUE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ENGAGED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  LOW_ENGAGEMENT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COLD: "bg-red-500/20 text-red-400 border-red-500/30",
};

const mapBucket = (bucket: string, score: number): string => {
  if (score >= 801) return "READY_TO_SELL";
  if (score >= 601) return "HIGH_VALUE";
  if (score >= 401) return "ENGAGED";
  if (score >= 201) return "LOW_ENGAGEMENT";
  return "COLD";
};

const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return p;
};

const fmtNum = (n: number) => new Intl.NumberFormat("pt-BR").format(Math.round(n));

const getScoreColor = (score: number) => {
  if (score >= 801) return "text-emerald-400";
  if (score >= 601) return "text-purple-400";
  if (score >= 401) return "text-blue-400";
  if (score >= 201) return "text-yellow-400";
  return "text-red-400";
};

type SortKey = "score_total" | "score_engagement" | "score_intent" | "score_risk" | "score_urgency";

export const ScoreRankingTab = ({ leads }: ScoreRankingTabProps) => {
  const [sortBy, setSortBy] = useState<SortKey>("score_total");

  const sorted = useMemo(
    () => [...leads].sort((a, b) => b[sortBy] - a[sortBy]),
    [leads, sortBy]
  );

  const getMedalIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="w-5 text-center text-sm text-muted-foreground font-medium">{index + 1}</span>;
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Ranking de Leads
          </CardTitle>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="score_total">Maior Score Total</SelectItem>
              <SelectItem value="score_engagement">Engajamento</SelectItem>
              <SelectItem value="score_intent">Intenção de Compra</SelectItem>
              <SelectItem value="score_urgency">Urgência</SelectItem>
              <SelectItem value="score_risk">Risco</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Users className="h-8 w-8" />
            <p className="text-sm">Nenhum lead com score disponível ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((lead, index) => {
              const bucket = mapBucket(lead.status_bucket, lead.score_total);
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50"
                >
                  <div className="w-8 flex justify-center">{getMedalIcon(index)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lead.name || fmtPhone(lead.phone_e164)}</p>
                    <p className="text-xs text-muted-foreground truncate">{fmtPhone(lead.phone_e164)}</p>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", BUCKET_BADGE_COLORS[bucket] || "")}>
                    {BUCKET_SHORT_LABELS[bucket] || bucket}
                  </Badge>
                  <div className="text-right min-w-[60px]">
                    <p className={`text-xl font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>
                      {fmtNum(lead.score_total)}
                    </p>
                    {sortBy !== "score_total" && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {fmtNum(lead[sortBy])} {sortBy.replace("score_", "")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
