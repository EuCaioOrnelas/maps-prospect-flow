import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Search, Wallet, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { fmtBRL, fmtDate, commissionStatusColors, commissionStatusLabel } from "@/lib/partnerFormat";
import { PageHeader } from "@/components/partners/PageHeader";
import { StatCard } from "@/components/partners/StatCard";

type StatusFilter = "all" | "pending" | "available" | "requested" | "paid" | "cancelled";

export default function PartnerCommissions() {
  const { partner } = useOutletContext<any>();
  const [items, setItems] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>({ pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const [c, b] = await Promise.all([
        supabase
          .from("partner_commissions")
          .select("*, sale:partner_sales(plan, paid_at, customer_user_id), lead:partner_sales!partner_commissions_partner_sale_id_fkey(partner_lead_id)")
          .eq("partner_id", partner.id)
          .order("created_at", { ascending: false }),
        supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
      ]);
      setItems(c.data || []);
      setBalance(b.data || { pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
      setLoading(false);
    })();
  }, [partner?.id]);

  const filtered = useMemo(() => items.filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    if (q) {
      const blob = `${c.sale?.plan || ""}`.toLowerCase();
      if (!blob.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [items, q, status]);

  const cards = [
    { label: "Comissão pendente", value: fmtBRL(balance.pending_cents), icon: Clock, accent: "amber" as const, hint: "Aguardando liberação" },
    { label: "Disponível p/ saque", value: fmtBRL(balance.available_cents), icon: Wallet, accent: "emerald" as const, highlight: true },
    { label: "Em saque", value: fmtBRL(balance.requested_cents), icon: TrendingUp, accent: "blue" as const, hint: "Já solicitado" },
    { label: "Total recebido", value: fmtBRL(balance.paid_cents), icon: CheckCircle2, accent: "primary" as const },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader title="Minhas comissões" subtitle="Histórico e status de cada comissão gerada" icon={DollarSign} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por plano..." className="pl-8 h-9" />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="requested">Solicitada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} de {items.length}</div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Plano</TableHead>
                  <TableHead>Venda</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Libera em</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {items.length === 0 ? "Nenhuma comissão ainda." : "Nenhuma comissão corresponde aos filtros."}
                  </TableCell></TableRow>
                ) : filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell><span className="text-sm capitalize">{c.sale?.plan || "—"}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(c.sale?.paid_at)}</TableCell>
                    <TableCell className="text-right text-sm">{fmtBRL(c.base_amount_cents)}</TableCell>
                    <TableCell className="text-right text-sm">{c.commission_percent}%</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{fmtBRL(c.commission_amount_cents)}</TableCell>
                    <TableCell><Badge variant="outline" className={commissionStatusColors[c.status]}>{commissionStatusLabel[c.status] || c.status}</Badge></TableCell>
                    <TableCell className="text-sm">{c.status === "pending" ? fmtDate(c.available_at) : "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(c.paid_at)}</TableCell>
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
