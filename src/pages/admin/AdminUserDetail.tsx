import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  Clock,
  Activity,
  Users as UsersIcon,
  DollarSign,
  Smartphone,
  MessageSquare,
  Calendar,
  LogIn,
  LogOut,
  Timer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileLite {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan: string | null;
  created_at: string;
}

interface SessionRow {
  day: string;
  session_start: string;
  session_end: string;
  active_seconds: number;
  event_count: number;
}

interface OpStats {
  leads: number;
  sales_count: number;
  sales_value: number;
  numbers_connected: number;
  numbers_total: number;
  messages_chat: number;
  messages_agents: number;
  messages_warming: number;
  messages_total: number;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const daysAgoISO = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt.toISOString().slice(0, 10);
};
const fmtMoney = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const fmtDuration = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState<ProfileLite | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [from, setFrom] = useState<string>(searchParams.get("from") || daysAgoISO(29));
  const [to, setTo] = useState<string>(searchParams.get("to") || todayISO());
  const tab = searchParams.get("tab") || "tempo";

  const [stats, setStats] = useState<OpStats | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoadingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url, plan, created_at")
        .eq("id", userId)
        .maybeSingle();
      setProfile((data as any) || null);
      setLoadingProfile(false);
    })();
  }, [userId]);

  const fromISO = useMemo(() => new Date(from + "T00:00:00").toISOString(), [from]);
  const toISO = useMemo(() => {
    const d = new Date(to + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }, [to]);

  const loadStats = async () => {
    if (!userId) return;
    setLoadingStats(true);
    const { data, error } = await supabase.rpc("admin_get_user_operational_stats", {
      _user_id: userId,
      _from: fromISO,
      _to: toISO,
    });
    if (error) {
      toast.error("Erro ao carregar estatísticas");
      console.error(error);
    } else {
      setStats(data as any);
    }
    setLoadingStats(false);
  };

  const loadSessions = async () => {
    if (!userId) return;
    setLoadingSessions(true);
    const { data, error } = await supabase.rpc("admin_get_user_activity_sessions", {
      _user_id: userId,
      _from: fromISO,
      _to: toISO,
    });
    if (error) {
      toast.error("Erro ao carregar sessões");
      console.error(error);
    } else {
      setSessions((data as any) || []);
    }
    setLoadingSessions(false);
  };

  useEffect(() => {
    if (tab === "operacional") loadStats();
    else loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, fromISO, toISO, userId]);

  const updateTab = (newTab: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", newTab);
    setSearchParams(sp, { replace: true });
  };

  const persistDates = (f: string, t: string) => {
    const sp = new URLSearchParams(searchParams);
    sp.set("from", f);
    sp.set("to", t);
    setSearchParams(sp, { replace: true });
  };

  const presets = [
    { label: "Hoje", from: todayISO(), to: todayISO() },
    { label: "7 dias", from: daysAgoISO(6), to: todayISO() },
    { label: "30 dias", from: daysAgoISO(29), to: todayISO() },
    { label: "90 dias", from: daysAgoISO(89), to: todayISO() },
  ];

  // Group sessions by day
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const s of sessions) {
      const arr = map.get(s.day) || [];
      arr.push(s);
      map.set(s.day, arr);
    }
    return Array.from(map.entries())
      .map(([day, items]) => ({
        day,
        items,
        totalSeconds: items.reduce((a, b) => a + b.active_seconds, 0),
        firstIn: items[0]?.session_start,
        lastOut: items[items.length - 1]?.session_end,
        sessionsCount: items.length,
      }))
      .sort((a, b) => (a.day < b.day ? 1 : -1));
  }, [sessions]);

  const totalActive = sessionsByDay.reduce((a, b) => a + b.totalSeconds, 0);
  const activeDays = sessionsByDay.length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/usuarios")}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
          </Button>
          {loadingProfile ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/15 text-primary text-sm font-semibold flex items-center justify-center border border-border">
                  {(profile?.name || profile?.email || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {profile?.name || "Sem nome"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              </div>
              {profile?.plan && (
                <Badge variant="outline" className="ml-2 text-xs uppercase">
                  {profile.plan}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Date filter */}
      <Card className="border-border/40">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => {
              const active = p.from === from && p.to === to;
              return (
                <Button
                  key={p.label}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => {
                    setFrom(p.from);
                    setTo(p.to);
                    persistDates(p.from, p.to);
                  }}
                >
                  {p.label}
                </Button>
              );
            })}
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> De
              </label>
              <Input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  persistDates(e.target.value, to);
                }}
                className="h-8 text-xs w-[150px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Até
              </label>
              <Input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  persistDates(from, e.target.value);
                }}
                className="h-8 text-xs w-[150px]"
              />
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs ml-auto"
            onClick={() => {
              if (tab === "operacional") loadStats();
              else loadSessions();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
          </Button>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={updateTab}>
        <TabsList>
          <TabsTrigger value="tempo" className="gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Tempo de uso
          </TabsTrigger>
          <TabsTrigger value="operacional" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Painel operacional
          </TabsTrigger>
        </TabsList>

        {/* TIME TAB */}
        <TabsContent value="tempo" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard icon={<Timer className="w-4 h-4" />} label="Tempo total ativo" value={fmtDuration(totalActive)} />
            <StatCard icon={<Calendar className="w-4 h-4" />} label="Dias ativos" value={String(activeDays)} />
            <StatCard
              icon={<Activity className="w-4 h-4" />}
              label="Média / dia ativo"
              value={activeDays > 0 ? fmtDuration(Math.round(totalActive / activeDays)) : "—"}
            />
          </div>

          <Card className="border-border/40">
            <CardContent className="p-0">
              {loadingSessions ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : sessionsByDay.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  Nenhuma atividade registrada no período.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dia</TableHead>
                      <TableHead><span className="inline-flex items-center gap-1.5"><LogIn className="w-3 h-3" /> Primeira entrada</span></TableHead>
                      <TableHead><span className="inline-flex items-center gap-1.5"><LogOut className="w-3 h-3" /> Última saída</span></TableHead>
                      <TableHead>Sessões</TableHead>
                      <TableHead>Tempo ativo</TableHead>
                      <TableHead>Detalhe das sessões</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionsByDay.map((d) => (
                      <TableRow key={d.day}>
                        <TableCell className="text-sm font-medium">{fmtDay(d.day)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{d.firstIn ? fmtTime(d.firstIn) : "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">{d.lastOut ? fmtTime(d.lastOut) : "—"}</TableCell>
                        <TableCell className="text-sm">{d.sessionsCount}</TableCell>
                        <TableCell className="text-sm font-semibold">{fmtDuration(d.totalSeconds)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {d.items.map((s, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-[10px] font-normal tabular-nums"
                                title={`${s.event_count} eventos`}
                              >
                                {fmtTime(s.session_start)}–{fmtTime(s.session_end)} · {fmtDuration(s.active_seconds)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Inatividade de 15 minutos sem nenhum evento encerra a sessão.
          </p>
        </TabsContent>

        {/* OPERATIONAL TAB */}
        <TabsContent value="operacional" className="space-y-4">
          {loadingStats || !stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  icon={<UsersIcon className="w-4 h-4" />}
                  label="Leads prospectados"
                  value={stats.leads.toLocaleString("pt-BR")}
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Vendas (quantidade)"
                  value={stats.sales_count.toLocaleString("pt-BR")}
                />
                <StatCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Vendas (valor)"
                  value={fmtMoney(Number(stats.sales_value || 0))}
                />
                <StatCard
                  icon={<Smartphone className="w-4 h-4" />}
                  label="Números conectados"
                  value={`${stats.numbers_connected} / ${stats.numbers_total}`}
                  hint="conectados / total"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Mensagens totais"
                  value={stats.messages_total.toLocaleString("pt-BR")}
                  hint="chat + agentes + aquecimento"
                />
                <StatCard
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Chat"
                  value={stats.messages_chat.toLocaleString("pt-BR")}
                />
                <StatCard
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Agentes IA"
                  value={stats.messages_agents.toLocaleString("pt-BR")}
                />
                <StatCard
                  icon={<MessageSquare className="w-4 h-4" />}
                  label="Aquecimento"
                  value={stats.messages_warming.toLocaleString("pt-BR")}
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-primary">{icon}</span>
          {label}
        </div>
        <div className="text-xl font-bold text-foreground tabular-nums">{value}</div>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
