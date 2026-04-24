import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, X } from "lucide-react";
import { fmtDate, fmtBRL } from "@/lib/partnerFormat";
import { PageHeader } from "@/components/partners/PageHeader";
import { ReferralLinksCard } from "@/components/partners/ReferralLinksCard";

type StatusFilter = "all" | "lead" | "trial" | "paid" | "cancelled";
type DateFilter = "all" | "7d" | "30d" | "90d";

export default function PartnerLeads() {
  const { partner } = useOutletContext<any>();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateFilter>("all");
  const [linkFilter, setLinkFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase
        .from("partner_leads")
        .select("*")
        .eq("partner_id", partner.id)
        .order("attributed_at", { ascending: false });
      setLeads(data || []);
      setLoading(false);
    })();
  }, [partner?.id]);

  const statusBadge = (l: any) => {
    if (l.is_cancelled) return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Cancelado</Badge>;
    if (l.is_paid) return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Pago</Badge>;
    if (l.is_trial) return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Trial</Badge>;
    return <Badge variant="outline">Lead</Badge>;
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    const ranges: Record<DateFilter, number> = { all: Infinity, "7d": 7, "30d": 30, "90d": 90 };
    return leads.filter((l) => {
      if (linkFilter && l.referral_link_id !== linkFilter) return false;
      if (status === "trial" && !(l.is_trial && !l.is_paid)) return false;
      if (status === "paid" && !(l.is_paid && !l.is_cancelled)) return false;
      if (status === "cancelled" && !l.is_cancelled) return false;
      if (status === "lead" && (l.is_trial || l.is_paid || l.is_cancelled)) return false;
      if (dateRange !== "all" && l.attributed_at) {
        const days = (now - new Date(l.attributed_at).getTime()) / 86400000;
        if (days > ranges[dateRange]) return false;
      }
      if (q) {
        const blob = `${l.name || ""} ${l.email || ""}`.toLowerCase();
        if (!blob.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [leads, q, status, dateRange, linkFilter]);

  const counts = useMemo(() => ({
    all: leads.length,
    paid: leads.filter((l) => l.is_paid && !l.is_cancelled).length,
    trial: leads.filter((l) => l.is_trial && !l.is_paid).length,
    cancelled: leads.filter((l) => l.is_cancelled).length,
  }), [leads]);

  const clearFilters = () => { setQ(""); setStatus("all"); setDateRange("all"); setLinkFilter(null); };
  const hasFilters = q || status !== "all" || dateRange !== "all" || linkFilter;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Meus leads"
        subtitle={`${counts.all} indicados · ${counts.paid} pagos · ${counts.trial} em trial`}
        icon={Users}
      />

      <ReferralLinksCard partner={partner} showFilters onSelectFilter={setLinkFilter} selectedLinkId={linkFilter} />

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou email..." className="pl-8 h-9" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="trial">Em trial</SelectItem>
                <SelectItem value="paid">Pago / Ativo</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateFilter)}>
              <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
                <X size={14} /> Limpar
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} de {leads.length}</div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>Cadastrado</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    {leads.length === 0 ? "Você ainda não tem leads — compartilhe seu link!" : "Nenhum lead corresponde aos filtros."}
                  </TableCell></TableRow>
                ) : filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{l.name || l.email.split("@")[0]}</div>
                      <div className="text-xs text-muted-foreground">{l.email}</div>
                    </TableCell>
                    <TableCell><span className="text-sm capitalize">{l.current_plan || "—"}</span></TableCell>
                    <TableCell>{statusBadge(l)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {l.is_paid && !l.is_cancelled && l.current_plan_amount_cents ? fmtBRL(l.current_plan_amount_cents) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(l.attributed_at)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(l.paid_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
