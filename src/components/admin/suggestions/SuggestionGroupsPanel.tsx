import { useCallback, useEffect, useState } from "react";
import {
  BrainCircuit, Loader2, RefreshCw, Eye, CheckCircle2, Unlink2,
  ArrowUpDown, Lock, AlertTriangle, Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  SUGGESTION_ALL_CATEGORIES,
  SUGGESTION_STATUS_LABEL,
  formatSuggestionDateShort,
  type SuggestionGroupRow,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/lib/suggestions";

type GroupSort = "solicitadas" | "votadas" | "crescimento" | "prioridade";

const GROUP_STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  revisao: "Revisão necessária",
  arquivado: "Arquivado",
};

const GROUP_STATUS_CLASS: Record<string, string> = {
  pendente: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  aprovado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  revisao: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  arquivado: "bg-muted text-muted-foreground border-border",
};

export default function SuggestionGroupsPanel() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<SuggestionGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<GroupSort>("solicitadas");
  const [selected, setSelected] = useState<SuggestionGroupRow | null>(null);
  const [members, setMembers] = useState<SuggestionRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProblem, setNewProblem] = useState("");
  const [newCategory, setNewCategory] = useState("Outros");
  const [saving, setSaving] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    const orderCol =
      sort === "votadas" ? "votes_total" :
      sort === "prioridade" ? "priority_score" :
      sort === "crescimento" ? "last_occurrence" : "users_count";
    const { data, error } = await supabase
      .from("suggestion_groups")
      .select("*")
      .neq("status", "arquivado")
      .order(orderCol, { ascending: false, nullsFirst: false });
    if (error) {
      toast({ title: "Erro ao carregar grupos", description: error.message, variant: "destructive" });
    } else {
      setGroups((data || []) as unknown as SuggestionGroupRow[]);
    }
    setLoading(false);
  }, [sort, toast]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const openGroup = async (g: SuggestionGroupRow) => {
    setSelected(g);
    setMembersLoading(true);
    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .eq("ai_group_id", g.id)
      .order("created_at", { ascending: false });
    setMembers((data || []) as unknown as SuggestionRow[]);
    setMembersLoading(false);
  };

  const audit = async (action: string, entityId: string, details: Record<string, unknown> = {}) => {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("suggestion_audit_log").insert({
      actor_id: userData.user?.id ?? null,
      action,
      entity: "suggestion_group",
      entity_id: entityId,
      details,
    } as any);
  };

  const updateGroup = async (id: string, patch: Record<string, unknown>, action: string) => {
    const { error } = await supabase.from("suggestion_groups").update(patch as any).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await audit(action, id, patch);
    toast({ title: "Grupo atualizado" });
    fetchGroups();
    if (selected?.id === id) setSelected({ ...selected, ...patch } as SuggestionGroupRow);
  };

  const removeMember = async (suggestionId: string) => {
    if (!selected) return;
    const { error } = await supabase
      .from("suggestions")
      .update({ ai_group_id: null, ai_status: "revisao" } as any)
      .eq("id", suggestionId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await audit("desassociar_sugestao", selected.id, { suggestion_id: suggestionId });
    setMembers((prev) => prev.filter((m) => m.id !== suggestionId));
    toast({ title: "Sugestão desassociada", description: "Ela foi marcada para nova revisão da IA." });
  };

  const runAnalysis = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggestions-analyst", {
        body: { action: "process_pending", limit: 10 },
      });
      if (error) throw error;
      toast({
        title: "Análise executada",
        description: `${data?.processed ?? 0} sugestão(ões) processada(s) pela IA.`,
      });
      fetchGroups();
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const createManualGroup = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("suggestion_groups").insert({
      name: newName.trim(),
      problem: newProblem.trim() || null,
      category: newCategory,
      status: "aprovado",
      admin_locked: true,
      created_by: userData.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar grupo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Grupo criado", description: "Grupos manuais são protegidos contra sobrescrita da IA." });
    setCreateOpen(false);
    setNewName("");
    setNewProblem("");
    fetchGroups();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Funcionalidades mais solicitadas pela comunidade</h2>
            <p className="text-xs text-muted-foreground">Grupos de necessidades identificados pela IA. A decisão final é sempre humana.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as GroupSort)}>
            <SelectTrigger className="w-44">
              <ArrowUpDown size={13} className="mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solicitadas">Mais solicitadas</SelectItem>
              <SelectItem value="votadas">Mais votadas</SelectItem>
              <SelectItem value="crescimento">Maior crescimento</SelectItem>
              <SelectItem value="prioridade">Maior prioridade</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" /> Novo grupo
          </Button>
          <Button size="sm" disabled={processing} onClick={runAnalysis}>
            {processing ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <RefreshCw size={14} className="mr-1.5" />}
            Analisar pendentes
          </Button>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 px-6 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <BrainCircuit size={24} className="text-muted-foreground/40" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="font-medium text-foreground">Nenhum grupo identificado ainda.</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Analisar pendentes" para a IA processar as sugestões recebidas e identificar necessidades recorrentes.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto animate-fade-in">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionalidade</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Sugestões</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="text-center">Empresas</TableHead>
                    <TableHead className="text-center">Votos</TableHead>
                    <TableHead className="text-center">Prioridade IA</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="max-w-[260px]">
                        <div className="flex items-center gap-1.5">
                          {g.admin_locked && <Lock size={12} className="text-muted-foreground shrink-0" />}
                          <span className="font-medium text-sm truncate">{g.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{g.category || "—"}</TableCell>
                      <TableCell className="text-center text-sm">{g.suggestions_count}</TableCell>
                      <TableCell className="text-center text-sm">{g.users_count}</TableCell>
                      <TableCell className="text-center text-sm">{g.companies_count}</TableCell>
                      <TableCell className="text-center text-sm">{g.votes_total}</TableCell>
                      <TableCell className="text-center">
                        {g.priority_score !== null ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                            {g.priority_score}/100
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm capitalize">{g.confidence || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={GROUP_STATUS_CLASS[g.status] || ""}>
                          {g.status === "revisao" && <AlertTriangle size={11} className="mr-1" />}
                          {GROUP_STATUS_LABEL[g.status] || g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openGroup(g)}>
                          <Eye size={15} className="mr-1.5" /> Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhe do grupo */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 flex items-center gap-2">
                  {selected.name}
                  {selected.admin_locked && <Lock size={14} className="text-muted-foreground" />}
                </DialogTitle>
                <DialogDescription>
                  {selected.category || "Sem categoria"} · criado em {formatSuggestionDateShort(selected.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Sugestões", value: selected.suggestions_count },
                    { label: "Usuários", value: selected.users_count },
                    { label: "Empresas", value: selected.companies_count },
                    { label: "Votos", value: selected.votes_total },
                  ].map((m) => (
                    <div key={m.label} className="rounded-lg border border-border/60 bg-muted/30 p-3 text-center">
                      <p className="text-xl font-semibold text-foreground">{m.value}</p>
                      <p className="text-[11px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>

                {selected.priority_score !== null && (
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      Prioridade {selected.priority_score}/100
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selected.priority_reason || "Sem justificativa registrada."}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      Recomendação da IA — a decisão final é da equipe.
                    </p>
                  </div>
                )}

                {selected.problem && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Problema que os usuários tentam resolver</p>
                    <p className="text-sm text-foreground leading-relaxed">{selected.problem}</p>
                  </div>
                )}
                {selected.solution && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Solução proposta</p>
                    <p className="text-sm text-foreground leading-relaxed">{selected.solution}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Sugestões originais vinculadas</p>
                  {membersLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma sugestão vinculada.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="rounded-lg border border-border/60 p-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {m.company_name || m.user_name || "—"} · {formatSuggestionDateShort(m.created_at)} ·{" "}
                              {SUGGESTION_STATUS_LABEL[m.status as SuggestionStatus] || m.status}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground shrink-0"
                            onClick={() => removeMember(m.id)}
                          >
                            <Unlink2 size={13} className="mr-1" /> Desassociar
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {selected.status !== "aprovado" && (
                    <Button
                      variant="outline"
                      className="flex-1 border-primary/40 text-primary hover:bg-primary/10"
                      onClick={() => updateGroup(selected.id, { status: "aprovado", admin_locked: true }, "aprovar_agrupamento")}
                    >
                      <CheckCircle2 size={15} className="mr-2" /> Aprovar agrupamento
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateGroup(selected.id, { status: "arquivado" }, "arquivar_agrupamento")}
                  >
                    Arquivar grupo
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Criar grupo manual */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar grupo manualmente</DialogTitle>
            <DialogDescription>
              Grupos manuais são protegidos: a IA não sobrescreve correções do administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nome da funcionalidade</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Alertas de oportunidades paradas" />
            </div>
            <div className="space-y-1.5">
              <Label>Problema</Label>
              <Textarea value={newProblem} onChange={(e) => setNewProblem(e.target.value)} rows={3} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUGGESTION_ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" disabled={saving || !newName.trim()} onClick={createManualGroup}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
              Criar grupo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
