import { useState } from 'react';
import { type Lead, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Phone, MessageCircle, Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isSelected?: boolean;
  onUpdateName?: (leadId: string, newName: string) => Promise<void>;
}

export const LeadCard = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isSelected,
  onUpdateName,
}: LeadCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(lead.contact_name || '');
  const [isHovered, setIsHovered] = useState(false);

  const formatPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 11 && digits.startsWith('55')) {
      return `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
    }
    return `+${digits}`;
  };
  
  const displayName = lead.contact_name || lead.company_name || formatPhone(lead.phone);
  const hasResponse = !!lead.last_response_at;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(lead.contact_name || '');
    setIsEditingName(true);
  };

  const handleSaveName = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateName && editName.trim()) {
      await onUpdateName(lead.id, editName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(false);
    setEditName(lead.contact_name || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleSaveName(e as unknown as React.MouseEvent);
    } else if (e.key === 'Escape') {
      handleCancelEdit(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-3 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/30",
        isSelected && "ring-2 ring-primary border-primary"
      )}
      onClick={onClick}
      draggable={!isEditingName}
      onDragStart={(e) => {
        if (isEditingName) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header - Name and Score */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {isEditingName ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 text-sm flex-1 min-w-0"
              placeholder="Nome do contato"
              autoFocus
            />
            <button
              onClick={handleSaveName}
              disabled={!editName.trim()}
              className="p-1 rounded hover:bg-primary/20 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <h4 className="font-medium text-sm text-foreground line-clamp-2 flex-1 min-w-0">
              {displayName}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {onUpdateName && (
                <button
                  onClick={handleEditClick}
                  className={cn(
                    "p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-opacity",
                    isHovered ? "opacity-100" : "opacity-0"
                  )}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              {lead.ai_score > 0 && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  lead.ai_score >= 80 ? "bg-green-500/20 text-green-400" :
                  lead.ai_score >= 50 ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {lead.ai_score}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Phone className="w-3 h-3 shrink-0" />
        <span className="truncate">{formatPhone(lead.phone)}</span>
      </div>

      {/* Estimated Value */}
      {Number(lead.estimated_value) > 0 && (
        <div className="mb-2 py-1.5 px-2 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-center gap-1">
          <span className="text-[10px] text-muted-foreground">Valor:</span>
          <span className="text-xs font-semibold text-primary">
            R$ {lead.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Footer - Status and Response time */}
      <div className="flex items-center justify-between gap-2">
        {lead.whatsapp_status && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 shrink-0",
              WHATSAPP_STATUS_COLORS[lead.whatsapp_status]
            )}
          >
            {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
          </Badge>
        )}

        {hasResponse && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto shrink-0">
            <MessageCircle className="w-3 h-3" />
            <span className="whitespace-nowrap">
              {formatDistanceToNow(new Date(lead.last_response_at!), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};
