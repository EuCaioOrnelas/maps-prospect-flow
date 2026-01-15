import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageCircle, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  RefreshCw,
  ArrowDownUp,
  User,
  Send,
  MessageSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneNumber } from '@/lib/phoneUtils';

interface WarmingInteraction {
  id: string;
  lead_phone: string;
  lead_name: string | null;
  warming_level: number;
  messages_sent: number;
  messages_received: number;
  status: string;
  last_message_sent: string | null;
  last_message_at: string | null;
  last_response_at: string | null;
  conversation_ended: boolean;
  created_at: string;
  warming_sessions: {
    id: string;
    whatsapp_number_id: string;
  };
}

interface WarmingInteractionsLogProps {
  userId: string;
  numberId?: string;
}

export function WarmingInteractionsLog({ userId, numberId }: WarmingInteractionsLogProps) {
  const [interactions, setInteractions] = useState<WarmingInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (userId) {
      fetchInteractions();
    }
  }, [userId, numberId, filter]);

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('warming_interactions')
        .select(`
          *,
          warming_sessions!inner(id, whatsapp_number_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (numberId) {
        query = query.eq('warming_sessions.whatsapp_number_id', numberId);
      }

      if (filter === 'active') {
        query = query.eq('conversation_ended', false);
      } else if (filter === 'completed') {
        query = query.eq('conversation_ended', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error fetching warming interactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string, conversationEnded: boolean) => {
    if (conversationEnded) {
      return { label: 'Concluído', color: 'bg-green-500/10 text-green-600', icon: CheckCircle };
    }
    switch (status) {
      case 'pending':
        return { label: 'Aguardando', color: 'bg-yellow-500/10 text-yellow-600', icon: Clock };
      case 'in_progress':
        return { label: 'Em andamento', color: 'bg-blue-500/10 text-blue-600', icon: Loader2 };
      case 'pending_response':
        return { label: 'Resposta pendente', color: 'bg-purple-500/10 text-purple-600', icon: MessageSquare };
      case 'completed':
        return { label: 'Concluído', color: 'bg-green-500/10 text-green-600', icon: CheckCircle };
      case 'failed':
        return { label: 'Falhou', color: 'bg-red-500/10 text-red-600', icon: XCircle };
      default:
        return { label: status, color: 'bg-muted text-muted-foreground', icon: MessageCircle };
    }
  };

  const getLevelBadge = (level: number) => {
    const configs: Record<number, { label: string; color: string }> = {
      1: { label: 'Nível 1', color: 'bg-slate-500/10 text-slate-600' },
      2: { label: 'Nível 2', color: 'bg-blue-500/10 text-blue-600' },
      3: { label: 'Nível 3', color: 'bg-orange-500/10 text-orange-600' },
      4: { label: 'Nível 4', color: 'bg-red-500/10 text-red-600' },
    };
    return configs[level] || configs[1];
  };

  // Use centralized phone formatting
  const formatPhone = (phone: string) => formatPhoneNumber(phone);

  const stats = {
    total: interactions.length,
    active: interactions.filter(i => !i.conversation_ended).length,
    completed: interactions.filter(i => i.conversation_ended).length,
    withResponse: interactions.filter(i => i.messages_received > 0).length,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Log de Interações
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchInteractions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-blue-600">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Ativos</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Concluídos</div>
          </div>
          <div className="bg-purple-500/10 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-purple-600">{stats.withResponse}</div>
            <div className="text-xs text-muted-foreground">Com resposta</div>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Interactions List */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : interactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma interação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => {
                const statusConfig = getStatusConfig(interaction.status, interaction.conversation_ended);
                const levelBadge = getLevelBadge(interaction.warming_level);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={interaction.id}
                    className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {interaction.lead_name || formatPhone(interaction.lead_phone)}
                          </span>
                        </div>
                        
                        {interaction.lead_name && (
                          <div className="flex items-center gap-2 mb-1 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            <span>{formatPhone(interaction.lead_phone)}</span>
                          </div>
                        )}

                        {interaction.last_message_sent && (
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            <span className="text-primary">→</span> {interaction.last_message_sent}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge className={statusConfig.color} variant="secondary">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <Badge className={levelBadge.color} variant="secondary">
                          {levelBadge.label}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Send className="w-3 h-3" />
                        <span>{interaction.messages_sent} enviadas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowDownUp className="w-3 h-3" />
                        <span>{interaction.messages_received} recebidas</span>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(interaction.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                    </div>

                    {interaction.last_response_at && (
                      <div className="mt-1 text-xs text-green-600">
                        ✓ Respondeu {formatDistanceToNow(new Date(interaction.last_response_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
