import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { commitSnapshot, isTabVisible } from "@/lib/dashboardSnapshot";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, History, CheckCircle2, XCircle, Calendar, MessageSquare, FileText, Phone, Globe, Users, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WabaConnection } from "@/pages/MetaCampaigns";

interface MetaCampaignHistoryProps {
  connections: WabaConnection[];
}

const META_ERROR_MAP: Record<string, string> = {
  "#131030": "Número não está na lista de contatos permitidos (opt-in não realizado)",
  "#131031": "Conta do remetente bloqueada pela Meta",
  "#131047": "Mensagem não entregue — contato indisponível nas últimas 72h",
  "#131026": "Mensagem não entregue — número inválido ou não existe no WhatsApp",
  "#131042": "Limite de envios da conta atingido",
  "#131045": "Número do destinatário não está registrado no WhatsApp",
  "#131051": "Tipo de mensagem não suportado para este contato",
  "#130429": "Taxa de envio excedida — aguarde antes de enviar novamente",
  "#131056": "Erro de template — parâmetros inválidos ou template não encontrado",
  "not in allowed list": "Número não está na lista de contatos permitidos (opt-in obrigatório)",
  "Rate limit": "Limite de taxa de envio atingido",
};

function parseErrorDetails(details: any): { phone: string; message: string }[] {
  if (!details) return [];
  const arr = Array.isArray(details) ? details : [details];
  return arr.map((item: any) => {
    const str = typeof item === "string" ? item : JSON.stringify(item);
    const phoneMatch = str.match(/^(\d+):/);
    const phone = phoneMatch ? phoneMatch[1] : "—";

    let friendlyMsg = "Erro desconhecido ao enviar mensagem";
    for (const [key, msg] of Object.entries(META_ERROR_MAP)) {
      if (str.includes(key)) {
        friendlyMsg = msg;
        break;
      }
    }
    return { phone, message: friendlyMsg };
  });
}

const ERRORS_PER_PAGE = 5;

export const MetaCampaignHistory = ({ connections }: MetaCampaignHistoryProps) => {
  const { user, accountOwnerId } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [errorPage, setErrorPage] = useState(1);

  useEffect(() => {
    fetchHistory();
    if (!accountOwnerId) return;
    const channel = supabase
      .channel(`meta-campaigns-${accountOwnerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meta_campaigns", filter: `owner_user_id=eq.${accountOwnerId}` },
        () => fetchHistory()
      )
      .subscribe();
    const interval = setInterval(() => { if (isTabVisible()) fetchHistory(); }, 120000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountOwnerId]);

  useEffect(() => { setErrorPage(1); }, [selectedCampaign]);

  const fetchHistory = async () => {
    if (!user || !accountOwnerId) return;
    try {
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("meta_campaigns")
        .select("*")
        .eq("owner_user_id", accountOwnerId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      if (commitSnapshot(`meta-history:${accountOwnerId}`, data || [])) setCampaigns(data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionLabel = (connId: string | null) => {
    if (!connId) return "—";
    const conn = connections.find((c) => c.id === connId);
    return conn?.nickname || conn?.display_phone_number || conn?.phone_number_id || connId.slice(0, 8);
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return "Concluída";
    if (s === "sending") return "Enviando";
    return s;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <History size={40} className="text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma campanha enviada ainda</p>
      </div>
    );
  }

  const parsedErrors = selectedCampaign ? parseErrorDetails(selectedCampaign.error_details) : [];
  const totalErrorPages = Math.max(1, Math.ceil(parsedErrors.length / ERRORS_PER_PAGE));
  const paginatedErrors = parsedErrors.slice(
    (errorPage - 1) * ERRORS_PER_PAGE,
    errorPage * ERRORS_PER_PAGE
  );

  return (
    <>
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Histórico de Campanhas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCampaign(c)}
              className="text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/20 transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-medium text-sm truncate pr-2">{c.campaign_name}</p>
                <Badge variant={c.status === "completed" ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {statusLabel(c.status)}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(c.created_at).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 size={11} /> {c.success_count}
                </span>
                {c.failed_count > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle size={11} /> {c.failed_count}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} /> {c.total_recipients}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={(o) => !o && setSelectedCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              {selectedCampaign?.campaign_name}
            </DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <CheckCircle2 size={18} className="text-primary mx-auto mb-1" />
                  <p className="text-lg font-bold text-primary">{selectedCampaign.success_count}</p>
                  <p className="text-[11px] text-muted-foreground">Enviados</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                  <XCircle size={18} className="text-destructive mx-auto mb-1" />
                  <p className="text-lg font-bold text-destructive">{selectedCampaign.failed_count}</p>
                  <p className="text-[11px] text-muted-foreground">Falharam</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2">
                <InfoItem icon={<FileText size={13} className="text-primary" />} label="Template" value={selectedCampaign.template_name} />
                <InfoItem icon={<Globe size={13} className="text-primary" />} label="Idioma" value={selectedCampaign.template_language} />
                <InfoItem icon={<Phone size={13} className="text-primary" />} label="Número" value={getConnectionLabel(selectedCampaign.connection_id)} />
                <InfoItem icon={<Users size={13} className="text-primary" />} label="Destinatários" value={`${selectedCampaign.total_recipients}`} />
                <InfoItem icon={<Calendar size={13} className="text-primary" />} label="Data" value={new Date(selectedCampaign.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                <InfoItem
                  icon={selectedCampaign.status === "completed" ? <CheckCircle2 size={13} className="text-primary" /> : <Loader2 size={13} className="text-muted-foreground" />}
                  label="Status"
                  value={statusLabel(selectedCampaign.status)}
                />
              </div>

              {/* Errors */}
              {parsedErrors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-destructive" />
                    Erros no envio ({parsedErrors.length})
                  </p>
                  <div className="space-y-1.5">
                    {paginatedErrors.map((err, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
                        <XCircle size={12} className="text-destructive mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-muted-foreground">{err.phone}</p>
                          <p className="text-xs text-foreground">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {totalErrorPages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-muted-foreground">{parsedErrors.length} erro(s)</p>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setErrorPage((p) => Math.max(1, p - 1))} disabled={errorPage === 1}>
                          <ChevronLeft size={12} />
                        </Button>
                        <span className="text-[11px] text-muted-foreground">{errorPage}/{totalErrorPages}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setErrorPage((p) => Math.min(totalErrorPages, p + 1))} disabled={errorPage === totalErrorPages}>
                          <ChevronRight size={12} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border">
    <div className="mt-0.5 shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  </div>
);
