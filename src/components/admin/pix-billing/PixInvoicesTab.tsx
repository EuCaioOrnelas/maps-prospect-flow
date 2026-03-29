import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Copy, ExternalLink, Mail, RefreshCw, Ban,
  CheckCircle2, XCircle, Eye, MoreHorizontal, Unlock, Pause, Play
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface InvoiceRow {
  id: string;
  user_id: string;
  email: string;
  user_name: string | null;
  plan: string;
  amount_cents: number;
  status: string;
  checkout_url: string | null;
  pix_code: string | null;
  renewal_stage: string | null;
  subscription_period_end: string | null;
  paid_at: string | null;
  last_email_sent_at: string | null;
  last_email_status: string | null;
  automation_paused: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "secondary",
  paid: "default",
  expired: "destructive",
  cancelled: "outline",
};

export function PixInvoicesTab() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Load from pix_invoices table
      const { data, error } = await supabase
        .from("pix_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      // Also load from checkout_leads for older data
      const { data: checkoutData } = await supabase
        .from("checkout_leads")
        .select("*")
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_%")
        .order("created_at", { ascending: false })
        .limit(200);

      // Merge data - pix_invoices takes priority
      const existingKeys = new Set((data || []).map((d: any) => `${d.user_id || ''}:${d.email || ''}:${d.amount_cents || 0}:${d.created_at || ''}`));
      const seenCheckoutSessions = new Set<string>();
      const legacyInvoices: InvoiceRow[] = (checkoutData || [])
        .filter((c: any) => {
          const sessionKey = c.stripe_session_id || c.id;
          if (seenCheckoutSessions.has(sessionKey)) return false;
          seenCheckoutSessions.add(sessionKey);

          const invoiceKey = `${c.user_id || ''}:${c.email || ''}:${c.plan_attempted?.includes("Start") ? 19700 : c.plan_attempted?.includes("Growth") ? 49700 : c.plan_attempted?.includes("Scale") ? 89700 : 0}:${c.created_at || ''}`;
          return !existingKeys.has(invoiceKey);
        })
        .map((c: any) => ({
          id: c.id,
          user_id: c.user_id || "",
          email: c.email,
          user_name: c.name,
          plan: c.plan_attempted,
          amount_cents: c.plan_attempted?.includes("Start") ? 19700 :
            c.plan_attempted?.includes("Growth") ? 49700 :
            c.plan_attempted?.includes("Scale") ? 89700 : 0,
          status: c.checkout_completed ? "paid" : "pending",
          checkout_url: null,
          pix_code: null,
          renewal_stage: null,
          subscription_period_end: null,
          paid_at: c.checkout_completed_at,
          last_email_sent_at: null,
          last_email_status: null,
          automation_paused: false,
          created_at: c.created_at,
        }));

      setInvoices([...(data || []) as unknown as InvoiceRow[], ...legacyInvoices]);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código PIX copiado!" });
  };

  const handleResendEmail = async (invoice: InvoiceRow) => {
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: invoice.user_id,
          email_type: "SUBSCRIPTION_RENEWAL",
          payload: {
            plan_name: invoice.plan,
            plan_price: `R$ ${(invoice.amount_cents / 100).toFixed(0)}`,
            expiry_date: invoice.subscription_period_end
              ? new Date(invoice.subscription_period_end).toLocaleDateString("pt-BR")
              : "N/A",
            remaining_days: invoice.subscription_period_end
              ? Math.ceil((new Date(invoice.subscription_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : 0,
            checkout_url: invoice.checkout_url || "",
            user_name: invoice.user_name || "Cliente",
          },
          idempotency_key: `manual_resend_${invoice.id}_${Date.now()}`,
        },
      });
      if (error) throw error;
      toast({ title: "Email reenviado com sucesso!" });
    } catch (err: any) {
      toast({ title: "Erro ao reenviar", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkAsPaid = async (invoice: InvoiceRow) => {
    try {
      await supabase
        .from("pix_invoices" as any)
        .update({ status: "paid", paid_at: new Date().toISOString() } as any)
        .eq("id", invoice.id);

      // Update profile
      const periodEnd = invoice.subscription_period_end
        ? new Date(invoice.subscription_period_end)
        : new Date();
      if (periodEnd < new Date()) {
        periodEnd.setDate(new Date().getDate() + 30);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }

      const planKey = invoice.plan.toLowerCase().includes("start") ? "start" :
        invoice.plan.toLowerCase().includes("growth") ? "growth" :
        invoice.plan.toLowerCase().includes("scale") ? "scale" : invoice.plan;

      const searchesLimit = planKey === "start" ? 200 : planKey === "growth" ? 600 : 1200;

      // This needs admin/service role - call edge function
      await supabase.functions.invoke("admin-create-user", {
        body: {
          action: "update_plan",
          user_id: invoice.user_id,
          plan: planKey,
          searches_limit: searchesLimit,
          period_end: periodEnd.toISOString(),
        },
      });

      toast({ title: "Marcado como pago!" });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleBlock = async (userId: string, block: boolean) => {
    try {
      await supabase.functions.invoke("admin-create-user", {
        body: {
          action: block ? "block_user" : "unblock_user",
          user_id: userId,
        },
      });
      toast({ title: block ? "Acesso bloqueado" : "Acesso desbloqueado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleAutomation = async (invoice: InvoiceRow) => {
    try {
      await supabase
        .from("pix_invoices" as any)
        .update({ automation_paused: !invoice.automation_paused } as any)
        .eq("id", invoice.id);
      toast({ title: invoice.automation_paused ? "Automação retomada" : "Automação pausada" });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateNewCharge = async (invoice: InvoiceRow) => {
    try {
      toast({ title: "Gerando nova cobrança..." });
      // Trigger pix-renewal-cron for specific user would need a dedicated endpoint
      // For now, this creates a new checkout via the existing flow
      const { data, error } = await supabase.functions.invoke("create-abacate-pix", {
        body: {
          planKey: invoice.plan.toLowerCase().includes("start") ? "start" :
            invoice.plan.toLowerCase().includes("growth") ? "growth" : "scale",
          userId: invoice.user_id,
          email: invoice.email,
          name: invoice.user_name,
        },
      });
      if (error) throw error;
      toast({ title: "Nova cobrança gerada!", description: "Link de pagamento atualizado." });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro ao gerar cobrança", description: err.message, variant: "destructive" });
    }
  };

  const filtered = invoices.filter((inv) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !inv.email?.toLowerCase().includes(term) &&
        !inv.user_name?.toLowerCase().includes(term) &&
        !inv.plan?.toLowerCase().includes(term)
      ) return false;
    }
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (stageFilter !== "all" && inv.renewal_stage !== stageFilter) return false;
    return true;
  });

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email, nome ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Etapas</SelectItem>
            <SelectItem value="D-5">D-5</SelectItem>
            <SelectItem value="D-3">D-3</SelectItem>
            <SelectItem value="D-1">D-1</SelectItem>
            <SelectItem value="D0">D0</SelectItem>
            <SelectItem value="D+1">D+1</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadInvoices} className="gap-1.5">
          <RefreshCw size={14} /> Atualizar
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-foreground">Usuário</th>
                    <th className="text-left p-3 font-medium text-foreground">Plano</th>
                    <th className="text-left p-3 font-medium text-foreground">Valor</th>
                    <th className="text-left p-3 font-medium text-foreground">Status</th>
                    <th className="text-left p-3 font-medium text-foreground">Etapa</th>
                    <th className="text-left p-3 font-medium text-foreground">Vencimento</th>
                    <th className="text-left p-3 font-medium text-foreground">Email</th>
                    <th className="text-left p-3 font-medium text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-foreground text-xs">{inv.user_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{inv.email}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{inv.plan}</Badge>
                      </td>
                      <td className="p-3 tabular-nums text-foreground">{formatCurrency(inv.amount_cents)}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_COLORS[inv.status] as any || "secondary"}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {inv.renewal_stage ? (
                          <Badge variant={inv.renewal_stage === "D+1" ? "destructive" : "secondary"}>
                            {inv.renewal_stage}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground tabular-nums">
                        {inv.subscription_period_end
                          ? new Date(inv.subscription_period_end).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="p-3">
                        {inv.last_email_status ? (
                          <div className="flex items-center gap-1">
                            {inv.last_email_status === "sent" ? (
                              <CheckCircle2 size={12} className="text-primary" />
                            ) : (
                              <XCircle size={12} className="text-destructive" />
                            )}
                            <span className="text-xs text-muted-foreground">
                              {inv.last_email_sent_at
                                ? new Date(inv.last_email_sent_at).toLocaleDateString("pt-BR")
                                : inv.last_email_status}
                            </span>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {inv.checkout_url && (
                              <DropdownMenuItem onClick={() => window.open(inv.checkout_url!, "_blank")}>
                                <ExternalLink size={14} className="mr-2" /> Abrir link pagamento
                              </DropdownMenuItem>
                            )}
                            {inv.pix_code && (
                              <DropdownMenuItem onClick={() => handleCopyPix(inv.pix_code!)}>
                                <Copy size={14} className="mr-2" /> Copiar código PIX
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleResendEmail(inv)}>
                              <Mail size={14} className="mr-2" /> Reenviar email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleGenerateNewCharge(inv)}>
                              <RefreshCw size={14} className="mr-2" /> Gerar nova cobrança
                            </DropdownMenuItem>
                            {inv.status !== "paid" && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(inv)}>
                                <CheckCircle2 size={14} className="mr-2" /> Marcar como pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleAutomation(inv)}>
                              {inv.automation_paused ? (
                                <><Play size={14} className="mr-2" /> Retomar automação</>
                              ) : (
                                <><Pause size={14} className="mr-2" /> Pausar automação</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleBlock(inv.user_id, true)}>
                              <Ban size={14} className="mr-2" /> Bloquear acesso
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleBlock(inv.user_id, false)}>
                              <Unlock size={14} className="mr-2" /> Desbloquear acesso
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-12">
                Nenhuma fatura encontrada.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
