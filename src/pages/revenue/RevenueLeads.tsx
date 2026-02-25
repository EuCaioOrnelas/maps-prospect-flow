import { useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueLeads } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const bucketLabels: Record<string, string> = {
  COLD: "Frio",
  ENGAGED: "Morno",
  HOT: "Engajado",
  VERY_HOT: "Quente",
};

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskLabels: Record<string, string> = {
  OK: "Saudável",
  COOLING: "Esfriando",
  AT_RISK: "Em Risco",
};

const riskColors: Record<string, string> = {
  OK: "text-primary",
  COOLING: "text-warning",
  AT_RISK: "text-destructive",
};

const getEffectiveStatus = (lead: { score_total: number; risk_state: string }) => {
  if (lead.score_total === 0) return { label: "Aguardando", color: "text-muted-foreground", icon: "⏳" };
  if (lead.score_total < 50) return { label: "Novo", color: "text-blue-400", icon: "🆕" };
  return {
    label: riskLabels[lead.risk_state] || lead.risk_state,
    color: riskColors[lead.risk_state] || "text-muted-foreground",
    icon: lead.risk_state === "AT_RISK" ? "🚨" : lead.risk_state === "COOLING" ? "⚠️" : "✅",
  };
};

const RevenueLeads = () => {
  const [bucketFilter, setBucketFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: leads, isLoading } = useRevenueLeads({
    bucket: bucketFilter !== "all" ? bucketFilter : undefined,
    riskState: riskFilter !== "all" ? riskFilter : undefined,
  });

  const filtered = (leads || []).filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.phone_e164.includes(q) ||
      (l.name && l.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Todos os leads com pontuação de engajamento calculada automaticamente
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={bucketFilter} onValueChange={setBucketFilter}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Níveis</SelectItem>
            <SelectItem value="COLD">🧊 Frio</SelectItem>
            <SelectItem value="ENGAGED">☀️ Morno</SelectItem>
            <SelectItem value="HOT">💬 Engajado</SelectItem>
            <SelectItem value="VERY_HOT">🔥 Quente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OK">✅ Saudável</SelectItem>
            <SelectItem value="COOLING">⚠️ Esfriando</SelectItem>
            <SelectItem value="AT_RISK">🚨 Em Risco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum lead encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left p-4 font-medium">Lead</th>
                    <th className="text-center p-4 font-medium">Pontuação</th>
                    <th className="text-center p-4 font-medium">Nível</th>
                    <th className="text-left p-4 font-medium">Última Atividade</th>
                    <th className="text-center p-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                    >
                      <td className="p-4">
                        <Link
                          to={`/revenue/leads/${lead.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <p className="font-medium text-foreground">
                            {lead.name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lead.phone_e164}
                          </p>
                        </Link>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-bold text-foreground">
                          {lead.score_total}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">pts</span>
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", bucketColors[lead.status_bucket])}
                        >
                          {bucketLabels[lead.status_bucket]}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(lead.last_activity_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          const status = getEffectiveStatus(lead);
                          return (
                            <span className={cn("text-xs font-medium", status.color)}>
                              {status.icon} {status.label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueLeads;
