import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeWpMetrics, type WpRevenue, type WpSale } from "@/lib/wiizepaySalesMetrics";

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const tone = (status: string) =>
  status === "overdue_installment" || status === "expired" ? "destructive"
  : status === "cancelled" || status === "refunded" ? "outline"
  : "secondary";

/** Vendas que chegaram pelos avisos da WiizePay: MRR, recebido no mês, a receber e inadimplência. */
export function WiizePaySalesPanel() {
  const [sales, setSales] = useState<WpSale[]>([]);
  const [revenue, setRevenue] = useState<WpRevenue[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [s, r] = await Promise.all([
        supabase.from("wiizepay_sales").select("*").order("last_event_at", { ascending: false }).limit(1000),
        supabase.from("wiizepay_revenue_entries").select("amount, paid_at, refunded").limit(10000),
      ]);
      if (!alive) return;
      setSales((s.data as unknown as WpSale[]) || []);
      setRevenue((r.data as unknown as WpRevenue[]) || []);
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  const m = useMemo(() => {
    const now = new Date();
    return computeWpMetrics(sales, revenue, new Date(now.getFullYear(), now.getMonth(), 1), now);
  }, [sales, revenue]);

  if (sales.length === 0) return null;

  const kpis = [
    { label: "MRR WiizePay", value: fmt(m.mrr), sub: m.contractedMrr > 0 ? `+ ${fmt(m.contractedMrr)} contratado` : "recorrentes ativas" },
    { label: "Recebido no mês", value: fmt(m.received), sub: "pagamentos confirmados" },
    { label: "A receber", value: fmt(m.toReceive), sub: "parcelas e próximo ciclo" },
    { label: "Inadimplência", value: fmt(m.delinquent), sub: `${m.delinquentCount} venda(s) em atraso`, danger: m.delinquentCount > 0 },
    { label: "Churn de MRR", value: fmt(m.churnMrr), sub: "cancelado no mês" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 rounded-2xl border-border/40 bg-card">
            <p className="text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground/80 font-semibold">{k.label}</p>
            <p className={`mt-2 text-[20px] font-bold tabular-nums ${k.danger ? "text-destructive" : "text-foreground"}`}>{k.value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70 truncate">{k.sub}</p>
          </Card>
        ))}
      </div>
      <Card className="rounded-2xl border-border/40 bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 text-sm font-semibold">Vendas da WiizePay</div>
        <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
          {sales.map((s) => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.service_name || "Venda WiizePay"} — {s.customer_name || "Cliente"}</p>
                <p className="text-xs text-muted-foreground">
                  {s.type_label || s.sale_type} · {fmt(Number(s.installment_amount || s.total_amount))}
                  {s.next_due_on ? ` · próximo vencimento ${new Date(s.next_due_on + "T12:00:00").toLocaleDateString("pt-BR")}` : ""}
                </p>
              </div>
              <span className="tabular-nums text-xs text-muted-foreground hidden sm:block">Recebido {fmt(Number(s.amount_received))}</span>
              <Badge variant={tone(s.status) as "destructive" | "outline" | "secondary"}>{s.status_label || s.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
