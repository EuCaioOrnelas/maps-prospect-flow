import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PartnerBankAccount() {
  const { partner } = useOutletContext<any>();
  const [form, setForm] = useState<any>({
    holder_name: "", holder_tax_id: "",
    bank_name: "", bank_branch: "", bank_account: "", account_type: "checking",
    pix_key: "", pix_key_type: "cpf",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!partner?.id) return;
    (async () => {
      const { data } = await supabase.from("partner_bank_accounts").select("*").eq("partner_id", partner.id).maybeSingle();
      if (data) setForm({ ...form, ...data });
      setLoading(false);
    })();
  }, [partner?.id]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("partner_bank_accounts").upsert({
      partner_id: partner.id,
      holder_name: form.holder_name,
      holder_tax_id: form.holder_tax_id,
      bank_name: form.bank_name,
      bank_branch: form.bank_branch,
      bank_account: form.bank_account,
      account_type: form.account_type,
      pix_key: form.pix_key,
      pix_key_type: form.pix_key_type,
    }, { onConflict: "partner_id" });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Dados bancários salvos" });
  };

  if (loading) return <div className="p-6"><Card><CardContent className="py-16 text-center"><Loader2 className="animate-spin mx-auto" /></CardContent></Card></div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Dados bancários</h1>
        <p className="text-sm text-muted-foreground">Necessários para receber seus saques</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Titular</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Nome do titular *</Label>
            <Input value={form.holder_name || ""} onChange={(e) => setForm({ ...form, holder_name: e.target.value })} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>CPF / CNPJ *</Label>
            <Input value={form.holder_tax_id || ""} onChange={(e) => setForm({ ...form, holder_tax_id: e.target.value })} placeholder="000.000.000-00" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">PIX (preferencial para saques)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
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
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Chave PIX *</Label>
            <Input value={form.pix_key || ""} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Conta bancária (opcional)</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-span-2">
            <Label>Banco</Label>
            <Input value={form.bank_name || ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Ex: Nubank" />
          </div>
          <div className="space-y-2">
            <Label>Agência</Label>
            <Input value={form.bank_branch || ""} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Conta</Label>
            <Input value={form.bank_account || ""} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Tipo de conta</Label>
            <Select value={form.account_type || "checking"} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar
        </Button>
      </div>
    </div>
  );
}
