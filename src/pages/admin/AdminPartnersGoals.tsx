import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Target, Trophy, CheckCircle2, XCircle, Search, Link2, RefreshCw, TrendingUp, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fmtBRL, fmtDate, goalStatusColors, goalStatusLabel, goalTypeLabel, formatGoalValue } from "@/lib/partnerFormat";
import { PartnerCombobox } from "@/components/admin/partners/PartnerCombobox";

interface Partner { id: string; full_name: string; email: string; }
interface ReferralLink { id: string; partner_id: string; slug: string; label: string; }
interface Goal {
  id: string; partner_id: string; title: string; description: string | null;
  goal_type: string; target_value: number; achieved_value: number; prize_amount_cents: number;
  status: string; prize_status: string; deadline_at: string; completed_at: string | null;
  referral_link_id: string | null;
  partners?: { full_name: string; email: string };
  partner_referral_links?: { slug: string; label: string } | null;
}

export default function AdminPartnersGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [allLinks, setAllLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [recomputing, setRecomputing] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    partner_id: "", title: "", description: "",
    goal_type: "revenue", target_value: "", prize_amount: "",
    deadline_at: "", referral_link_id: "all",
  });

  const load = async () => {
    setLoading(true);
    const [g, p, l] = await Promise.all([
      supabase.from("partner_goals")
        .select("*, partners:partner_id(full_name, email), partner_referral_links:referral_link_id(slug, label)")
        .order("created_at", { ascending: false }),
      supabase.from("partners").select("id, full_name, email").eq("status", "active").order("full_name"),
      supabase.from("partner_referral_links").select("id, partner_id, slug, label").eq("is_active", true).order("created_at", { ascending: false }),
    ]);
    setGoals((g.data as any) || []);
    setPartners((p.data as any) || []);
    setAllLinks((l.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const partnerLinks = useMemo(() => allLinks.filter((l) => l.partner_id === form.partner_id), [allLinks, form.partner_id]);

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
        referral_link_id: form.referral_link_id !== "all" ? form.referral_link_id : null,
      },
    });
    setSubmitting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Erro", description: (data as any)?.error || error?.message, variant: "destructive" }); return;
    }
    toast({ title: "Meta criada", description: "Recalcule o progresso para já refletir as vendas." });
    setOpen(false);
    setForm({ partner_id: "", title: "", description: "", goal_type: "revenue", target_value: "", prize_amount: "", deadline_at: "", referral_link_id: "all" });
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

  const recomputeAll = async () => {
    setRecomputing(true);
    const partnerIds = Array.from(new Set(goals.filter((g) => g.status === "active").map((g) => g.partner_id)));
    for (const pid of partnerIds) {
      await supabase.functions.invoke("admin-manage-partner-goal", { body: { action: "recompute", partner_id: pid } });
    }
    setRecomputing(false);
    toast({ title: "Progresso recalculado", description: `${partnerIds.length} parceiro(s) processado(s).` });
    load();
  };

  const filtered = useMemo(() => {
    let list = goals;
    if (statusFilter !== "all") list = list.filter((g) => g.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((g) => g.goal_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((g) =>
        g.title.toLowerCase().includes(q) ||
        g.partners?.full_name?.toLowerCase().includes(q) ||
        g.partners?.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [goals, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter((g) => g.status === "completed").length;
    const active = goals.filter((g) => g.status === "active").length;
    const expired = goals.filter((g) => g.status === "expired").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgProgress = active > 0
      ? Math.round(
          goals
            .filter((g) => g.status === "active")
            .reduce((s, g) => s + Math.min(100, (Number(g.achieved_value) / Number(g.target_value)) * 100), 0) / active
        )
      : 0;
    const prizesPaid = goals
      .filter((g) => g.prize_status === "paid")
      .reduce((s, g) => s + g.prize_amount_cents, 0);
    const prizesPending = goals
      .filter((g) => g.status === "completed" && g.prize_status !== "paid")
      .reduce((s, g) => s + g.prize_amount_cents, 0);
    return { total, completed, active, expired, completionRate, avgProgress, prizesPaid, prizesPending };
  }, [goals]);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-primary">
            <Target size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Metas dos parceiros</h1>
            <p className="text-sm text-muted-foreground">Crie metas com prêmios em dinheiro. O prêmio é um bônus pago à parte (não desconta da comissão/MRR).</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={recomputeAll} disabled={recomputing} className="gap-2">
            {recomputing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Recalcular progresso
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2"><Plus size={16} /> Nova meta</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={<Target size={16} />} label="Total de metas" value={String(stats.total)} sub={`${stats.active} ativas`} />
        <Kpi icon={<Trophy size={16} />} label="Concluídas" value={`${stats.completed}`} sub={`${stats.completionRate}% de conclusão`} accent="emerald" />
        <Kpi icon={<TrendingUp size={16} />} label="Progresso médio" value={`${stats.avgProgress}%`} sub={`${stats.active} metas ativas`} accent="blue" />
        <Kpi icon={<Award size={16} />} label="Prêmios pagos" value={fmtBRL(stats.prizesPaid)} sub={`${fmtBRL(stats.prizesPending)} a liberar`} accent="violet" />
      </div>

      <Card className="border-border/60">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar meta, parceiro ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Em andamento</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="expired">Expiradas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="revenue">Receita</SelectItem>
                <SelectItem value="mrr">MRR</SelectItem>
                <SelectItem value="paid_clients">Clientes pagos</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
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
                  <TableHead className="min-w-[200px]">Progresso</TableHead>
                  <TableHead>Prêmio (bônus)</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resgate</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Nenhuma meta encontrada.</TableCell></TableRow>
                ) : filtered.map((g) => {
                  const pct = Math.min(100, Math.round((Number(g.achieved_value) / Number(g.target_value)) * 100));
                  return (
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
                      <TableCell>
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatGoalValue(g.goal_type, Number(g.achieved_value))} / {formatGoalValue(g.goal_type, Number(g.target_value))} · {pct}%
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{fmtBRL(g.prize_amount_cents)}</TableCell>
                      <TableCell className="text-xs">
                        {g.partner_referral_links ? (
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 font-mono">
                            <Link2 size={10} />/r/{g.partner_referral_links.slug}
                          </Badge>
                        ) : <span className="text-muted-foreground">Geral</span>}
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(g.deadline_at)}</TableCell>
                      <TableCell><Badge variant="outline" className={goalStatusColors[g.status]}>{goalStatusLabel[g.status]}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {g.prize_status === "not_claimed" && g.status === "completed" && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Disponível</Badge>}
                        {g.prize_status === "requested" && <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">Solicitado</Badge>}
                        {g.prize_status === "paid" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Pago</Badge>}
                        {g.prize_status === "not_claimed" && g.status !== "completed" && <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {g.status === "active" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setStatus(g.id, "completed")} title="Marcar como concluída">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setStatus(g.id, "cancelled")} title="Cancelar">
                              <XCircle size={14} className="text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy size={18} className="text-primary" /> Nova meta</DialogTitle>
            <DialogDescription>
              O prêmio é pago como saque normal pelo parceiro após a conclusão. <strong>Não desconta da comissão nem do MRR</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <FormRow label="Parceiro *">
              <PartnerCombobox
                partners={partners}
                value={form.partner_id}
                onChange={(id) => setForm({ ...form, partner_id: id, referral_link_id: "all" })}
              />
            </FormRow>
            <FormRow label="Título *">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Bater R$ 10k em 30 dias" />
            </FormRow>
            <FormRow label="Descrição">
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes ou regras..." />
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Tipo de meta *">
                <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v, referral_link_id: v === "mrr" ? "all" : form.referral_link_id })}>
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
            <FormRow label="Vínculo a link de campanha (opcional)">
              <Select
                value={form.referral_link_id}
                onValueChange={(v) => setForm({ ...form, referral_link_id: v })}
                disabled={!form.partner_id || form.goal_type === "mrr"}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.partner_id ? "Selecione..." : "Escolha um parceiro primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toda a operação do parceiro</SelectItem>
                  {partnerLinks.map((l) => (
                    <SelectItem key={l.id} value={l.id}>/r/{l.slug} · {l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.referral_link_id !== "all" && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  ✓ Apenas vendas/leads/clientes deste link específico contarão para esta meta.
                </p>
              )}
            </FormRow>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Prêmio em R$ (bônus extra) *">
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

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "emerald" | "blue" | "violet" }) {
  const tone = accent === "emerald"
    ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
    : accent === "blue"
    ? "bg-blue-500/10 text-blue-600 ring-blue-500/20"
    : accent === "violet"
    ? "bg-violet-500/10 text-violet-600 ring-violet-500/20"
    : "bg-primary/10 text-primary ring-primary/20";
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl ring-1 flex items-center justify-center ${tone}`}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-lg font-bold tracking-tight truncate">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
