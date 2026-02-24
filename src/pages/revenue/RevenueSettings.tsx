import { useState, useEffect } from "react";
import { Save, RefreshCw, Info, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRevenueSettings } from "@/hooks/useRevenueData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

const RevenueSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useRevenueSettings();
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

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
        const { error } = await supabase
          .from("revenue_settings")
          .update(form as any)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("revenue_settings")
          .insert({ ...form, user_id: user.id } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["revenue-settings"] });
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRules = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const { error } = await supabase.rpc("seed_revenue_score_rules", {
        p_user_id: user.id,
      });
      if (error) throw error;
      toast.success("Regras de pontuação criadas com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Personalize os parâmetros que o sistema usa para calcular score, projeções de receita e alertas de risco
        </p>
      </div>

      {/* Explainer */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Info size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">Como funciona o sistema de pontuação?</p>
              <p>Cada lead recebe um score de 0 a 1000, que sobe com interações (mensagens recebidas, intenções detectadas) e desce com inatividade. O nível é atualizado automaticamente:</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 mt-1">
                <li><strong>Frio:</strong> 0–149 pts — Lead novo ou com pouco engajamento</li>
                <li><strong>Engajado:</strong> 150–349 pts — Mostrando interesse</li>
                <li><strong>Quente:</strong> 350–649 pts — Alta probabilidade de conversão</li>
                <li><strong>Muito Quente:</strong> 650–1000 pts — Pronto para fechar</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket & Close Rates */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Projeções de Receita</CardTitle>
          <CardDescription>
            Esses valores são usados para estimar quanto você pode faturar com base no nível de engajamento dos leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-xs text-muted-foreground">Ticket Médio (R$)</Label>
              <FieldHelp>
                Valor médio de cada venda ou contrato. Usado para calcular a receita potencial e esperada no painel e em projeções.
              </FieldHelp>
            </div>
            <Input
              type="number"
              value={form.default_ticket_value}
              onChange={(e) =>
                setForm((f) => ({ ...f, default_ticket_value: Number(e.target.value) }))
              }
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
              Taxas de Conversão por Nível
              <FieldHelp>
                Porcentagem estimada de leads que fecham negócio em cada nível. Ex: se a taxa do nível "Quente" é 35%, o sistema calcula que 35% dos leads quentes irão converter. Ajuste conforme o histórico do seu negócio.
              </FieldHelp>
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">🧊 Frio (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={Math.round(form.default_close_rate_cold * 100)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, default_close_rate_cold: Number(e.target.value) / 100 }))
                  }
                />
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Score 0–149</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">💬 Engajado (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={Math.round(form.default_close_rate_engaged * 100)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      default_close_rate_engaged: Number(e.target.value) / 100,
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Score 150–349</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">🔥 Quente (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={Math.round(form.default_close_rate_hot * 100)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, default_close_rate_hot: Number(e.target.value) / 100 }))
                  }
                />
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Score 350–649</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">🔥🔥 Muito Quente (%)</Label>
                <Input
                  type="number"
                  step="1"
                  value={Math.round(form.default_close_rate_very_hot * 100)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      default_close_rate_very_hot: Number(e.target.value) / 100,
                    }))
                  }
                />
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Score 650–1000</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA & Risk */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tempo de Resposta e Risco</CardTitle>
          <CardDescription>
            Controle como o sistema detecta leads que estão esfriando e quando aplicar penalidades de score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-xs text-muted-foreground">
                SLA de Primeira Resposta (minutos)
              </Label>
              <FieldHelp>
                SLA = Acordo de Nível de Serviço. Define o tempo ideal para responder um lead pela primeira vez. Se você responder dentro desse prazo, o lead ganha pontos bônus. Se demorar mais, perde pontos. Exemplo: se o SLA é 5 min e você responde em 3 min, o lead ganha +40 pts.
              </FieldHelp>
            </div>
            <Input
              type="number"
              value={form.sla_first_response_minutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sla_first_response_minutes: Number(e.target.value),
                }))
              }
            />
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Responder dentro desse prazo = bônus de pontos. Acima de 30 min = penalidade.
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-xs text-muted-foreground">
                Alerta de Risco por Inatividade (horas)
              </Label>
              <FieldHelp>
                Depois de quantas horas sem responder uma mensagem recebida do lead, o sistema marca o lead como "esfriando" e depois como "em risco". Isso ajuda a identificar oportunidades que estão sendo perdidas por falta de acompanhamento.
              </FieldHelp>
            </div>
            <Input
              type="number"
              value={form.risk_no_reply_hours}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  risk_no_reply_hours: Number(e.target.value),
                }))
              }
            />
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              3+ dias sem atividade = "Esfriando" · 7+ dias = "Em Risco"
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Label className="text-xs text-muted-foreground">
                Decaimento Diário do Score (%)
              </Label>
              <FieldHelp>
                Porcentagem do score que o lead perde por dia de inatividade. Isso garante que leads antigos e inativos não fiquem com score alto para sempre. Exemplo: com 6%, um lead com 500 pts perde ~30 pts por dia sem interação.
              </FieldHelp>
            </div>
            <Input
              type="number"
              step="1"
              value={Math.round(form.cooldown_decay_per_day * 100)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cooldown_decay_per_day: Number(e.target.value) / 100,
                }))
              }
            />
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Quanto maior o valor, mais rápido leads inativos perdem pontuação
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
        <Button variant="outline" onClick={handleSeedRules} disabled={seeding}>
          <RefreshCw size={16} className="mr-2" />
          {seeding ? "Criando..." : "Criar Regras de Pontuação Padrão"}
        </Button>
      </div>

      {/* Rules explanation */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            O que são as Regras de Pontuação?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As regras definem quantos pontos cada tipo de interação vale. Por exemplo: uma mensagem recebida vale +12 pts, 
            detectar que o lead perguntou sobre preço vale +80 pts, e uma intenção de compra vale +140 pts. 
            Sinais negativos como "não quero" tiram -200 pts. O botão acima cria automaticamente as regras padrão recomendadas 
            — você pode ajustá-las depois conforme seu negócio.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueSettings;
