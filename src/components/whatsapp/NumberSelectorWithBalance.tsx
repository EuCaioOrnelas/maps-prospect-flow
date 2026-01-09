import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Crown,
  Info
} from "lucide-react";
import { Link } from "react-router-dom";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";
import { useCampaignBalance } from "@/hooks/useCampaignBalance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NumberSelectorWithBalanceProps {
  numbers: WhatsAppNumber[];
  selectedNumberId: string | null;
  onSelectNumber: (numberId: string | null) => void;
  leadsCount: number;
  isScheduled: boolean;
  scheduledDate?: Date;
  maxNumbers: number;
  userPlan: string;
}

export const NumberSelectorWithBalance = ({
  numbers,
  selectedNumberId,
  onSelectNumber,
  leadsCount,
  isScheduled,
  scheduledDate,
  maxNumbers,
  userPlan
}: NumberSelectorWithBalanceProps) => {
  const { getBalanceForDate, getReservationsForDate, DAILY_LIMIT_PER_NUMBER } = useCampaignBalance();
  
  const [balances, setBalances] = useState<Record<string, { available: number; used: number; reserved: number }>>({});
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    numberId: string;
    numberName: string;
    available: number;
    needed: number;
    reservations: Array<{ campaignName: string; reservedCount: number; scheduledAt: string }>;
  } | null>(null);

  const connectedNumbers = numbers.filter(n => n.is_connected);
  const canAddMoreNumbers = numbers.length < maxNumbers;
  const showUpgradeButton = !canAddMoreNumbers && (userPlan === 'start' || userPlan === 'growth');

  // Fetch balances for all connected numbers
  useEffect(() => {
    const fetchBalances = async () => {
      const targetDate = isScheduled && scheduledDate ? scheduledDate : new Date();
      
      const newBalances: Record<string, { available: number; used: number; reserved: number }> = {};
      
      for (const number of connectedNumbers) {
        const balance = await getBalanceForDate(number.id, targetDate, 0);
        newBalances[number.id] = {
          available: balance.available,
          used: balance.used,
          reserved: balance.reserved
        };
      }
      
      setBalances(newBalances);
    };

    fetchBalances();
  }, [connectedNumbers.length, isScheduled, scheduledDate, getBalanceForDate]);

  const handleSelectNumber = async (numberId: string) => {
    const balance = balances[numberId];
    const number = numbers.find(n => n.id === numberId);
    
    if (!balance || !number) {
      onSelectNumber(numberId);
      return;
    }

    // Check if the number has enough balance for this campaign
    if (balance.available < leadsCount) {
      // Get detailed reservations for error message
      const targetDate = isScheduled && scheduledDate ? scheduledDate : new Date();
      const reservations = await getReservationsForDate(numberId, targetDate);
      
      setErrorInfo({
        numberId,
        numberName: number.name,
        available: balance.available,
        needed: leadsCount,
        reservations
      });
      setErrorDialogOpen(true);
      return;
    }

    onSelectNumber(numberId);
  };

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

  const targetDate = isScheduled && scheduledDate ? scheduledDate : new Date();
  const formattedDate = format(targetDate, "dd 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Número para disparos</label>
        {isScheduled && scheduledDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            Saldo para {formattedDate}
          </div>
        )}
      </div>
      
      <Select
        value={selectedNumberId || ""}
        onValueChange={handleSelectNumber}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione um número" />
        </SelectTrigger>
        <SelectContent>
          {connectedNumbers.map((number) => {
            const balance = balances[number.id];
            const available = balance?.available ?? DAILY_LIMIT_PER_NUMBER;
            const hasEnoughBalance = available >= leadsCount;
            
            return (
              <SelectItem 
                key={number.id} 
                value={number.id}
                className={!hasEnoughBalance ? 'opacity-70' : ''}
              >
                <div className="flex items-center gap-2">
                  {hasEnoughBalance ? (
                    <CheckCircle2 size={14} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={14} className="text-destructive" />
                  )}
                  <span>{number.name}</span>
                  <span className={`text-xs ${hasEnoughBalance ? 'text-muted-foreground' : 'text-destructive'}`}>
                    ({available} disponíveis)
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {selectedNumberId && balances[selectedNumberId] && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
          <Info size={12} className="mt-0.5 flex-shrink-0" />
          <div>
            <p>
              Limite diário: {DAILY_LIMIT_PER_NUMBER} disparos por número
            </p>
            {balances[selectedNumberId].reserved > 0 && (
              <p className="text-warning">
                {balances[selectedNumberId].reserved} já reservados para campanhas agendadas
              </p>
            )}
          </div>
        </div>
      )}

      {showUpgradeButton && (
        <Link to="/upgrade">
          <Button variant="outline" size="sm" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Crown size={14} />
            Fazer upgrade para conectar mais números
          </Button>
        </Link>
      )}

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              Saldo insuficiente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p>
                  O número <strong>{errorInfo?.numberName}</strong> não tem saldo suficiente para esta campanha.
                </p>
                
                <div className="p-3 rounded-lg bg-muted space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Leads na campanha:</span>
                    <span className="font-medium">{errorInfo?.needed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Saldo disponível:</span>
                    <span className="font-medium text-destructive">{errorInfo?.available}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Faltam:</span>
                    <span className="font-medium text-destructive">
                      {(errorInfo?.needed || 0) - (errorInfo?.available || 0)}
                    </span>
                  </div>
                </div>

                {errorInfo?.reservations && errorInfo.reservations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Campanhas já agendadas para este dia:</p>
                    <div className="space-y-1">
                      {errorInfo.reservations.map((r, i) => (
                        <div key={i} className="flex justify-between text-xs p-2 bg-warning/10 rounded">
                          <span>{r.campaignName}</span>
                          <span className="font-medium">{r.reservedCount} leads</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    <strong>Sugestões:</strong>
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-4 mt-1 space-y-1">
                    <li>Reduza o número de leads para {errorInfo?.available || 0}</li>
                    <li>Selecione outro número com mais saldo</li>
                    <li>Agende para outro dia com mais saldo disponível</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorDialogOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
