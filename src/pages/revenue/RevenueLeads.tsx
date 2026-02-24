import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueLeads } from "@/hooks/useRevenueData";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const bucketColors: Record<string, string> = {
  COLD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ENGAGED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  HOT: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  VERY_HOT: "bg-red-500/10 text-red-400 border-red-500/20",
};

const riskColors: Record<string, string> = {
  OK: "text-primary",
  COOLING: "text-warning",
  AT_RISK: "text-destructive",
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
          Todos os leads com score de engajamento
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
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Bucket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Buckets</SelectItem>
            <SelectItem value="COLD">Cold</SelectItem>
            <SelectItem value="ENGAGED">Engaged</SelectItem>
            <SelectItem value="HOT">Hot</SelectItem>
            <SelectItem value="VERY_HOT">Very Hot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Risco" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="COOLING">Cooling</SelectItem>
            <SelectItem value="AT_RISK">At Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
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
                    <th className="text-center p-4 font-medium">Score</th>
                    <th className="text-center p-4 font-medium">Bucket</th>
                    <th className="text-left p-4 font-medium">Última Atividade</th>
                    <th className="text-center p-4 font-medium">Risco</th>
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
                      </td>
                      <td className="p-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", bucketColors[lead.status_bucket])}
                        >
                          {lead.status_bucket.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {formatDistanceToNow(new Date(lead.last_activity_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={cn(
                            "text-xs font-medium",
                            riskColors[lead.risk_state]
                          )}
                        >
                          {lead.risk_state}
                        </span>
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
