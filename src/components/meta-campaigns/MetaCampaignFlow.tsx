import { useState, useEffect, useMemo } from "react";
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
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CRMLeadImportDialog } from "@/components/whatsapp/CRMLeadImportDialog";
import type { WabaConnection } from "@/pages/MetaCampaigns";

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components: any[];
}

interface MetaCampaignFlowProps {
  connections: WabaConnection[];
  expiredTokenIds?: Set<string>;
}

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

const CATEGORY_COST: Record<string, string> = {
  MARKETING: "~R$ 0,50",
  UTILITY: "~R$ 0,15",
  AUTHENTICATION: "~R$ 0,15",
};

const TEMPLATES_PER_PAGE = 6;

export const MetaCampaignFlow = ({ connections, expiredTokenIds = new Set() }: MetaCampaignFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(
    connections.length === 1 ? connections[0].id : ""
  );
  const selectedConnection = connections.find((c) => c.id === selectedConnectionId) || null;

  // Always start with number selection now
  const [step, setStep] = useState<"number" | "template" | "audience" | "review">("number");

  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MetaTemplate | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [templateSearch, setTemplateSearch] = useState("");
  const [templatePage, setTemplatePage] = useState(1);

  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [rulesOpen, setRulesOpen] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);
  const [crmDialogOpen, setCrmDialogOpen] = useState(false);

  // Fetch templates when connection changes (and connection is selected)
  useEffect(() => {
    if (selectedConnection) {
      fetchTemplates();
    } else {
      setTemplates([]);
    }
  }, [selectedConnectionId]);

  // Auto-advance if only 1 connection
  useEffect(() => {
    if (connections.length === 1 && step === "number") {
      setSelectedConnectionId(connections[0].id);
      setStep("template");
    }
  }, []);

  const fetchTemplates = async () => {
    if (!selectedConnection) return;

    if (expiredTokenIds.has(selectedConnection.id)) {
      setTemplates([]);
      setLoadingTemplates(false);
      return;
    }

    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase.functions.invoke("meta-fetch-templates", {
        body: {
          waba_id: selectedConnection.waba_id,
          access_token: selectedConnection.access_token,
        },
      });
      if (error) {
        // Check if it's a token expiry error
        const errorText = typeof error === 'object' && error.message ? error.message : String(error);
        throw new Error(errorText);
      }
      // Check if response contains token error
      if (data?.error) {
        const details = data?.details?.error;
        if (details?.code === 190 || details?.error_subcode === 463) {
          // Silently handle - the expired token detection system in MetaCampaigns already shows alerts
          console.warn("[MetaCampaignFlow] Token expired for connection:", selectedConnection.display_phone_number || selectedConnection.waba_id);
          setLoadingTemplates(false);
          return;
        }
        throw new Error(data.error);
      }
      setTemplates((data?.templates || []).filter((t: MetaTemplate) => t.status === "APPROVED"));
    } catch (err: any) {
      console.error("Error fetching templates:", err);
      const errMsg = err?.message || String(err);
        const isTokenError =
          expiredTokenIds.has(selectedConnection?.id || "") ||
          errMsg.includes("Session has expired") ||
          errMsg.includes("access token") ||
          errMsg.includes("OAuthException") ||
          errMsg.includes("non-2xx status code");
      if (isTokenError) {
        console.warn("[MetaCampaignFlow] Token expired (catch):", selectedConnection?.display_phone_number);
          setTemplates([]);
      } else {
        toast({
          title: "Erro ao buscar templates",
          description: "Verifique seu token de acesso e tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || (CATEGORY_LABELS[t.category] || t.category).toLowerCase().includes(q)
    );
  }, [templates, templateSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE));
  const paginatedTemplates = filteredTemplates.slice(
    (templatePage - 1) * TEMPLATES_PER_PAGE,
    templatePage * TEMPLATES_PER_PAGE
  );

  useEffect(() => { setTemplatePage(1); }, [templateSearch]);

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

  // Valida número E.164: exige DDI (código do país) + número.
  // Mínimo 12 dígitos (ex: DDI 2 + 10), máximo 15. Para BR (DDI 55) aceita 12 ou 13 dígitos.
  const isValidIntlNumber = (digits: string): boolean => {
    if (digits.length < 12 || digits.length > 15) return false;
    // Bloqueia números BR sem DDI (10 ou 11 dígitos começando com DDD comum) — já filtrado por length, mas reforça
    if (digits.startsWith("55")) {
      // BR: 55 + DDD(2) + número(8 ou 9) = 12 ou 13 dígitos
      return digits.length === 12 || digits.length === 13;
    }
    return true;
  };

  const parsePhoneNumbers = (): string[] => {
    return phoneNumbers
      .split(/[\n,;]+/)
      .map((p) => p.trim().replace(/\D/g, ""))
      .filter(isValidIntlNumber);
  };

  const parseAllNumbers = () => {
    const all = phoneNumbers
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const valid = all.filter((p) => isValidIntlNumber(p.replace(/\D/g, "")));
    const invalid = all.filter((p) => !isValidIntlNumber(p.replace(/\D/g, "")));
    return { valid, invalid, total: all.length };
  };

  const audienceCount = parsePhoneNumbers().length;
  const canProceedToAudience = !!selectedTemplate;
  const canProceedToReview = audienceCount > 0;
  const allVariablesFilled = Object.values(templateVariables).every((v) => v.trim());

  const handleSelectNumber = (connId: string) => {
    setSelectedConnectionId(connId);
    // Reset template when changing number since templates are per-number
    setSelectedTemplate(null);
    setTemplateVariables({});
    setTemplateSearch("");
    setTemplatePage(1);
  };

  const handleSendCampaign = async () => {
    if (!user || !selectedTemplate || !selectedConnection) return;
    setSending(true);
    try {
      const phones = parsePhoneNumbers();
      const name = campaignName || `Meta ${new Date().toLocaleDateString("pt-BR")}`;
      const { data, error } = await supabase.functions.invoke("meta-send-campaign", {
        body: {
          connection_id: selectedConnection.id,
          waba_id: selectedConnection.waba_id,
          phone_number_id: selectedConnection.phone_number_id,
          access_token: selectedConnection.access_token,
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
          template_variables: templateVariables,
          phone_numbers: phones,
          campaign_name: name,
        },
      });
      if (error) throw error;
      setSendResult({ success: data?.success_count || 0, failed: data?.failed_count || 0 });
      toast({ title: "Campanha enviada!", description: `${data?.success_count || 0} mensagens enviadas com sucesso.` });
    } catch (err: any) {
      console.error("Error sending campaign:", err);
      toast({ title: "Erro ao enviar campanha", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep(connections.length === 1 ? "template" : "number");
    setSelectedTemplate(null);
    setTemplateVariables({});
    setPhoneNumbers("");
    setCampaignName("");
    setSendResult(null);
    setTemplateSearch("");
    setTemplatePage(1);
  };

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
          <Rocket size={16} /> Nova campanha
        </Button>
      </div>
    );
  }

  const { valid: validNums, invalid: invalidNums } = parseAllNumbers();

  return (
    <div className="space-y-6">
      {/* Step: Number Selection */}
      {step === "number" && (
        <div className="glass rounded-2xl p-6 animate-in fade-in">
          <div className="mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Phone size={20} className="text-primary" />
              Selecione o número de envio
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha qual número será usado para disparar esta campanha. Os templates serão carregados com base no número selecionado.
            </p>
          </div>
          <div className="grid gap-3">
            {connections.map((conn) => {
              const isExpired = expiredTokenIds.has(conn.id);
              return (
                <button
                  key={conn.id}
                  onClick={() => !isExpired && handleSelectNumber(conn.id)}
                  disabled={isExpired}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isExpired
                      ? "border-destructive/30 bg-destructive/5 opacity-60 cursor-not-allowed"
                      : selectedConnectionId === conn.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isExpired ? "bg-destructive/10" : "bg-primary/10"
                      }`}>
                        {isExpired ? (
                          <AlertTriangle size={14} className="text-destructive" />
                        ) : (
                          <Phone size={14} className="text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {conn.nickname || conn.display_phone_number || `Número ${conn.phone_number_id.slice(-4)}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isExpired ? (
                            <span className="text-destructive">Token expirado — atualize em Números Conectados</span>
                          ) : (
                            conn.business_name || conn.waba_id
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedConnectionId === conn.id && !isExpired && <CheckCircle2 size={18} className="text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setStep("template")} disabled={!selectedConnectionId} className="gap-2">
              Próximo <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

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
                Templates do número: <strong>{selectedConnection?.nickname || selectedConnection?.display_phone_number || selectedConnection?.phone_number_id}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={loadingTemplates} className="gap-1">
                <RefreshCw size={14} className={loadingTemplates ? "animate-spin" : ""} />
                Atualizar
              </Button>
              <a href="https://business.facebook.com/latest/whatsapp_manager/message_templates" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1">
                  <ExternalLink size={14} /> Criar template
                </Button>
              </a>
            </div>
          </div>

          {templates.length > 0 && (
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar template por nome ou categoria..."
                className="pl-9 bg-secondary"
              />
            </div>
          )}

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
                <ExternalLink size={12} /> Criar template no painel Meta
              </a>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                {paginatedTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTemplate(t)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      selectedTemplate?.id === t.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{t.name}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {CATEGORY_LABELS[t.category] || t.category}
                        </Badge>
                        <span className="text-xs font-medium text-primary">
                          {CATEGORY_COST[t.category] || "—"}/msg
                        </span>
                        <span className="text-xs text-muted-foreground">{t.language}</span>
                      </div>
                    </div>
                    {t.components?.map((comp: any, i: number) =>
                      comp.type === "BODY" ? (
                        <p key={i} className="text-xs text-muted-foreground mt-1 line-clamp-1">{comp.text}</p>
                      ) : null
                    )}
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground">{filteredTemplates.length} template(s)</p>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTemplatePage((p) => Math.max(1, p - 1))} disabled={templatePage === 1}>
                      <ChevronLeft size={14} />
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">{templatePage}/{totalPages}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTemplatePage((p) => Math.min(totalPages, p + 1))} disabled={templatePage === totalPages}>
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {selectedTemplate && Object.keys(templateVariables).length > 0 && (
            <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30">
              <p className="text-sm font-medium mb-3">Variáveis do template:</p>
              <div className="space-y-3">
                {Object.keys(templateVariables).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{"{{" + key + "}}"}</Label>
                    <Input
                      value={templateVariables[key]}
                      onChange={(e) => setTemplateVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`Valor para variável ${key}`}
                      className="bg-secondary text-sm"
                    />
                  </div>
                ))}
              </div>
              {!allVariablesFilled && (
                <p className="text-xs text-warning mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> Preencha todas as variáveis para prosseguir
                </p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {connections.length > 1 && (
              <Button variant="ghost" onClick={() => setStep("number")} className="gap-2">
                <ArrowLeft size={16} /> Voltar
              </Button>
            )}
            <div className={connections.length === 1 ? "ml-auto" : ""}>
              <Button
                onClick={() => setStep("audience")}
                disabled={!canProceedToAudience || (Object.keys(templateVariables).length > 0 && !allVariablesFilled)}
                className="gap-2"
              >
                Próximo <ArrowRight size={16} />
              </Button>
            </div>
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
            <p className="text-sm text-muted-foreground mt-1">Cole os números de telefone para envio</p>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCrmDialogOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Users size={14} />
                  Importar do CRM
                </Button>
              </div>
              <Textarea
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder={"5511999999999\n5521988888888; 5531977777777\n5541966666666, 5551955555555\n\nCole números separados por linha, vírgula (,) ou ponto-e-vírgula (;)"}
                className="bg-secondary min-h-[180px] font-mono text-sm"
              />

              {phoneNumbers.trim().length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 size={12} /> {validNums.length} número(s) com formato válido
                    </span>
                    {invalidNums.length > 0 && (
                      <span className="flex items-center gap-1 text-destructive">
                        <XCircle size={12} /> {invalidNums.length} inválido(s), serão ignorados
                      </span>
                    )}
                  </div>
                  {invalidNums.length > 0 && (
                    <div className="flex items-start gap-2 p-2.5 rounded-lg border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium">Inclua o código do país (DDI) em todos os números</p>
                        <p className="text-destructive/80 mt-0.5">
                          Ex: <code className="font-mono">5511999999999</code> (Brasil = 55). Sem o DDI o envio falha na Meta.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible rules */}
              <Collapsible open={rulesOpen} onOpenChange={setRulesOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors p-2 rounded-lg hover:bg-muted/30">
                    <HelpCircle size={14} />
                    <span className="font-medium">Regras de formatação dos números</span>
                    <span className="text-xs text-muted-foreground">(clique para ver)</span>
                    <ChevronDown size={12} className={`ml-auto transition-transform ${rulesOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-3 rounded-lg bg-muted/50 border border-border mt-1">
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Inclua o <strong>código do país</strong> (ex: <code>55</code> para Brasil)</li>
                      <li>Inclua o <strong>DDD</strong> + número completo com 9 dígitos</li>
                      <li>Formato: <code>5511999999999</code> (13 dígitos para BR)</li>
                      <li>Espaços, traços e parênteses são removidos automaticamente</li>
                      <li>Separe por <strong>linha</strong>, <strong>vírgula</strong> ou <strong>ponto-e-vírgula</strong></li>
                      <li>Números com menos de 10 dígitos serão ignorados</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      ⚠️ A validação verifica apenas o formato do número. O status de opt-in é verificado pela Meta no momento do envio.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Opt-in warning */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5">
                <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Opt-in obrigatório — Leads frios não são permitidos</p>
                  <p className="mt-0.5">
                    A Meta exige consentimento prévio (opt-in) dos contatos. Não é possível enviar para leads frios pela API oficial, para prospecção fria use a Prospecção. Enviar para contatos sem opt-in pode resultar em baixa qualidade do número e restrições na conta.
                  </p>
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1.5"
                  >
                    <ExternalLink size={10} /> Como obter opt-in dos contatos
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">Número de envio</p>
                <p className="text-sm font-medium">
                  {selectedConnection?.nickname || selectedConnection?.display_phone_number || selectedConnection?.phone_number_id}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">Template selecionado</p>
                <p className="text-sm font-medium text-primary">{selectedTemplate?.name}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="ghost" onClick={() => setStep("template")} className="gap-2">
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button onClick={() => setStep("review")} disabled={!canProceedToReview} className="gap-2">
              Revisar ({validNums.length} contatos) <ArrowRight size={16} />
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
            <p className="text-sm text-muted-foreground mt-1">Confira os detalhes antes de disparar</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Template</p>
                <p className="text-sm font-medium">{selectedTemplate?.name}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Categoria</p>
                <p className="text-sm font-medium">
                  {CATEGORY_LABELS[selectedTemplate?.category || ""] || selectedTemplate?.category}
                  <span className="text-xs text-muted-foreground ml-2">
                    ({CATEGORY_COST[selectedTemplate?.category || ""] || "—"}/msg)
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Destinatários</p>
                <p className="text-sm font-medium">{audienceCount} contatos</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Número de envio</p>
                <p className="text-sm font-medium">
                  {selectedConnection?.nickname || selectedConnection?.display_phone_number || selectedConnection?.phone_number_id}
                </p>
              </div>
            </div>

            {Object.keys(templateVariables).length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Variáveis</p>
                {Object.entries(templateVariables).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="text-muted-foreground">{"{{" + key + "}}"}</span>: <span className="font-medium">{value}</span>
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
            <Button onClick={handleSendCampaign} disabled={sending} className="gap-2 bg-primary hover:bg-primary/90">
              {sending ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando...</>
              ) : (
                <><Rocket size={16} /> Enviar campanha ({audienceCount} contatos)</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Footer info - always visible */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5 mt-2">
        <Info size={18} className="text-primary mt-0.5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">API de Marketing do WhatsApp (Cloud API)</p>
          <p className="text-muted-foreground mt-0.5">
            Usa templates pré-aprovados pela Meta. Funciona apenas para contatos que já interagiram com seu número ou fizeram opt-in. Não funciona para leads frios, para isso use a Prospecção.
          </p>
          <a
            href="https://developers.facebook.com/docs/whatsapp/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1 mt-1 text-xs"
          >
            <ExternalLink size={10} /> Documentação oficial da Meta
          </a>
        </div>
      </div>

      {/* CRM Import Dialog */}
      <CRMLeadImportDialog
        open={crmDialogOpen}
        onOpenChange={setCrmDialogOpen}
        onImportPhones={(phones) => {
          const current = phoneNumbers.trim();
          const newNumbers = phones.join("\n");
          setPhoneNumbers(current ? current + "\n" + newNumbers : newNumbers);
        }}
      />
    </div>
  );
};
