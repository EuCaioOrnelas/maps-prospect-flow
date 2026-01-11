import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Flame, 
  Thermometer, 
  ThermometerSun,
  Clock,
  Users,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WarmingSession {
  id: string;
  status: 'idle' | 'active' | 'paused' | 'completed' | 'error';
  warming_level: number;
  warming_status: 'cold' | 'warm' | 'hot';
  leads_used: number;
  leads_limit: number;
  current_day: number;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface WarmingInteraction {
  id: string;
  lead_phone: string;
  lead_name: string | null;
  warming_level: number;
  messages_sent: number;
  messages_received: number;
  status: string;
  created_at: string;
}

interface WarmingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  number: {
    id: string;
    name: string;
    phone_number: string | null;
  };
  session?: WarmingSession;
}

const LEVEL_DETAILS = [
  {
    level: 1,
    name: 'Ativação Inicial',
    status: 'cold',
    days: '1-5',
    leadsPerDay: 2,
    messagesPerLead: 1,
    description: 'Criação de histórico básico de envio'
  },
  {
    level: 2,
    name: 'Conversa Leve',
    status: 'warm',
    days: '6-10',
    leadsPerDay: 3,
    messagesPerLead: 2,
    description: 'Conversas bidirecionais simples'
  },
  {
    level: 3,
    name: 'Interação Natural',
    status: 'warm',
    days: '11-15',
    leadsPerDay: 3,
    messagesPerLead: 3,
    description: 'Aumentar profundidade das conversas'
  },
  {
    level: 4,
    name: 'Pré-Comercial',
    status: 'hot',
    days: '16-20',
    leadsPerDay: 2,
    messagesPerLead: 1,
    description: 'Preparar para campanhas reais'
  }
];

export function WarmingDetailsDialog({
  open,
  onOpenChange,
  number,
  session
}: WarmingDetailsDialogProps) {
  const [interactions, setInteractions] = useState<WarmingInteraction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && session) {
      fetchInteractions();
    }
  }, [open, session]);

  const fetchInteractions = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('warming_interactions')
        .select('*')
        .eq('warming_session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setInteractions(data as WarmingInteraction[] || []);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'no_response':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const currentLevel = session?.warming_level || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Detalhes do Aquecimento
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Number Info */}
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{number.name}</h3>
                  <p className="text-sm text-muted-foreground">{number.phone_number}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={cn(
                    session?.warming_status === 'hot' && 'bg-green-500/10 text-green-500 border-green-500/30',
                    session?.warming_status === 'warm' && 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
                    (!session || session.warming_status === 'cold') && 'bg-red-500/10 text-red-500 border-red-500/30'
                  )}
                >
                  {session?.warming_status === 'hot' && <ThermometerSun className="w-3 h-3 mr-1" />}
                  {session?.warming_status === 'warm' && <Thermometer className="w-3 h-3 mr-1" />}
                  {(!session || session.warming_status === 'cold') && <Flame className="w-3 h-3 mr-1" />}
                  {session?.warming_status === 'hot' ? 'Aquecido' : 
                   session?.warming_status === 'warm' ? 'Morno' : 'Frio'}
                </Badge>
              </div>

              {session?.started_at && (
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Iniciado: {format(new Date(session.started_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{session.leads_used}/{session.leads_limit} leads</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Timeline */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Níveis de Aquecimento</h4>
              <div className="space-y-3">
                {LEVEL_DETAILS.map((level) => {
                  const isActive = currentLevel === level.level;
                  const isCompleted = currentLevel > level.level;
                  const isPending = currentLevel < level.level;

                  return (
                    <div
                      key={level.level}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        isActive && "bg-primary/10 border-primary/30",
                        isCompleted && "bg-green-500/5 border-green-500/20",
                        isPending && "bg-muted/30 border-border opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                            isActive && "bg-primary text-primary-foreground",
                            isCompleted && "bg-green-500 text-white",
                            isPending && "bg-muted text-muted-foreground"
                          )}>
                            {isCompleted ? '✓' : level.level}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Nível {level.level} - {level.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {level.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Dias {level.days}
                        </Badge>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{level.leadsPerDay} leads/dia</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MessageCircle className="w-4 h-4" />
                          <span>Até {level.messagesPerLead} msg/lead</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Recent Interactions */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Interações Recentes</h4>
              
              {!session ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Inicie o aquecimento para ver as interações
                </p>
              ) : loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma interação registrada ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className="p-3 rounded-lg bg-muted/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(interaction.status)}
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {interaction.lead_name || interaction.lead_phone}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nível {interaction.warming_level} • {interaction.messages_sent} enviadas • {interaction.messages_received} recebidas
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(interaction.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {session?.error_message && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Erro no aquecimento</p>
                    <p className="text-sm text-destructive/80 mt-1">
                      {session.error_message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
