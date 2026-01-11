import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, CartesianGrid } from "recharts";
import { MessageSquare, MessageCircle, TrendingUp, Users, Percent, Calendar } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WarmingStatsProps {
  userId: string;
  selectedNumberId?: string | null;
}

interface DailyStats {
  date: string;
  messagesSent: number;
  messagesReceived: number;
  responseRate: number;
}

interface InteractionStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  responseRate: number;
  totalLeadsContacted: number;
  activeSessions: number;
  averageResponseTime: string;
}

export function WarmingStatsPanel({ userId, selectedNumberId }: WarmingStatsProps) {
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [stats, setStats] = useState<InteractionStats>({
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    responseRate: 0,
    totalLeadsContacted: 0,
    activeSessions: 0,
    averageResponseTime: "-"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, selectedNumberId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Build query for interactions
      let interactionsQuery = supabase
        .from('warming_interactions')
        .select('*, warming_sessions!inner(whatsapp_number_id)')
        .eq('user_id', userId);

      // Filter by number if selected
      if (selectedNumberId) {
        interactionsQuery = interactionsQuery.eq('warming_sessions.whatsapp_number_id', selectedNumberId);
      }

      const { data: interactions, error: interactionsError } = await interactionsQuery;

      if (interactionsError) throw interactionsError;

      // Build query for active sessions
      let sessionsQuery = supabase
        .from('warming_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (selectedNumberId) {
        sessionsQuery = sessionsQuery.eq('whatsapp_number_id', selectedNumberId);
      }

      const { data: sessions, error: sessionsError } = await sessionsQuery;

      if (sessionsError) throw sessionsError;

      // Calculate overall stats
      const totalMessagesSent = interactions?.reduce((sum, i) => sum + (i.messages_sent || 0), 0) || 0;
      const totalMessagesReceived = interactions?.reduce((sum, i) => sum + (i.messages_received || 0), 0) || 0;
      const responseRate = totalMessagesSent > 0 
        ? Math.round((totalMessagesReceived / totalMessagesSent) * 100) 
        : 0;
      const totalLeadsContacted = interactions?.length || 0;

      // Calculate average response time
      const respondedInteractions = interactions?.filter(i => i.last_response_at && i.last_message_at) || [];
      let avgResponseTime = "-";
      
      if (respondedInteractions.length > 0) {
        const totalResponseTime = respondedInteractions.reduce((sum, i) => {
          const sent = new Date(i.last_message_at).getTime();
          const received = new Date(i.last_response_at).getTime();
          return sum + Math.max(0, received - sent);
        }, 0);
        const avgMs = totalResponseTime / respondedInteractions.length;
        const avgMinutes = Math.round(avgMs / 60000);
        if (avgMinutes < 60) {
          avgResponseTime = `${avgMinutes} min`;
        } else {
          const hours = Math.floor(avgMinutes / 60);
          avgResponseTime = `${hours}h ${avgMinutes % 60}min`;
        }
      }

      setStats({
        totalMessagesSent,
        totalMessagesReceived,
        responseRate,
        totalLeadsContacted,
        activeSessions: sessions?.length || 0,
        averageResponseTime: avgResponseTime
      });

      // Calculate daily stats for the last 14 days
      const last14Days = eachDayOfInterval({
        start: subDays(new Date(), 13),
        end: new Date()
      });

      const dailyData = last14Days.map(day => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayInteractions = interactions?.filter(i => {
          const createdAt = new Date(i.created_at);
          return createdAt >= dayStart && createdAt <= dayEnd;
        }) || [];

        const messagesSent = dayInteractions.reduce((sum, i) => sum + (i.messages_sent || 0), 0);
        const messagesReceived = dayInteractions.reduce((sum, i) => sum + (i.messages_received || 0), 0);
        const dayResponseRate = messagesSent > 0 
          ? Math.round((messagesReceived / messagesSent) * 100) 
          : 0;

        return {
          date: format(day, "dd/MM", { locale: ptBR }),
          fullDate: format(day, "dd 'de' MMM", { locale: ptBR }),
          messagesSent,
          messagesReceived,
          responseRate: dayResponseRate
        };
      });

      setDailyStats(dailyData);
    } catch (error) {
      console.error('Error fetching warming stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartConfig = {
    messagesSent: {
      label: "Enviadas",
      color: "hsl(var(--primary))"
    },
    messagesReceived: {
      label: "Respostas",
      color: "hsl(var(--chart-2))"
    },
    responseRate: {
      label: "Taxa de Resposta",
      color: "hsl(var(--chart-3))"
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* KPI Cards - 2 rows of 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Row 1 */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalMessagesSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Respostas Recebidas</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalMessagesReceived}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Percent className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                <p className="text-2xl font-bold text-foreground">{stats.responseRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Leads Utilizados</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalLeadsContacted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessões Ativas</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio de Resposta</p>
                <p className="text-2xl font-bold text-foreground">{stats.averageResponseTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Evolution Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Evolução de Mensagens (últimos 14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <AreaChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradientReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '5 5' }}
                />
                <Area
                  type="monotone"
                  dataKey="messagesSent"
                  stroke="hsl(var(--primary))"
                  fill="url(#gradientSent)"
                  strokeWidth={2}
                  name="Enviadas"
                />
                <Area
                  type="monotone"
                  dataKey="messagesReceived"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#gradientReceived)"
                  strokeWidth={2}
                  name="Respostas"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Response Rate Chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">
              Taxa de Resposta Diária (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent />}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                />
                <Bar
                  dataKey="responseRate"
                  fill="hsl(var(--chart-3))"
                  radius={[4, 4, 0, 0]}
                  name="Taxa %"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
