import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { History, Send, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WabaConnection {
  id: string;
  waba_id: string;
  phone_number_id: string;
  business_name: string | null;
  display_phone: string | null;
  access_token: string;
  messaging_tier: string | null;
  daily_limit: number;
}

interface MetaCampaign {
  id: string;
  campaign_name: string;
  template_name: string;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

interface MetaCampaignHistoryProps {
  connection: WabaConnection;
}

export const MetaCampaignHistory = ({ connection }: MetaCampaignHistoryProps) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("meta_campaigns")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCampaigns((data || []) as unknown as MetaCampaign[]);
    } catch (err) {
      console.error("Error fetching meta campaigns:", err);
    } finally {
      setLoading(false);
    }
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
        <h3 className="text-lg font-medium mb-1">Nenhuma campanha enviada</h3>
        <p className="text-sm text-muted-foreground">
          Suas campanhas Meta aparecerão aqui após o primeiro envio
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <History size={20} className="text-primary" />
        Histórico de campanhas
      </h2>

      <div className="space-y-3">
        {campaigns.map((c) => (
          <div key={c.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm">{c.campaign_name}</h3>
              <span className="text-xs text-muted-foreground">
                {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Send size={12} />
                Template: {c.template_name}
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-primary" />
                {c.success_count} enviados
              </span>
              {c.failed_count > 0 && (
                <span className="flex items-center gap-1">
                  <XCircle size={12} className="text-destructive" />
                  {c.failed_count} falhas
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Total: {c.total_recipients}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
