import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead } from "@/pages/WhatsAppCampaign";
import { Link } from "react-router-dom";

export type MessageMode = "custom" | "ai_generated";

interface MessageTypeSelectorProps {
  selectedLeads: Lead[];
  messageMode: MessageMode;
  onMessageModeChange: (mode: MessageMode) => void;
  onBack: () => void;
  onNext: () => void;
  onLeadsUpdate: (leads: Lead[]) => void;
}

interface LeadWithAiMessage {
  phone: string;
  company_name: string | null;
  contact_name: string | null;
  ai_approach_message: string | null;
}

export const MessageTypeSelector = ({
  selectedLeads,
  messageMode,
  onMessageModeChange,
  onBack,
  onNext,
  onLeadsUpdate,
}: MessageTypeSelectorProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [aiLeads, setAiLeads] = useState<LeadWithAiMessage[]>([]);
  const [leadsWithMessage, setLeadsWithMessage] = useState<LeadWithAiMessage[]>([]);
  const [leadsWithoutMessage, setLeadsWithoutMessage] = useState<LeadWithAiMessage[]>([]);

  // Fetch AI messages when mode changes to ai_generated
  useEffect(() => {
    if (messageMode === "ai_generated" && user) {
      fetchAiMessages();
    }
  }, [messageMode, user, selectedLeads]);

  const fetchAiMessages = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get phones from selected leads
      const phones = selectedLeads.map((l) => l.phone).filter(Boolean);

      if (phones.length === 0) {
        setAiLeads([]);
        setLeadsWithMessage([]);
        setLeadsWithoutMessage([]);
        setLoading(false);
        return;
      }

      // Fetch leads from DB with ai_approach_message
      const { data, error } = await supabase
        .from("leads")
        .select("phone, company_name, contact_name, ai_approach_message")
        .eq("user_id", user.id)
        .in("phone", phones);

      if (error) throw error;

      const dbLeads = (data || []) as LeadWithAiMessage[];
      setAiLeads(dbLeads);

      // Match by phone - normalize for comparison
      const normalize = (p: string) => p.replace(/\D/g, "").slice(-8);
      const dbMap = new Map(dbLeads.map((l) => [normalize(l.phone), l]));

      const withMsg: LeadWithAiMessage[] = [];
      const withoutMsg: LeadWithAiMessage[] = [];

      for (const lead of selectedLeads) {
        const key = normalize(lead.phone);
        const dbLead = dbMap.get(key);

        if (dbLead?.ai_approach_message?.trim()) {
          withMsg.push(dbLead);
        } else {
          withoutMsg.push({
            phone: lead.phone,
            company_name: lead.name || null,
            contact_name: null,
            ai_approach_message: null,
          });
        }
      }

      setLeadsWithMessage(withMsg);
      setLeadsWithoutMessage(withoutMsg);
    } catch (err) {
      console.error("Error fetching AI messages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedWithAi = () => {
    // Update leads to include AI messages
    const normalize = (p: string) => p.replace(/\D/g, "").slice(-8);
    const msgMap = new Map(
      leadsWithMessage.map((l) => [normalize(l.phone), l.ai_approach_message!])
    );

    const updatedLeads = selectedLeads
      .filter((lead) => {
        const key = normalize(lead.phone);
        return msgMap.has(key);
      })
      .map((lead) => ({
        ...lead,
        aiMessage: msgMap.get(normalize(lead.phone)) || "",
      }));

    onLeadsUpdate(updatedLeads);
    onNext();
  };

  const canProceedAi = messageMode === "ai_generated" && leadsWithMessage.length > 0;
  const canProceedCustom = messageMode === "custom";

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <MessageSquare size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Tipo de Mensagem</h2>
        <p className="text-muted-foreground">
          Escolha como as mensagens serão enviadas para os leads
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Custom Messages */}
        <button
          onClick={() => onMessageModeChange("custom")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            messageMode === "custom"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          {messageMode === "custom" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 size={20} className="text-primary" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <MessageSquare size={20} className="text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Mensagens da Campanha</h3>
              <p className="text-xs text-muted-foreground">5 variações manuais</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Você cria 5 variações de mensagem que serão enviadas aleatoriamente para os leads.
          </p>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              Risco moderado — mensagens padronizadas podem ser detectadas como spam
            </p>
          </div>
        </button>

        {/* AI Generated Messages */}
        <button
          onClick={() => onMessageModeChange("ai_generated")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            messageMode === "ai_generated"
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/30"
          }`}
        >
          {messageMode === "ai_generated" && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 size={20} className="text-primary" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Mensagens com IA</h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Recomendado
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Cada lead recebe uma mensagem única, gerada por IA com base no diagnóstico individual em{" "}
            <strong>Gestão de Oportunidades</strong>.
          </p>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-400">
              Risco menor — mensagens personalizadas reduzem chance de bloqueio
            </p>
          </div>
        </button>
      </div>

      {/* AI Mode Info */}
      {messageMode === "ai_generated" && (
        <div className="space-y-4">
          {/* Explanation */}
          <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">Como funciona?</p>
                <p className="text-muted-foreground">
                  Cada mensagem é gerada individualmente para cada contato na{" "}
                  <strong>Gestão de Oportunidades</strong>, com base no diagnóstico feito pela IA.
                  Por serem únicas e personalizadas, o risco de bloqueio por spam é significativamente
                  menor do que usando mensagens padronizadas.
                </p>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Verificando mensagens geradas...</span>
            </div>
          )}

          {/* Results */}
          {!loading && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">Prontos para envio</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{leadsWithMessage.length}</p>
                  <p className="text-xs text-muted-foreground">leads com mensagem IA</p>
                </div>

                <div className={`p-3 rounded-lg ${leadsWithoutMessage.length > 0 ? "bg-amber-500/10 border border-amber-500/20" : "bg-muted/50 border border-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {leadsWithoutMessage.length > 0 ? (
                      <AlertTriangle size={16} className="text-amber-400" />
                    ) : (
                      <CheckCircle2 size={16} className="text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">Pendentes</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{leadsWithoutMessage.length}</p>
                  <p className="text-xs text-muted-foreground">sem mensagem gerada</p>
                </div>
              </div>

              {/* Pending Leads List */}
              {leadsWithoutMessage.length > 0 && (
                <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {leadsWithoutMessage.length} lead{leadsWithoutMessage.length > 1 ? "s" : ""} sem mensagem gerada
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Gere a mensagem de abordagem na <strong>Gestão de Oportunidades</strong> antes de incluí-los na campanha.
                        Esses leads serão excluídos do envio.
                      </p>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {leadsWithoutMessage.map((lead, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <XCircle size={14} className="text-amber-400" />
                          <span className="text-sm text-foreground truncate max-w-[200px]">
                            {lead.company_name || lead.phone}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {lead.phone}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/opportunities-management"
                    className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
                  >
                    <ExternalLink size={14} />
                    Ir para Gestão de Oportunidades
                  </Link>
                </div>
              )}

              {/* Ready leads preview */}
              {leadsWithMessage.length > 0 && (
                <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Prévia das mensagens personalizadas
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {leadsWithMessage.slice(0, 5).map((lead, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background/50 border border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles size={12} className="text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {lead.company_name || lead.phone}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {lead.ai_approach_message}
                        </p>
                      </div>
                    ))}
                    {leadsWithMessage.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center py-1">
                        + {leadsWithMessage.length - 5} mensagens personalizadas
                      </p>
                    )}
                  </div>
                </div>
              )}

              {leadsWithMessage.length === 0 && leadsWithoutMessage.length > 0 && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    Nenhum lead selecionado possui mensagem gerada por IA.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Gere as mensagens na Gestão de Oportunidades ou escolha "Mensagens da Campanha".
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Custom Mode Info */}
      {messageMode === "custom" && (
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground mb-1">Atenção ao risco</p>
              <p className="text-muted-foreground">
                Mensagens padronizadas são mais fáceis de serem identificadas como spam pelo WhatsApp.
                Use variações bem diferentes entre si e evite links para reduzir o risco de bloqueio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t border-border">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Button
          onClick={messageMode === "ai_generated" ? handleProceedWithAi : onNext}
          disabled={messageMode === "ai_generated" ? !canProceedAi || loading : !canProceedCustom}
          className="gap-2"
        >
          {messageMode === "ai_generated" ? (
            <>
              Continuar com {leadsWithMessage.length} leads
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              Próximo
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
