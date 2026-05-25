import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Copy, Check, KeyRound, RefreshCcw, Ban, Save, Loader2,
  Users, DollarSign, Wallet, TrendingUp, MousePointerClick, Award, Building2, Trash2, Target, Link2, FileDown,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PartnerGoalsTab } from "@/components/admin/partners/PartnerGoalsTab";
import { PartnerLinksTab } from "@/components/admin/partners/PartnerLinksTab";

type Level = "bronze" | "silver" | "gold" | "platinum";
type Status = "active" | "inactive" | "blocked";

interface Partner {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  tax_id: string | null;
  country: string | null;
  referral_code: string;
  level: Level;
  status: Status;
  custom_commission_percent: number | null;
  internal_notes: string | null;
  total_leads: number;
  total_paid_clients: number;
  lifetime_revenue_cents: number;
  lifetime_commission_cents: number;
  created_at: string;
}

interface Bank {
  holder_name: string | null;
  holder_tax_id: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account: string | null;
  account_type: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
}

const fmtBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const levelLabel: Record<Level, string> = { bronze: "Select", silver: "Signature", gold: "Prime", platinum: "Exclusive" };
const statusLabel: Record<Status, string> = { active: "Ativo", inactive: "Inativo", blocked: "Bloqueado" };

const statusBadge: Record<Status, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
  blocked: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

