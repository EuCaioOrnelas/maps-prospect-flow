import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TimerReset, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

type TrialRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  created_at: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  trial_will_charge_at: string | null;
  trial_auto_charge_cancelled: boolean | null;
  trial_auto_charge_cancelled_at: string | null;
  trial_plan_chosen: string | null;
  trial_billing_period: string | null;
  trial_asaas_subscription_id: string | null;
  trial_card_brand: string | null;
  trial_card_last4: string | null;
  is_archived: boolean | null;
  first_paid_at: string | null;
  subscription_price_cents: number | null;
  subscription_current_period_end: string | null;
  searches_used: number | null;
  trial_messages_sent: number | null;
  trial_leads_used: number | null;
};

/** Duração padrão do teste quando a conta não tem datas gravadas. */
const TRIAL_DAYS = 7;
const DAY_MS = 86400000;

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

const fmtRemaining = (ms: number) => {
  if (ms <= 0) return "vencido";
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

export default function AdminTrials() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "expired" | "cancelled" | "converted" | "all">("active");
  const [usage, setUsage] = useState<Record<string, { leads: number; contacts: number; numbers: number }>>({});

  const load = async () => {
    setLoading(true);
    const pageSize = 1000;
    let from = 0;
    let all: TrialRow[] = [];
    const cols =
      "id, name, email, plan, created_at, trial_start_at, trial_end_at, trial_will_charge_at, trial_auto_charge_cancelled, trial_auto_charge_cancelled_at, trial_plan_chosen, trial_billing_period, trial_asaas_subscription_id, trial_card_brand, trial_card_last4, is_archived, first_paid_at, subscription_price_cents, subscription_current_period_end, searches_used, trial_messages_sent, trial_leads_used";

    // Considera também contas recentes sem campos de trial preenchidos
    // (trial implícito: criadas nos últimos 60 dias e ainda sem pagamento).
    const since = new Date(Date.now() - 60 * DAY_MS).toISOString();
    while (true) {
      const { data, error } = await supabase
        .from("profiles")
        .select(cols)
        .or(
          `trial_start_at.not.is.null,trial_end_at.not.is.null,trial_will_charge_at.not.is.null,and(created_at.gte.${since},first_paid_at.is.null)`
        )
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !data || data.length === 0) break;
      all = all.concat(data as any);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    setRows(all);
    setLoading(false);

    // Uso real por usuário (leads prospectados, contatos no CRM e números conectados).
    const ids = all.map((r) => r.id);
    if (ids.length > 0) {
      const map: Record<string, { leads: number; contacts: number; numbers: number }> = {};
      const bump = (id: string, key: "leads" | "contacts" | "numbers") => {
        if (!map[id]) map[id] = { leads: 0, contacts: 0, numbers: 0 };
        map[id][key] += 1;
      };
      const [leadsRes, dealsRes, numbersRes] = await Promise.all([
        supabase.from("leads").select("user_id").in("user_id", ids).limit(50000),
        supabase.from("chat_conversations").select("user_id").in("user_id", ids).limit(50000),
        supabase.from("user_waba_connections").select("user_id").in("user_id", ids).limit(5000),
      ]);
      ((leadsRes.data as any[]) || []).forEach((r) => r?.user_id && bump(r.user_id, "leads"));
      ((dealsRes.data as any[]) || []).forEach((r) => r?.user_id && bump(r.user_id, "contacts"));
      ((numbersRes.data as any[]) || []).forEach((r) => r?.user_id && bump(r.user_id, "numbers"));
      setUsage(map);
    } else {
      setUsage({});
    }
  };

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(
    () =>
      rows.map((r) => {
        const start = r.trial_start_at || r.created_at;
        const end =
          r.trial_end_at ||
          r.trial_will_charge_at ||
          new Date(new Date(start).getTime() + TRIAL_DAYS * DAY_MS).toISOString();
        const endMs = new Date(end).getTime();
        const remaining = endMs - Date.now();
        const converted = !!r.first_paid_at || ((r.subscription_price_cents || 0) > 0 && r.plan !== "free");
        const active = !converted && remaining > 0;
        const u = usage[r.id] || { leads: 0, contacts: 0, numbers: 0 };
        return {
          ...r,
          start,
          end,
          remaining,
          active,
          converted,
          cancelled: !!r.trial_auto_charge_cancelled,
          leads: u.leads || r.trial_leads_used || 0,
          contacts: u.contacts,
          numbers: u.numbers,
          messages: r.trial_messages_sent || 0,
          searches: r.searches_used || 0,
        };
      }),
    [rows, usage]
  );

  const filtered = useMemo(
    () =>
      enriched.filter((r) => {
        const matchSearch =
          !search ||
          r.email?.toLowerCase().includes(search.toLowerCase()) ||
          r.name?.toLowerCase().includes(search.toLowerCase());
        const matchStatus =
          status === "all" ||
          (status === "active" && r.active) ||
          (status === "expired" && !r.active && !r.converted) ||
          (status === "converted" && r.converted) ||
          (status === "cancelled" && r.cancelled);
        return matchSearch && matchStatus;
      }),
    [enriched, search, status]
  );

  const counters = useMemo(() => {
    const active = enriched.filter((r) => r.active).length;
    const cancelled = enriched.filter((r) => r.active && r.cancelled).length;
    const expiring = enriched.filter((r) => r.active && r.remaining <= 3 * DAY_MS).length;
    const converted = enriched.filter((r) => r.converted).length;
    const finished = enriched.filter((r) => !r.active).length;
    const conversion = finished > 0 ? (converted / finished) * 100 : 0;
    return {
      total: enriched.length,
      active,
      cancelled,
      expiring,
      converted,
      conversion,
      willCharge: active - cancelled,
    };
  }, [enriched]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TimerReset size={20} /> Trials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {counters.total} registros no período de teste
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="text-xs">
          <RefreshCw size={14} className="mr-1.5" /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Em teste agora", value: String(counters.active) },
          { label: "Vencendo em 3 dias", value: String(counters.expiring) },
          { label: "Cobrança prevista", value: String(counters.willCharge) },
          { label: "Convertidos", value: String(counters.converted) },
          { label: "Taxa de conversão", value: `${counters.conversion.toFixed(1)}%` },
        ].map((c) => (
          <Card key={c.label} className="border-border/40">
            <CardContent className="p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>


      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Em trial</SelectItem>
            <SelectItem value="cancelled">Ativação cancelada</SelectItem>
            <SelectItem value="expired">Trial encerrado</SelectItem>
            <SelectItem value="converted">Convertidos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Nenhum trial encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Falta</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Cobrança automática</TableHead>
                  <TableHead>Plano escolhido</TableHead>
                  <TableHead>Cartão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => navigate(`/admin/usuarios/${r.id}`)}
                  >
                    <TableCell>
                      <p className="font-medium text-sm">{r.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {r.converted ? (
                          <Badge className="bg-primary/10 text-primary border-0 text-xs">Convertido</Badge>
                        ) : r.active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">
                            Em trial · {fmtRemaining(r.remaining)}
                          </Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-0 text-xs">Encerrado</Badge>
                        )}
                        {r.is_archived && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Arquivado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(r.trial_start_at || r.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmt(r.end)}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {r.converted ? "—" : fmtRemaining(r.remaining)}
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="text-foreground font-medium">{r.leads}</span> leads ·{" "}
                      <span className="text-foreground font-medium">{r.contacts}</span> contatos
                      <br />
                      <span className="text-foreground font-medium">{r.messages}</span> msgs ·{" "}
                      <span className="text-foreground font-medium">{r.searches}</span> buscas ·{" "}
                      <span className="text-foreground font-medium">{r.numbers}</span> nº
                    </TableCell>
                    <TableCell>
                      {r.cancelled ? (
                        <div>
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30 px-1.5 py-0">
                            Cancelada
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{fmt(r.trial_auto_charge_cancelled_at)}</p>
                        </div>
                      ) : r.trial_will_charge_at ? (
                        <div>
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1.5 py-0">
                            Prevista
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-1">{fmt(r.trial_will_charge_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.trial_plan_chosen || r.plan || "—"}
                      {r.trial_billing_period ? ` · ${r.trial_billing_period}` : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.trial_card_last4 ? `${r.trial_card_brand || "cartão"} ····${r.trial_card_last4}` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
