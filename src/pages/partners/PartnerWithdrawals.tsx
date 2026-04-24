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
import { Loader2, Wallet, Clock, CheckCircle2, ShieldAlert, Building2, KeyRound, User, ShieldCheck, Save } from "lucide-react";
import { fmtBRL, fmtDate, withdrawalStatusColors, withdrawalStatusLabel } from "@/lib/partnerFormat";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";
import { StatCard } from "@/components/partners/StatCard";

const REQUIRED_BANK_KEYS = [
  "holder_name", "holder_tax_id",
  "bank_name", "bank_code", "bank_branch", "bank_account", "account_type",
  "pix_key", "pix_key_type",
] as const;

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
    setBankAccount(ba.data);
    if (ba.data) setBankForm((f: any) => ({ ...f, ...ba.data }));
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

  const missingBank = REQUIRED_BANK_KEYS.filter((k) => !String(bankForm[k] || "").trim());

  const saveBank = async () => {
    if (missingBank.length > 0) {
      toast({ title: "Campos obrigatórios", description: `Preencha todos os campos marcados.`, variant: "destructive" });
      return;
    }
    setSavingBank(true);
    const { error } = await supabase.from("partner_bank_accounts").upsert({
      partner_id: partner.id,
      ...REQUIRED_BANK_KEYS.reduce((acc, k) => ({ ...acc, [k]: bankForm[k] }), {} as Record<string, string>),
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar saque</DialogTitle>
            <DialogDescription>
              Saldo disponível: <strong className="text-foreground">{fmtBRL(balance.available_cents)}</strong> · Mínimo: {fmtBRL(minCents)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                min="0"
                step="10"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(minCents / 100)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <button
                type="button"
                onClick={() => setAmount(String(balance.available_cents / 100))}
                className="text-xs text-primary hover:underline"
              >
                Usar saldo total disponível
              </button>
            </div>
            <div className="bg-muted/40 p-3 rounded-md text-xs space-y-1.5">
              <div className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Destino do saque</div>
              <div><span className="text-muted-foreground">PIX:</span> <strong>{bankAccount?.pix_key}</strong> ({bankAccount?.pix_key_type})</div>
              <div><span className="text-muted-foreground">Titular:</span> {bankAccount?.holder_name} · {bankAccount?.holder_tax_id}</div>
              <div><span className="text-muted-foreground">Banco:</span> {bankAccount?.bank_code} - {bankAccount?.bank_name} · Ag {bankAccount?.bank_branch} · Cc {bankAccount?.bank_account}</div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ✅ Validação executada no servidor. O saldo é recalculado e travado no momento da solicitação para impedir falsificação.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin mr-2" size={16} />Enviando...</> : "Confirmar"}
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
