import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, Clock, CheckCircle2, ShieldAlert, Building2, KeyRound, User, ShieldCheck, Save, ArrowUpRight, Landmark, Zap, Lock, CreditCard } from "lucide-react";
import { fmtBRL, fmtDate, withdrawalStatusColors, withdrawalStatusLabel } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { StatCard } from "@/components/partners/StatCard";

const REQUIRED_BANK_KEYS = [
  "holder_name", "holder_tax_id",
  "bank_name", "bank_code", "bank_branch", "bank_account", "account_type",
  "pix_key", "pix_key_type",
] as const;

const BANK_FIELD_LABELS: Record<(typeof REQUIRED_BANK_KEYS)[number], string> = {
  holder_name: "Nome do titular",
  holder_tax_id: "CPF / CNPJ do titular",
  bank_name: "Banco",
  bank_code: "Número do banco",
  bank_branch: "Agência",
  bank_account: "Conta",
  account_type: "Tipo de conta",
  pix_key: "Chave PIX",
  pix_key_type: "Tipo de chave PIX",
};

const cleanBankAccountData = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([_, value]) => value !== null && value !== undefined));

export default function PartnerWithdrawals() {
  const { partner } = useOutletContext<any>();
  const [balance, setBalance] = useState<any>({ pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [bankForm, setBankForm] = useState<any>({
    holder_name: "", holder_tax_id: "",
    bank_name: "", bank_code: "", bank_branch: "", bank_account: "", account_type: "checking",
    pix_key: "", pix_key_type: "cpf",
  });
  const [savingBank, setSavingBank] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("withdrawals");
  const { toast } = useToast();

  const load = async () => {
    if (!partner?.id) return;
    const [b, w, ba, s] = await Promise.all([
      supabase.rpc("compute_partner_balance", { p_partner_id: partner.id }),
      supabase.from("partner_withdrawals").select("*").eq("partner_id", partner.id).order("requested_at", { ascending: false }),
      supabase.from("partner_bank_accounts").select("*").eq("partner_id", partner.id).maybeSingle(),
      supabase.from("partner_settings").select("minimum_withdrawal_cents, allow_multiple_pending_withdrawals").eq("id", 1).maybeSingle(),
    ]);
    setBalance(b.data || { pending_cents: 0, available_cents: 0, requested_cents: 0, paid_cents: 0 });
    setWithdrawals(w.data || []);
    setBankAccount(ba.data ? { account_type: "checking", pix_key_type: "cpf", ...cleanBankAccountData(ba.data) } : null);
    if (ba.data) setBankForm((f: any) => ({ ...f, ...cleanBankAccountData(ba.data) }));
    setSettings(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [partner?.id]);

  const isBankComplete = !!(
    bankAccount?.holder_name && bankAccount?.holder_tax_id &&
    bankAccount?.pix_key && bankAccount?.pix_key_type &&
    bankAccount?.bank_name && bankAccount?.bank_code &&
    bankAccount?.bank_branch && bankAccount?.bank_account && bankAccount?.account_type
  );
  const hasPending = withdrawals.some((w) => w.status === "pending" || w.status === "approved");
  const minCents = settings?.minimum_withdrawal_cents || 10000;
  const canRequest = isBankComplete && balance.available_cents >= minCents && (settings?.allow_multiple_pending_withdrawals || !hasPending);

  const normalizedBankForm = { ...bankForm, account_type: bankForm.account_type || "checking", pix_key_type: bankForm.pix_key_type || "cpf" };
  const missingBank = REQUIRED_BANK_KEYS.filter((k) => !String(normalizedBankForm[k] || "").trim());

  const saveBank = async () => {
    if (missingBank.length > 0) {
      toast({ title: "Campos obrigatórios", description: `Preencha: ${missingBank.map((k) => BANK_FIELD_LABELS[k]).join(", ")}.`, variant: "destructive" });
      return;
    }
    setSavingBank(true);
    const { error } = await supabase.from("partner_bank_accounts").upsert({
      partner_id: partner.id,
      ...REQUIRED_BANK_KEYS.reduce((acc, k) => ({ ...acc, [k]: normalizedBankForm[k] }), {} as Record<string, string>),
    }, { onConflict: "partner_id" });
    setSavingBank(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dados bancários salvos com sucesso" });
    load();
  };

  const submit = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (cents < minCents) { toast({ title: `Saque mínimo: ${fmtBRL(minCents)}`, variant: "destructive" }); return; }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_partner_withdrawal", { p_amount_cents: cents });
    setSubmitting(false);

    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    const result = data as any;
    if (result?.error) { toast({ title: "Não foi possível", description: result.error, variant: "destructive" }); return; }

    const firstName = (partner?.full_name || "").split(" ")[0] || "Parceiro";
    supabase.functions.invoke("send-partner-email", {
      body: { type: "partner_withdrawal_requested", to: partner?.email, data: { first_name: firstName, amount_cents: cents, user_id: partner?.user_id } },
    }).catch(() => {});
    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "admin_partner_alert",
        to: "parceiros@wiize.com.br",
        data: {
          subject: `💰 Novo saque solicitado — ${partner?.full_name || "Parceiro"}`,
          title: "Novo pedido de saque",
          lines: [
            `Parceiro: <strong>${partner?.full_name}</strong> (${partner?.email})`,
            `Valor: <strong>R$ ${(cents / 100).toFixed(2).replace(".", ",")}</strong>`,
            `<strong>Dados bancários:</strong>`,
            `PIX (${bankAccount?.pix_key_type}): ${bankAccount?.pix_key}`,
            `Titular: ${bankAccount?.holder_name} — ${bankAccount?.holder_tax_id}`,
            `Banco: ${bankAccount?.bank_code} ${bankAccount?.bank_name} · Ag ${bankAccount?.bank_branch} · Cc ${bankAccount?.bank_account} (${bankAccount?.account_type === 'checking' ? 'Corrente' : 'Poupança'})`,
          ],
          cta_url: `${window.location.origin}/admin/partners/saques`,
          cta_label: "Revisar saque",
        },
      },
    }).catch(() => {});

    toast({ title: "Solicitação enviada!", description: "Aguarde aprovação do admin." });
    setOpen(false);
    setAmount("");
    load();
  };

  const cards = [
    { label: "Disponível p/ saque", value: fmtBRL(balance.available_cents), icon: Wallet, accent: "emerald" as const, highlight: true, hint: "Pronto para resgate", empty: !balance.available_cents },
    { label: "Em saque solicitado", value: fmtBRL(balance.requested_cents), icon: Clock, accent: "blue" as const, hint: "Em análise", empty: !balance.requested_cents },
    { label: "Pendente liberação", value: fmtBRL(balance.pending_cents), icon: Clock, accent: "amber" as const, hint: "Após período de retenção", empty: !balance.pending_cents },
    { label: "Total recebido", value: fmtBRL(balance.paid_cents), icon: CheckCircle2, accent: "primary" as const, hint: "Histórico", empty: !balance.paid_cents },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Saques"
        subtitle="Solicite resgates do seu saldo de comissões"
        icon={Wallet}
        actions={
          <Button onClick={() => { if (!isBankComplete) { setTab("bank"); toast({ title: "Cadastre seus dados bancários antes de sacar" }); return; } setOpen(true); }} disabled={!canRequest && isBankComplete} className="gap-2">
            <Wallet size={16} /> Solicitar saque
          </Button>
        }
      />

      {!isBankComplete && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 ring-1 ring-amber-500/30 shrink-0">
              <ShieldAlert size={16} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Complete seus dados bancários</div>
              <p className="text-xs text-muted-foreground mt-0.5">Para liberar saques precisamos de: titular, CPF/CNPJ, banco completo (nome, número, agência, conta, tipo) e chave PIX.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTab("bank")} className="gap-1">
              Cadastrar agora
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => <StatCard key={c.label} {...c} />)}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="withdrawals" className="gap-2"><Wallet size={14} /> Saques</TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <Building2 size={14} /> Dados bancários
            {!isBankComplete && <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawals" className="mt-6">
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="text-base">Histórico de saques</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solicitado</TableHead>
                      <TableHead>Aprovado</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                    ) : withdrawals.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum saque ainda.</TableCell></TableRow>
                    ) : withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-right font-semibold">{fmtBRL(w.amount_cents)}</TableCell>
                        <TableCell><Badge variant="outline" className={withdrawalStatusColors[w.status]}>{withdrawalStatusLabel[w.status]}</Badge></TableCell>
                        <TableCell className="text-sm">{fmtDate(w.requested_at)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(w.approved_at)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(w.paid_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{w.rejection_reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="mt-6 space-y-6">
          {missingBank.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-4 flex items-start gap-3 text-sm">
                <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Cadastro incompleto</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Faltam {missingBank.length} campo(s) para liberar saques. Todos os dados abaixo são <strong>obrigatórios</strong>.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User size={16} className="text-primary" /> Titular</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <BankField label="Nome do titular *" col2>
                <Input value={bankForm.holder_name || ""} onChange={(e) => setBankForm({ ...bankForm, holder_name: e.target.value })} />
              </BankField>
              <BankField label="CPF / CNPJ do titular *" col2>
                <Input value={bankForm.holder_tax_id || ""} onChange={(e) => setBankForm({ ...bankForm, holder_tax_id: e.target.value })} placeholder="000.000.000-00" />
              </BankField>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><KeyRound size={16} className="text-primary" /> PIX</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <BankField label="Tipo *">
                <Select value={bankForm.pix_key_type} onValueChange={(v) => setBankForm({ ...bankForm, pix_key_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </BankField>
              <BankField label="Chave PIX *" className="col-span-2">
                <Input value={bankForm.pix_key || ""} onChange={(e) => setBankForm({ ...bankForm, pix_key: e.target.value })} />
              </BankField>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Building2 size={16} className="text-primary" /> Conta bancária</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <BankField label="Banco (nome) *">
                <Input value={bankForm.bank_name || ""} onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })} placeholder="Ex: Nubank" />
              </BankField>
              <BankField label="Número do banco (FEBRABAN) *">
                <Input value={bankForm.bank_code || ""} onChange={(e) => setBankForm({ ...bankForm, bank_code: e.target.value })} placeholder="Ex: 260" maxLength={5} />
              </BankField>
              <BankField label="Agência *">
                <Input value={bankForm.bank_branch || ""} onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })} />
              </BankField>
              <BankField label="Conta (com dígito) *">
                <Input value={bankForm.bank_account || ""} onChange={(e) => setBankForm({ ...bankForm, bank_account: e.target.value })} />
              </BankField>
              <BankField label="Tipo de conta *" col2>
                <Select value={bankForm.account_type || "checking"} onValueChange={(v) => setBankForm({ ...bankForm, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta corrente</SelectItem>
                    <SelectItem value="savings">Conta poupança</SelectItem>
                  </SelectContent>
                </Select>
              </BankField>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveBank} disabled={savingBank} size="lg" className="gap-2">
              {savingBank ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar dados bancários
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden p-5 gap-3 max-h-[92vh]">
          {/* Ambient top glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full blur-3xl opacity-40 bg-primary/25" />

          <DialogHeader className="relative space-y-0.5 pb-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/25">
                <Wallet size={16} className="text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold tracking-tight">Resgatar comissões</DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Saque via PIX em até 3 dias úteis
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 relative">
            {/* Saldo disponível — botão clicável que usa tudo */}
            <button
              type="button"
              onClick={() => setAmount(String(balance.available_cents / 100))}
              className="group relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.12] via-primary/[0.06] to-transparent p-4 text-left transition-all duration-300 hover:border-primary/40 hover:shadow-[0_8px_28px_hsl(158_72%_38%_/0.14)]"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl opacity-30 bg-primary/25 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">Saldo disponível</div>
                  <div className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
                    {fmtBRL(balance.available_cents)}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Toque para resgatar tudo · Mín. {fmtBRL(minCents)}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/25 group-hover:bg-primary/25 transition-colors duration-300">
                  <ArrowUpRight size={18} className="text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </div>
              </div>
            </button>

            {/* Input de valor */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-muted-foreground">Valor do resgate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={String(minCents / 100)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="pl-8 pr-4 h-10 text-base font-semibold tabular-nums"
                />
              </div>
              {Number(amount) > 0 && (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min((Number(amount) * 100) / (balance.available_cents || 1) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Destino do saque — card compacto */}
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5"><Landmark size={11} /> Destino</span>
                <span className="flex items-center gap-1 text-primary/80 normal-case tracking-normal font-medium">
                  <Clock size={10} /> até 3 dias úteis
                </span>
              </div>
              <div className="space-y-1 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
                    <Zap size={11} className="text-primary" /> PIX
                  </span>
                  <span className="font-semibold truncate ml-2 max-w-[60%]">{bankAccount?.pix_key}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Titular</span>
                  <span className="font-medium truncate ml-2 max-w-[60%]">{bankAccount?.holder_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Banco</span>
                  <span className="font-medium tabular-nums">{bankAccount?.bank_code} · {bankAccount?.bank_name}</span>
                </div>
              </div>
            </div>

            {/* Badge de segurança */}
            <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-1.5">
              <Lock size={12} className="text-primary shrink-0" />
              <p className="text-[10.5px] leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground">Saldo validado no servidor</span> no momento da solicitação.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-1">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting} className="flex-1 h-10">
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={submitting || !amount || Number(amount) * 100 < minCents || Number(amount) * 100 > balance.available_cents}
              className="flex-1 h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_16px_hsl(158_72%_38%_/0.3)] border-0"
            >
              {submitting ? (
                <><Loader2 className="animate-spin" size={16} /> Enviando...</>
              ) : (
                <><ArrowUpRight size={16} /> Confirmar resgate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BankField({ label, children, col2, className }: { label: string; children: React.ReactNode; col2?: boolean; className?: string }) {
  return (
    <div className={`space-y-2 ${col2 ? "col-span-2" : ""} ${className || ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
