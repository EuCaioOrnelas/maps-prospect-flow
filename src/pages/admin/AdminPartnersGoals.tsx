import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Target, Trophy, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDate, goalStatusColors, goalStatusLabel, goalTypeLabel, formatGoalValue } from "@/lib/partnerFormat";

interface Partner { id: string; full_name: string; email: string; }
interface Goal {
  id: string; partner_id: string; title: string; description: string | null;
  goal_type: string; target_value: number; achieved_value: number; prize_amount_cents: number;
  status: string; prize_status: string; deadline_at: string; completed_at: string | null;
  partners?: { full_name: string; email: string };
}

export default function AdminPartnersGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const [form, setForm] = useState({
    partner_id: "", title: "", description: "",
    goal_type: "revenue", target_value: "", prize_amount: "",
    deadline_at: "",
  });

  const load = async () => {
    setLoading(true);
    const [g, p] = await Promise.all([
      supabase.from("partner_goals").select("*, partners:partner_id(full_name, email)").order("created_at", { ascending: false }),
      supabase.from("partners").select("id, full_name, email").eq("status", "active").order("full_name"),
    ]);
    setGoals((g.data as any) || []);
    setPartners((p.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.partner_id || !form.title || !form.target_value || !form.deadline_at) {
      toast({ title: "Campos obrigatórios", description: "Parceiro, título, meta e prazo.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-partner-goal", {
      body: {
        action: "create",
        partner_id: form.partner_id,
        title: form.title,
        description: form.description || null,
        goal_type: form.goal_type,
        target_value: Number(form.target_value),
        prize_amount_cents: Math.round(Number(form.prize_amount || 0) * 100),
        deadline_at: new Date(form.deadline_at).toISOString(),
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Meta criada" });
    setOpen(false);
    setForm({ partner_id: "", title: "", description: "", goal_type: "revenue", target_value: "", prize_amount: "", deadline_at: "" });
    load();
  };

  const setStatus = async (goalId: string, status: "completed" | "cancelled") => {
    const { error } = await supabase.functions.invoke("admin-manage-partner-goal", {
      body: { action: "update_status", goal_id: goalId, status },
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "completed" ? "Meta marcada como concluída" : "Meta cancelada" });
    load();
  };

  const filtered = goals.filter((g) => statusFilter === "all" || g.status === statusFilter);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Target size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metas dos parceiros</h1>
            <p className="text-sm text-muted-foreground">Crie metas com prêmios em dinheiro. Não exclua — marque como concluída ou cancelada.</p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Nova meta</Button>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Em andamento</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto text-xs text-muted-foreground">{filtered.length} de {goals.length}</div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resgate</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-10 text-muted-foreground">Nenhuma meta cadastrada.</TableCell></TableRow>
                ) : filtered.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div className="font-medium text-sm">{g.partners?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{g.partners?.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{g.title}</div>
                      {g.description && <div className="text-xs text-muted-foreground line-clamp-1">{g.description}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{goalTypeLabel[g.goal_type] || g.goal_type}</TableCell>
                    <TableCell className="text-sm">
                      {formatGoalValue(g.goal_type, Number(g.achieved_value))} / {formatGoalValue(g.goal_type, Number(g.target_value))}
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{fmtBRL(g.prize_amount_cents)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(g.deadline_at)}</TableCell>
                    <TableCell><Badge variant="outline" className={goalStatusColors[g.status]}>{goalStatusLabel[g.status]}</Badge></TableCell>
                    <TableCell className="text-xs">
                      {g.prize_status === "not_claimed" && g.status === "completed" && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Disponível</Badge>}
                      {g.prize_status === "requested" && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Solicitado</Badge>}
                      {g.prize_status === "paid" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Pago</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      {g.status === "active" && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setStatus(g.id, "completed")} title="Marcar concluída">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setStatus(g.id, "cancelled")} title="Cancelar">
                            <XCircle size={14} className="text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy size={18} className="text-primary" /> Nova meta</DialogTitle>
            <DialogDescription>Quando o parceiro atingir a meta, ele poderá resgatar o prêmio (vira saque normal).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormRow label="Parceiro *">
              <Select value={form.partner_id} onValueChange={(v) => setForm({ ...form, partner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} · {p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormRow>
            <FormRow label="Título *">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Bater R$ 10k em 30 dias" />
            </FormRow>
            <FormRow label="Descrição">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes ou regras..." />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Tipo de meta *">
                <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Receita gerada (R$)</SelectItem>
                    <SelectItem value="mrr">MRR atribuído (R$)</SelectItem>
                    <SelectItem value="paid_clients">Clientes pagos</SelectItem>
                    <SelectItem value="leads">Leads indicados</SelectItem>
                  </SelectContent>
                </Select>
              </FormRow>
              <FormRow label={form.goal_type === "revenue" || form.goal_type === "mrr" ? "Meta (R$) *" : "Meta (qtd) *"}>
                <Input type="number" min="0" step="0.01" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
              </FormRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Prêmio (R$) *">
                <Input type="number" min="0" step="10" value={form.prize_amount} onChange={(e) => setForm({ ...form, prize_amount: e.target.value })} placeholder="500" />
              </FormRow>
              <FormRow label="Prazo final *">
                <Input type="date" value={form.deadline_at} onChange={(e) => setForm({ ...form, deadline_at: e.target.value })} />
              </FormRow>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={create} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin mr-2" size={16} />Criando...</> : "Criar meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
