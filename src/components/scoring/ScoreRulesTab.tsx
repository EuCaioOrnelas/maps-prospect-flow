import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Search } from "lucide-react";

interface ScoreRule {
  id: string;
  event_name: string;
  category: string;
  points: number;
  is_negative: boolean;
  is_active: boolean;
  apply_decay: boolean;
  max_applications_per_period: number | null;
  period_type: string | null;
  description: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  activation: { label: "Ativação", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  engagement: { label: "Engajamento", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  value: { label: "Valor", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  purchase_intent: { label: "Intenção Compra", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  churn_risk: { label: "Risco Churn", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

export const ScoreRulesTab = () => {
  const [rules, setRules] = useState<ScoreRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState("");

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("score_rules")
      .select("*")
      .order("category", { ascending: true });
    
    if (!error && data) setRules(data as ScoreRule[]);
    setLoading(false);
  };

  const toggleRule = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("score_rules")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar regra");
    } else {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, is_active: isActive } : r)));
      toast.success(isActive ? "Regra ativada" : "Regra desativada");
    }
  };

  const updatePoints = async (id: string) => {
    const pts = parseInt(editPoints);
    if (isNaN(pts)) return;

    const { error } = await supabase
      .from("score_rules")
      .update({ points: pts })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar pontos");
    } else {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, points: pts } : r)));
      setEditingId(null);
      toast.success("Pontos atualizados");
    }
  };

  const filtered = rules.filter(
    (r) =>
      r.event_name.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, ScoreRule[]>);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar regra..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        Object.entries(grouped).map(([category, categoryRules]) => {
          const catConfig = CATEGORY_LABELS[category] || { label: category, color: "" };
          return (
            <Card key={category} className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <Badge variant="outline" className={catConfig.color}>{catConfig.label}</Badge>
                  <span className="text-muted-foreground text-xs">({categoryRules.length} regras)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{rule.event_name}</p>
                          {rule.is_negative && <Badge variant="destructive" className="text-[10px] px-1">NEG</Badge>}
                          {rule.apply_decay && <Badge variant="secondary" className="text-[10px] px-1">DECAY</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{rule.description || "Sem descrição"}</p>
                        {rule.max_applications_per_period && (
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            Máx: {rule.max_applications_per_period}x por {rule.period_type}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Points */}
                        {editingId === rule.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-16 h-8 text-center text-sm"
                              value={editPoints}
                              onChange={(e) => setEditPoints(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && updatePoints(rule.id)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingId(rule.id); setEditPoints(String(rule.points)); }}
                            className={`text-lg font-bold min-w-[40px] text-center cursor-pointer hover:opacity-70 ${
                              rule.is_negative ? "text-destructive" : "text-primary"
                            }`}
                          >
                            {rule.is_negative ? `-${rule.points}` : `+${rule.points}`}
                          </button>
                        )}

                        {/* Toggle */}
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleRule(rule.id, checked)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
