import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Copy, ExternalLink, Mail, RefreshCw, Ban,
  CheckCircle2, XCircle, MoreHorizontal, Unlock, Pause, Play, Plus
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { AdminUserInfoDialog } from "@/components/admin/AdminUserInfoDialog";

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

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export function PixInvoicesTab() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pix_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      // Also load checkout_leads for PIX checkouts without invoices
      const { data: checkoutData } = await supabase
        .from("checkout_leads")
        .select("*")
        .or("stripe_session_id.like.abacate_%,stripe_session_id.like.asaas_pixauto_%")
        .order("created_at", { ascending: false })
        .limit(200);

      const invoiceUserIds = new Set((data || []).map((d: any) => d.user_id));
      const legacyInvoices: InvoiceRow[] = (checkoutData || [])
        .filter((c: any) => c.user_id && !invoiceUserIds.has(c.user_id))
        .map((c: any) => ({
          id: c.id,
          user_id: c.user_id || "",
          email: c.email,
          user_name: c.name,
          plan: c.plan_attempted,
          amount_cents: c.plan_attempted?.includes("Start") ? 29600 :
            c.plan_attempted?.includes("Growth") ? 69600 : 89700,
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

  const handleOpenPaymentLink = (invoice: InvoiceRow) => {
    // Build checkout URL for the user to regularize
    const planKey = invoice.plan.toLowerCase().includes("start") ? "start" :
      invoice.plan.toLowerCase().includes("growth") ? "growth" : "scale";
    const planName = invoice.plan.includes("Wiize") ? invoice.plan : `Wiize ${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)}`;
    const priceNumber = Math.round(invoice.amount_cents / 100);
    
    const url = invoice.checkout_url || 
      `https://wiize.com.br/checkout-pix?plan=${planKey}&planName=${encodeURIComponent(planName)}&planPrice=${priceNumber}&email=${encodeURIComponent(invoice.email)}&name=${encodeURIComponent(invoice.user_name || "")}&renewal=true`;
    
    window.open(url, "_blank");
  };

  const handleResendEmail = async (invoice: InvoiceRow) => {
    try {
      toast({ title: "Reenviando email..." });
      const planName = invoice.plan.includes("Wiize") ? invoice.plan : `Wiize ${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)}`;
      const priceFormatted = `R$ ${Math.round(invoice.amount_cents / 100)}`;
      const daysRemaining = invoice.subscription_period_end
        ? Math.ceil((new Date(invoice.subscription_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

      const planKey = invoice.plan.toLowerCase().includes("start") ? "start" :
        invoice.plan.toLowerCase().includes("growth") ? "growth" : "scale";
      const checkoutUrl = invoice.checkout_url ||
        `https://wiize.com.br/checkout-pix?plan=${planKey}&planName=${encodeURIComponent(planName)}&planPrice=${Math.round(invoice.amount_cents / 100)}&email=${encodeURIComponent(invoice.email)}&name=${encodeURIComponent(invoice.user_name || "")}&renewal=true`;

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: invoice.user_id,
          email_type: "SUBSCRIPTION_RENEWAL",
          payload: {
            plan_name: planName,
            plan_price: priceFormatted,
            expiry_date: invoice.subscription_period_end
              ? new Date(invoice.subscription_period_end).toLocaleDateString("pt-BR")
              : "N/A",
            remaining_days: daysRemaining,
            checkout_url: checkoutUrl,
            user_name: invoice.user_name || "Cliente",
            stage: invoice.renewal_stage || "D0",
          },
          idempotency_key: `manual_resend_${invoice.id}_${Date.now()}`,
        },
      });
      if (error) throw error;

      // Update invoice email status
      if (invoice.id) {
        await supabase.from("pix_invoices" as any)
          .update({ 
            last_email_sent_at: new Date().toISOString(), 
            last_email_status: "sent" 
          } as any)
          .eq("id", invoice.id);
      }

      toast({ title: "✅ Email reenviado com sucesso!" });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro ao reenviar", description: err.message, variant: "destructive" });
    }
  };

  const handleGenerateNewCharge = async (invoice: InvoiceRow) => {
    try {
      toast({ title: "Gerando nova cobrança..." });
      const planKey = invoice.plan.toLowerCase().includes("start") ? "start" :
        invoice.plan.toLowerCase().includes("growth") ? "growth" : "scale";
      const planName = invoice.plan.includes("Wiize") ? invoice.plan : `Wiize ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}`;
      const priceNumber = Math.round(invoice.amount_cents / 100);

      // Create new checkout URL
      const checkoutUrl = `https://wiize.com.br/checkout-pix?plan=${planKey}&planName=${encodeURIComponent(planName)}&planPrice=${priceNumber}&email=${encodeURIComponent(invoice.email)}&name=${encodeURIComponent(invoice.user_name || "")}&renewal=true`;

      // Update existing invoice or create new
      if (invoice.id && invoice.id.length > 10) {
        await supabase.from("pix_invoices" as any)
          .update({
            checkout_url: checkoutUrl,
            status: "pending",
            renewal_stage: "D0",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", invoice.id);
      } else {
        await supabase.from("pix_invoices" as any)
          .insert({
            user_id: invoice.user_id,
            email: invoice.email,
            user_name: invoice.user_name,
            plan: planKey,
            amount_cents: invoice.amount_cents,
            status: "pending",
            checkout_url: checkoutUrl,
            renewal_stage: "D0",
            subscription_period_end: invoice.subscription_period_end,
          } as any);
      }

      // Send email with new charge link
      await supabase.functions.invoke("send-email", {
        body: {
          user_id: invoice.user_id,
          email_type: "SUBSCRIPTION_RENEWAL",
          payload: {
            plan_name: planName,
            plan_price: `R$ ${priceNumber}`,
            expiry_date: new Date().toLocaleDateString("pt-BR"),
            remaining_days: 0,
            checkout_url: checkoutUrl,
            user_name: invoice.user_name || "Cliente",
            stage: "D0",
          },
          idempotency_key: `new_charge_${invoice.user_id}_${Date.now()}`,
        },
      });

      toast({ title: "✅ Nova cobrança gerada e email enviado!" });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleMarkAsPaid = async (invoice: InvoiceRow) => {
    try {
      // Update invoice status
      if (invoice.id && invoice.id.length > 10) {
        await supabase.from("pix_invoices" as any)
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            automation_paused: true,
          } as any)
          .eq("id", invoice.id);
      }

      // Extend subscription by 30 days
      const periodEnd = invoice.subscription_period_end
        ? new Date(invoice.subscription_period_end)
        : new Date();
      if (periodEnd < new Date()) {
        periodEnd.setTime(Date.now());
      }
      periodEnd.setDate(periodEnd.getDate() + 30);

      const planKey = invoice.plan.toLowerCase().includes("start") ? "start" :
        invoice.plan.toLowerCase().includes("growth") ? "growth" :
        invoice.plan.toLowerCase().includes("scale") ? "scale" : invoice.plan;

      const searchesLimit = planKey === "start" ? 1000 : planKey === "growth" ? 3000 : 10000;

      // Update profile via admin function
      await supabase.functions.invoke("admin-create-user", {
        body: {
          action: "update_plan",
          user_id: invoice.user_id,
          plan: planKey,
          searches_limit: searchesLimit,
          period_end: periodEnd.toISOString(),
        },
      });

      // Log tracking event
      await supabase.from("pix_tracking_events" as any).insert({
        invoice_id: invoice.id,
        user_id: invoice.user_id,
        event_type: "payment_confirmed",
        renewal_stage: invoice.renewal_stage || "manual",
        metadata: { source: "admin_manual_mark" },
      } as any);

      toast({ title: "✅ Marcado como pago! Assinatura renovada por +30 dias." });
      loadInvoices();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleAutomation = async (invoice: InvoiceRow) => {
    try {
      await supabase.from("pix_invoices" as any)
        .update({ automation_paused: !invoice.automation_paused } as any)
        .eq("id", invoice.id);
      toast({ title: invoice.automation_paused ? "✅ Automação retomada" : "⏸️ Automação pausada" });
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
      
      if (block) {
        // Log tracking event
        await supabase.from("pix_tracking_events" as any).insert({
          user_id: userId,
          event_type: "access_suspended",
          renewal_stage: "manual",
          metadata: { source: "admin_manual_block" },
        } as any);
      }

      toast({ title: block ? "🔒 Acesso bloqueado" : "🔓 Acesso desbloqueado" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{filtered.length} faturas</span>
        <span>•</span>
        <span className="text-emerald-500">{filtered.filter(i => i.status === "paid").length} pagas</span>
        <span>•</span>
        <span className="text-yellow-500">{filtered.filter(i => i.status === "pending").length} pendentes</span>
        {filtered.some(i => i.automation_paused) && (
          <>
            <span>•</span>
            <span className="text-orange-500">{filtered.filter(i => i.automation_paused).length} pausadas</span>
          </>
        )}
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
                        <button
                          onClick={() => inv.user_id && setSelectedUserId(inv.user_id)}
                          className="text-left hover:underline"
                        >
                          <p className="font-medium text-foreground text-xs">{inv.user_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{inv.email}</p>
                        </button>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{inv.plan}</Badge>
                      </td>
                      <td className="p-3 tabular-nums text-foreground text-xs">{formatCurrency(inv.amount_cents)}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_COLORS[inv.status] as any || "secondary"} className="text-xs">
                          {STATUS_LABELS[inv.status] || inv.status}
                        </Badge>
                        {inv.automation_paused && (
                          <Badge variant="outline" className="text-xs ml-1 text-orange-500 border-orange-500/30">
                            Pausado
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {inv.renewal_stage ? (
                          <Badge variant={inv.renewal_stage === "D+1" ? "destructive" : "secondary"} className="text-xs">
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
                              <CheckCircle2 size={12} className="text-[#34A853]" />
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
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => handleOpenPaymentLink(inv)}>
                              <ExternalLink size={14} className="mr-2" /> Abrir link pagamento
                            </DropdownMenuItem>
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
                              <Plus size={14} className="mr-2" /> Gerar nova cobrança
                            </DropdownMenuItem>
                            {inv.status !== "paid" && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(inv)}>
                                <CheckCircle2 size={14} className="mr-2 text-[#34A853]" /> Marcar como pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleAutomation(inv)}>
                              {inv.automation_paused ? (
                                <><Play size={14} className="mr-2 text-[#34A853]" /> Retomar automação</>
                              ) : (
                                <><Pause size={14} className="mr-2 text-yellow-500" /> Pausar automação</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleBlock(inv.user_id, true)} className="text-destructive focus:text-destructive">
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

      {selectedUserId && (
        <AdminUserInfoDialog
          userId={selectedUserId}
          open={!!selectedUserId}
          onOpenChange={(open) => !open && setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
