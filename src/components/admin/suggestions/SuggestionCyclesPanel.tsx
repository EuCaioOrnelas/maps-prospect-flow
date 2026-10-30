import { useCallback, useEffect, useState } from "react";
import {
  CalendarClock, Plus, Loader2, Trash2, Megaphone, PackageCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CYCLE_STATUS_LABEL,
  CYCLE_ITEM_STATUSES,
  formatSuggestionDateShort,
  type SuggestionCycleRow,
  type SuggestionCycleItemRow,
  type SuggestionGroupRow,
} from "@/lib/suggestions";

export default function SuggestionCyclesPanel() {
  const { toast } = useToast();
  const [cycles, setCycles] = useState<SuggestionCycleRow[]>([]);
  const [items, setItems] = useState<SuggestionCycleItemRow[]>([]);
  const [groups, setGroups] = useState<SuggestionGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMonth, setNewMonth] = useState("");
  const [saving, setSaving] = useState(false);

  // Novo item
  const [addItemCycle, setAddItemCycle] = useState<string | null>(null);
  const [itemGroup, setItemGroup] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [itemJustification, setItemJustification] = useState("");
  const [itemResponsible, setItemResponsible] = useState("");
  const [itemDue, setItemDue] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, i, g] = await Promise.all([
      supabase.from("suggestion_cycles").select("*").order("created_at", { ascending: false }),
      supabase.from("suggestion_cycle_items").select("*").order("created_at", { ascending: false }),
      supabase.from("suggestion_groups").select("id, name, category, users_count, votes_total, priority_score").neq("status", "arquivado"),
    ]);
    setCycles((c.data || []) as unknown as SuggestionCycleRow[]);
    setItems((i.data || []) as unknown as SuggestionCycleItemRow[]);
    setGroups((g.data || []) as unknown as SuggestionGroupRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const audit = async (action: string, entity: string, entityId: string, details: Record<string, unknown> = {}) => {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("suggestion_audit_log").insert({
      actor_id: userData.user?.id ?? null,
      action,
      entity,
      entity_id: entityId,
      details,
    } as any);
  };

  const createCycle = async () => {
    if (!newTitle.trim() || !newMonth.trim()) return;
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("suggestion_cycles").insert({
      title: newTitle.trim(),
      month_label: newMonth.trim(),
      created_by: userData.user?.id ?? null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao criar ciclo", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Ciclo criado" });
    setCreateOpen(false);
    setNewTitle("");
    setNewMonth("");
    fetchAll();
  };

  const addItem = async () => {
    if (!addItemCycle || !itemTitle.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("suggestion_cycle_items").insert({
      cycle_id: addItemCycle,
      group_id: itemGroup && itemGroup !== "none" ? itemGroup : null,
      title: itemTitle.trim(),
      justification: itemJustification.trim() || null,
      responsible: itemResponsible.trim() || null,
      due_date: itemDue || null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
      return;
    }
    await audit("selecionar_funcionalidade", "suggestion_cycle_item", addItemCycle, { title: itemTitle });
    toast({ title: "Funcionalidade selecionada para o ciclo" });
    setAddItemCycle(null);
    setItemTitle("");
    setItemGroup("");
    setItemJustification("");
    setItemResponsible("");
    setItemDue("");
    fetchAll();
  };

  const updateItemStatus = async (item: SuggestionCycleItemRow, status: string) => {
    const { error } = await supabase
      .from("suggestion_cycle_items")
      .update({ status } as any)
      .eq("id", item.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await audit("alterar_status_planejamento", "suggestion_cycle_item", item.id, { status });
    fetchAll();
  };

  const removeItem = async (item: SuggestionCycleItemRow) => {
    const { error } = await supabase.from("suggestion_cycle_items").delete().eq("id", item.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await audit("remover_item_planejamento", "suggestion_cycle_item", item.id, { title: item.title });
    fetchAll();
  };

  // Publica a melhoria para os usuários (alimenta as seções públicas)
  const publishItem = async (item: SuggestionCycleItemRow) => {
    const group = groups.find((g) => g.id === item.group_id);
    const { data: existing } = await supabase
      .from("suggestion_releases")
      .select("id")
      .eq("cycle_item_id", item.id)
      .maybeSingle();
    if (existing) {
      toast({ title: "Já publicada", description: "Esta melhoria já tem uma publicação vinculada." });
      return;
    }
    const { error } = await supabase.from("suggestion_releases").insert({
      cycle_item_id: item.id,
      title: item.title,
      description: group?.description || item.justification || null,
      problem: group?.problem || null,
      benefit: group?.solution || null,
      category: group?.category || null,
      status: item.status === "implementada" ? "implementada" : "em_desenvolvimento",
      expected_date: item.due_date || null,
      released_at: item.status === "implementada" ? new Date().toISOString() : null,
      published: true,
    } as any);
    if (error) {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
      return;
    }
    await audit("publicar_funcionalidade", "suggestion_cycle_item", item.id, { title: item.title });
    toast({ title: "Melhoria publicada", description: "Ela aparece na página Wiize Evolui para todos os usuários." });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={18} className="text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">Planejamento mensal</h2>
            <p className="text-xs text-muted-foreground">Organize os ciclos de evolução e publique as melhorias selecionadas.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} className="mr-1.5" /> Novo ciclo
        </Button>
      </div>

      {cycles.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 px-6 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <CalendarClock size={24} className="text-muted-foreground/40" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="font-medium text-foreground">Nenhum ciclo criado.</p>
              <p className="text-sm text-muted-foreground">
                Crie o primeiro ciclo mensal para organizar as melhorias selecionadas.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        cycles.map((cycle) => {
          const cycleItems = items.filter((i) => i.cycle_id === cycle.id);
          return (
            <Card key={cycle.id} className="border-border/60">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cycle.title}</p>
                    <p className="text-xs text-muted-foreground">{cycle.month_label}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAddItemCycle(cycle.id)}>
                    <Plus size={13} className="mr-1.5" /> Selecionar funcionalidade
                  </Button>
                </div>

                {cycleItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma funcionalidade selecionada neste ciclo.</p>
                ) : (
                  <div className="space-y-2">
                    {cycleItems.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border/60 p-3 flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.responsible ? `Responsável: ${item.responsible} · ` : ""}
                            {item.due_date ? `Prazo: ${formatSuggestionDateShort(item.due_date)}` : "Sem prazo"}
                          </p>
                          {item.justification && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.justification}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Select value={item.status} onValueChange={(v) => updateItemStatus(item, v)}>
                            <SelectTrigger className="w-48 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CYCLE_ITEM_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{CYCLE_STATUS_LABEL[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => publishItem(item)}>
                            {item.status === "implementada" ? (
                              <PackageCheck size={13} className="mr-1.5" />
                            ) : (
                              <Megaphone size={13} className="mr-1.5" />
                            )}
                            Publicar
                          </Button>
                          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => removeItem(item)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Novo ciclo */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo ciclo mensal</DialogTitle>
            <DialogDescription>Ex.: "Ciclo de Novembro" com o mês de referência.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ciclo de evolução — Novembro" />
            </div>
            <div className="space-y-1.5">
              <Label>Mês de referência</Label>
              <Input value={newMonth} onChange={(e) => setNewMonth(e.target.value)} placeholder="Novembro/2026" />
            </div>
            <Button className="w-full" disabled={saving || !newTitle.trim() || !newMonth.trim()} onClick={createCycle}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
              Criar ciclo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selecionar funcionalidade */}
      <Dialog open={!!addItemCycle} onOpenChange={(o) => !o && setAddItemCycle(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar funcionalidade para o ciclo</DialogTitle>
            <DialogDescription>
              Vincule um grupo identificado pela IA ou registre um título livre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Grupo de sugestões (opcional)</Label>
              <Select value={itemGroup} onValueChange={setItemGroup}>
                <SelectTrigger><SelectValue placeholder="Nenhum — título livre" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum — título livre</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.users_count} usuários · {g.votes_total} votos)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Título da melhoria</Label>
              <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Ex.: Alertas de oportunidades paradas" />
            </div>
            <div className="space-y-1.5">
              <Label>Justificativa</Label>
              <Textarea value={itemJustification} onChange={(e) => setItemJustification(e.target.value)} rows={3} className="resize-none" placeholder="Por que esta melhoria entrou no ciclo?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Input value={itemResponsible} onChange={(e) => setItemResponsible(e.target.value)} placeholder="Equipe" />
              </div>
              <div className="space-y-1.5">
                <Label>Prazo estimado</Label>
                <Input type="date" value={itemDue} onChange={(e) => setItemDue(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" disabled={saving || !itemTitle.trim()} onClick={addItem}>
              {saving && <Loader2 size={14} className="mr-2 animate-spin" />}
              Adicionar ao ciclo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
