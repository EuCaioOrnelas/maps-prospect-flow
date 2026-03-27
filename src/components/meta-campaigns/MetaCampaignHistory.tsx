import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, History, CheckCircle2, XCircle } from "lucide-react";
import type { WabaConnection } from "@/pages/MetaCampaigns";

interface MetaCampaignHistoryProps {
  connections: WabaConnection[];
}

export const MetaCampaignHistory = ({ connections }: MetaCampaignHistoryProps) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
            <div>
              <p className="font-medium text-sm">{c.campaign_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(c.created_at).toLocaleDateString("pt-BR")} — via {getConnectionLabel(c.connection_id)}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-primary">
                <CheckCircle2 size={14} /> {c.success_count}
              </span>
              {c.failed_count > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle size={14} /> {c.failed_count}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
