import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

interface NumberSelectorProps {
  numbers: WhatsAppNumber[];
  selectedNumberId: string | null;
  onSelectNumber: (numberId: string | null) => void;
  dailyLimit: number;
}

export const NumberSelector = ({
  numbers,
  selectedNumberId,
  onSelectNumber,
  dailyLimit
}: NumberSelectorProps) => {
  const connectedNumbers = numbers.filter(n => n.is_connected);
  
  if (connectedNumbers.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm">
        <div className="flex items-center gap-2 text-warning font-medium">
          <AlertTriangle size={16} />
          Nenhum número conectado
        </div>
        <p className="text-muted-foreground mt-1">
          Conecte um número WhatsApp no botão verde no topo da página
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Número para disparos</label>
      <Select
        value={selectedNumberId || ""}
        onValueChange={(value) => onSelectNumber(value || null)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione um número" />
        </SelectTrigger>
        <SelectContent>
          {connectedNumbers.map((number) => {
            const isAtLimit = number.daily_sent_count >= dailyLimit;
            const remaining = dailyLimit - number.daily_sent_count;
            
            return (
              <SelectItem 
                key={number.id} 
                value={number.id}
                disabled={isAtLimit}
              >
                <div className="flex items-center gap-2">
                  {isAtLimit ? (
                    <AlertTriangle size={14} className="text-destructive" />
                  ) : (
                    <CheckCircle2 size={14} className="text-green-500" />
                  )}
                  <span>{number.name}</span>
                  <span className={`text-xs ${isAtLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                    ({isAtLimit ? 'Limite atingido' : `${remaining} restantes`})
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {selectedNumberId && (
        <p className="text-xs text-muted-foreground">
          Limite: {dailyLimit} disparos/dia por número
        </p>
      )}
    </div>
  );
};