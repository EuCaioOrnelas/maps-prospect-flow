import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Building2, KeyRound, User, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/partners/PageHeader";

const REQUIRED_KEYS = [
  "holder_name", "holder_tax_id",
  "bank_name", "bank_code", "bank_branch", "bank_account", "account_type",
  "pix_key", "pix_key_type",
] as const;

export default function PartnerBankAccount() {
  const { partner } = useOutletContext<any>();
  const [form, setForm] = useState<any>({
    holder_name: "", holder_tax_id: "",
    bank_name: "", bank_code: "", bank_branch: "", bank_account: "", account_type: "checking",
    pix_key: "", pix_key_type: "cpf",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase.from("partner_bank_accounts").select("*").eq("partner_id", partner.id).maybeSingle();
      if (data) setForm((f: any) => ({ ...f, ...data }));
      setLoading(false);
    })();
  }, [partner?.id]);

  const missing = REQUIRED_KEYS.filter((k) => !String(form[k] || "").trim());

  const save = async () => {
    if (missing.length > 0) {
      toast({ title: "Campos obrigatórios", description: `Preencha: ${missing.join(", ")}`, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("partner_bank_accounts").upsert({
      partner_id: partner.id,
      ...REQUIRED_KEYS.reduce((acc, k) => ({ ...acc, [k]: form[k] }), {} as Record<string, string>),
    }, { onConflict: "partner_id" });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dados bancários salvos com sucesso" });
  };

  if (loading) {
    return (
      <div className="p-8">
        <Card><CardContent className="py-16 text-center"><Loader2 className="animate-spin mx-auto" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Dados bancários"
        subtitle="Necessários para receber saques de comissões e prêmios de metas"
        icon={Building2}
      />

      {missing.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <ShieldCheck size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Cadastro incompleto</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faltam {missing.length} campos para liberar saques. Todos os dados abaixo são <strong>obrigatórios</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User size={16} className="text-primary" /> Titular
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Nome do titular *" col2>
            <Input value={form.holder_name || ""} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} />
          </Field>
          <Field label="CPF / CNPJ do titular *" col2>
            <Input value={form.holder_tax_id || ""} onChange={(e) => setForm({ ...form, holder_tax_id: e.target.value })} placeholder="000.000.000-00" />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound size={16} className="text-primary" /> PIX
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Field label="Tipo *">
            <Select value={form.pix_key_type} onValueChange={(v) => setForm({ ...form, pix_key_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Chave PIX *" className="col-span-2">
            <Input value={form.pix_key || ""} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
          </Field>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 size={16} className="text-primary" /> Conta bancária
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Field label="Banco (nome) *">
            <Input value={form.bank_name || ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Ex: Nubank" />
          </Field>
          <Field label="Número do banco (FEBRABAN) *">
            <Input value={form.bank_code || ""} onChange={(e) => setForm({ ...form, bank_code: e.target.value })} placeholder="Ex: 260" maxLength={5} />
          </Field>
          <Field label="Agência *">
            <Input value={form.bank_branch || ""} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} />
          </Field>
          <Field label="Conta (com dígito) *">
            <Input value={form.bank_account || ""} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
          </Field>
          <Field label="Tipo de conta *" col2>
            <Select value={form.account_type || "checking"} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Conta corrente</SelectItem>
                <SelectItem value="savings">Conta poupança</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar dados bancários
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children, col2, className }: { label: string; children: React.ReactNode; col2?: boolean; className?: string }) {
  return (
    <div className={`space-y-2 ${col2 ? "col-span-2" : ""} ${className || ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
