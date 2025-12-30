import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DailyLimitIndicatorProps {
  usedToday: number;
  dailyLimit: number;
  selectedCount: number;
}

export const DailyLimitIndicator = ({
  usedToday,
  dailyLimit,
  selectedCount
}: DailyLimitIndicatorProps) => {
  const remaining = dailyLimit - usedToday;
  const willExceed = selectedCount > remaining;
  const percentage = Math.min((usedToday / dailyLimit) * 100, 100);
  const projectedPercentage = Math.min(((usedToday + selectedCount) / dailyLimit) * 100, 100);

  return (
    <div className="p-4 rounded-lg border border-border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Limite Diário</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Recomendamos no máximo 200 disparos por dia para evitar bloqueios no WhatsApp.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <span className="text-sm">
          <span className="font-medium">{usedToday}</span>
          <span className="text-muted-foreground"> / {dailyLimit}</span>
        </span>
      </div>

      <div className="relative">
        <Progress value={percentage} className="h-2" />
        {selectedCount > 0 && (
          <div 
            className="absolute top-0 h-2 bg-primary/40 rounded-full transition-all"
            style={{ 
              left: `${percentage}%`, 
              width: `${Math.min(projectedPercentage - percentage, 100 - percentage)}%` 
            }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Restantes: <span className="font-medium text-foreground">{remaining}</span>
        </span>
        
        {selectedCount > 0 && (
          <div className={`flex items-center gap-1 ${willExceed ? 'text-destructive' : 'text-green-600'}`}>
            {willExceed ? (
              <>
                <AlertTriangle size={14} />
                <span>Excede limite em {selectedCount - remaining}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>+{selectedCount} selecionados</span>
              </>
            )}
          </div>
        )}
      </div>

      {willExceed && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>
              Você selecionou {selectedCount} leads, mas só pode enviar mais {remaining} hoje. 
              Reduza a seleção ou continue amanhã.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
