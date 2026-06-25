import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Activity, Users, DollarSign, Phone, MessageSquare,
  Calendar, Mail, Crown, Loader2, Download, TimerReset, BarChart3,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/accountPermissions";
import type { AccountMember } from "@/hooks/useAccountMembers";
import { downloadCsv, fmtDuration, rangeToDates, toDateInputValue, type UserMonitoringRange } from "@/lib/userMonitoring";
import { MemberAvailabilityCard } from "@/components/users/MemberAvailabilityCard";

interface Props {
  member: AccountMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");
const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MemberDetailDialog({ member, open, onOpenChange }: Props) {
  const [range, setRange] = useState<UserMonitoringRange>("30d");
  const [customFrom, setCustomFrom] = useState(toDateInputValue(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [customTo, setCustomTo] = useState(toDateInputValue(new Date()));
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [lastLogin, setLastLogin] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !member?.user_id) return;
    const { from, to } = rangeToDates(range, customFrom, customTo);
    setLoading(true);
    Promise.all([
      supabase.rpc("account_get_member_activity_sessions", {
        _user_id: member.user_id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      }),
      supabase.rpc("account_get_member_operational_stats", {
        _user_id: member.user_id,
        _from: from.toISOString(),
        _to: to.toISOString(),
      }),
      supabase.rpc("account_get_member_last_login", { _user_id: member.user_id }),
    ])
      .then(([s, o, l]) => {
        setSessions((s.data as any[]) || []);
        setStats(o.data || null);
        setLastLogin((l.data as string | null) || member.last_login_at || null);
      })
      .finally(() => setLoading(false));
  }, [open, member?.user_id, member?.last_login_at, range, customFrom, customTo]);

  const totals = useMemo(() => {
    const totalSec = sessions.reduce((acc, s) => acc + (s.active_seconds || 0), 0);
    const days = new Set(sessions.map((s) => s.day)).size;
    return {
      totalSec,
      days,
      avg: days ? Math.round(totalSec / days) : 0,
    };
  }, [sessions]);

