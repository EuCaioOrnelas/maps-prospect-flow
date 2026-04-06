import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  BarChart3, Users, Trophy, Settings, Loader2, 
  Smartphone, Search, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Target, AlertTriangle, Zap,
  ChevronsLeft, ChevronsRight, Info, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAutoScoreTracking } from "@/hooks/useAutoScoreTracking";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer 
} from "recharts";

// ═══════════════ TYPES ═══════════════

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
  risk_state: string;
  last_activity_at: string;
  score_last_calc_at: string | null;
  first_seen_at: string;
  tags: string[] | null;
  source_number_instance_id: string | null;
}

interface ScoreRule {
  id: string;
  rule_key: string;
  points: number;
  is_enabled: boolean;
  cooldown_minutes: number | null;
  max_per_day: number | null;
  user_id: string;
}

// ═══════════════ CONSTANTS ═══════════════

const BUCKET_COLORS: Record<string, string> = {
  "READY_TO_SELL": "hsl(158, 72%, 38%)",
  "HIGH_VALUE": "hsl(262, 83%, 58%)",
  "ENGAGED": "hsl(200, 98%, 39%)",
  "LOW_ENGAGEMENT": "hsl(38, 92%, 50%)",
  "COLD": "hsl(0, 72%, 51%)",
};

const BUCKET_LABELS: Record<string, string> = {
  "COLD": "Frio (0-200)",
  "LOW_ENGAGEMENT": "Baixo engajamento (201-400)",
  "ENGAGED": "Engajado (401-600)",
  "HIGH_VALUE": "Alto valor (601-800)",
  "READY_TO_SELL": "Pronto para venda (801-1000)",
};

const BUCKET_SHORT_LABELS: Record<string, string> = {
  "COLD": "Frio",
  "LOW_ENGAGEMENT": "Baixo engaj.",
  "ENGAGED": "Engajado",
  "HIGH_VALUE": "Alto valor",
  "READY_TO_SELL": "Pronto p/ venda",
};

const BUCKET_BADGE_COLORS: Record<string, string> = {
  "READY_TO_SELL": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "HIGH_VALUE": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "ENGAGED": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "LOW_ENGAGEMENT": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "COLD": "bg-red-500/20 text-red-400 border-red-500/30",
};

// Map old buckets to new ones for backward compatibility
const mapBucket = (bucket: string, score: number): string => {
  if (score >= 801) return "READY_TO_SELL";
  if (score >= 601) return "HIGH_VALUE";
  if (score >= 401) return "ENGAGED";
  if (score >= 201) return "LOW_ENGAGEMENT";
  return "COLD";
};

const RULE_LABELS: Record<string, string> = {
  INBOUND_MESSAGE: "Mensagem recebida",
  INBOUND_STREAK_3: "Sequência de 3 msgs",
  INBOUND_AFTER_24H_SILENCE: "Voltou após 24h",
  INBOUND_AFTER_7D_SILENCE: "Voltou após 7 dias",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Resposta em < 1h",
  INTENT_PRICE: "Perguntou preço",
  INTENT_BUY_NOW: "Intenção de compra",
  INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento",
  INTENT_PROPOSAL: "Proposta",
  INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção",
  INTENT_NEGATIVE_MODERATE: "Penalidade Moderada",
  INTENT_NEGATIVE_HARD: "Penalidade Forte",
  LINK_CLICK: "Clique em link",
  FORM_SUBMIT: "Formulário enviado",
  CALL_REQUEST: "Pediu ligação",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "Resposta < 5min",
  SLA_FIRST_RESPONSE_5_TO_30MIN: "Resposta 5-30min",
  SLA_FIRST_RESPONSE_OVER_30MIN: "Resposta > 30min",
  UNREPLIED_INBOUND_OVER_2H: "Sem resposta 2h+",
  UNREPLIED_INBOUND_OVER_24H: "Sem resposta 24h+",
  CONVERSATION_ACTIVE_3D: "Conversa ativa 3 dias",
  CONVERSATION_ACTIVE_5D: "Conversa ativa 5 dias",
  BACK_AND_FORTH_5_TURNS: "5+ turnos de conversa",
};

