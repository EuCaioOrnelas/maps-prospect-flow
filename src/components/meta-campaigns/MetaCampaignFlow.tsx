import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Users,
  Send,
  Loader2,
  CheckCircle2,
  Info,
  AlertTriangle,
  Rocket,
  RefreshCw,
  ExternalLink,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone_number: string | null;
  access_token: string;
  status: string | null;
}

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
}

interface MetaCampaignFlowProps {
  connection: WabaConnection;
}

export const MetaCampaignFlow = ({ connection }: MetaCampaignFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"template" | "audience" | "review">("template");

  // Template
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  // Audience
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [campaignName, setCampaignName] = useState("");

  // Sending
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);

  // Tier info
  const tierLimits: Record<string, { label: string; daily: string }> = {
    TIER_1: { label: "Tier 1", daily: "1.000/dia" },
    TIER_2: { label: "Tier 2", daily: "10.000/dia" },
    TIER_3: { label: "Tier 3", daily: "100.000/dia" },
    TIER_4: { label: "Tier 4", daily: "Ilimitado" },
    UNKNOWN: { label: "Não verificado", daily: "Verifique no painel Meta" },
  };

  const currentTier = tierLimits["UNKNOWN"];

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-fetch-templates", {
        body: {
          waba_id: connection.waba_id,
          access_token: connection.access_token,
        },
      });

      if (error) throw error;
      setTemplates((data?.templates || []).filter((t: MetaTemplate) => t.status === "APPROVED"));
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      toast({
        title: "Erro ao buscar templates",
        description: "Verifique seu token de acesso e tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const extractVariables = (template: MetaTemplate): string[] => {
    const vars: string[] = [];
    template.components?.forEach((comp: any) => {
      const text = comp.text || "";
      const matches = text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((m: string) => {
          const num = m.replace(/[{}]/g, "");
          if (!vars.includes(num)) vars.push(num);
        });
      }
    });
    return vars.sort();
  };

  const handleSelectTemplate = (template: MetaTemplate) => {
    setSelectedTemplate(template);
    const vars = extractVariables(template);
    const initVars: Record<string, string> = {};
    vars.forEach((v) => (initVars[v] = ""));
    setTemplateVariables(initVars);
  };

  const parsePhoneNumbers = (): string[] => {
    return phoneNumbers
      .split(/[\n,;]+/)
      .map((p) => p.trim().replace(/\D/g, ""))
      .filter((p) => p.length >= 10);
  };

  const audienceCount = parsePhoneNumbers().length;

  const canProceedToAudience = !!selectedTemplate;
  const canProceedToReview = audienceCount > 0;
  const allVariablesFilled = Object.values(templateVariables).every((v) => v.trim());

  const handleSendCampaign = async () => {
    if (!user || !selectedTemplate) return;
    setSending(true);

    try {
      const phones = parsePhoneNumbers();
      const name = campaignName || `Meta ${new Date().toLocaleDateString("pt-BR")}`;

      const { data, error } = await supabase.functions.invoke("meta-send-campaign", {
        body: {
          connection_id: connection.id,
          waba_id: connection.waba_id,
          phone_number_id: connection.phone_number_id,
          access_token: connection.access_token,
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
          template_variables: templateVariables,
          phone_numbers: phones,
          campaign_name: name,
        },
      });

      if (error) throw error;

      setSendResult({
        success: data?.success_count || 0,
        failed: data?.failed_count || 0,
      });

      toast({
        title: "Campanha enviada!",
        description: `${data?.success_count || 0} mensagens enviadas com sucesso.`,
      });
    } catch (err: any) {
      console.error("Error sending campaign:", err);
      toast({
        title: "Erro ao enviar campanha",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep("template");
    setSelectedTemplate(null);
    setTemplateVariables({});
    setPhoneNumbers("");
    setCampaignName("");
    setSendResult(null);
  };

  // Success screen
  if (sendResult) {
    return (
      <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Campanha enviada!</h2>
        <p className="text-muted-foreground mb-6">
          {sendResult.success} mensagens enviadas com sucesso
          {sendResult.failed > 0 && `, ${sendResult.failed} falharam`}
        </p>
        <Button onClick={handleReset} className="gap-2">
          <Rocket size={16} />
          Nova campanha
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tier info banner */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
        <Info size={18} className="text-primary shrink-0" />
        <div className="text-sm">
          <span className="font-medium">Seu nível: {currentTier.label}</span>
          <span className="text-muted-foreground"> — Limite: {currentTier.daily}</span>
        </div>
        <a
          href="https://developers.facebook.com/docs/whatsapp/messaging-limits"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink size={12} /> Saiba mais
        </a>
      </div>

      {/* Step: Template Selection */}
      {step === "template" && (
        <div className="glass rounded-2xl p-6 animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText size={20} className="text-primary" />
                Selecione o Template
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha um template aprovado pela Meta para sua campanha
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={loadingTemplates} className="gap-1">
              <RefreshCw size={14} className={loadingTemplates ? "animate-spin" : ""} />
              Atualizar
            </Button>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={40} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum template aprovado encontrado</p>
              <a
                href="https://business.facebook.com/latest/whatsapp_manager/message_templates"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                <ExternalLink size={12} />
                Criar template no painel Meta
              </a>
            </div>
          ) : (
            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{t.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">{t.category}</span>
                      <span className="text-xs text-muted-foreground">{t.language}</span>
                    </div>
                  </div>
                  {t.components?.map((comp: any, i: number) =>
                    comp.type === "BODY" ? (
                      <p key={i} className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {comp.text}
                      </p>
                    ) : null
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Template variables */}
          {selectedTemplate && Object.keys(templateVariables).length > 0 && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-medium mb-3">Variáveis do template:</p>
              <div className="space-y-3">
                {Object.keys(templateVariables).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{"{{" + key + "}}"}</Label>
                    <Input
                      value={templateVariables[key]}
                      onChange={(e) =>
                        setTemplateVariables((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={`Valor para variável ${key}`}
                      className="bg-secondary text-sm"
                    />
                  </div>
                ))}
              </div>
              {!allVariablesFilled && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Preencha todas as variáveis para prosseguir
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button
              onClick={() => setStep("audience")}
              disabled={!canProceedToAudience || (Object.keys(templateVariables).length > 0 && !allVariablesFilled)}
              className="gap-2"
            >
              Próximo <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Audience */}
      {step === "audience" && (
        <div className="glass rounded-2xl p-6 animate-in fade-in">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} className="text-primary" />
              Defina o público
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Cole os números de telefone para envio (com código do país)
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da campanha (opcional)</Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={`Meta Campanha ${new Date().toLocaleDateString("pt-BR")}`}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Números de telefone</Label>
                <span className="text-xs text-muted-foreground">
                  {audienceCount} número(s) detectado(s)
                </span>
              </div>
              <Textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder={"5511999999999\n5521988888888\n5531977777777\n\nCole um número por linha, separados por vírgula ou ponto-e-vírgula"}
                className="bg-secondary min-h-[200px] font-mono text-sm"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/50">
                <Info size={12} className="mt-0.5 shrink-0" />
                <p>
                  Os números devem incluir o código do país (ex: 55 para Brasil).
                  O sistema vai filtrar números inválidos automaticamente.
                </p>
              </div>
            </div>

            {/* Template preview */}
            <div className="p-3 rounded-lg border border-border bg-muted/30">
              <p className="text-xs font-medium mb-1">Template selecionado:</p>
              <p className="text-sm text-primary font-medium">{selectedTemplate?.name}</p>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep("template")} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button
              onClick={() => setStep("review")}
              disabled={!canProceedToReview}
              className="gap-2"
            >
              Revisar <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Step: Review & Send */}
      {step === "review" && (
        <div className="glass rounded-2xl p-6 animate-in fade-in">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Send size={20} className="text-primary" />
              Revisar e enviar
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Confira os detalhes antes de disparar a campanha
            </p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{selectedTemplate?.name}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="text-sm font-medium">{selectedTemplate?.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Destinatários</p>
                <p className="text-sm font-medium">{audienceCount} contatos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Número de envio</p>
                <p className="text-sm font-medium">{connection.display_phone || connection.phone_number_id}</p>
              </div>
            </div>

            {Object.keys(templateVariables).length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Variáveis</p>
                {Object.entries(templateVariables).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="text-muted-foreground">{"{{" + key + "}}"}</span>:{" "}
                    <span className="font-medium">{value}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle size={16} className="text-warning mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Ação irreversível</p>
                <p className="text-muted-foreground text-xs">
                  As mensagens serão enviadas imediatamente. Os custos serão cobrados diretamente pela Meta na sua conta.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep("audience")} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button
              onClick={handleSendCampaign}
              disabled={sending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {sending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Rocket size={16} />
                  Enviar campanha ({audienceCount} contatos)
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
