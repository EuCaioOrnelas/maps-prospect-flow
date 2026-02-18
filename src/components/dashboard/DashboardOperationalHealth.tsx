import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";

interface DashboardOperationalHealthProps {
  numbers: any[];
  warmingSessions: any[];
  incidents: any[];
}

function getChipStatus(number: any, warmingSession: any): { label: string; color: string; icon: React.ReactNode } {
  if (!number.is_connected) {
    return { label: "Desconectado", color: "text-destructive bg-destructive/10 border-destructive/30", icon: <XCircle size={12} /> };
  }
  if (warmingSession?.error_message) {
    return { label: "Atenção", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30", icon: <AlertTriangle size={12} /> };
  }
  return { label: "Saudável", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 size={12} /> };
}

export function DashboardOperationalHealth({ numbers, warmingSessions, incidents }: DashboardOperationalHealthProps) {
  const totalErrors = incidents.length;
  const connectedCount = numbers.filter(n => n.is_connected).length;
  const avgDailySent = numbers.length > 0
    ? Math.round(numbers.reduce((s, n) => s + (n.daily_sent_count || 0), 0) / numbers.length)
    : 0;

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          Saúde Operacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{connectedCount}/{numbers.length}</p>
            <p className="text-[10px] text-muted-foreground">Conectados</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-foreground">{avgDailySent}</p>
            <p className="text-[10px] text-muted-foreground">Média diária</p>
          </div>
          <div className="text-center p-2.5 rounded-lg bg-muted/50">
            <p className={cn("text-lg font-bold", totalErrors > 0 ? "text-destructive" : "text-foreground")}>{totalErrors}</p>
            <p className="text-[10px] text-muted-foreground">Incidentes</p>
          </div>
        </div>

        {/* Chip list */}
        {numbers.length > 0 ? (
          <div className="space-y-2">
            {numbers.map(number => {
              const warming = warmingSessions.find(w => w.whatsapp_number_id === number.id);
              const status = getChipStatus(number, warming);
              return (
                <div key={number.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={14} className="text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{number.name}</p>
                      {number.phone_number && (
                        <p className="text-[10px] text-muted-foreground">{formatPhoneNumber(number.phone_number)}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[10px] gap-1", status.color)}>
                    {status.icon}
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum número cadastrado</p>
        )}

        {/* Recent incidents */}
        {incidents.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Alertas Recentes</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {incidents.slice(0, 5).map(inc => (
                <div key={inc.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle size={10} className="text-yellow-500 shrink-0" />
                  <span className="truncate">
                    {inc.incident_type === 'not_on_whatsapp' ? 'Número não está no WhatsApp' : inc.incident_type}
                    {inc.contact_phone && ` • ${inc.contact_phone.slice(-4)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