export default function AdminPartnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [bank, setBank] = useState<Bank | null>(null);
  const [balance, setBalance] = useState<{ pending_cents: number; available_cents: number; requested_cents: number; paid_cents: number } | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [clicks, setClicks] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    company: "",
    tax_id: "",
    level: "bronze" as Level,
    status: "active" as Status,
    custom_commission_percent: "" as string,
    internal_notes: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [newReferralCode, setNewReferralCode] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data: p, error } = await supabase.from("partners").select("*").eq("id", id).maybeSingle();
    if (error || !p) {
      toast({ title: "Parceiro não encontrado", variant: "destructive" });
      navigate("/admin/partners/parceiros");
      return;
    }
    setPartner(p as any);
    setForm({
      full_name: p.full_name || "",
      phone: p.phone || "",
      company: p.company || "",
      tax_id: p.tax_id || "",
      level: p.level,
      status: p.status,
      custom_commission_percent: p.custom_commission_percent != null ? String(p.custom_commission_percent) : "",
      internal_notes: p.internal_notes || "",
    });

    const [bankRes, balRes, salesRes, commRes, wdRes, payRes, leadsRes, clicksRes, histRes] = await Promise.all([
      supabase.from("partner_bank_accounts").select("*").eq("partner_id", id).maybeSingle(),
      supabase.rpc("compute_partner_balance", { p_partner_id: id }),
      supabase.from("partner_sales").select("*").eq("partner_id", id).order("paid_at", { ascending: false }).limit(100),
      supabase.from("partner_commissions").select("*").eq("partner_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("partner_withdrawals").select("*").eq("partner_id", id).order("requested_at", { ascending: false }).limit(50),
      supabase.from("partner_payouts").select("*").eq("partner_id", id).order("paid_at", { ascending: false }).limit(50),
      supabase.from("partner_leads").select("*, profiles:user_id(name, email, plan, created_at)").eq("partner_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("partner_clicks").select("id, referral_code, landing_page, utm_source, utm_medium, utm_campaign, converted_to_lead_at, created_at").eq("partner_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("partner_levels_history").select("*").eq("partner_id", id).order("changed_at", { ascending: false }),
    ]);

    setBank((bankRes.data as any) || null);
    setBalance((balRes.data as any) || null);
    setSales((salesRes.data as any) || []);
    setCommissions((commRes.data as any) || []);
    setWithdrawals((wdRes.data as any) || []);
    setPayouts((payRes.data as any) || []);
    setLeads((leadsRes.data as any) || []);
    setClicks((clicksRes.data as any) || []);
    setHistory((histRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const callUpdate = async (payload: Record<string, unknown>, successMsg: string) => {
    if (!partner) return;
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-update-partner", {
      body: { partner_id: partner.id, ...payload },
    });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return false;
    }
    toast({ title: successMsg });
    await load();
    return true;
  };

  const onSaveDetails = async () => {
    const pct = form.custom_commission_percent.trim() === "" ? null : Number(form.custom_commission_percent);
    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) {
      toast({ title: "Comissão inválida", description: "Use um número entre 0 e 100.", variant: "destructive" });
      return;
    }
    await callUpdate({
      full_name: form.full_name,
      phone: form.phone || null,
      company: form.company || null,
      tax_id: form.tax_id || null,
      level: form.level,
      status: form.status,
      custom_commission_percent: pct,
      internal_notes: form.internal_notes || null,
    }, "Dados atualizados");
  };

  const onChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Senha muito curta", description: "Mínimo de 8 caracteres.", variant: "destructive" });
      return;
    }
    const ok = await callUpdate({ new_password: newPassword }, "Senha alterada com sucesso");
    if (ok) setNewPassword("");
  };

  const onResetReferral = async () => {
    await callUpdate({ reset_referral_code: true }, "Novo código gerado");
  };

  const onApplyCustomReferral = async () => {
    const candidate = newReferralCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (candidate.length < 3 || candidate.length > 30) {
      toast({ title: "Código inválido", description: "Use de 3 a 30 letras/números, sem espaços ou símbolos.", variant: "destructive" });
      return;
    }
    if (partner && candidate === partner.referral_code) {
      toast({ title: "Sem alterações", description: "Este já é o código atual." });
      return;
    }
    const ok = await callUpdate({ referral_code: candidate }, "Código atualizado");
    if (ok) setNewReferralCode("");
  };

  const onToggleBlock = async () => {
    if (!partner) return;
    const next: Status = partner.status === "blocked" ? "active" : "blocked";
    await callUpdate({ status: next }, next === "blocked" ? "Parceiro bloqueado" : "Parceiro reativado");
  };

  const copyLink = async () => {
    if (!partner) return;
    const url = `${window.location.origin}/?ref=${partner.referral_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copiado!", description: url });
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading || !partner) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const kpis = [
    { label: "Receita gerada", value: fmtBRL(partner.lifetime_revenue_cents), icon: DollarSign, accent: "primary" },
    { label: "Comissão acumulada", value: fmtBRL(partner.lifetime_commission_cents), icon: Award, accent: "primary" },
    { label: "Disponível p/ saque", value: fmtBRL(balance?.available_cents || 0), icon: Wallet, accent: "emerald" },
    { label: "Comissão pendente", value: fmtBRL(balance?.pending_cents || 0), icon: TrendingUp, accent: "amber" },
    { label: "Clientes pagos", value: String(partner.total_paid_clients), icon: Users, accent: "primary" },
    { label: "Leads indicados", value: String(partner.total_leads), icon: MousePointerClick, accent: "violet" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/partners/parceiros")} className="gap-2">
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card/60 to-card/20 p-6 lg:p-8 backdrop-blur-sm">
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center text-primary text-xl font-bold uppercase">
              {partner.full_name.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{partner.full_name}</h1>
                <Badge variant="outline" className={statusBadge[partner.status]}>{statusLabel[partner.status]}</Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">{levelLabel[partner.level]}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1">{partner.email} · cadastrado em {fmtDate(partner.created_at)}</div>
              <button onClick={copyLink} className="mt-3 inline-flex items-center gap-2 text-xs font-mono bg-muted/60 hover:bg-muted px-3 py-1.5 rounded-lg transition-colors">
                /?ref={partner.referral_code}
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("generate-partner-certificate", {
                    body: { partner_id: partner.id, as_base64: true },
                  });
                  if (error) throw error;
                  const { pdf_base64, filename } = data as { pdf_base64: string; filename: string };
                  const bytes = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0));
                  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                  const a = document.createElement("a");
                  a.href = url; a.download = filename; a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Certificado gerado", description: "Download iniciado." });
                } catch (e: any) {
                  toast({ title: "Erro ao gerar certificado", description: e?.message || "", variant: "destructive" });
                }
              }}
            >
              <FileDown size={14} /> Baixar certificado
            </Button>

            {/* Reset rápido continua útil; edição completa fica em Configurações */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={partner.status === "blocked" ? "outline" : "destructive"}
                  size="sm"
                  className="gap-2"
                  disabled={saving}
                >
                  <Ban size={14} /> {partner.status === "blocked" ? "Reativar" : "Bloquear"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {partner.status === "blocked" ? "Reativar parceiro?" : "Bloquear parceiro?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {partner.status === "blocked"
                      ? "O parceiro voltará a aparecer como ativo e poderá gerar novas comissões."
                      : "O parceiro perderá o acesso ativo e não gerará novas comissões. Comissões já liberadas continuam disponíveis."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onToggleBlock}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="border-border/60 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="rounded-lg p-2 bg-primary/10 ring-1 ring-primary/20 text-primary w-fit mb-2">
                <k.icon size={14} />
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="text-lg font-bold tracking-tight mt-0.5">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="withdrawals">Saques</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="clicks">Cliques</TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5"><Target size={13} /> Metas</TabsTrigger>
          <TabsTrigger value="links" className="gap-1.5"><Link2 size={13} /> Links</TabsTrigger>
          <TabsTrigger value="bank">Dados bancários</TabsTrigger>
          <TabsTrigger value="settings">Editar / Senha</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="border-border/60">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Nome" value={partner.full_name} />
              <Field label="Email" value={partner.email} />
              <Field label="Telefone" value={partner.phone || "—"} />
              <Field label="Empresa" value={partner.company || "—"} />
              <Field label="CPF/CNPJ" value={partner.tax_id || "—"} />
              <Field label="País" value={partner.country || "—"} />
              <Field label="Nível atual" value={levelLabel[partner.level]} />
              <Field label="Status" value={statusLabel[partner.status]} />
              <Field label="% Comissão (custom)" value={partner.custom_commission_percent != null ? `${partner.custom_commission_percent}%` : "Padrão do nível"} />
              <Field label="Código de indicação" value={partner.referral_code} mono />
            </CardContent>
          </Card>
          {partner.internal_notes && (
            <Card className="border-border/60">
              <CardContent className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notas internas</div>
                <p className="text-sm whitespace-pre-wrap">{partner.internal_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SALES */}
        <TabsContent value="sales" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <SimpleTable
                empty="Nenhuma venda registrada"
                cols={["Plano", "Valor", "Provedor", "Recorrente", "Pago em"]}
                rows={sales.map((s) => [
                  s.plan,
                  fmtBRL(s.amount_cents),
                  s.payment_provider || "—",
                  s.is_recurring ? "Sim" : "Não",
                  fmtDate(s.paid_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* COMMISSIONS */}
        <TabsContent value="commissions" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <SimpleTable
                empty="Nenhuma comissão"
                cols={["Base", "%", "Comissão", "Status", "Disponível em", "Paga em"]}
                rows={commissions.map((c) => [
                  fmtBRL(c.base_amount_cents),
                  `${c.commission_percent}%`,
                  fmtBRL(c.commission_amount_cents),
                  c.status,
                  fmtDate(c.available_at),
                  fmtDate(c.paid_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* WITHDRAWALS */}
        <TabsContent value="withdrawals" className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">Solicitações</div>
              <SimpleTable
                empty="Nenhum saque solicitado"
                cols={["Valor", "Status", "Solicitado", "Aprovado", "Pago", "Motivo rejeição"]}
                rows={withdrawals.map((w) => [
                  fmtBRL(w.amount_cents),
                  w.status,
                  fmtDate(w.requested_at),
                  fmtDate(w.approved_at),
                  fmtDate(w.paid_at),
                  w.rejection_reason || "—",
                ])}
              />
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="p-0">
              <div className="px-4 py-3 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagamentos efetuados</div>
              <SimpleTable
                empty="Nenhum pagamento registrado"
                cols={["Valor", "Método", "Referência", "Pago em"]}
                rows={payouts.map((p) => [
                  fmtBRL(p.amount_cents),
                  p.payment_method || "—",
                  p.payment_reference || "—",
                  fmtDate(p.paid_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADS */}
        <TabsContent value="leads" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <SimpleTable
                empty="Nenhum lead indicado"
                cols={["Usuário", "Email", "Plano", "Cadastrado em"]}
                rows={leads.map((l: any) => [
                  l.profiles?.name || "—",
                  l.profiles?.email || "—",
                  l.profiles?.plan || "—",
                  fmtDate(l.created_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLICKS */}
        <TabsContent value="clicks" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <SimpleTable
                empty="Nenhum clique rastreado"
                cols={["Landing", "UTM Source", "UTM Medium", "UTM Campaign", "Convertido?", "Quando"]}
                rows={clicks.map((c) => [
                  c.landing_page || "/",
                  c.utm_source || "—",
                  c.utm_medium || "—",
                  c.utm_campaign || "—",
                  c.converted_to_lead_at ? "Sim" : "Não",
                  fmtDate(c.created_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* GOALS */}
        <TabsContent value="goals" className="mt-4">
          <PartnerGoalsTab partnerId={partner.id} />
        </TabsContent>

        {/* LINKS */}
        <TabsContent value="links" className="mt-4">
          <PartnerLinksTab partnerId={partner.id} />
        </TabsContent>

        {/* BANK */}
        <TabsContent value="bank" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Titular" value={bank?.holder_name || "—"} />
              <Field label="CPF/CNPJ titular" value={bank?.holder_tax_id || "—"} />
              <Field label="Banco" value={bank?.bank_name || "—"} />
              <Field label="Agência" value={bank?.bank_branch || "—"} />
              <Field label="Conta" value={bank?.bank_account || "—"} />
              <Field label="Tipo de conta" value={bank?.account_type || "—"} />
              <Field label="Chave Pix" value={bank?.pix_key || "—"} />
              <Field label="Tipo Pix" value={bank?.pix_key_type || "—"} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTINGS */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <div className="text-sm font-semibold flex items-center gap-2"><Building2 size={16} /> Dados do parceiro</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Nome completo">
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </FormField>
                <FormField label="Telefone">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </FormField>
                <FormField label="Empresa">
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </FormField>
                <FormField label="CPF/CNPJ">
                  <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
                </FormField>
                <FormField label="Nível">
                  <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as Level })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bronze">Select (10%)</SelectItem>
                      <SelectItem value="silver">Signature (15%)</SelectItem>
                      <SelectItem value="gold">Prime (20%)</SelectItem>
                      <SelectItem value="platinum">Exclusive (25%)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="% Comissão personalizada (vazio = padrão do nível)">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="Ex: 25"
                    value={form.custom_commission_percent}
                    onChange={(e) => setForm({ ...form, custom_commission_percent: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Notas internas">
                <Textarea
                  rows={3}
                  value={form.internal_notes}
                  onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
                  placeholder="Observações que apenas a equipe enxerga..."
                />
              </FormField>
              <div className="flex justify-end">
                <Button onClick={onSaveDetails} disabled={saving} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Salvar dados
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <div className="text-sm font-semibold flex items-center gap-2"><KeyRound size={16} /> Trocar senha</div>
              <p className="text-xs text-muted-foreground">A nova senha será aplicada imediatamente. O parceiro deverá usar essa senha para entrar no portal.</p>
              <div className="flex gap-2 max-w-md">
                <Input
                  type="text"
                  placeholder="Nova senha (mínimo 8 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={onChangePassword} disabled={saving || newPassword.length < 8} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-6 space-y-4">
              <div className="text-sm font-semibold flex items-center gap-2"><RefreshCcw size={16} /> Código de indicação</div>
              <p className="text-xs text-muted-foreground">
                Código atual: <span className="font-mono font-semibold text-foreground">{partner.referral_code}</span>. Você pode definir um código personalizado (3-30 letras/números, sem espaços) ou gerar um novo automaticamente.
              </p>
              <div className="flex flex-wrap gap-2 max-w-2xl">
                <Input
                  className="flex-1 min-w-[200px] font-mono"
                  placeholder={`Novo código (ex: ${partner.full_name.split(" ")[0]?.toLowerCase() || "parceiro"})`}
                  value={newReferralCode}
                  onChange={(e) => setNewReferralCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  maxLength={30}
                />
                <Button onClick={onApplyCustomReferral} disabled={saving || newReferralCode.length < 3} className="gap-2">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Aplicar
                </Button>
                <Button variant="outline" onClick={onResetReferral} disabled={saving} className="gap-2">
                  <RefreshCcw size={14} />
                  Gerar aleatório
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠️ Trocar o código invalida o link de indicação anterior. Cliques e leads já registrados continuam vinculados ao parceiro.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          <Card className="border-border/60">
            <CardContent className="p-0">
              <SimpleTable
                empty="Sem mudanças de nível registradas"
                cols={["De", "Para", "Motivo", "Quando"]}
                rows={history.map((h) => [
                  h.from_level ? levelLabel[h.from_level as Level] : "—",
                  levelLabel[h.to_level as Level],
                  h.reason || "—",
                  fmtDate(h.changed_at),
                ])}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={mono ? "text-sm font-mono" : "text-sm"}>{value}</div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SimpleTable({ cols, rows, empty }: { cols: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) {
    return <div className="px-6 py-12 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {cols.map((c) => (
              <TableHead key={c} className="text-xs uppercase tracking-wider font-semibold">{c}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              {row.map((cell, j) => <TableCell key={j} className="text-sm">{cell}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