const RULE_CATEGORIES: Record<string, { label: string; color: string; keys: string[] }> = {
  engagement: {
    label: "Engajamento",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    keys: ["INBOUND_MESSAGE", "INBOUND_STREAK_3", "INBOUND_AFTER_24H_SILENCE", "INBOUND_AFTER_7D_SILENCE", "OUTBOUND_REPLY_RECEIVED_WITHIN_1H", "CONVERSATION_ACTIVE_3D", "CONVERSATION_ACTIVE_5D", "BACK_AND_FORTH_5_TURNS"],
  },
  intent: {
    label: "Intenção de Compra",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    keys: ["INTENT_PRICE", "INTENT_BUY_NOW", "INTENT_AVAILABILITY", "INTENT_PAYMENT", "INTENT_PROPOSAL", "INTENT_URGENT", "INTENT_OBJECTION", "INTENT_NEGATIVE_MODERATE", "INTENT_NEGATIVE_HARD"],
  },
  actions: {
    label: "Ações",
    color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    keys: ["LINK_CLICK", "FORM_SUBMIT", "CALL_REQUEST"],
  },
  sla: {
    label: "SLA / Risco",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    keys: ["SLA_FIRST_RESPONSE_UNDER_5MIN", "SLA_FIRST_RESPONSE_5_TO_30MIN", "SLA_FIRST_RESPONSE_OVER_30MIN", "UNREPLIED_INBOUND_OVER_2H", "UNREPLIED_INBOUND_OVER_24H"],
  },
};

const PER_PAGE = 20;

const getScoreColor = (score: number) => {
  if (score >= 801) return "text-emerald-400";
  if (score >= 601) return "text-purple-400";
  if (score >= 401) return "text-blue-400";
  if (score >= 201) return "text-yellow-400";
  return "text-red-400";
};

const fmtNum = (n: number) => n.toLocaleString('pt-BR');

// ═══════════════ SCORE INFO POPOVER ═══════════════

const ScoreInfoPopover = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button className="text-muted-foreground hover:text-foreground transition-colors">
        <HelpCircle className="h-5 w-5" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-80 text-sm space-y-3" side="bottom" align="start">
      <h4 className="font-semibold text-foreground">Como funciona o Score</h4>
      <p className="text-muted-foreground">
        O score vai de 0 a 1.000 pontos e é calculado automaticamente com base nas interações dos leads no WhatsApp.
      </p>
      <div className="space-y-1.5">
        <p className="text-xs"><span className="text-red-400 font-medium">0 – 200:</span> Frio — sem interação relevante</p>
        <p className="text-xs"><span className="text-yellow-400 font-medium">201 – 400:</span> Baixo engajamento — pouca atividade</p>
        <p className="text-xs"><span className="text-blue-400 font-medium">401 – 600:</span> Engajado — interagindo ativamente</p>
        <p className="text-xs"><span className="text-purple-400 font-medium">601 – 800:</span> Alto valor — forte interesse</p>
        <p className="text-xs"><span className="text-emerald-400 font-medium">801 – 1.000:</span> Pronto para venda — lead quente</p>
      </div>
      <div className="border-t border-border pt-2">
        <p className="text-xs text-muted-foreground">
          O score é atualizado automaticamente conforme novas interações acontecem. Cada regra ativa soma ou subtrai pontos.
        </p>
      </div>
    </PopoverContent>
  </Popover>
);

// ═══════════════ DASHBOARD TAB ═══════════════

