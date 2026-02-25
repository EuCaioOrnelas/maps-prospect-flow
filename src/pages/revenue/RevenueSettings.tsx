import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Save, RefreshCw, Info, HelpCircle, Plus, X, Smartphone, QrCode, ArrowRight, AlertTriangle, ShieldAlert, ChevronLeft } from "lucide-react";
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
import { useWhatsAppNumbers, PLAN_LIMITS } from "@/hooks/useWhatsAppNumbers";
import { NumbersManager } from "@/components/whatsapp/NumbersManager";

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
  INTENT_NEGATIVE_MODERATE: "Penalidade Moderada",
  INTENT_NEGATIVE_HARD: "Penalidade Forte",
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

const ruleDescriptions: Record<string, { description: string; triggers?: string[]; type: "bonus" | "penalty" | "neutral" }> = {
  INBOUND_MESSAGE: {
    description: "Toda mensagem recebida do lead soma pontos de engajamento.",
    triggers: ["Qualquer mensagem enviada pelo lead"],
    type: "bonus",
  },
  INBOUND_STREAK_3: {
    description: "Quando o lead envia 3 mensagens seguidas sem você responder, indica alto interesse.",
    triggers: ["3 mensagens consecutivas do lead"],
    type: "bonus",
  },
  INBOUND_AFTER_24H_SILENCE: {
    description: "Lead que volta a falar após 24h de silêncio demonstra interesse persistente.",
    triggers: ["Mensagem após 24h sem interação"],
    type: "bonus",
  },
  INBOUND_AFTER_7D_SILENCE: {
    description: "Lead que retorna após 7 dias é um sinal forte de intenção real.",
    triggers: ["Mensagem após 7 dias sem interação"],
    type: "bonus",
  },
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: {
    description: "Lead responde rápido à sua mensagem, indicando engajamento ativo.",
    triggers: ["Resposta do lead em menos de 1 hora"],
    type: "bonus",
  },
  INTENT_PRICE: {
    description: "Lead demonstrou interesse em valores ou orçamento. Classificado como Intenção Positiva (PRICE_REQUEST).",
    triggers: ["preço", "valor", "quanto custa", "qual o valor", "orçamento", "tabela", "investimento", "custo", "quanto fica"],
    type: "bonus",
  },
  INTENT_BUY_NOW: {
    description: "Lead sinalizou forte intenção de fechar negócio. Classificado como Intenção Positiva (BUY_INTENT).",
    triggers: ["quero fechar", "quero contratar", "vamos fechar", "pode mandar contrato", "como assino", "onde pago", "pode emitir", "pode gerar boleto", "faz o pix", "como pagar", "parcelamento", "forma de pagamento"],
    type: "bonus",
  },
  INTENT_AVAILABILITY: {
    description: "Lead perguntou sobre disponibilidade ou agenda. Classificado como Intenção Positiva (AVAILABILITY).",
    triggers: ["tem vaga", "quando começa", "disponível", "agenda", "prazo", "entrega quando", "tempo de entrega"],
    type: "bonus",
  },
  INTENT_PAYMENT: {
    description: "Lead mencionou forma de pagamento — sinal de decisão avançada. Classificado como Intenção Positiva (PAYMENT).",
    triggers: ["pix", "cartão", "boleto", "parcelar", "pagamento", "parcela"],
    type: "bonus",
  },
  INTENT_PROPOSAL: {
    description: "Lead solicitou proposta ou material comercial. Classificado como Intenção Positiva (PROPOSAL).",
    triggers: ["proposta", "cotação", "envia pdf", "manda a proposta", "detalhamento", "escopo", "condições"],
    type: "bonus",
  },
  INTENT_URGENT: {
    description: "Lead demonstrou urgência na compra. Classificado como Intenção Positiva (URGENT).",
    triggers: ["urgente", "pra hoje", "imediato", "preciso já", "pra ontem"],
    type: "bonus",
  },
  INTENT_OBJECTION: {
    description: "Objeção contextual detectada. Inclui objeção de preço (preço+caro), financeira ou adiamento. Score líquido leve negativo.",
    triggers: ["preço+caro", "preço+alto", "preço+absurdo", "preço+salgado", "não tenho dinheiro", "não cabe no orçamento", "fora do orçamento", "sem budget", "budget apertado", "preciso pensar", "depois eu vejo", "vou analisar", "vou falar com sócio", "mais tarde", "vou ver e te falo", "vou ver", "preciso falar com", "vou conversar com", "vou consultar"],
    type: "penalty",
  },
  INTENT_NEGATIVE_MODERATE: {
    description: "Penalidade moderada — lead demonstrou desinteresse leve. Mantém lead ativo mas reduz score.",
    triggers: ["não sei", "não tenho certeza", "talvez depois", "não agora", "não é prioridade", "estou resolvendo outra coisa", "não faz sentido agora"],
    type: "penalty",
  },
  INTENT_NEGATIVE_HARD: {
    description: "Penalidade forte — desinteresse explícito ou opt-out. Se OPT_OUT: adiciona tag do_not_contact e marca AT_RISK.",
    triggers: ["não quero", "não tenho interesse", "pode cancelar", "não preciso", "desiste", "pare", "para de mandar", "remove meu número", "não me chama", "exclui meu contato", "me tira da lista", "bloqueia"],
    type: "penalty",
  },
  INTENT_NEGATIVE: {
    description: "⚠️ Regra legada. Substituída por INTENT_NEGATIVE_MODERATE e INTENT_NEGATIVE_HARD para classificação mais precisa.",
    triggers: ["não quero", "pare", "não me chama", "sair", "cancelar", "bloquear"],
    type: "penalty",
  },
  LINK_CLICK: {
    description: "Lead clicou em um link enviado, demonstrando interesse no conteúdo.",
    triggers: ["Clique em link rastreado"],
    type: "bonus",
  },
  FORM_SUBMIT: {
    description: "Lead preencheu e enviou um formulário.",
    triggers: ["Envio de formulário detectado"],
    type: "bonus",
  },
  CALL_REQUEST: {
    description: "Lead solicitou uma ligação ou chamada.",
    triggers: ["Pedido de ligação ou chamada"],
    type: "bonus",
  },
  SLA_FIRST_RESPONSE_UNDER_5MIN: {
    description: "Você respondeu em menos de 5 minutos — excelente atendimento!",
    triggers: ["Primeira resposta em < 5 minutos"],
    type: "bonus",
  },
  SLA_FIRST_RESPONSE_5_TO_30MIN: {
    description: "Você respondeu entre 5 e 30 minutos — dentro do aceitável.",
    triggers: ["Primeira resposta entre 5–30 minutos"],
    type: "neutral",
  },
  SLA_FIRST_RESPONSE_OVER_30MIN: {
    description: "Resposta demorou mais de 30 minutos — penalidade aplicada.",
    triggers: ["Primeira resposta acima de 30 minutos"],
    type: "penalty",
  },
  UNREPLIED_INBOUND_OVER_2H: {
    description: "Lead enviou mensagem e não foi respondido há mais de 2 horas.",
    triggers: ["Mensagem do lead sem resposta por 2h+"],
    type: "penalty",
  },
  UNREPLIED_INBOUND_OVER_24H: {
    description: "Lead sem resposta há mais de 24 horas — risco alto de perda.",
    triggers: ["Mensagem do lead sem resposta por 24h+"],
    type: "penalty",
  },
  CONVERSATION_ACTIVE_3D: {
    description: "Conversa ativa por 3 dias consecutivos — bom sinal de engajamento.",
    triggers: ["Troca de mensagens por 3 dias seguidos"],
    type: "bonus",
  },
  CONVERSATION_ACTIVE_5D: {
    description: "Conversa ativa por 5 dias — lead altamente engajado.",
    triggers: ["Troca de mensagens por 5 dias seguidos"],
    type: "bonus",
  },
  BACK_AND_FORTH_5_TURNS: {
    description: "5 trocas de mensagem no diálogo — conversa avançada.",
    triggers: ["5 mensagens alternadas (ida e volta)"],
    type: "bonus",
  },
};

