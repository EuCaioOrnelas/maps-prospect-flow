import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Mail, Phone, Lock, Award, Percent, FileText, Link2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const CreatePartnerDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    company: "",
    tax_id: "",
    level: "bronze" as const,
    custom_commission_percent: "",
    internal_notes: "",
    referral_code: "",
  });
  const { toast } = useToast();
  const [emailCheck, setEmailCheck] = useState<{ checking: boolean; exists: boolean; isAlreadyPartner: boolean }>({
    checking: false, exists: false, isAlreadyPartner: false,
  });

  const reset = () => {
    setForm({
      full_name: "", email: "", password: "", phone: "", company: "", tax_id: "",
      level: "bronze", custom_commission_percent: "", internal_notes: "", referral_code: "",
    });
    setEmailCheck({ checking: false, exists: false, isAlreadyPartner: false });
  };

  // Debounced check whether the email belongs to an existing Wiize user
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailCheck({ checking: false, exists: false, isAlreadyPartner: false });
      return;
    }
    setEmailCheck((s) => ({ ...s, checking: true }));
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("admin-check-wiize-account", { body: { email } });
        if (error) throw error;
        setEmailCheck({
          checking: false,
          exists: !!(data as any)?.exists,
          isAlreadyPartner: !!(data as any)?.isAlreadyPartner,
        });
      } catch {
        setEmailCheck({ checking: false, exists: false, isAlreadyPartner: false });
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form.email]);

  const submit = async () => {
    const passwordRequired = !emailCheck.exists;
    if (!form.full_name.trim() || !form.email.trim() || (passwordRequired && form.password.length < 8)) {
      toast({ title: "Campos obrigatórios", description: passwordRequired ? "Nome, email e senha (mín. 8 caracteres) são obrigatórios." : "Nome e email são obrigatórios.", variant: "destructive" });
      return;
    }
    if (emailCheck.isAlreadyPartner) {
      toast({ title: "Já é parceiro", description: "Este email já está cadastrado como parceiro.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-partner", {
        body: {
          ...form,
          custom_commission_percent: form.custom_commission_percent ? Number(form.custom_commission_percent) : null,
          referral_code: form.referral_code.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Parceiro criado!", description: `${form.full_name} foi cadastrado com código ${(data as any).partner.referral_code}` });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Erro ao criar parceiro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><User size={20} /> Novo parceiro</DialogTitle>
          <DialogDescription>Cadastra um parceiro manualmente. Será gerado um código de referral único e o painel do parceiro.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-2">
            <Label className="flex items-center gap-1.5"><User size={14} /> Nome completo *</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="João Silva" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Mail size={14} /> Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="joao@empresa.com" />
            {emailCheck.checking && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Verificando…</p>
            )}
            {!emailCheck.checking && emailCheck.isAlreadyPartner && (
              <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle size={12} /> Este email já está cadastrado como parceiro.</p>
            )}
          </div>

          {emailCheck.exists && !emailCheck.isAlreadyPartner ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Conta Wiize detectada</Label>
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                Este email já tem conta na Wiize. O parceiro fará login no portal usando a <strong>mesma senha</strong> que já utiliza na ferramenta principal — não é necessário definir uma nova.
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Lock size={14} /> Senha inicial *</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Phone size={14} /> Telefone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+55 11 99999-9999" />
          </div>

          <div className="space-y-2">
            <Label>CPF/CNPJ</Label>
            <Input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} placeholder="000.000.000-00" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Empresa (opcional)</Label>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Agência XYZ" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Award size={14} /> Nível inicial</Label>
            <Select value={form.level} onValueChange={(v: any) => setForm({ ...form, level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Percent size={14} /> Comissão personalizada (%)</Label>
            <Input type="number" min="0" max="100" step="0.01" value={form.custom_commission_percent} onChange={(e) => setForm({ ...form, custom_commission_percent: e.target.value })} placeholder="Deixe vazio para usar % do nível" />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="flex items-center gap-1.5"><Link2 size={14} /> Código de indicação (opcional)</Label>
            <Input
              value={form.referral_code}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
              placeholder="Ex: joaosilva (deixe vazio para gerar automaticamente)"
              maxLength={30}
            />
            <p className="text-xs text-muted-foreground">3 a 30 letras/números, sem espaços ou símbolos. Se vazio, é gerado a partir do nome.</p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label className="flex items-center gap-1.5"><FileText size={14} /> Observações internas</Label>
            <Textarea value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} placeholder="Anotações visíveis só pelo admin" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Criando...</> : "Criar parceiro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