const ScoreDashboard = ({ leads }: { leads: RevenueLead[] }) => {
  const totalLeads = leads.length;
  const avgScore = totalLeads > 0 ? leads.reduce((s, l) => s + l.score_total, 0) / totalLeads : 0;
  const sortedScores = [...leads].sort((a, b) => a.score_total - b.score_total);
  const medianScore = totalLeads > 0 ? sortedScores[Math.floor(totalLeads / 2)]?.score_total || 0 : 0;

  const byBucket = leads.reduce((acc, l) => {
    const b = mapBucket(l.status_bucket, l.score_total);
    acc[b] = (acc[b] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const atRisk = leads.filter(l => l.risk_state === "AT_RISK" || l.risk_state === "CRITICAL").length;
  const readyToSell = byBucket["READY_TO_SELL"] || 0;
  const cold = byBucket["COLD"] || 0;

  const kpis = [
    { label: "Total Leads", value: fmtNum(totalLeads), icon: Users, color: "text-primary" },
    { label: "Score Médio", value: fmtNum(Math.round(avgScore)), icon: BarChart3, color: "text-blue-400" },
    { label: "Score Mediano", value: fmtNum(Math.round(medianScore)), icon: Target, color: "text-yellow-400" },
    { label: "Pronto p/ Venda", value: fmtNum(readyToSell), icon: TrendingUp, color: "text-emerald-400" },
    { label: "Em Risco", value: fmtNum(atRisk), icon: AlertTriangle, color: "text-destructive" },
    { label: "Frios", value: fmtNum(cold), icon: TrendingDown, color: "text-red-400" },
  ];

  const pieData = Object.entries(byBucket).map(([bucket, count]) => ({
    name: BUCKET_SHORT_LABELS[bucket] || bucket,
    value: count,
    color: BUCKET_COLORS[bucket] || "hsl(var(--muted))",
  }));

  return (
    <div className="space-y-6">
      {/* KPIs - 3 per row, matching Opportunities design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="relative overflow-hidden bg-card border-border/60">
            <div className="absolute top-4 right-4 w-[56px] h-[56px] rounded-full bg-primary/[0.07] dark:bg-primary/[0.12] flex items-center justify-center">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <CardContent className="p-5 relative">
              <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mb-2">{kpi.label}</p>
              <p className="text-[30px] font-bold leading-none tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Distribuição por Status</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, value }) => `${name}: ${fmtNum(value)}`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum dado ainda</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader><CardTitle className="text-base">Top 10 Leads por Score</CardTitle></CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[...leads].sort((a, b) => b.score_total - a.score_total).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" domain={[0, 1000]} />
                  <YAxis dataKey="name" type="category" width={120} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v || "Sem nome"} />
                  <RechartsTooltip />
                  <Bar dataKey="score_total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">Nenhum lead com score</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ═══════════════ USERS TAB ═══════════════

const ScoreUsersTab = ({ leads }: { leads: RevenueLead[] }) => {
  const [search, setSearch] = useState("");
  const [filterBucket, setFilterBucket] = useState("all");
  const [sortBy, setSortBy] = useState("score_total");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedLead, setSelectedLead] = useState<RevenueLead | null>(null);

  const filtered = useMemo(() => {
    let result = leads.filter(l => {
      if (search) {
        const s = search.toLowerCase();
        if (!(l.name?.toLowerCase().includes(s) || l.phone_e164.includes(search))) return false;
      }
      if (filterBucket !== "all") {
        const mapped = mapBucket(l.status_bucket, l.score_total);
        if (mapped !== filterBucket) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const aVal = (a as any)[sortBy] ?? 0;
      const bVal = (b as any)[sortBy] ?? 0;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [leads, search, filterBucket, sortBy, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const getPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      pages.push(0);
      if (page > 3) pages.push("...");
      for (let i = Math.max(1, page - 2); i <= Math.min(totalPages - 2, page + 2); i++) pages.push(i);
      if (page < totalPages - 4) pages.push("...");
      pages.push(totalPages - 1);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
        </div>
        <Select value={filterBucket} onValueChange={(v) => { setFilterBucket(v); setPage(0); }}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            {Object.entries(BUCKET_SHORT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortBy("score_total"); setSortAsc(sortBy === "score_total" ? !sortAsc : false); }}>
                  Score Total {sortBy === "score_total" && (sortAsc ? "↑" : "↓")}
                </TableHead>
                <TableHead className="hidden md:table-cell">Engajamento</TableHead>
                <TableHead className="hidden md:table-cell">Intenção</TableHead>
                <TableHead className="hidden lg:table-cell">Risco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Última Atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((lead) => {
                const bucket = mapBucket(lead.status_bucket, lead.score_total);
                return (
                  <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setSelectedLead(lead)}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{lead.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone_e164}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-lg font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>{fmtNum(lead.score_total)}</span>
                      <span className="text-xs text-muted-foreground ml-1">/1.000</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm tabular-nums">{fmtNum(lead.score_engagement)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm tabular-nums">{fmtNum(lead.score_intent)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm tabular-nums">{fmtNum(lead.score_risk)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={BUCKET_BADGE_COLORS[bucket] || ""}>
                        {BUCKET_SHORT_LABELS[bucket] || bucket}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(lead.last_activity_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {paginated.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum lead encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPages().map((p, i) =>
            typeof p === "string" ? (
              <span key={`e${i}`} className="px-1 text-muted-foreground">...</span>
            ) : (
              <Button key={p} variant={page === p ? "default" : "outline"} size="sm" className="h-8 min-w-[2rem]" onClick={() => setPage(p)}>
                {p + 1}
              </Button>
            )
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <Card className="w-full max-w-lg bg-card" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{selectedLead.name || selectedLead.phone_e164}</span>
                <Badge variant="outline" className={BUCKET_BADGE_COLORS[mapBucket(selectedLead.status_bucket, selectedLead.score_total)] || ""}>
                  {BUCKET_SHORT_LABELS[mapBucket(selectedLead.status_bucket, selectedLead.score_total)] || selectedLead.status_bucket}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/20 border border-border/30">
                  <p className={`text-3xl font-bold tabular-nums ${getScoreColor(selectedLead.score_total)}`}>{fmtNum(selectedLead.score_total)}</p>
                  <p className="text-xs text-muted-foreground">Score Total / 1.000</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Engajamento</span><span className="font-medium tabular-nums">{fmtNum(selectedLead.score_engagement)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Intenção</span><span className="font-medium tabular-nums">{fmtNum(selectedLead.score_intent)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Urgência</span><span className="font-medium tabular-nums">{fmtNum(selectedLead.score_urgency)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Risco</span><span className={`font-medium tabular-nums ${selectedLead.score_risk < 0 ? 'text-destructive' : ''}`}>{fmtNum(selectedLead.score_risk)}</span></div>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{selectedLead.phone_e164}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Primeira interação</span><span>{new Date(selectedLead.first_seen_at).toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Última atividade</span><span>{new Date(selectedLead.last_activity_at).toLocaleDateString('pt-BR')}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Risco</span>
                  <Badge variant="outline" className={selectedLead.risk_state === "SAFE" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                    {selectedLead.risk_state === "SAFE" ? "Seguro" : selectedLead.risk_state === "AT_RISK" ? "Em Risco" : selectedLead.risk_state}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSelectedLead(null)}>Fechar</Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ═══════════════ RANKING TAB ═══════════════

const ScoreRankingTab = ({ leads }: { leads: RevenueLead[] }) => {
  const ranked = useMemo(() => [...leads].sort((a, b) => b.score_total - a.score_total).slice(0, 50), [leads]);

  const getMedal = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Top 50 leads com maior score de engajamento no WhatsApp</p>
      <Card className="bg-card border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Pos.</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Engajamento</TableHead>
                <TableHead className="hidden md:table-cell">Intenção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((lead, i) => {
                const bucket = mapBucket(lead.status_bucket, lead.score_total);
                return (
                  <TableRow key={lead.id}>
                    <TableCell className="font-bold text-lg">{getMedal(i)}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{lead.name || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground">{lead.phone_e164}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xl font-bold tabular-nums ${getScoreColor(lead.score_total)}`}>{fmtNum(lead.score_total)}</span>
                      <span className="text-xs text-muted-foreground ml-1">/1.000</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={BUCKET_BADGE_COLORS[bucket] || ""}>
                        {BUCKET_SHORT_LABELS[bucket] || bucket}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">{fmtNum(lead.score_engagement)}</TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums">{fmtNum(lead.score_intent)}</TableCell>
                  </TableRow>
                );
              })}
              {ranked.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum lead com score</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ═══════════════ RULES TAB ═══════════════

const ScoreRulesTab = ({ userId }: { userId: string }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState("");
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["crm-score-rules", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_score_rules")
        .select("*")
        .eq("user_id", userId)
        .order("rule_key");
      if (error) throw error;
      return (data || []) as ScoreRule[];
    },
  });

  useEffect(() => {
    if (!isLoading && rules.length === 0) {
      supabase.rpc("seed_revenue_score_rules", { p_user_id: userId }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      });
    }
  }, [isLoading, rules.length, userId]);

  const toggleRule = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from("revenue_score_rules").update({ is_enabled: enabled }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar regra");
    } else {
      queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      toast.success(enabled ? "Regra ativada" : "Regra desativada");
    }
  };

  const updatePoints = async (id: string) => {
    const pts = parseInt(editPoints);
    if (isNaN(pts)) return;
    const { error } = await supabase.from("revenue_score_rules").update({ points: pts }).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar pontos");
    } else {
      queryClient.invalidateQueries({ queryKey: ["crm-score-rules"] });
      setEditingId(null);
      toast.success("Pontos atualizados");
    }
  };

  const filteredRules = rules.filter(r =>
    (RULE_LABELS[r.rule_key] || r.rule_key).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar regra..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Link to="/warming">
          <Button variant="outline" size="sm" className="gap-2">
            <Smartphone className="h-4 w-4" />
            Conectar WhatsApp
          </Button>
        </Link>
      </div>

      {Object.entries(RULE_CATEGORIES).map(([catKey, cat]) => {
        const catRules = filteredRules.filter(r => cat.keys.includes(r.rule_key));
        if (catRules.length === 0) return null;

        return (
          <Card key={catKey} className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <Badge variant="outline" className={cat.color}>{cat.label}</Badge>
                <span className="text-muted-foreground text-xs">({catRules.length} regras)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {catRules.map((rule) => {
                  const isNegative = rule.points < 0;
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{RULE_LABELS[rule.rule_key] || rule.rule_key}</p>
                          {isNegative && <Badge variant="destructive" className="text-[10px] px-1">NEG</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.rule_key}</p>
                        {(rule.cooldown_minutes || rule.max_per_day) && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            {rule.cooldown_minutes && `Cooldown: ${rule.cooldown_minutes}min`}
                            {rule.cooldown_minutes && rule.max_per_day && " · "}
                            {rule.max_per_day && `Máx: ${rule.max_per_day}x/dia`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {editingId === rule.id ? (
                          <Input
                            className="w-16 h-8 text-center text-sm"
                            value={editPoints}
                            onChange={(e) => setEditPoints(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && updatePoints(rule.id)}
                            onBlur={() => setEditingId(null)}
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => { setEditingId(rule.id); setEditPoints(String(rule.points)); }}
                            className={`text-lg font-bold min-w-[40px] text-center cursor-pointer hover:opacity-70 ${isNegative ? "text-destructive" : "text-primary"}`}
                          >
                            {isNegative ? `${rule.points}` : `+${rule.points}`}
                          </button>
                        )}
                        <Switch checked={rule.is_enabled} onCheckedChange={(checked) => toggleRule(rule.id, checked)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ═══════════════ MAIN PAGE ═══════════════

const CRMScore = () => {
  const { user, profile } = useAuth();
  useAutoScoreTracking("crm_score");

  const { data: sidebarProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["crm-score-leads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("revenue_leads")
        .select("id, name, phone_e164, score_total, score_engagement, score_intent, score_risk, score_urgency, status_bucket, risk_state, last_activity_at, score_last_calc_at, first_seen_at, tags, source_number_instance_id")
        .eq("user_id", user.id)
        .order("score_total", { ascending: false });
      if (error) throw error;
      return (data || []) as RevenueLead[];
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <SEO title="Score CRM - Wiize" description="Análise de score de engajamento dos seus leads via WhatsApp" />
      <AppSidebar profile={profile || sidebarProfile} />
      <MobileNav profile={profile || sidebarProfile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground">Score de Leads</h1>
                  <ScoreInfoPopover />
                </div>
                <p className="text-sm text-muted-foreground">
                  Análise de engajamento e intenção de compra via WhatsApp · Score de 0 a 1.000
                </p>
              </div>
            </div>
          </div>

          {/* Score Level Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(BUCKET_LABELS).map(([key, label]) => (
              <div key={key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${BUCKET_BADGE_COLORS[key]}`}>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-card border-border/50"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <Tabs defaultValue="dashboard" className="space-y-4">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="dashboard" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Leads
                </TabsTrigger>
                <TabsTrigger value="ranking" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="rules" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Regras
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <ScoreDashboard leads={leads} />
              </TabsContent>
              <TabsContent value="users">
                <ScoreUsersTab leads={leads} />
              </TabsContent>
              <TabsContent value="ranking">
                <ScoreRankingTab leads={leads} />
              </TabsContent>
              <TabsContent value="rules">
                {user && <ScoreRulesTab userId={user.id} />}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default CRMScore;
