import { useEffect, useState } from "react";
import { externalSupabase } from "@/lib/externalSupabase";

// Usa o cliente externo para operações de campanhas
const supabase = externalSupabase;
import { Heart, AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Heartbeat {
  id: string;
  action: string;
  status: string;
  campaigns_processed: number;
  messages_sent: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export const ProcessorHeartbeat = () => {
  const [lastHeartbeat, setLastHeartbeat] = useState<Heartbeat | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  const fetchLastHeartbeat = async () => {
    const { data, error } = await supabase
      .from('campaign_processor_heartbeats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setLastHeartbeat(data as Heartbeat);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLastHeartbeat();

    // Update time every 30 seconds
    const timer = setInterval(() => setNow(new Date()), 30000);

    // Subscribe to realtime updates
    const channel = supabase
      .channel('heartbeat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_processor_heartbeats'
        },
        (payload) => {
          setLastHeartbeat(payload.new as Heartbeat);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_processor_heartbeats'
        },
        (payload) => {
          if (lastHeartbeat?.id === payload.new.id) {
            setLastHeartbeat(payload.new as Heartbeat);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw size={14} className="animate-spin" />
        <span>Verificando...</span>
      </div>
    );
  }

  if (!lastHeartbeat) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
            <Clock size={14} />
            <span>Aguardando heartbeat</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>O cron job ainda não executou. Aguarde até 1 minuto.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const timeSinceHeartbeat = now.getTime() - new Date(lastHeartbeat.created_at).getTime();
  const minutesSince = Math.floor(timeSinceHeartbeat / 60000);
  
  // Healthy if heartbeat within last 2 minutes
  const isHealthy = minutesSince < 2;
  // Warning if between 2-5 minutes
  const isWarning = minutesSince >= 2 && minutesSince < 5;
  // Critical if more than 5 minutes
  const isCritical = minutesSince >= 5;

  const getStatusColor = () => {
    if (lastHeartbeat.status === 'running') return 'text-primary';
    if (isCritical) return 'text-destructive';
    if (isWarning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (lastHeartbeat.status === 'running') {
      return <RefreshCw size={14} className="animate-spin" />;
    }
    if (isCritical) {
      return <AlertTriangle size={14} />;
    }
    return <Heart size={14} className={isHealthy ? 'animate-pulse' : ''} />;
  };

  const timeAgo = formatDistanceToNow(new Date(lastHeartbeat.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 text-sm cursor-help ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="hidden sm:inline">
            {lastHeartbeat.status === 'running' ? 'Processando...' : timeAgo}
          </span>
          {isCritical && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={fetchLastHeartbeat}
            >
              <RefreshCw size={12} />
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {isHealthy && <CheckCircle2 size={14} className="text-green-500" />}
            {isWarning && <AlertTriangle size={14} className="text-yellow-500" />}
            {isCritical && <AlertTriangle size={14} className="text-destructive" />}
            <span className="font-medium">
              {isHealthy ? 'Processador saudável' : isWarning ? 'Verificando...' : 'Possível problema'}
            </span>
          </div>
          
          <div className="text-xs space-y-1">
            <p><strong>Última ação:</strong> {lastHeartbeat.action}</p>
            <p><strong>Status:</strong> {lastHeartbeat.status}</p>
            <p><strong>Campanhas processadas:</strong> {lastHeartbeat.campaigns_processed || 0}</p>
            <p><strong>Último check:</strong> {timeAgo}</p>
            {lastHeartbeat.error_message && (
              <p className="text-destructive"><strong>Erro:</strong> {lastHeartbeat.error_message}</p>
            )}
          </div>
          
          {isCritical && (
            <p className="text-xs text-muted-foreground">
              O cron job pode estar com problemas. Verifique os logs do backend.
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
