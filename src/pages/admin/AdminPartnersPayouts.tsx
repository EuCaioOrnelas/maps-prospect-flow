import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, Wallet, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/partnerFormat";

interface Payout {
  id: string;
  partner_id: string;
  withdrawal_id: string | null;
  amount_cents: number;
  paid_at: string;
  payment_method: string;
  payment_reference: string | null;
  receipt_file_url: string | null;
  receipt_file_name: string | null;
  internal_notes: string | null;
  partner: { full_name: string; email: string };
  withdrawal?: { requested_at: string; bank_snapshot: any } | null;
}

export default function AdminPartnersPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<"all" | "30" | "90" | "365">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partner_payouts")
        .select(
          "id, partner_id, withdrawal_id, amount_cents, paid_at, payment_method, payment_reference, receipt_file_url, receipt_file_name, internal_notes, partner:partners(full_name, email), withdrawal:partner_withdrawals(requested_at, bank_snapshot)"
        )
        .order("paid_at", { ascending: false });
      setPayouts((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = payouts;
    if (period !== "all") {
      const days = Number(period);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter((p) => new Date(p.paid_at).getTime() >= cutoff);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.partner.full_name?.toLowerCase().includes(q) ||
          p.partner.email?.toLowerCase().includes(q) ||
          p.payment_reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [payouts, search, period]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, p) => s + p.amount_cents, 0);
    const last30 = payouts
      .filter((p) => new Date(p.paid_at).getTime() >= Date.now() - 30 * 86400 * 1000)
      .reduce((s, p) => s + p.amount_cents, 0);
    const uniquePartners = new Set(filtered.map((p) => p.partner_id)).size;
    return { total, count: filtered.length, last30, uniquePartners };
  }, [filtered, payouts]);

  const downloadReceipt = async (path: string, name: string | null) => {
    const { data, error } = await supabase.storage.from("partner-payouts").createSignedUrl(path, 60);
    if (error || !data) return;
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = name || "comprovante";
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center text-emerald-600">
          <Wallet size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pagamentos realizados</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de saques marcados como pagos no sistema de saques de parceiros.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Wallet size={16} />} label="Total pago (filtro)" value={fmtBRL(stats.total)} accent="emerald" />
        <KpiCard icon={<CheckCircle2 size={16} />} label="Pagamentos" value={String(stats.count)} accent="primary" />
        <KpiCard icon={<Calendar size={16} />} label="Últimos 30 dias" value={fmtBRL(stats.last30)} accent="blue" />
        <KpiCard icon={<TrendingUp size={16} />} label="Parceiros únicos" value={String(stats.uniquePartners)} accent="violet" />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por parceiro, e-mail ou referência..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} de {payouts.length}</div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Parceiro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Pago em</TableHead>
                  <TableHead className="text-right">Comprovante</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum pagamento encontrado.</TableCell></TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{p.partner.full_name}</div>
                      <div className="text-xs text-muted-foreground">{p.partner.email}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">{fmtBRL(p.amount_cents)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize bg-primary/5 text-primary border-primary/20">
                        {p.payment_method || "pix"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{p.payment_reference || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.withdrawal ? fmtDate(p.withdrawal.requested_at) : "—"}</TableCell>
                    <TableCell className="text-sm">{fmtDate(p.paid_at)}</TableCell>
                    <TableCell className="text-right">
                      {p.receipt_file_url ? (
                        <Button size="sm" variant="ghost" onClick={() => downloadReceipt(p.receipt_file_url!, p.receipt_file_name)} className="gap-1.5">
                          <Download size={13} />Comprovante
                        </Button>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
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

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: "primary" | "emerald" | "blue" | "violet" }) {
  const tone = {
    primary: "bg-primary/10 text-primary ring-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 ring-blue-500/20",
    violet: "bg-violet-500/10 text-violet-600 ring-violet-500/20",
  }[accent];
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl ring-1 flex items-center justify-center ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-bold tracking-tight truncate">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
