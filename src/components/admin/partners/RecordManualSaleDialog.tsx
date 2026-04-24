import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, DollarSign, Check, ChevronsUpDown, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const RecordManualSaleDialog = ({ open, onOpenChange, onCreated }: Props) => {
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; email: string; full_name: string | null; current_plan: string | null }>>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userOpen, setUserOpen] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [form, setForm] = useState({
    partner_id: "",
    customer_user_id: "",
    customer_email: "",
    customer_label: "",
    amount: "",
    plan: "start",
    payment_provider: "asaas",
    payment_method: "pix",
    is_recurring: "true",
    external_reference: "",
    paid_at: new Date().toISOString().slice(0, 10),
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      supabase.from("partners").select("id, full_name, email").eq("status", "active").order("full_name").then(({ data }) => {
        setPartners(data || []);
      });
    }
  }, [open]);

  // Search users (profiles) with debounce
  useEffect(() => {
    if (!open) return;
    const q = userSearch.trim();
    setSearchingUsers(true);
    const t = setTimeout(async () => {
      let query = supabase
        .from("profiles")
        .select("id, email, full_name, current_plan")
        .order("created_at", { ascending: false })
        .limit(20);
      if (q.length >= 2) {
        query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
      }
      const { data } = await query;
      setUsers(data || []);
      setSearchingUsers(false);
    }, 250);
    return () => clearTimeout(t);
  }, [userSearch, open]);

  const submit = async () => {
    if (!form.partner_id || !form.customer_email.trim() || !form.amount) {
      toast({ title: "Campos obrigatórios", description: "Parceiro, email do cliente e valor são obrigatórios.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-record-partner-sale", {
        body: {
          partner_id: form.partner_id,
          customer_email: form.customer_email.trim().toLowerCase(),
          amount_cents: Math.round(Number(form.amount) * 100),
          plan: form.plan,
          payment_provider: form.payment_provider,
          payment_method: form.payment_method,
          is_recurring: form.is_recurring === "true",
          external_reference: form.external_reference || null,
          paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : new Date().toISOString(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({ title: "Venda registrada!", description: `Comissão será liberada em 30 dias.` });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      toast({ title: "Erro ao registrar venda", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DollarSign size={20} /> Lançar venda manual</DialogTitle>
          <DialogDescription>Use para vendas Asaas/PIX ou contratos custom. A comissão será gerada automaticamente.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          <div className="md:col-span-2 space-y-2">
            <Label>Parceiro *</Label>
            <Select value={form.partner_id} onValueChange={(v) => setForm({ ...form, partner_id: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o parceiro" /></SelectTrigger>
              <SelectContent>
                {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} — {p.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Email do cliente *</Label>
            <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} placeholder="cliente@empresa.com" />
            <p className="text-xs text-muted-foreground">Precisa existir um perfil com esse email.</p>
          </div>

          <div className="space-y-2">
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="296,00" />
          </div>

          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="start">Start</SelectItem>
                <SelectItem value="growth">Growth</SelectItem>
                <SelectItem value="scale">Scale</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={form.payment_provider} onValueChange={(v) => setForm({ ...form, payment_provider: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asaas">Asaas</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="manual">Manual / Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Método</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="card">Cartão</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Recorrente?</Label>
            <Select value={form.is_recurring} onValueChange={(v) => setForm({ ...form, is_recurring: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim (mensal)</SelectItem>
                <SelectItem value="false">Não (avulsa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pago em</Label>
            <Input type="date" value={form.paid_at} onChange={(e) => setForm({ ...form, paid_at: e.target.value })} />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label>Referência externa (opcional)</Label>
            <Input value={form.external_reference} onChange={(e) => setForm({ ...form, external_reference: e.target.value })} placeholder="ID Asaas, número do contrato, etc" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" />Registrando...</> : "Registrar venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