  if (!member) return null;
  const initials = (member.name || member.email || "?").slice(0, 2).toUpperCase();
  const { from, to } = rangeToDates(range, customFrom, customTo);
  const filenameRange = `${toDateInputValue(from)}_${toDateInputValue(to)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-full sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-3 pb-3 pt-3 sm:px-6 sm:pt-6">
          <DialogTitle className="flex min-w-0 items-center gap-3 pr-8">
            <Avatar className="h-10 w-10">
              {member.avatar_url && <AvatarImage src={member.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex min-w-0 items-center gap-2 text-base font-semibold">
                {member.role === "owner" && <Crown size={14} className="text-amber-500" />}
                <span className="min-w-0 truncate">{member.name || member.email}</span>
              </div>
              <span className="min-w-0 truncate text-xs font-normal text-muted-foreground">{member.email}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 overflow-x-auto wa-scrollbar px-3 py-3 sm:px-6">
            <TabsList className="inline-flex min-w-max max-w-none gap-1">
              <TabsTrigger value="info" className="shrink-0 whitespace-nowrap px-2 text-[11px] sm:px-3 sm:text-sm">Perfil</TabsTrigger>
              <TabsTrigger value="availability" className="shrink-0 whitespace-nowrap px-2 text-[11px] sm:px-3 sm:text-sm">Disponibilidade</TabsTrigger>
              <TabsTrigger value="time" className="shrink-0 whitespace-nowrap px-2 text-[11px] sm:px-3 sm:text-sm">Tempo de uso</TabsTrigger>
              <TabsTrigger value="ops" className="shrink-0 whitespace-nowrap px-2 text-[11px] sm:px-3 sm:text-sm">Operacional</TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 sm:px-6 sm:pb-6">
          <TabsContent value="info" className="mt-0 min-w-0 space-y-3 focus-visible:outline-none focus-visible:ring-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoCard icon={<Users size={14} />} label="Cargo" value={ROLE_LABEL[member.role]} />
              <InfoCard
                icon={<Activity size={14} />}
                label="Status"
                value={
                  member.status === "active" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">Ativo</Badge>
                  ) : (
                    <Badge variant="outline">Inativo</Badge>
                  )
                }
              />
              <InfoCard icon={<Mail size={14} />} label="Email" value={member.email || "—"} />
              <InfoCard icon={<Calendar size={14} />} label="Criado em" value={fmtDate(member.created_at)} />
              <InfoCard icon={<Clock size={14} />} label="Último login" value={fmtDateTime(lastLogin)} />
              <InfoCard
                icon={<Activity size={14} />}
                label="Trocar senha"
                value={member.must_change_password ? "Pendente" : "OK"}
              />
            </div>
          </TabsContent>

          <TabsContent value="availability" className="mt-0 min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <MemberAvailabilityCard userId={member.user_id} title={`Disponibilidade de ${member.name || member.email}`} />
          </TabsContent>

          <TabsContent value="time" className="mt-0 min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RangePicker value={range} onChange={setRange} from={customFrom} to={customTo} onFromChange={setCustomFrom} onToChange={setCustomTo} />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!sessions.length}
                onClick={() => downloadCsv(`tempo-uso-${member.email || member.user_id}-${filenameRange}.csv`, sessions.map((s) => ({
                  data: new Date(s.day).toLocaleDateString("pt-BR"),
                  entrada: new Date(s.session_start).toLocaleString("pt-BR"),
                  saida: new Date(s.session_end).toLocaleString("pt-BR"),
                  tempo: fmtDuration(s.active_seconds),
                  eventos: s.event_count,
                })))}
              >
                <Download size={14} className="mr-1.5" /> Exportar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <KpiCard icon={<TimerReset size={14} />} label="Tempo ativo" value={fmtDuration(totals.totalSec)} />
              <KpiCard icon={<Calendar size={14} />} label="Dias ativos" value={String(totals.days)} />
              <KpiCard icon={<BarChart3 size={14} />} label="Média/dia" value={fmtDuration(totals.avg)} />
            </div>
            <SyncedHorizontalTable minWidth={520}>
                <div className="grid grid-cols-4 px-3 py-2 text-xs font-medium bg-muted/40 text-muted-foreground">
                  <span>Data</span><span>Entrou</span><span>Saiu</span><span className="text-right">Tempo</span>
                </div>
                {loading && <div className="p-6 text-center"><Loader2 className="animate-spin mx-auto" size={16} /></div>}
                {!loading && sessions.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">Sem atividade no período.</div>
                )}
                {!loading && sessions.map((s, i) => (
                  <div key={i} className="grid grid-cols-4 px-3 py-2 text-sm border-t border-border/40">
                    <span>{new Date(s.day).toLocaleDateString("pt-BR")}</span>
                    <span className="text-muted-foreground">{new Date(s.session_start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-muted-foreground">{new Date(s.session_end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-right font-medium">{fmtDuration(s.active_seconds)}</span>
                  </div>
                ))}
            </SyncedHorizontalTable>
          </TabsContent>

          <TabsContent value="ops" className="mt-0 min-w-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <RangePicker value={range} onChange={setRange} from={customFrom} to={customTo} onFromChange={setCustomFrom} onToChange={setCustomTo} />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={!stats}
                onClick={() => downloadCsv(`operacional-${member.email || member.user_id}-${filenameRange}.csv`, [{
                  leads_prospectados: stats?.leads || 0,
                  vendas_valor: Number(stats?.sales_value || 0),
                  vendas_quantidade: stats?.sales_count || 0,
                  numeros_conectados: stats?.numbers_connected || 0,
                  numeros_total: stats?.numbers_total || 0,
                  mensagens_chat: stats?.messages_chat || 0,
                  mensagens_agentes: stats?.messages_agents || 0,
                  mensagens_aquecimento: stats?.messages_warming || 0,
                  mensagens_total: stats?.messages_total || 0,
                }])}
              >
                <Download size={14} className="mr-1.5" /> Exportar
              </Button>
            </div>
            {loading || !stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard icon={<Users size={14} />} label="Leads prospectados" value={String(stats.leads || 0)} />
                <KpiCard icon={<DollarSign size={14} />} label="Vendas (valor)" value={fmtMoney(Number(stats.sales_value || 0))} />
                <KpiCard icon={<DollarSign size={14} />} label="Vendas (quantidade)" value={String(stats.sales_count || 0)} />
                <KpiCard icon={<Phone size={14} />} label="Números conectados" value={`${stats.numbers_connected || 0}/${stats.numbers_total || 0}`} />
                <KpiCard icon={<MessageSquare size={14} />} label="Mensagens enviadas" value={String(stats.messages_total || 0)} />
                <KpiCard icon={<MessageSquare size={14} />} label="Chat / Agentes / Aquec." value={`${stats.messages_chat || 0} · ${stats.messages_agents || 0} · ${stats.messages_warming || 0}`} />
              </div>
            )}
          </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 min-w-0 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border/60 bg-background/60 p-3">
      <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        {icon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>}
        <span className="min-w-0 break-words">{label}</span>
      </div>
      <div className="mt-2 min-w-0 break-words text-base font-semibold sm:text-lg">{value}</div>
    </div>
  );
}

function SyncedHorizontalTable({ children, minWidth }: { children: React.ReactNode; minWidth: number }) {
  const topRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const syncScroll = (source: "top" | "body") => {
    const top = topRef.current;
    const body = bodyRef.current;
    if (!top || !body) return;
    if (source === "top") body.scrollLeft = top.scrollLeft;
    if (source === "body") top.scrollLeft = body.scrollLeft;
  };

  return (
    <div className="min-w-0 max-w-full overflow-hidden rounded-lg border border-border/60">
      <div
        ref={topRef}
        className="h-3 max-w-full overflow-x-auto overflow-y-hidden wa-scrollbar bg-muted/20"
        onScroll={() => syncScroll("top")}
        aria-hidden="true"
      >
        <div style={{ width: minWidth }} className="h-1" />
      </div>
      <div
        ref={bodyRef}
        className="max-w-full overflow-x-auto wa-scrollbar"
        onScroll={() => syncScroll("body")}
      >
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}

function RangePicker({
  value,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  value: UserMonitoringRange;
  onChange: (r: UserMonitoringRange) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const opts: { v: UserMonitoringRange; label: string }[] = [
    { v: "today", label: "Hoje" },
    { v: "7d", label: "7 dias" },
    { v: "30d", label: "30 dias" },
    { v: "90d", label: "90 dias" },
    { v: "custom", label: "Personalizado" },
  ];
  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
        {opts.map((o) => (
          <Button
            key={o.v}
            size="sm"
            variant={value === o.v ? "default" : "outline"}
            className="h-8 text-xs"
            onClick={() => onChange(o.v)}
          >
            {o.label}
          </Button>
        ))}
      </div>
      {value === "custom" && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
          <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="h-8 w-[132px] max-w-full text-xs" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="h-8 w-[132px] max-w-full text-xs" />
        </div>
      )}
    </div>
  );
}