const ruleCategories: Record<string, string> = {
  INBOUND_MESSAGE: "engagement", INBOUND_STREAK_3: "engagement", INBOUND_AFTER_24H_SILENCE: "engagement",
  INBOUND_AFTER_7D_SILENCE: "engagement", OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "sla",
  INTENT_PRICE: "intent", INTENT_BUY_NOW: "intent", INTENT_AVAILABILITY: "intent",
  INTENT_PAYMENT: "intent", INTENT_PROPOSAL: "intent", INTENT_URGENT: "intent",
  INTENT_OBJECTION: "penalty", INTENT_NEGATIVE: "penalty",
  INTENT_NEGATIVE_MODERATE: "penalty", INTENT_NEGATIVE_HARD: "penalty",
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
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useRevenueSettings();
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showNumbersManager, setShowNumbersManager] = useState(false);
  const [rulesUnlocked, setRulesUnlocked] = useState(false);
  const [searchParams] = useSearchParams();
  const [togglingNumber, setTogglingNumber] = useState<string | null>(null);

  const { numbers, setNumbers, maxNumbers, fetchNumbers } = useWhatsAppNumbers();
  const userPlan = profile?.plan?.toLowerCase() || "free";
  const planMaxNumbers = PLAN_LIMITS[userPlan] || 1;

  // Fetch revenue number configs
  const { data: numberConfigs, refetch: refetchConfigs } = useQuery({
    queryKey: ["revenue-number-config", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_number_config")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Default tab from URL param
  const defaultTab = searchParams.get("tab") || "general";

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
    weight_intent: 0.35,
    weight_engagement: 0.30,
    weight_urgency: 0.20,
    weight_risk: 0.15,
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
        weight_intent: (settings as any).weight_intent || 0.35,
        weight_engagement: (settings as any).weight_engagement || 0.30,
        weight_urgency: (settings as any).weight_urgency || 0.20,
        weight_risk: (settings as any).weight_risk || 0.15,
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

  const handleToggleRevenueNumber = async (numberId: string, currentEnabled: boolean) => {
    if (!user) return;
    setTogglingNumber(numberId);
    try {
      const existing = (numberConfigs || []).find((c: any) => c.whatsapp_number_id === numberId);
      if (existing) {
        const { error } = await supabase
          .from("revenue_number_config")
          .update({ is_enabled: !currentEnabled } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("revenue_number_config")
          .insert({ user_id: user.id, whatsapp_number_id: numberId, is_enabled: true } as any);
        if (error) throw error;
      }
      refetchConfigs();
      toast.success(!currentEnabled ? "Número ativado para Revenue" : "Número desativado para Revenue");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setTogglingNumber(null);
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
          Personalize pesos de pontuação, taxas de conversão, SLA e gerencie seus números
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="weights">Pesos</TabsTrigger>
          <TabsTrigger value="numbers">Números</TabsTrigger>
          <TabsTrigger value="scoring">Pontuação</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
        </TabsList>

        {/* Weights Tab */}
        <TabsContent value="weights" className="space-y-6 mt-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">Pesos do Score Multidimensional</p>
                  <p>O score total é calculado como: (Intenção × peso) + (Engajamento × peso) + (Urgência × peso) − (Risco × peso). A soma dos pesos deve ser 1.0.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Pesos das Dimensões</CardTitle>
              <CardDescription>Ajuste como cada dimensão influencia o score total</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { key: "weight_intent", label: "🎯 Intenção", desc: "Sinais de interesse (preço, proposta, compra)" },
                { key: "weight_engagement", label: "💬 Engajamento", desc: "Volume e frequência de interações" },
                { key: "weight_urgency", label: "⚡ Urgência", desc: "Sinais de urgência e tempo de resposta" },
                { key: "weight_risk", label: "⚠️ Risco (penalidade)", desc: "Leads esfriando, sem resposta, objeções" },
              ].map(({ key, label, desc }) => (
                <div key={key}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <FieldHelp>{desc}</FieldHelp>
                  </div>
                  <Input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                  />
                </div>
              ))}

              <div className="p-3 rounded-lg bg-secondary/30 text-sm">
                <p className="text-muted-foreground">
                  Soma atual:{" "}
                  <span className={cn(
                    "font-bold",
                    Math.abs(form.weight_intent + form.weight_engagement + form.weight_urgency + form.weight_risk - 1) < 0.01
                      ? "text-primary"
                      : "text-destructive"
                  )}>
                    {(form.weight_intent + form.weight_engagement + form.weight_urgency + form.weight_risk).toFixed(2)}
                  </span>
                  {" "}(ideal: 1.00)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Numbers Tab */}
        <TabsContent value="numbers" className="space-y-6 mt-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <Smartphone size={18} className="text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="text-foreground font-medium">Números WhatsApp</p>
                  <p>Conecte seus números de WhatsApp para que o módulo de Inteligência de Receita possa monitorar conversas, calcular scores e detectar intenções automaticamente.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {numbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-10 h-10 text-primary" />
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">
                    Conecte um número para começar
                  </h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    O módulo de Inteligência de Receita monitora automaticamente as conversas do WhatsApp
                    para calcular scores, detectar intenções e gerar insights comerciais.
                  </p>
                </div>

                <Card className="bg-card border-border/50 text-left">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                      <p className="text-sm text-muted-foreground">Clique no botão abaixo para adicionar um número</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                      <p className="text-sm text-muted-foreground">Escaneie o QR Code com seu WhatsApp</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                      <p className="text-sm text-muted-foreground">Os dados de receita serão gerados automaticamente</p>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={() => setShowNumbersManager(true)}
                  size="lg"
                  className="w-full gap-2 h-12 text-base"
                >
                  <QrCode className="w-5 h-5" />
                  Conectar WhatsApp
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <p className="text-xs text-muted-foreground">
                  🔒 Conexão segura e criptografada
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {numbers.length} de {planMaxNumbers} número(s) conectado(s)
                </p>
                <Button
                  onClick={() => setShowNumbersManager(true)}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Smartphone size={14} />
                  Gerenciar Números
                </Button>
              </div>

              <div className="grid gap-3">
                {numbers.map((num) => {
                  const config = (numberConfigs || []).find((c: any) => c.whatsapp_number_id === num.id);
                  const isEnabled = config?.is_enabled || false;
                  return (
                    <Card key={num.id} className={cn("bg-card border-border/50 transition-colors", isEnabled && "border-primary/30 bg-primary/[0.02]")}>
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${num.is_connected ? "bg-primary" : "bg-destructive"}`} />
                          <div>
                            <p className="text-sm font-medium text-foreground">{num.name}</p>
                            <p className="text-xs text-muted-foreground">{num.phone_number || "Sem número detectado"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-[10px] ${num.is_connected ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"}`}>
                            {num.is_connected ? "Conectado" : "Desconectado"}
                          </Badge>
                          <div className="flex items-center gap-2 pl-3 border-l border-border/40">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={isEnabled}
                                    disabled={togglingNumber === num.id}
                                    onCheckedChange={() => handleToggleRevenueNumber(num.id, isEnabled)}
                                  />
                                  <span className={cn("text-[10px] font-medium", isEnabled ? "text-primary" : "text-muted-foreground")}>
                                    {isEnabled ? "Ativo" : "Inativo"}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[240px]">
                                <p className="text-xs">
                                  {isEnabled
                                    ? "Este número está sendo analisado pela Revenue. Mensagens recebidas geram score e intenção."
                                    : "Este número está ignorado pela Revenue. Ative para começar a analisar mensagens."}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

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

        {/* Scoring Tab */}
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
          {!rulesUnlocked ? (
            <Card className="bg-destructive/[0.03] border-destructive/20">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col items-center text-center max-w-lg mx-auto space-y-5">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="w-7 h-7 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">Área de Configuração Avançada</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Esta seção controla <strong>todo o funcionamento do sistema de pontuação</strong> da Wiize Revenue.
                      Alterar valores incorretamente pode afetar a classificação de leads, projeções de receita e detecção de riscos.
                    </p>
                    <p className="text-xs text-destructive/80 font-medium mt-2">
                      ⚠️ Edite com cuidado. Alterações são aplicadas imediatamente.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => {
                      const tabsList = document.querySelector('[data-state="active"][value="rules"]');
                      if (tabsList) {
                        const generalTab = document.querySelector('[value="general"]') as HTMLElement;
                        generalTab?.click();
                      }
                    }}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={() => setRulesUnlocked(true)}>
                      <AlertTriangle size={14} className="mr-2" />
                      Entendo, avançar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-6">
              {/* Sidebar fixa com explicação */}
              <div className="w-72 shrink-0">
                <div className="sticky top-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setRulesUnlocked(false)} className="gap-1.5 text-muted-foreground -ml-2">
                      <ChevronLeft size={14} />
                      Voltar
                    </Button>
                  </div>

                  <Card className="bg-card border-border/50">
                    <CardContent className="pt-5 pb-4 space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-1.5">Como funciona</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Cada interação do lead gera eventos que somam ou subtraem pontos do score total.
                          O score varia de <strong>0 a 1000</strong> pontos e define automaticamente o nível do lead.
                        </p>
                      </div>

                      <div className="border-t border-border/40 pt-3">
                        <p className="text-xs font-semibold text-foreground mb-2">Faixas de Nível</p>
                        <div className="space-y-1.5">
                          {[
                            { emoji: "🧊", label: "Frio", range: `0 – 149`, rate: form.default_close_rate_cold },
                            { emoji: "☀️", label: "Morno", range: `150 – 349`, rate: form.default_close_rate_engaged },
                            { emoji: "💬", label: "Engajado", range: `350 – 649`, rate: form.default_close_rate_hot },
                            { emoji: "🔥", label: "Quente", range: `650 – 1000`, rate: form.default_close_rate_very_hot },
                          ].map(b => (
                            <div key={b.label} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{b.emoji} {b.label}</span>
                              <span className="font-mono text-foreground">{b.range}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-3">
                        <p className="text-xs font-semibold text-foreground mb-2">Taxa de Conversão</p>
                        <div className="space-y-1.5">
                          {[
                            { label: "Frio", rate: form.default_close_rate_cold },
                            { label: "Morno", rate: form.default_close_rate_engaged },
                            { label: "Engajado", rate: form.default_close_rate_hot },
                            { label: "Quente", rate: form.default_close_rate_very_hot },
                          ].map(b => (
                            <div key={b.label} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{b.label}</span>
                              <span className="font-mono text-foreground">{Math.round(b.rate * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-3">
                        <p className="text-xs font-semibold text-foreground mb-2">Pesos do Score</p>
                        <div className="space-y-1.5">
                          {[
                            { label: "Intenção", value: form.weight_intent },
                            { label: "Engajamento", value: form.weight_engagement },
                            { label: "Urgência", value: form.weight_urgency },
                            { label: "Risco", value: form.weight_risk },
                          ].map(w => (
                            <div key={w.label} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{w.label}</span>
                              <span className="font-mono text-foreground">{(w.value * 100).toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-border/40 pt-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">SLA resposta</span>
                          <span className="font-mono text-foreground">{form.sla_first_response_minutes}min</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Risco inatividade</span>
                          <span className="font-mono text-foreground">{form.risk_no_reply_hours}h</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Decaimento/dia</span>
                          <span className="font-mono text-foreground">{Math.round(form.cooldown_decay_per_day * 100)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Conteúdo principal das regras */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-end">
                  <Button variant="outline" onClick={handleSeedRules} disabled={seeding} size="sm">
                    <RefreshCw size={14} className="mr-1.5" />
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
                      {rules.map((rule) => {
                        const info = ruleDescriptions[rule.rule_key];
                        return (
                          <div key={rule.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/20">
                            <Switch
                              checked={rule.is_enabled}
                              onCheckedChange={(checked) => handleUpdateRule(rule.id, { is_enabled: checked })}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-foreground">{ruleLabels[rule.rule_key] || rule.rule_key}</p>
                                {info && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="shrink-0 outline-none">
                                        <Info size={13} className={cn(
                                          "cursor-help transition-colors",
                                          info.type === "penalty" ? "text-destructive/50 hover:text-destructive" :
                                          info.type === "bonus" ? "text-primary/50 hover:text-primary" :
                                          "text-muted-foreground/50 hover:text-muted-foreground"
                                        )} />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[320px] p-3 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={cn(
                                          "text-[9px] px-1.5 py-0",
                                          info.type === "penalty" ? "border-destructive/40 text-destructive" :
                                          info.type === "bonus" ? "border-primary/40 text-primary" :
                                          "border-border text-muted-foreground"
                                        )}>
                                          {info.type === "penalty" ? "Penalidade" : info.type === "bonus" ? "Bônus" : "Neutro"}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
                                      {info.triggers && info.triggers.length > 0 && (
                                        <div className="pt-1 border-t border-border/40">
                                          <p className="text-[10px] font-medium text-foreground mb-1">
                                            {rule.rule_key.startsWith("INTENT_") ? "Palavras-chave detectadas:" : "Gatilho:"}
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {info.triggers.map((t, i) => (
                                              <span key={i} className={cn(
                                                "inline-block text-[10px] px-1.5 py-0.5 rounded-md font-mono",
                                                info.type === "penalty"
                                                  ? "bg-destructive/10 text-destructive"
                                                  : "bg-primary/10 text-primary"
                                              )}>
                                                {t}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
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
                        );
                      })}
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
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NumbersManager
        numbers={numbers}
        onNumbersChange={(nums) => { setNumbers(nums); fetchNumbers(); }}
        maxNumbers={planMaxNumbers}
        onConnect={() => { fetchNumbers(); }}
        forceOpen={showNumbersManager}
        onClose={() => setShowNumbersManager(false)}
        hideButtons
      />
    </div>
  );
};

export default RevenueSettings;
