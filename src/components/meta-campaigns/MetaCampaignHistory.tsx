import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, History, CheckCircle2, XCircle, Calendar, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { WabaConnection } from "@/pages/MetaCampaigns";

interface MetaCampaignHistoryProps {
  connections: WabaConnection[];
}

export const MetaCampaignHistory = ({ connections }: MetaCampaignHistoryProps) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("meta_campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setCampaigns(data || []);
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
            <DialogTitle>{selectedCampaign?.campaign_name}</DialogTitle>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Status" value={statusLabel(selectedCampaign.status)} />
                <InfoItem label="Data" value={new Date(selectedCampaign.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                <InfoItem label="Template" value={selectedCampaign.template_name} />
                <InfoItem label="Idioma" value={selectedCampaign.template_language} />
                <InfoItem label="Número" value={getConnectionLabel(selectedCampaign.connection_id)} />
                <InfoItem label="Destinatários" value={`${selectedCampaign.total_recipients}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-lg font-bold text-primary">{selectedCampaign.success_count}</p>
                  <p className="text-[11px] text-muted-foreground">Enviados</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                  <p className="text-lg font-bold text-destructive">{selectedCampaign.failed_count}</p>
                  <p className="text-[11px] text-muted-foreground">Falharam</p>
                </div>
              </div>
              {selectedCampaign.error_details && (
                <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-destructive mb-1">Detalhes de erros:</p>
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {typeof selectedCampaign.error_details === "string"
                      ? selectedCampaign.error_details
                      : JSON.stringify(selectedCampaign.error_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="p-2 rounded-lg bg-muted/50 border border-border">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium truncate">{value}</p>
  </div>
);
