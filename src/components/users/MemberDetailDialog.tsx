import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import {
  Clock, Activity, Users, DollarSign, Phone, MessageSquare,
  Calendar, Mail, Crown, Loader2,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/accountPermissions";
import type { AccountMember } from "@/hooks/useAccountMembers";

interface Props {
  member: AccountMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Range = "today" | "7d" | "30d" | "90d";

function rangeToDates(r: Range): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (r === "today") from.setHours(0, 0, 0, 0);
  else if (r === "7d") from.setDate(from.getDate() - 7);
  else if (r === "30d") from.setDate(from.getDate() - 30);
  else from.setDate(from.getDate() - 90);
  return { from, to };
}

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");
const fmtMoney = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
function fmtDuration(seconds: number) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function MemberDetailDialog({ member, open, onOpenChange }: Props) {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!open || !member?.user_id) return;
    const { from, to } = rangeToDates(range);
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
    ])
      .then(([s, o]) => {
        setSessions((s.data as any[]) || []);
        setStats(o.data || null);
      })
      .finally(() => setLoading(false));
  }, [open, member?.user_id, range]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {member.avatar_url && <AvatarImage src={member.avatar_url} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-base font-semibold">
                {member.role === "owner" && <Crown size={14} className="text-amber-500" />}
                {member.name || member.email}
              </div>
              <span className="text-xs text-muted-foreground font-normal">{member.email}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Perfil</TabsTrigger>
            <TabsTrigger value="time">Tempo de uso</TabsTrigger>
            <TabsTrigger value="ops">Operacional</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
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
              <InfoCard icon={<Clock size={14} />} label="Último login" value={fmtDateTime(member.last_login_at)} />
              <InfoCard
                icon={<Activity size={14} />}
                label="Trocar senha"
                value={member.must_change_password ? "Pendente" : "OK"}
              />
            </div>
          </TabsContent>

          <TabsContent value="time" className="space-y-4 mt-4">
            <RangePicker value={range} onChange={setRange} />
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Tempo ativo" value={fmtDuration(totals.totalSec)} />
              <KpiCard label="Dias ativos" value={String(totals.days)} />
              <KpiCard label="Média/dia" value={fmtDuration(totals.avg)} />
            </div>
            <div className="rounded-lg border border-border/60 overflow-hidden">
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
            </div>
          </TabsContent>

          <TabsContent value="ops" className="space-y-4 mt-4">
            <RangePicker value={range} onChange={setRange} />
            {loading || !stats ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <KpiCard icon={<Users size={14} />} label="Leads prospectados" value={String(stats.leads || 0)} />
                <KpiCard icon={<DollarSign size={14} />} label="Vendas (valor)" value={fmtMoney(Number(stats.sales_value || 0))} />
                <KpiCard icon={<DollarSign size={14} />} label="Vendas (quantidade)" value={String(stats.sales_count || 0)} />
                <KpiCard icon={<Phone size={14} />} label="Números conectados" value={`${stats.numbers_connected || 0}/${stats.numbers_total || 0}`} />
                <KpiCard icon={<MessageSquare size={14} />} label="Mensagens enviadas" value={String(stats.messages_total || 0)} />
                <KpiCard icon={<MessageSquare size={14} />} label="Chat / Agentes / Aquec." value={`${stats.messages_chat || 0} · ${stats.messages_agents || 0} · ${stats.messages_warming || 0}`} />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">{icon} {label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function RangePicker({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const opts: { v: Range; label: string }[] = [
    { v: "today", label: "Hoje" },
    { v: "7d", label: "7 dias" },
    { v: "30d", label: "30 dias" },
    { v: "90d", label: "90 dias" },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {opts.map((o) => (
        <Button
          key={o.v}
          size="sm"
          variant={value === o.v ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
