import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, Calendar, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCampaignBalance } from "@/hooks/useCampaignBalance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BalanceIndicatorProps {
  numberId: string | null;
  numberName?: string;
  selectedCount: number;
  isScheduled?: boolean;
  scheduledDate?: Date;
}

export const BalanceIndicator = ({
  numberId,
  numberName,
  selectedCount,
  isScheduled = false,
  scheduledDate
}: BalanceIndicatorProps) => {
  const { getBalanceForDate, getReservationsForDate, DAILY_LIMIT_PER_NUMBER, loading } = useCampaignBalance();
  
  const [balanceInfo, setBalanceInfo] = useState<{
    available: number;
    used: number;
    reserved: number;
    dailyLimit: number;
  } | null>(null);
  
  const [reservations, setReservations] = useState<Array<{
    campaignName: string;
    reservedCount: number;
  }>>([]);

  useEffect(() => {
    if (!numberId) {
      setBalanceInfo(null);
      setReservations([]);
      return;
    }

    const fetchBalance = async () => {
      const targetDate = isScheduled && scheduledDate ? scheduledDate : new Date();
      const balance = await getBalanceForDate(numberId, targetDate, selectedCount);
      
      setBalanceInfo({
        available: balance.available,
        used: balance.used,
        reserved: balance.reserved,
        dailyLimit: balance.dailyLimit
      });

      // Fetch reservations if there are any
      if (balance.reserved > 0) {
        const reservs = await getReservationsForDate(numberId, targetDate);
        setReservations(reservs.map(r => ({
          campaignName: r.campaignName,
          reservedCount: r.reservedCount
        })));
      } else {
        setReservations([]);
      }
    };

    fetchBalance();
  }, [numberId, selectedCount, isScheduled, scheduledDate, getBalanceForDate, getReservationsForDate]);

  if (!numberId || !balanceInfo) {
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Info size={16} />
          <span className="text-sm">Selecione um número para ver o saldo disponível</span>
        </div>
      </div>
    );
  }

  const willExceed = selectedCount > balanceInfo.available;
  const usedPercentage = Math.min((balanceInfo.used / balanceInfo.dailyLimit) * 100, 100);
  const reservedPercentage = Math.min((balanceInfo.reserved / balanceInfo.dailyLimit) * 100, 100);
  const projectedPercentage = Math.min(((balanceInfo.used + balanceInfo.reserved + selectedCount) / balanceInfo.dailyLimit) * 100, 100);
  
  const targetDate = isScheduled && scheduledDate ? scheduledDate : new Date();
  const isToday = new Date().toDateString() === targetDate.toDateString();
  const formattedDate = format(targetDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Saldo {numberName ? `(${numberName})` : ''}
          </span>
          {!isToday && (
            <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Calendar size={12} />
              {formattedDate}
            </div>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Máximo de {DAILY_LIMIT_PER_NUMBER} disparos por dia por número para evitar bloqueios no WhatsApp.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm">
          <span className="font-medium text-green-600">{balanceInfo.available}</span>
          <span className="text-muted-foreground"> disponíveis</span>
        </span>
      </div>

      {/* Progress bar with segments */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Used segment */}
        {balanceInfo.used > 0 && (
          <div 
            className="absolute top-0 left-0 h-full bg-primary rounded-l-full transition-all"
            style={{ width: `${usedPercentage}%` }}
          />
        )}
        {/* Reserved segment */}
        {balanceInfo.reserved > 0 && (
          <div 
            className="absolute top-0 h-full bg-warning transition-all"
            style={{ 
              left: `${usedPercentage}%`,
              width: `${reservedPercentage}%` 
            }}
          />
        )}
        {/* Projected segment (current selection) */}
        {selectedCount > 0 && !willExceed && (
          <div 
            className="absolute top-0 h-full bg-primary/40 transition-all"
            style={{ 
              left: `${usedPercentage + reservedPercentage}%`,
              width: `${Math.min((selectedCount / balanceInfo.dailyLimit) * 100, 100 - usedPercentage - reservedPercentage)}%` 
            }}
          />
        )}
        {/* Will exceed indicator */}
        {selectedCount > 0 && willExceed && (
          <div 
            className="absolute top-0 right-0 h-full bg-destructive/60 transition-all animate-pulse"
            style={{ 
              width: `${Math.min((selectedCount / balanceInfo.dailyLimit) * 100, 100 - usedPercentage - reservedPercentage)}%` 
            }}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {balanceInfo.used > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span className="text-muted-foreground">Enviados hoje: <span className="font-medium text-foreground">{balanceInfo.used}</span></span>
          </div>
        )}
        {balanceInfo.reserved > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <div className="w-3 h-3 rounded bg-warning" />
                  <span className="text-muted-foreground">Reservados: <span className="font-medium text-foreground">{balanceInfo.reserved}</span></span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">Campanhas agendadas:</p>
                  {reservations.map((r, i) => (
                    <div key={i} className="flex justify-between gap-4 text-xs">
                      <span>{r.campaignName}</span>
                      <span className="font-medium">{r.reservedCount} leads</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${willExceed ? 'bg-destructive' : 'bg-primary/40'}`} />
            <span className={willExceed ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              Selecionados: <span className="font-medium">{selectedCount}</span>
            </span>
          </div>
        )}
      </div>

      {/* Status message */}
      {selectedCount > 0 && (
        <div className={`flex items-center gap-2 text-sm ${willExceed ? 'text-destructive' : 'text-green-600'}`}>
          {willExceed ? (
            <>
              <AlertTriangle size={16} />
              <span>Excede o saldo em <strong>{selectedCount - balanceInfo.available}</strong> leads</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>Saldo suficiente para {selectedCount} leads</span>
            </>
          )}
        </div>
      )}

      {/* Warning box when exceeding */}
      {willExceed && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Você selecionou {selectedCount} leads, mas só tem {balanceInfo.available} disponíveis{!isToday ? ` para ${formattedDate}` : ' hoje'}. 
              {balanceInfo.reserved > 0 && ` (${balanceInfo.reserved} já reservados para campanhas agendadas)`}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};