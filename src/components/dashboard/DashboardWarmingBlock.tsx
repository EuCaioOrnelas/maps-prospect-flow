import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ShieldAlert, TrendingUp, TrendingDown, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DashboardWarmingBlockProps {
  numbers: any[];
  warmingSessions: any[];
  incidents: any[];
}

function getWarmingLevel(session: any): { label: string; level: number; color: string } {
  const wl = session?.warming_level || 1;
  const status = session?.warming_status || 'cold';
  
  if (status === 'warm' || wl >= 4) return { label: 'Aquecido', level: wl, color: 'text-emerald-400' };
  if (status === 'warming' || wl >= 2) return { label: 'Aquecendo', level: wl, color: 'text-yellow-400' };
  return { label: 'Frio', level: wl, color: 'text-blue-400' };
}

function getBlockRisk(number: any, incidents: any[]): { label: string; percent: number; color: string } {
  const numberIncidents = incidents.filter(i => i.whatsapp_number_id === number.id || 
    (i.contact_phone && number.phone_number && i.contact_phone.includes(number.phone_number?.slice(-4))));
  
  if (!number.is_connected) return { label: 'Desconectado', percent: 100, color: 'text-destructive' };
  
  const dailySent = number.daily_sent_count || 0;
  let risk = 0;
  
  // High daily volume increases risk
  if (dailySent > 200) risk += 40;
  else if (dailySent > 100) risk += 20;
  else if (dailySent > 50) risk += 10;
  
  // Incidents increase risk
  risk += Math.min(numberIncidents.length * 10, 40);
  
  risk = Math.min(risk, 100);
  
  if (risk >= 60) return { label: 'Alto', percent: risk, color: 'text-destructive' };
  if (risk >= 30) return { label: 'Médio', percent: risk, color: 'text-yellow-400' };
  return { label: 'Baixo', percent: risk, color: 'text-emerald-400' };
}

export function DashboardWarmingBlock({ numbers, warmingSessions, incidents }: DashboardWarmingBlockProps) {
  const numbersWithData = numbers.map(n => {
    const warming = warmingSessions.find(w => w.whatsapp_number_id === n.id);
    const warmingInfo = getWarmingLevel(warming);
    const blockRisk = getBlockRisk(n, incidents);
    return { ...n, warming, warmingInfo, blockRisk };
  });

  const avgRisk = numbersWithData.length > 0
    ? Math.round(numbersWithData.reduce((s, n) => s + n.blockRisk.percent, 0) / numbersWithData.length)
    : 0;

  const overallRiskColor = avgRisk >= 60 ? 'text-destructive' : avgRisk >= 30 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Flame size={16} className="text-orange-400" />
          Aquecimento & Tendência de Bloqueio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall risk indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className={overallRiskColor} />
            <span className="text-sm text-muted-foreground">Risco médio de bloqueio</span>
          </div>
          <span className={cn("text-lg font-bold", overallRiskColor)}>{avgRisk}%</span>
        </div>

        {/* Per-number details */}
        {numbersWithData.length > 0 ? (
          <div className="space-y-3">
            {numbersWithData.map(n => (
              <div key={n.id} className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate max-w-[140px]">{n.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px] gap-1", n.warmingInfo.color, "border-current/30")}>
                      <Thermometer size={10} />
                      {n.warmingInfo.label}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Risco de bloqueio</span>
                    <span className={cn("font-medium", n.blockRisk.color)}>{n.blockRisk.label} ({n.blockRisk.percent}%)</span>
                  </div>
                  <Progress 
                    value={n.blockRisk.percent} 
                    className="h-1.5 bg-muted/50"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Envios hoje: {n.daily_sent_count || 0}</span>
                  <span>Nível: {n.warmingInfo.level}/5</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum número cadastrado</p>
        )}
      </CardContent>
    </Card>
  );
}
