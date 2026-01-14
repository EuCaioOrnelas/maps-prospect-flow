import { type Lead, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Phone, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isSelected?: boolean;
}

export const LeadCard = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isSelected,
}: LeadCardProps) => {
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 11 && digits.startsWith('55')) {
      return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return `+${digits}`;
  };
  
  const displayName = lead.contact_name || lead.company_name || formatPhone(lead.phone);
  const hasResponse = !!lead.last_response_at;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      {/* Header - Name and Score */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h4 className="font-medium text-sm text-foreground truncate flex-1">
          {displayName}
        </h4>
        {lead.ai_score > 0 && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
            lead.ai_score >= 80 ? "bg-green-500/20 text-green-400" :
            lead.ai_score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
            "bg-red-500/20 text-red-400"
          )}>
            {lead.ai_score}
          </span>
        )}
      </div>

      {/* Phone - Always shown, compact */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Phone className="w-3 h-3 shrink-0" />
        <span className="truncate">{formatPhone(lead.phone)}</span>
      </div>

      {/* Estimated Value - if exists */}
      {lead.estimated_value && lead.estimated_value > 0 && (
        <div className="mb-2 pt-2 border-t border-border/50">
          <span className="text-xs font-medium text-primary">
            R$ {lead.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </span>
        </div>
      )}

      {/* Footer - Status and Response */}
      <div className="flex items-center justify-between gap-2">
        <Badge 
          variant="secondary" 
          className={cn("text-[10px] px-1.5 py-0", WHATSAPP_STATUS_COLORS[lead.whatsapp_status])}
        >
          {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
        </Badge>
        
        {hasResponse && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {formatDistanceToNow(new Date(lead.last_response_at!), {
              addSuffix: false,
              locale: ptBR,
            })}
          </span>
        )}
      </div>
    </div>
  );
};
