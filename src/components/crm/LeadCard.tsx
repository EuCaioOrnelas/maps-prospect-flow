import { type Lead, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Building2, Phone, MapPin, MessageCircle, Smartphone } from 'lucide-react';
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
  // Phone is the primary identifier - name is just a visual label
  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 11 && digits.startsWith('55')) {
      return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return `+${digits}`;
  };
  
  const displayName = lead.contact_name || lead.company_name || formatPhone(lead.phone);
  const subtitle = lead.company_name && lead.contact_name 
    ? lead.company_name 
    : (lead.company_name || lead.contact_name ? null : null);
  const hasLocation = lead.city || lead.region;

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
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-foreground truncate">
            {displayName}
          </h4>
          {subtitle && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{subtitle}</span>
            </p>
          )}
        </div>
        {lead.ai_score > 0 && (
          <div className={cn(
            "text-xs font-semibold px-1.5 py-0.5 rounded",
            lead.ai_score >= 80 ? "bg-green-100 text-green-700" :
            lead.ai_score >= 50 ? "bg-yellow-100 text-yellow-700" :
            "bg-red-100 text-red-700"
          )}>
            {lead.ai_score}%
          </div>
        )}
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <Phone className="w-3 h-3" />
        <span>{formatPhone(lead.phone)}</span>
      </div>

      {/* WhatsApp Number (connected number) */}
      {lead.whatsapp_number && (
        <div className="flex items-center gap-1 text-xs text-primary/70 mb-2">
          <Smartphone className="w-3 h-3" />
          <span className="truncate" title={lead.whatsapp_number.phone_number || lead.whatsapp_number.name}>
            {lead.whatsapp_number.name}
          </span>
        </div>
      )}

      {/* Location */}
      {hasLocation && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <MapPin className="w-3 h-3" />
          <span className="truncate">
            {[lead.city, lead.region].filter(Boolean).join(', ')}
          </span>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lead.tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
          {lead.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              +{lead.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
        <Badge 
          variant="secondary" 
          className={cn("text-[10px]", WHATSAPP_STATUS_COLORS[lead.whatsapp_status])}
        >
          {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
        </Badge>
        
        {lead.last_response_at && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {formatDistanceToNow(new Date(lead.last_response_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
        )}
      </div>

      {/* Value */}
      {lead.estimated_value > 0 && (
        <div className="mt-2 text-xs font-medium text-primary">
          R$ {lead.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
};
