import { useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Lead, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Phone, MessageCircle, Pencil, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhoneShort } from '@/lib/phoneUtils';
import { useLeadScores } from '@/hooks/useLeadScores';
import { usePhonePrivacy, maskPhoneTail } from '@/hooks/usePhonePrivacy';
import { LeadEngagementScore } from './LeadEngagementScore';
import { LeadPotentialValueCompact } from './LeadPotentialValueCompact';
import { ResponsibleAvatar, type ResponsibleMember } from './ResponsibleAvatar';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isSelected?: boolean;
  onUpdateName?: (leadId: string, newName: string) => Promise<void>;
  members?: ResponsibleMember[];
  onChangeResponsible?: (leadId: string, userId: string | null) => Promise<void>;
  canChangeResponsible?: boolean;
  hideValue?: boolean;
}

const LeadCardComponent = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isSelected,
  onUpdateName,
  members = [],
  onChangeResponsible,
  canChangeResponsible = true,
  hideValue = false,
}: LeadCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(lead.contact_name || '');
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const { getScoreForPhone } = useLeadScores();
  const { hidden: phoneHidden } = usePhonePrivacy();
  
  const scoreData = getScoreForPhone(lead.phone);
  const phoneFormatted = formatPhoneShort(lead.phone);
  const phoneDisplay = phoneHidden ? maskPhoneTail(phoneFormatted) : phoneFormatted;
  const displayName = lead.contact_name || lead.company_name || phoneDisplay;
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
      data-lead-id={lead.id}
      className={cn(
        "w-full max-w-full bg-card border border-border/60 rounded-[18px] p-5 cursor-pointer transition-all duration-200 relative",
        "shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-px",
        isSelected && "ring-2 ring-inset ring-primary border-primary"
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
      <div className="flex items-start justify-between gap-2 mb-1.5 overflow-visible">
        {isEditingName ? (
          <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 50))}
              onKeyDown={handleKeyDown}
              className="h-7 text-sm flex-1 min-w-0"
              placeholder="Nome do contato"
              maxLength={50}
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
            <h4 
              className="font-medium text-sm text-foreground min-w-0 flex-1 w-0 overflow-hidden text-ellipsis whitespace-nowrap" 
              title={displayName}
            >
              {displayName}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0 pr-0.5">
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
              <ResponsibleAvatar
                responsibleId={lead.responsible_user_id}
                members={members}
                canEdit={canChangeResponsible && !!onChangeResponsible}
                onChange={async (uid) => { if (onChangeResponsible) await onChangeResponsible(lead.id, uid); }}
              />
            </div>
          </>
        )}
      </div>

      {/* Phone */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5 min-w-0">
        <Phone className="w-3 h-3 shrink-0" />
        <span className="truncate min-w-0">{phoneDisplay}</span>
      </div>



      {/* (Score movido para o rodapé do card) */}

      {/* Valor potencial — pill verde compacto */}
      {!hideValue && Number(lead.estimated_value) > 0 && (
        <div className="mb-2.5">
          <LeadPotentialValueCompact value={Number(lead.estimated_value)} />
        </div>
      )}

      {/* Footer - Status, Tags and Response time */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {lead.whatsapp_status && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] px-1.5 py-0 shrink-0 pointer-events-none",
              WHATSAPP_STATUS_COLORS[lead.whatsapp_status]
            )}
          >
            {WHATSAPP_STATUS_LABELS[lead.whatsapp_status]}
          </Badge>
        )}

        {/* Custom tags */}
        {Array.isArray(lead.tags) && lead.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant="outline"
            className="text-[10px] px-1.5 py-0 shrink-0 pointer-events-none border-primary/30 text-primary"
          >
            {tag}
          </Badge>
        ))}
        {Array.isArray(lead.tags) && lead.tags.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 2}</span>
        )}

        {hasResponse && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto min-w-0">
            <MessageCircle className="w-3 h-3 shrink-0" />
            <span className="truncate min-w-0">
              {formatDistanceToNow(new Date(lead.last_response_at!), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          </span>
        )}
      </div>

      {/* Score footer — divisor suave + Score + número + progressbar */}
      {scoreData && scoreData.score_total > 0 && (() => {
        const s = Math.max(0, Math.min(scoreData.score_total, 1000));
        const pct = (s / 1000) * 100;
        const bg = s >= 750 ? 'bg-emerald-500' : s >= 500 ? 'bg-blue-500' : s >= 250 ? 'bg-orange-500' : 'bg-red-500';
        const fg = s >= 750 ? 'text-emerald-500' : s >= 500 ? 'text-blue-500' : s >= 250 ? 'text-orange-500' : 'text-red-500';
        return (
          <div
            className="-mx-5 -mb-5 mt-3 px-5 pt-2.5 pb-3 relative cursor-pointer rounded-b-[18px]"
            onClick={(e) => { e.stopPropagation(); navigate(`/crm/score?phone=${encodeURIComponent(lead.phone)}`); }}
          >
            {/* divisor suave: forte no meio, fade nas pontas */}
            <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Score</span>
              <span className={cn("text-xs font-semibold tabular-nums", fg)}>{s}</span>
              <div className="relative flex-1 h-1 rounded-full bg-muted/60 overflow-hidden ml-1">
                <div className={cn("h-full rounded-full transition-[width] duration-700", bg)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Memoize with custom comparison to avoid unnecessary re-renders
export const LeadCard = memo(LeadCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.lead.contact_name === nextProps.lead.contact_name &&
    prevProps.lead.company_name === nextProps.lead.company_name &&
    prevProps.lead.phone === nextProps.lead.phone &&
    prevProps.lead.whatsapp_status === nextProps.lead.whatsapp_status &&
    prevProps.lead.ai_score === nextProps.lead.ai_score &&
    prevProps.lead.estimated_value === nextProps.lead.estimated_value &&
    prevProps.lead.last_response_at === nextProps.lead.last_response_at &&
    prevProps.lead.responsible_user_id === nextProps.lead.responsible_user_id &&
    JSON.stringify(prevProps.lead.tags) === JSON.stringify(nextProps.lead.tags) &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.members === nextProps.members &&
    prevProps.canChangeResponsible === nextProps.canChangeResponsible &&
    prevProps.hideValue === nextProps.hideValue
  );
});
