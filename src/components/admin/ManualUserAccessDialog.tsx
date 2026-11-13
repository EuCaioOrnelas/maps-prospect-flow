import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PLAN_DEFAULTS, PAYMENT_METHODS } from "./customSubscription/customSubConfig";

type Profile = { id: string; name: string | null; phone?: string | null; plan: string | null; payment_provider?: string | null; subscription_current_period_end?: string | null; trial_end_at?: string | null; terms_accepted_at?: string | null };
type Action = "edit" | "trial" | "activate" | "renew" | "expiry";

export function ManualUserAccessDialog({ profile, onSaved }: { profile: Profile; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<Action>("trial");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<"start" | "growth" | "scale">("growth");
  const [days, setDays] = useState("7");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pix");
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [requestId, setRequestId] = useState("");
  const paid = action === "activate" || action === "renew";
  const external = !!profile.payment_provider && !["manual", "free"].includes(profile.payment_provider);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false); setName(profile.name || ""); setPhone(profile.phone || "");
    setPlan(profile.plan === "start" || profile.plan === "scale" ? profile.plan : "growth");
    setAction(external ? "edit" : "trial"); setDays("7"); setDate(""); setAmount("");
    setConfirmed(false); setNotes(""); setRequestId(crypto.randomUUID());
    supabase.from("profiles").select("updated_at").eq("id", profile.id).single().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { toast.error("Não foi possível carregar o usuário. Feche e tente novamente."); return; }
      setVersion(data.updated_at); setReady(true);
    });
    return () => { cancelled = true; };
  }, [open, profile.id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase.rpc as any)("admin_manage_user_access", {
        _user_id: profile.id,
        _payload: { action, name, phone, plan, days: Number(days), end_date: date || null,
          amount_cents: Math.round(Number(amount.replace(",", ".")) * 100), payment_method: method,
          payment_confirmed: confirmed, notes, expected_updated_at: version, request_id: requestId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error("Não foi possível confirmar a alteração.");
      toast.success("Usuário atualizado. A alteração ficou registrada no histórico.");
      onSaved(); setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (error as { message?: string })?.message || "Não foi possível salvar. Tente novamente.");
    } finally { setBusy(false); }
  }

  return <Dialog open={open} onOpenChange={(value) => { if (!busy) setOpen(value); }}>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Pencil className="mr-2 h-4 w-4" />Editar usuário e acesso</Button>
    <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Editar usuário e acesso</DialogTitle><DialogDescription>{profile.name || "Usuário"} · {profile.plan || "free"}</DialogDescription></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2"><Label htmlFor="access-action">O que deseja fazer?</Label><Select value={action} onValueChange={(v) => { setAction(v as Action); setConfirmed(false); setRequestId(crypto.randomUUID()); }}><SelectTrigger id="access-action"><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="edit">Editar dados cadastrais</SelectItem>
          <SelectItem value="trial" disabled={external}>Dar mais dias de teste / cortesia</SelectItem>
          <SelectItem value="activate" disabled={external}>Ativar plano com pagamento manual</SelectItem>
          <SelectItem value="renew" disabled={external}>Renovar plano manual</SelectItem>
          <SelectItem value="expiry" disabled={external}>Alterar data de expiração</SelectItem>
        </SelectContent></Select></div>
        {external && <p className="text-sm text-muted-foreground">Esta conta possui cobrança externa. Gerencie a assinatura atual antes de trocar para pagamento manual; editar os dados não altera cobranças.</p>}
        {profile.terms_accepted_at === null && <p className="text-sm text-muted-foreground">O usuário ainda precisa aceitar os termos para acessar a plataforma. Esta alteração não aceita os termos por ele.</p>}
        {action === "edit" ? <>
          <div className="space-y-2"><Label htmlFor="access-name">Nome</Label><Input id="access-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} /></div>
          <div className="space-y-2"><Label htmlFor="access-phone">Telefone</Label><Input id="access-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></div>
        </> : <>
          {action !== "expiry" && <div className="space-y-2"><Label htmlFor="access-plan">Plano</Label><Select value={plan} onValueChange={(v) => { const next = v as typeof plan; setPlan(next); setAmount((PLAN_DEFAULTS[next].monthly_value_cents / 100).toFixed(2)); }}><SelectTrigger id="access-plan"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="start">Atendimento</SelectItem><SelectItem value="growth">Growth IA</SelectItem><SelectItem value="scale">Enterprise</SelectItem></SelectContent></Select></div>}
          {action !== "expiry" && <div className="space-y-2"><Label htmlFor="access-days">Dias adicionais {action === "renew" || action === "trial" ? "(a partir do vencimento atual, se ainda válido)" : "(a partir de hoje)"}</Label><Input id="access-days" type="number" min={1} max={3660} step={1} value={days} onChange={(e) => setDays(e.target.value)} required={!date} /></div>}
          <div className="space-y-2"><Label htmlFor="access-date">{action === "expiry" ? "Nova data de expiração" : "Ou defina uma data de expiração"}</Label><Input id="access-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required={action === "expiry"} /><p className="text-xs text-muted-foreground">Acesso até 23:59 do dia escolhido, no horário de Brasília.</p></div>
          {paid && <>
            <div className="space-y-2"><Label htmlFor="access-amount">Valor recebido (R$)</Label><Input id="access-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="129,00" /></div>
            <div className="space-y-2"><Label htmlFor="access-method">Forma de pagamento</Label><Select value={method} onValueChange={setMethod}><SelectTrigger id="access-method"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.filter((m) => m.value !== "free").map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="flex items-start gap-2"><Checkbox id="access-confirmed" checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} /><Label htmlFor="access-confirmed">Confirmo que o pagamento já foi recebido e compensado.</Label></div>
          </>}
        </>}
        <div className="space-y-2"><Label htmlFor="access-notes">Motivo / observação</Label><Input id="access-notes" value={notes} onChange={(e) => setNotes(e.target.value)} required minLength={3} maxLength={1000} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={busy || !ready || (paid && !confirmed)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar alteração</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}