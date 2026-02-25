import { useState, useEffect } from "react";
import { Save, RefreshCw, Info, HelpCircle, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRevenueSettings } from "@/hooks/useRevenueData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

const FieldHelp = ({ children }: { children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle size={14} className="text-muted-foreground/50 cursor-help shrink-0" />
    </TooltipTrigger>
    <TooltipContent className="max-w-[280px]">
      <p className="text-xs leading-relaxed">{children}</p>
    </TooltipContent>
  </Tooltip>
);

const ruleLabels: Record<string, string> = {
  INBOUND_MESSAGE: "Mensagem recebida",
  INBOUND_STREAK_3: "Sequência de 3 msgs",
  INBOUND_AFTER_24H_SILENCE: "Voltou após 24h",
  INBOUND_AFTER_7D_SILENCE: "Voltou após 7 dias",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "Resposta em < 1h",
  INTENT_PRICE: "Perguntou preço",
  INTENT_BUY_NOW: "Intenção de compra",
  INTENT_AVAILABILITY: "Disponibilidade",
  INTENT_PAYMENT: "Pagamento",
  INTENT_PROPOSAL: "Proposta",
  INTENT_URGENT: "Urgência",
  INTENT_OBJECTION: "Objeção",
  INTENT_NEGATIVE: "Desinteresse",
  LINK_CLICK: "Clique em link",
  FORM_SUBMIT: "Formulário enviado",
  CALL_REQUEST: "Pediu ligação",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "SLA < 5min",
  SLA_FIRST_RESPONSE_5_TO_30MIN: "SLA 5-30min",
  SLA_FIRST_RESPONSE_OVER_30MIN: "SLA > 30min",
  UNREPLIED_INBOUND_OVER_2H: "Sem resposta 2h+",
  UNREPLIED_INBOUND_OVER_24H: "Sem resposta 24h+",
  CONVERSATION_ACTIVE_3D: "Conversa ativa 3d",
  CONVERSATION_ACTIVE_5D: "Conversa ativa 5d",
  BACK_AND_FORTH_5_TURNS: "5 trocas de mensagem",
};

const ruleCategories: Record<string, string> = {
  INBOUND_MESSAGE: "engagement", INBOUND_STREAK_3: "engagement", INBOUND_AFTER_24H_SILENCE: "engagement",
  INBOUND_AFTER_7D_SILENCE: "engagement", OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "sla",
  INTENT_PRICE: "intent", INTENT_BUY_NOW: "intent", INTENT_AVAILABILITY: "intent",
  INTENT_PAYMENT: "intent", INTENT_PROPOSAL: "intent", INTENT_URGENT: "intent",
  INTENT_OBJECTION: "penalty", INTENT_NEGATIVE: "penalty",
  LINK_CLICK: "engagement", FORM_SUBMIT: "engagement", CALL_REQUEST: "engagement",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "sla", SLA_FIRST_RESPONSE_5_TO_30MIN: "sla", SLA_FIRST_RESPONSE_OVER_30MIN: "penalty",
  UNREPLIED_INBOUND_OVER_2H: "penalty", UNREPLIED_INBOUND_OVER_24H: "penalty",
  CONVERSATION_ACTIVE_3D: "engagement", CONVERSATION_ACTIVE_5D: "engagement", BACK_AND_FORTH_5_TURNS: "engagement",
};

const categoryLabels: Record<string, string> = {
  engagement: "Engajamento", intent: "Intenção", sla: "SLA", penalty: "Penalidade",
};

interface ScoreRule {
  id: string;
  rule_key: string;
  points: number;
  is_enabled: boolean;
  cooldown_minutes: number | null;
  max_per_day: number | null;
}

const RevenueSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useRevenueSettings();
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const { data: scoreRules } = useQuery({
    queryKey: ["revenue-score-rules", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_score_rules")
        .select("*")
        .order("rule_key");
      if (error) throw error;
      return (data || []) as unknown as ScoreRule[];
    },
    enabled: !!user,
  });

  const [form, setForm] = useState({
    default_ticket_value: 3000,
    default_close_rate_cold: 0.05,
    default_close_rate_engaged: 0.15,
    default_close_rate_hot: 0.35,
    default_close_rate_very_hot: 0.55,
    sla_first_response_minutes: 5,
    risk_no_reply_hours: 24,
    cooldown_decay_per_day: 0.06,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_ticket_value: settings.default_ticket_value,
        default_close_rate_cold: settings.default_close_rate_cold,
        default_close_rate_engaged: settings.default_close_rate_engaged,
        default_close_rate_hot: settings.default_close_rate_hot,
        default_close_rate_very_hot: settings.default_close_rate_very_hot,
        sla_first_response_minutes: settings.sla_first_response_minutes,
        risk_no_reply_hours: settings.risk_no_reply_hours,
        cooldown_decay_per_day: settings.cooldown_decay_per_day,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase.from("revenue_settings").update(form as any).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("revenue_settings").insert({ ...form, user_id: user.id } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["revenue-settings"] });
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRules = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const { error } = await supabase.rpc("seed_revenue_score_rules", { p_user_id: user.id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["revenue-score-rules"] });
      toast.success("Regras criadas!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleUpdateRule = async (ruleId: string, updates: Partial<ScoreRule>) => {
    try {
      const { error } = await supabase
        .from("revenue_score_rules")
        .update(updates as any)
        .eq("id", ruleId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["revenue-score-rules"] });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const groupedRules = (scoreRules || []).reduce((acc, rule) => {
    const cat = ruleCategories[rule.rule_key] || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rule);
    return acc;
  }, {} as Record<string, ScoreRule[]>);

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações Avançadas</h1>
        <p className="text-sm text-muted-foreground">
          Personalize pesos de pontuação, taxas de conversão, SLA e decaimento
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="scoring">Pontuação</TabsTrigger>
          <TabsTrigger value="rules">Regras de Score</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Explainer */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">Como funciona o sistema de pontuação?</p>
                  <p>Cada lead recebe um score de 0 a 1000. Os níveis são:</p>
                  <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                    <li><strong>Frio:</strong> 0–149 pts</li>
                    <li><strong>Morno:</strong> 150–349 pts</li>
                    <li><strong>Engajado:</strong> 350–649 pts</li>
                    <li><strong>Quente:</strong> 650–1000 pts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket & Close Rates */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Projeções de Receita</CardTitle>
              <CardDescription>Valores para estimar faturamento por nível de engajamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-xs text-muted-foreground">Ticket Médio (R$)</Label>
                  <FieldHelp>Valor médio por venda. Usado nas projeções de receita.</FieldHelp>
                </div>
                <Input type="number" value={form.default_ticket_value} onChange={(e) => setForm((f) => ({ ...f, default_ticket_value: Number(e.target.value) }))} />
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                  Taxas de Conversão por Nível
                  <FieldHelp>% estimada de leads que fecham em cada nível. Ajuste conforme seu histórico.</FieldHelp>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "default_close_rate_cold", label: "🧊 Frio (%)", range: "0–149" },
                    { key: "default_close_rate_engaged", label: "☀️ Morno (%)", range: "150–349" },
                    { key: "default_close_rate_hot", label: "💬 Engajado (%)", range: "350–649" },
                    { key: "default_close_rate_very_hot", label: "🔥 Quente (%)", range: "650–1000" },
                  ].map(({ key, label, range }) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground">{label}</Label>
                      <Input
                        type="number" step="1"
                        value={Math.round((form as any)[key] * 100)}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) / 100 }))}
                      />
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Score {range}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SLA & Risk */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Tempo de Resposta e Risco</CardTitle>
              <CardDescription>Controle detecção de leads esfriando e penalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-xs text-muted-foreground">SLA de Primeira Resposta (min)</Label>
                  <FieldHelp>Responder dentro desse prazo = bônus. Acima de 30 min = penalidade.</FieldHelp>
                </div>
                <Input type="number" value={form.sla_first_response_minutes} onChange={(e) => setForm((f) => ({ ...f, sla_first_response_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-xs text-muted-foreground">Alerta de Risco por Inatividade (horas)</Label>
                  <FieldHelp>Após quanto tempo sem resposta o lead é marcado como esfriando/em risco.</FieldHelp>
                </div>
                <Input type="number" value={form.risk_no_reply_hours} onChange={(e) => setForm((f) => ({ ...f, risk_no_reply_hours: Number(e.target.value) }))} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Label className="text-xs text-muted-foreground">Decaimento Diário (%)</Label>
                  <FieldHelp>% do score perdido por dia de inatividade. Ex: 6% = lead com 500 pts perde ~30 pts/dia.</FieldHelp>
                </div>
                <Input type="number" step="1" value={Math.round(form.cooldown_decay_per_day * 100)} onChange={(e) => setForm((f) => ({ ...f, cooldown_decay_per_day: Number(e.target.value) / 100 }))} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </TabsContent>

        {/* Scoring Tab - explains how scoring works */}
        <TabsContent value="scoring" className="space-y-6 mt-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Como o Score Funciona</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-4">
              <div>
                <p className="text-foreground font-medium mb-1">📥 Engajamento</p>
                <p className="text-xs">Cada mensagem recebida do lead soma pontos. Sequências e retornos após silêncio valem mais. Atividade contínua por vários dias gera bônus extra.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">🎯 Intenção</p>
                <p className="text-xs">Quando o lead menciona preço, pagamento, proposta ou demonstra urgência, o sistema detecta automaticamente e soma pontos de intenção — os mais valiosos.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">⏱️ SLA</p>
                <p className="text-xs">Sua velocidade de resposta impacta o score. Respostas rápidas ({"<"} 5 min) ganham bônus. Respostas demoradas ({">"}30 min) geram penalidade.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">📉 Penalidades</p>
                <p className="text-xs">Objeções, desinteresse, e leads sem resposta perdem pontos. Inatividade gera decaimento diário configurável.</p>
              </div>
              <div>
                <p className="text-foreground font-medium mb-1">🔄 Decaimento</p>
                <p className="text-xs">Leads inativos perdem {Math.round(form.cooldown_decay_per_day * 100)}% do score por dia. Isso garante que leads antigos não permaneçam quentes artificialmente.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-6 mt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <Button variant="outline" onClick={handleSeedRules} disabled={seeding}>
              <RefreshCw size={16} className="mr-2" />
              {seeding ? "Criando..." : "Criar Regras Padrão"}
            </Button>
          </div>

          {Object.entries(groupedRules).map(([category, rules]) => (
            <Card key={category} className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold capitalize">
                  {categoryLabels[category] || category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20">
                    <Switch
                      checked={rule.is_enabled}
                      onCheckedChange={(checked) => handleUpdateRule(rule.id, { is_enabled: checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{ruleLabels[rule.rule_key] || rule.rule_key}</p>
                      <p className="text-[10px] text-muted-foreground">{rule.rule_key}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={rule.points}
                        onChange={(e) => handleUpdateRule(rule.id, { points: Number(e.target.value) })}
                        className="w-20 h-8 text-sm text-center"
                      />
                      <span className="text-xs text-muted-foreground">pts</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {(!scoreRules || scoreRules.length === 0) && (
            <Card className="bg-card border-border/50">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma regra criada. Clique em "Criar Regras Padrão" para começar.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RevenueSettings;
