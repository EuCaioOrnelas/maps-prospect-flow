import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Loader2, Send, CheckCircle2, MessageCircle, AlertTriangle, Wifi,
  MoreVertical, ChevronLeft, ChevronRight, Clock, Sparkles, FileText,
  MessageSquare, CheckCheck, Info, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface MetaConnection {
  id: string;
  phone_number_id: string | null;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string | null;
}

interface Template {
  id: string;
  name: string;
  body: string;
  language: string;
  category_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadPhone: string;
  leadName: string;
  leadData?: any;
  message: string; // AI-generated approach message (used as default follow-up)
  userId: string;
  availableNumbers?: any[];
  onSent: () => void;
  onRequestConnect?: () => void;
}

type Phase = "loading" | "no_connection" | "pick_template" | "edit_followup" | "summary" | "sending" | "sent" | "error";

// Replace simple variables like {{name}} {{company}} in template bodies
function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => vars[key] || `{{${key}}}`);
}

export function SendMessageDialog({
  open, onOpenChange, leadId, leadPhone, leadName, leadData,
  message, userId, onSent,
}: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("loading");
  const [connections, setConnections] = useState<MetaConnection[]>([]);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [initialMessage, setInitialMessage] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [delayMinutes, setDelayMinutes] = useState<1 | 2>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset / load when opened
  useEffect(() => {
    if (!open) return;
    setPhase("loading");
    setErrorMessage(null);
    setSelectedTemplate(null);
    setInitialMessage("");
    setFollowUpMessage(message || "");
    setDelayMinutes(1);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadData = async () => {
    try {
      const [{ data: conns }, { data: tpls }] = await Promise.all([
        supabase
          .from("user_waba_connections")
          .select("id, phone_number_id, display_phone_number, verified_name, status")
          .eq("user_id", userId)
          .eq("status", "connected"),
        supabase
          .from("wiize_message_templates")
          .select("id, name, body, language, category_id")
          .eq("owner_user_id", userId)
          .eq("archived", false)
          .order("updated_at", { ascending: false }),
      ]);

      const activeConns = (conns || []).filter((c: any) => c.phone_number_id);
      setConnections(activeConns as MetaConnection[]);
      setTemplates((tpls || []) as Template[]);

      if (activeConns.length === 0) {
        setPhase("no_connection");
        return;
      }
      setSelectedConnId(activeConns[0].id);
      setPhase("pick_template");
    } catch (err) {
      console.error("[SendMessageDialog] load error:", err);
      setPhase("error");
      setErrorMessage("Falha ao carregar dados. Tente novamente.");
    }
  };

  const vars = {
    name: leadName || leadData?.contact_name || "",
    company: leadData?.company_name || leadName || "",
    city: leadData?.city || "",
  };

  const handlePickTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setInitialMessage(renderTemplate(tpl.body, vars));
  };

  const handleNextFromTemplate = () => {
    if (!initialMessage.trim()) {
      toast({ title: "Selecione e revise um template", variant: "destructive" });
      return;
    }
    setPhase("edit_followup");
  };

  const handleConfirm = async () => {
    if (!selectedConnId) return;
    setPhase("sending");
    try {
      const { data, error } = await supabase.functions.invoke("opportunity-campaign-send", {
        body: {
          leadId,
          userId,
          initialMessage,
          followUpMessage: followUpMessage.trim() || null,
          delaySeconds: delayMinutes * 60,
          connectionId: selectedConnId,
          templateId: selectedTemplate?.id || null,
        },
      });
      if (error) throw new Error(error.message);
      if (data && data.success === false) throw new Error(data.error || "Falha ao enviar");
      setPhase("sent");
      onSent();
      toast({ title: "Campanha iniciada!", description: `Mensagem enviada para ${leadName}` });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Erro desconhecido");
      setPhase("error");
      toast({ title: "Erro ao enviar", description: err?.message, variant: "destructive" });
    }
  };

  const stepIndex = phase === "pick_template" ? 0 : phase === "edit_followup" ? 1 : phase === "summary" ? 2 : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Zap size={18} className="text-primary" />
                Campanha de Oportunidade
              </DialogTitle>
              <DialogDescription>
                {phase === "no_connection" && "Conecte um número Meta para iniciar a campanha"}
                {phase === "pick_template" && "Etapa 1 de 3 — Escolha o template inicial"}
                {phase === "edit_followup" && "Etapa 2 de 3 — Configure a resposta automática"}
                {phase === "summary" && "Etapa 3 de 3 — Confirme e dispare a campanha"}
                {phase === "sending" && "Enviando mensagem inicial..."}
                {phase === "sent" && "Campanha iniciada com sucesso"}
                {phase === "error" && "Houve um erro"}
              </DialogDescription>
            </div>
            {/* Help popover with the "..." */}
            {phase !== "no_connection" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical size={16} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <Info size={14} className="text-primary" />
                    Como funciona a campanha
                  </div>
                  <ol className="space-y-2 text-xs text-muted-foreground list-decimal pl-4">
                    <li>Você escolhe um <b>template inicial</b> e revisa o texto.</li>
                    <li>Configura a <b>resposta automática</b> (gerada pela IA) e o delay de 1 ou 2 minutos.</li>
                    <li>Ao confirmar, enviamos a mensagem inicial via <b>Meta Cloud API</b>.</li>
                    <li>Quando o contato <b>responder</b>, aguardamos o delay e enviamos a resposta configurada automaticamente.</li>
                    <li>O status do lead evolui: <b>Em contato → Após contato → Enviado</b>.</li>
                  </ol>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Step indicator */}
          {stepIndex >= 0 && (
            <div className="flex items-center gap-2 pt-3">
              {[
                { i: 0, label: "Template", icon: FileText },
                { i: 1, label: "Resposta IA", icon: Sparkles },
                { i: 2, label: "Resumo", icon: CheckCheck },
              ].map((s) => (
                <div key={s.i} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${stepIndex >= s.i ? "text-primary" : "text-muted-foreground"}`}>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] ${stepIndex >= s.i ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {stepIndex > s.i ? <CheckCircle2 size={12} /> : s.i + 1}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {s.i < 2 && <div className={`h-px flex-1 ${stepIndex > s.i ? "bg-primary" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {phase === "loading" && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" /> Carregando...
            </div>
          )}

          {phase === "no_connection" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle size={28} className="text-amber-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Nenhum número Meta conectado</p>
                <p className="text-xs text-muted-foreground">
                  Conecte um número via Meta Cloud API para iniciar campanhas.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                <Button onClick={() => { onOpenChange(false); window.location.href = "/meta/numeros"; }} className="gap-2">
                  <Wifi size={16} /> Conectar Número
                </Button>
              </div>
            </div>
          )}

          {phase === "pick_template" && (
            <div className="space-y-4">
              {connections.length > 1 && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Número de envio (Meta)</label>
                  <Select value={selectedConnId || ""} onValueChange={setSelectedConnId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {connections.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.verified_name || "WABA"} {c.display_phone_number ? `(${c.display_phone_number})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Escolha um template inicial ({templates.length} disponíveis)
                </label>
                {templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Nenhum template criado.{" "}
                    <a href="/meta/templates" className="text-primary underline">Criar templates</a>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                    {templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handlePickTemplate(tpl)}
                        className={`text-left rounded-lg border p-3 transition-colors ${
                          selectedTemplate?.id === tpl.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{tpl.name}</span>
                          <Badge variant="outline" className="text-[10px]">{tpl.language}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{tpl.body}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedTemplate && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Revisar mensagem inicial (você pode editar)
                  </label>
                  <Textarea
                    value={initialMessage}
                    onChange={(e) => setInitialMessage(e.target.value)}
                    rows={5}
                    className="text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleNextFromTemplate} disabled={!initialMessage.trim()} className="flex-1 gap-2">
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {phase === "edit_followup" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex gap-2">
                <Sparkles size={14} className="text-primary shrink-0 mt-0.5" />
                <span>
                  Esta mensagem será enviada <b>automaticamente após o contato responder</b>, respeitando o delay configurado.
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Mensagem de resposta (gerada pela IA — editável)
                </label>
                <Textarea
                  value={followUpMessage}
                  onChange={(e) => setFollowUpMessage(e.target.value)}
                  rows={8}
                  className="text-sm"
                  placeholder="Mensagem que será enviada automaticamente após o contato responder..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock size={12} /> Delay antes de enviar a resposta
                </label>
                <div className="flex gap-2">
                  {([1, 2] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setDelayMinutes(m)}
                      className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
                        delayMinutes === m
                          ? "border-primary bg-primary/5 text-primary font-medium"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      {m} minuto{m > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setPhase("pick_template")} className="flex-1 gap-2">
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button onClick={() => setPhase("summary")} className="flex-1 gap-2">
                  Próximo <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {phase === "summary" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Contato:</span><span className="font-medium">{leadName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Telefone:</span><span className="font-medium">{leadPhone}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Via:</span><span className="font-medium">{connections.find(c => c.id === selectedConnId)?.display_phone_number || "Meta"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Delay da resposta:</span><span className="font-medium">{delayMinutes} min</span></div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Send size={12} /> 1. Mensagem inicial (envio imediato)
                </div>
                <div className="rounded-lg border p-3 bg-card text-sm whitespace-pre-wrap leading-relaxed">
                  {initialMessage}
                </div>
              </div>

              {followUpMessage.trim() && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Sparkles size={12} /> 2. Resposta automática após reply (+{delayMinutes} min)
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm whitespace-pre-wrap leading-relaxed">
                    {followUpMessage}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setPhase("edit_followup")} className="flex-1 gap-2">
                  <ChevronLeft size={16} /> Voltar
                </Button>
                <Button onClick={handleConfirm} className="flex-1 gap-2">
                  <Zap size={16} /> Confirmar e Enviar
                </Button>
              </div>
            </div>
          )}

          {phase === "sending" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando mensagem inicial via Meta Cloud...</p>
            </div>
          )}

          {phase === "sent" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">Campanha iniciada!</p>
                  <p className="text-xs text-muted-foreground">
                    {followUpMessage.trim()
                      ? `A resposta será enviada automaticamente ${delayMinutes} min após o contato responder.`
                      : "Mensagem inicial entregue."}
                  </p>
                </div>
              </div>
              <Button onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
            </div>
          )}

          {phase === "error" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive mb-1">Falha no envio</p>
                {errorMessage && (
                  <p className="text-xs text-destructive/80 font-mono break-words">{errorMessage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Fechar</Button>
                <Button onClick={() => setPhase("summary")} className="flex-1 gap-2">
                  <Send size={16} /> Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
