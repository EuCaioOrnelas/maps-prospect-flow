import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, History, CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WabaConnection } from "@/pages/MetaCampaigns";

interface MetaCampaignHistoryProps {
  connections: WabaConnection[];
}

export const MetaCampaignHistory = ({ connections }: MetaCampaignHistoryProps) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4">Histórico de Campanhas</h2>
      <div className="space-y-2">
        {campaigns.map((c) => {
          const isExpanded = expandedId === c.id;
          return (
            <div key={c.id} className="rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="font-medium text-sm truncate">{c.campaign_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 size={12} /> {c.success_count}
                  </span>
                  {c.failed_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-destructive">
                      <XCircle size={12} /> {c.failed_count}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border pt-3 bg-muted/20 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Template:</span>{" "}
                      <span className="font-medium">{c.template_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Idioma:</span>{" "}
                      <span className="font-medium">{c.template_language}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Número:</span>{" "}
                      <span className="font-medium">{getConnectionLabel(c.connection_id)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{" "}
                      <span className="font-medium">{c.total_recipients} destinatário(s)</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{" "}
                      <Badge variant={c.status === "completed" ? "default" : "secondary"} className="text-[10px] ml-1">
                        {c.status === "completed" ? "Concluída" : c.status === "sending" ? "Enviando" : c.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
