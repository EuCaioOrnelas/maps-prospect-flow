import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { FileText, RefreshCw, DollarSign, Calendar, History, Receipt, ExternalLink, Infinity as InfinityIcon } from "lucide-react";
import { formatCents, PAYMENT_METHODS } from "./customSubConfig";
import { RenewSubscriptionDialog } from "./RenewSubscriptionDialog";

interface Props {
  userId: string;
  onChanged?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
  renewed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  canceled: "bg-muted text-muted-foreground border-border",
};

const paymentLabel = (m: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label || m;

export const CustomSubscriptionTab = ({ userId, onChanged }: Props) => {
  const [subs, setSubs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewOpen, setRenewOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [subsRes, paysRes, renRes] = await Promise.all([
      supabase.from("custom_subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("custom_subscription_payments").select("*").eq("user_id", userId).order("paid_at", { ascending: false }),
      supabase.from("custom_subscription_renewals").select("*").eq("user_id", userId).order("renewed_at", { ascending: false }),
    ]);
    setSubs(subsRes.data || []);
    setPayments(paysRes.data || []);
    setRenewals(renRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const activeSub = subs.find((s) => s.status === "active");
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  if (loading) return <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-40 w-full" /></div>;

  if (subs.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Este usuário não possui contratos customizados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contrato ativo */}
      {activeSub && (
        <Card className="border-primary/30 bg-primary/[0.02]">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> Contrato Ativo
              <Badge variant="outline" className={`ml-1 text-[10px] ${STATUS_COLORS.active}`}>ATIVO</Badge>
              {activeSub.subscription_label && (
                <Badge variant="secondary" className="text-[10px]">{activeSub.subscription_label}</Badge>
              )}
            </CardTitle>
            <Button size="sm" onClick={() => setRenewOpen(true)} className="gap-1.5 h-8 text-xs">
              <RefreshCw className="h-3 w-3" /> Renovar Contrato
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Field label="Plano" value={activeSub.plan?.toUpperCase()} />
            <Field label="Valor mensal" value={formatCents(activeSub.monthly_value_cents)} />
            <Field label="Total do contrato" value={formatCents(activeSub.total_value_cents)} />
            <Field label="Pagamento" value={paymentLabel(activeSub.payment_method)} />
            <Field label="Buscas" value={String(activeSub.searches_limit)} />
            <Field label="Números WhatsApp" value={String(activeSub.whatsapp_numbers_limit)} />
            <Field label="Início" value={fmtDate(activeSub.starts_at)} />
            <Field
              label="Expira em"
              value={activeSub.is_lifetime
                ? <span className="inline-flex items-center gap-1"><InfinityIcon className="h-3 w-3" /> Vitalício</span>
                : fmtDate(activeSub.ends_at)}
            />
            {(activeSub.contract_file_url || activeSub.notes) && (
              <div className="col-span-2 md:col-span-4 pt-2 border-t border-border/40 space-y-2">
                {activeSub.contract_file_url && (
                  <a href={activeSub.contract_file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {activeSub.contract_file_name || "Contrato"} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {activeSub.notes && <p className="text-xs text-muted-foreground">{activeSub.notes}</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagamentos */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Receipt className="h-4 w-4" /> Pagamentos ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum pagamento registrado.</p>
          ) : payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/30 text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3 text-emerald-500" />
                <span className="font-bold">{formatCents(p.amount_cents)}</span>
                <Badge variant="outline" className="text-[10px]">{paymentLabel(p.payment_method)}</Badge>
                {p.notes && <span className="text-muted-foreground truncate max-w-[200px]">{p.notes}</span>}
              </div>
              <div className="flex items-center gap-2">
                {p.receipt_file_url && (
                  <a href={p.receipt_file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Comprovante
                  </a>
                )}
                <span className="text-muted-foreground whitespace-nowrap">{fmtDate(p.paid_at)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Histórico de contratos */}
      {subs.length > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Histórico de Contratos ({subs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {subs.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/30 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[s.status] || ""}`}>{s.status.toUpperCase()}</Badge>
                  <span className="font-medium uppercase">{s.plan}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{formatCents(s.monthly_value_cents)}/mês</span>
                  {s.subscription_label && <Badge variant="secondary" className="text-[10px]">{s.subscription_label}</Badge>}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(s.starts_at)} → {s.is_lifetime ? "∞" : fmtDate(s.ends_at)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Log de renovações */}
      {renewals.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Renovações ({renewals.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {renewals.map((r) => (
              <div key={r.id} className="text-xs p-2 rounded-md bg-muted/20 border border-border/30 flex items-center justify-between">
                <span>Renovado em <strong>{fmtDate(r.renewed_at)}</strong></span>
                {r.notes && <span className="text-muted-foreground truncate max-w-[300px]">{r.notes}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {activeSub && (
        <RenewSubscriptionDialog
          userId={userId}
          previousSubscription={activeSub}
          open={renewOpen}
          onOpenChange={setRenewOpen}
          onRenewed={() => { load(); onChanged?.(); }}
        />
      )}
    </div>
  );
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}
