import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Users, DollarSign, Wallet, Clock, TrendingUp } from "lucide-react";
import { fmtBRL } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";

export default function PartnerDashboard() {
  const { partner } = useOutletContext<any>();
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const [balRes, leadsRes, partnerData] = await Promise.all([
        supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
        supabase.from("partner_leads").select("id, is_trial, is_paid").eq("partner_id", partner.id),
        supabase.from("partners").select("total_clicks, total_leads, total_paid_clients, lifetime_revenue_cents").eq("id", partner.id).maybeSingle(),
      ]);
      const leads = leadsRes.data || [];
      setStats({
        ...(balRes.data as any || {}),
        total_leads: leads.length,
        trials: leads.filter((l) => l.is_trial && !l.is_paid).length,
        paid: leads.filter((l) => l.is_paid).length,
        ...(partnerData.data || {}),
      });
    })();
  }, [partner?.id]);

  const link = `${window.location.origin}/?ref=${partner.referral_code}`;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const cards = stats ? [
    { label: "Leads totais", value: stats.total_leads, icon: Users },
    { label: "Em trial", value: stats.trials, icon: Clock },
    { label: "Clientes pagos", value: stats.paid, icon: TrendingUp },
    { label: "Comissão pendente", value: fmtBRL(stats.pending_cents), icon: Clock },
    { label: "Disponível p/ saque", value: fmtBRL(stats.available_cents), icon: Wallet, highlight: true },
    { label: "Em saque solicitado", value: fmtBRL(stats.requested_cents), icon: Wallet },
    { label: "Total recebido", value: fmtBRL(stats.paid_cents), icon: DollarSign },
    { label: "Receita gerada", value: fmtBRL(stats.lifetime_revenue_cents || 0), icon: TrendingUp },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Olá, {partner.full_name.split(" ")[0]}! 👋</h1>
        <p className="text-sm text-muted-foreground">Acompanhe seu programa de indicações</p>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader><CardTitle className="text-base">Seu link de indicação</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background border rounded-md px-3 py-2 text-sm font-mono truncate">{link}</code>
            <Button onClick={copy} variant="outline" className="gap-2">
              {copied ? <Check size={16} className="text-primary" /> : <Copy size={16} />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Compartilhe este link. Toda venda gerada nos próximos 2 anos é vinculada a você.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={c.highlight ? "border-primary/30 bg-primary/5" : ""}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</span>
                <c.icon size={16} className="text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
