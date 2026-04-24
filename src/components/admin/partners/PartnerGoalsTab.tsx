import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Target, Trophy, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fmtBRL, fmtDate, goalStatusColors, goalStatusLabel, goalTypeLabel, formatGoalValue,
} from "@/lib/partnerFormat";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number;
  achieved_value: number;
  prize_amount_cents: number;
  status: string;
  prize_status: string;
  starts_at: string;
  deadline_at: string;
  completed_at: string | null;
}

export function PartnerGoalsTab({ partnerId }: { partnerId: string }) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", goal_type: "revenue",
    target_value: "", prize_amount: "", deadline_at: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_goals")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    setGoals((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (partnerId) load(); /* eslint-disable-next-line */ }, [partnerId]);

  const create = async () => {
    if (!form.title.trim() || !form.target_value || !form.deadline_at) {
      toast({ title: "Campos obrigatórios", description: "Título, meta e prazo.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("admin-manage-partner-goal", {
      body: {
        action: "create",
        partner_id: partnerId,
        title: form.title.trim(),
        description: form.description || null,
        goal_type: form.goal_type,
        target_value: Number(form.target_value),
        prize_amount_cents: Math.round(Number(form.prize_amount || 0) * 100),
        deadline_at: new Date(form.deadline_at).toISOString(),
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Meta criada" });
    setOpen(false);
    setForm({ title: "", description: "", goal_type: "revenue", target_value: "", prize_amount: "", deadline_at: "" });
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

  const recompute = async () => {
    setRecomputing(true);
    const { error } = await supabase.functions.invoke("admin-manage-partner-goal", {
      body: { action: "recompute", partner_id: partnerId },
    });
    setRecomputing(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Progresso recalculado" });
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {loading ? "Carregando..." : `${goals.length} meta(s) cadastrada(s)`}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={recompute} disabled={recomputing} className="gap-2">
            {recomputing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Recalcular
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus size={14} /> Nova meta</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Trophy size={18} className="text-primary" /> Nova meta</DialogTitle>
                <DialogDescription>O parceiro verá a meta no portal e poderá resgatar o prêmio quando atingir.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <Row label="Título *">
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Bater R$ 10k em 30 dias" />
                </Row>
                <Row label="Descrição">
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes ou regras..." />
                </Row>
                <div className="grid grid-cols-2 gap-3">
                  <Row label="Tipo *">
                    <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Receita gerada (R$)</SelectItem>
                        <SelectItem value="mrr">MRR atribuído (R$)</SelectItem>
                        <SelectItem value="paid_clients">Clientes pagos</SelectItem>
                        <SelectItem value="leads">Leads indicados</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>
                  <Row label={form.goal_type === "revenue" || form.goal_type === "mrr" ? "Meta (R$) *" : "Meta (qtd) *"}>
                    <Input type="number" min="0" step="0.01" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} />
                  </Row>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Row label="Prêmio (R$) *">
                    <Input type="number" min="0" step="10" value={form.prize_amount} onChange={(e) => setForm({ ...form, prize_amount: e.target.value })} placeholder="500" />
                  </Row>
                  <Row label="Prazo final *">
                    <Input type="date" value={form.deadline_at} onChange={(e) => setForm({ ...form, deadline_at: e.target.value })} />
                  </Row>
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
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : goals.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Target className="text-muted-foreground/50" />
              Nenhuma meta criada para este parceiro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                  {goals.map((g) => (
                    <TableRow key={g.id}>
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
                      <TableCell>
                        <Badge variant="outline" className={goalStatusColors[g.status]}>{goalStatusLabel[g.status]}</Badge>
                      </TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
