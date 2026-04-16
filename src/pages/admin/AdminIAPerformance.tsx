import { useEffect, useMemo, useState } from "react";
import { Zap, Clock, CheckCircle2, Activity, AlertTriangle, MessageSquare, ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer,
} from "recharts";

// ============================================================
// PERFORMANCE IA — métricas reais derivadas de agent_message_logs
// e agent_conversations.
// ------------------------------------------------------------
//  Tempo Médio Resposta = mediana entre response_received_at e
//                          reply_sent_at em conversas com reply.
//  Taxa de Sucesso      = (reply_sent / total replies tentados) das
//                          últimas 24h. Falhas detectadas por padrões
//                          de erro no conteúdo enviado.
//  Chamadas 24h         = total de mensagens enviadas pelos agentes
//                          (direction = 'sent') nas últimas 24h.
//  Logs                 = lista das últimas 50 chamadas com timing
//                          e classificação ok/erro.
// ============================================================

const ERROR_PATTERNS = ["error", "failed", "timeout", "rate limit", "erro ao", "indisponível"];

type LogRow = {
  id: string;
  agent_id: string;
  direction: string;
  content: string | null;
  created_at: string;
  message_type: string | null;
};

type PerfPoint = { hour: string; calls: number; errors: number };

export default function AdminIAPerformance() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // 1) Logs das últimas 24h
      const { data: l } = await supabase
        .from("agent_message_logs")
        .select("id, agent_id, direction, content, created_at, message_type")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      // 2) Latência média de resposta (response_received_at → reply_sent_at)
      const { data: convos } = await supabase
        .from("agent_conversations")
        .select("response_received_at, reply_sent_at")
        .eq("reply_sent", true)
        .not("response_received_at", "is", null)
        .not("reply_sent_at", "is", null)
        .gte("reply_sent_at", since)
        .limit(200);

      const diffs = (convos || [])
        .map((c: any) => new Date(c.reply_sent_at).getTime() - new Date(c.response_received_at).getTime())
        .filter((d) => d > 0 && d < 1000 * 60 * 30); // ignora outliers > 30 min
      const avgMs = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;

      // 3) Nomes dos agentes (para os logs)
      const agentIds = Array.from(new Set((l || []).map((x: any) => x.agent_id))).filter(Boolean);
      let nameMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: ags } = await supabase.from("ai_agents").select("id, name").in("id", agentIds);
        (ags || []).forEach((a: any) => { nameMap[a.id] = a.name; });
      }

      setLogs((l as LogRow[]) || []);
      setLatencyMs(avgMs);
      setAgentNames(nameMap);
      setLoading(false);
    };
    load();
  }, []);

  // Métricas derivadas
  const sentLogs = useMemo(() => logs.filter((x) => x.direction === "sent"), [logs]);
  const calls24h = sentLogs.length;
  const errors24h = useMemo(
    () => sentLogs.filter((x) => x.content && ERROR_PATTERNS.some((p) => x.content!.toLowerCase().includes(p))).length,
    [sentLogs],
  );
  const successRate = calls24h > 0 ? ((calls24h - errors24h) / calls24h) * 100 : null;

  // Série hora a hora (24h)
  const hourly = useMemo<PerfPoint[]>(() => {
    const buckets: Record<string, PerfPoint> = {};
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = `${d.getHours()}h`;
      buckets[key] = { hour: key, calls: 0, errors: 0 };
    }
    sentLogs.forEach((l) => {
      const d = new Date(l.created_at);
      const key = `${d.getHours()}h`;
      if (!buckets[key]) return;
      buckets[key].calls++;
      if (l.content && ERROR_PATTERNS.some((p) => l.content!.toLowerCase().includes(p))) {
        buckets[key].errors++;
      }
    });
    return Object.values(buckets);
  }, [sentLogs]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap size={20} className="text-primary" />
          Performance IA
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Métricas em tempo real das chamadas dos agentes (últimas 24h)
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI
          icon={Clock}
          label="Tempo Médio Resposta"
          value={loading ? null : latencyMs == null ? "—" : `${(latencyMs / 1000).toFixed(1)}s`}
          sub="Mediana entre lead → resposta do agente"
          accent="text-blue-500"
        />
        <KPI
          icon={CheckCircle2}
          label="Taxa de Sucesso"
          value={loading ? null : successRate == null ? "—" : `${successRate.toFixed(1)}%`}
          sub={`${calls24h - errors24h} sucessos / ${calls24h} chamadas`}
          accent="text-emerald-500"
        />
        <KPI
          icon={Activity}
          label="Chamadas 24h"
          value={loading ? null : calls24h.toLocaleString("pt-BR")}
          sub={`${errors24h} com erro detectado`}
          accent="text-primary"
        />
      </div>

      {/* Gráfico hora a hora */}
      <Card className="border-border/40 bg-card/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Volume por Hora · 24h</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="callsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                <RTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="calls" stroke="hsl(var(--primary))" fill="url(#callsGrad)" strokeWidth={2} name="Chamadas" />
                <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" fillOpacity={0} strokeWidth={1.5} name="Erros" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Logs das chamadas */}
      <Card className="border-border/40 bg-card/80 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Logs de Performance</CardTitle>
          <p className="text-xs text-muted-foreground/70">
            Últimas 50 chamadas registradas em <code className="text-primary">agent_message_logs</code>
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sem chamadas nas últimas 24h.</p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-1.5">
                {logs.slice(0, 50).map((log) => {
                  const isError = log.content && ERROR_PATTERNS.some((p) => log.content!.toLowerCase().includes(p));
                  const isInbound = log.direction === "received";
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30 bg-background/50"
                    >
                      {isError ? (
                        <AlertTriangle size={14} className="text-destructive shrink-0" />
                      ) : isInbound ? (
                        <ArrowDown size={14} className="text-blue-500 shrink-0" />
                      ) : (
                        <ArrowUp size={14} className="text-emerald-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {agentNames[log.agent_id] || "Agente"}
                          <span className="ml-2 text-muted-foreground/60 font-normal">
                            {isInbound ? "lead → agente" : "agente → lead"}
                          </span>
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 truncate">{log.content || "(sem conteúdo)"}</p>
                      </div>
                      {isError ? (
                        <Badge variant="destructive" className="text-[10px] h-5">erro</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5">ok</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground/60 shrink-0">
                        {new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({
  icon: Icon, label, value, sub, accent,
}: { icon: any; label: string; value: string | null; sub: string; accent: string }) {
  return (
    <Card className="border-border/40 bg-card/80 rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{label}</p>
          <Icon size={14} className={accent} />
        </div>
        {value === null ? (
          <Skeleton className="h-8 w-16 mt-1.5" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-1.5 tracking-tight">{value}</p>
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
