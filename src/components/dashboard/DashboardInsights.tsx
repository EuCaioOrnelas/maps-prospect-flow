import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardInsightsProps {
  leadsProspected: number;
  prevLeadsProspected: number;
  responseRate: number;
  prevResponseRate: number;
  totalResponses: number;
  campaigns: any[];
  messagesSent: number;
  prevMessagesSent: number;
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  type: 'positive' | 'neutral' | 'warning';
}

export function DashboardInsights(props: DashboardInsightsProps) {
  const insights: Insight[] = [];

  // Response rate change
  if (props.prevResponseRate > 0) {
    const change = props.responseRate - props.prevResponseRate;
    if (change > 0) {
      insights.push({
        icon: <TrendingUp size={14} />,
        text: `Sua taxa de resposta cresceu ${change.toFixed(1)}% em relação ao período anterior.`,
        type: 'positive',
      });
    } else if (change < -2) {
      insights.push({
        icon: <TrendingUp size={14} />,
        text: `Sua taxa de resposta caiu ${Math.abs(change).toFixed(1)}% em relação ao período anterior. Considere revisar a segmentação.`,
        type: 'warning',
      });
    }
  }

  // Best campaign
  const campaignsWithResponses = props.campaigns
    .filter(c => c.sent_count > 0 && (c.total_responses || 0) > 0)
    .sort((a, b) => ((b.total_responses || 0) / b.sent_count) - ((a.total_responses || 0) / a.sent_count));
  
  if (campaignsWithResponses.length > 0) {
    const best = campaignsWithResponses[0];
    const rate = ((best.total_responses || 0) / best.sent_count * 100).toFixed(1);
    insights.push({
      icon: <Trophy size={14} />,
      text: `A campanha "${best.name}" teve a maior taxa de resposta: ${rate}%.`,
      type: 'positive',
    });
  }

  // Leads growth
  if (props.prevLeadsProspected > 0) {
    const leadsGrowth = ((props.leadsProspected - props.prevLeadsProspected) / props.prevLeadsProspected * 100);
    if (leadsGrowth > 10) {
      insights.push({
        icon: <TrendingUp size={14} />,
        text: `Sua prospecção cresceu ${leadsGrowth.toFixed(0)}% no período. Boa performance!`,
        type: 'positive',
      });
    }
  }

  // Volume insight
  if (props.messagesSent > 0 && props.prevMessagesSent > 0) {
    const volumeChange = ((props.messagesSent - props.prevMessagesSent) / props.prevMessagesSent * 100);
    if (volumeChange > 20) {
      insights.push({
        icon: <TrendingUp size={14} />,
        text: `Volume de envios aumentou ${volumeChange.toFixed(0)}% vs período anterior.`,
        type: 'neutral',
      });
    }
  }

  // No data fallback
  if (insights.length === 0) {
    insights.push({
      icon: <Clock size={14} />,
      text: "Continue utilizando a plataforma para gerar insights de performance personalizados.",
      type: 'neutral',
    });
  }

  return (
    <Card className="dashboard-card rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Lightbulb size={16} className="text-yellow-500" />
          Insights de Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2.5 p-3 rounded-lg border text-sm",
              insight.type === 'positive' && "bg-emerald-500/5 border-emerald-500/20 text-emerald-300",
              insight.type === 'warning' && "bg-yellow-500/5 border-yellow-500/20 text-yellow-300",
              insight.type === 'neutral' && "bg-muted/30 border-border/50 text-muted-foreground",
            )}
          >
            <div className="shrink-0 mt-0.5">{insight.icon}</div>
            <p className="leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
