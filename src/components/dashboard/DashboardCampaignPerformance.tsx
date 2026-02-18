import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

interface DashboardCampaignPerformanceProps {
  campaigns: any[];
  responsesByDay: { date: string; count: number }[];
}

export function DashboardCampaignPerformance({ campaigns, responsesByDay }: DashboardCampaignPerformanceProps) {
  // Top campaigns by response rate
  const campaignData = campaigns
    .filter(c => c.sent_count > 0)
    .map(c => ({
      name: c.name?.length > 18 ? c.name.slice(0, 18) + '…' : c.name,
      taxa: c.sent_count > 0 ? parseFloat(((c.total_responses || 0) / c.sent_count * 100).toFixed(1)) : 0,
      respostas: c.total_responses || 0,
      enviadas: c.sent_count,
    }))
    .sort((a, b) => b.taxa - a.taxa)
    .slice(0, 8);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Response rate per campaign */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 size={16} className="text-primary" />
            Taxa de Resposta por Campanha
          </CardTitle>
        </CardHeader>
        <CardContent>
          {campaignData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={campaignData} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Taxa de Resposta']} />
                <Bar dataKey="taxa" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma campanha com envios no período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response evolution */}
      <Card className="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            Evolução de Respostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {responsesByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={responsesByDay}>
                <defs>
                  <linearGradient id="colorResp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, 'Respostas']} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorResp)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Nenhuma resposta registrada no período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
