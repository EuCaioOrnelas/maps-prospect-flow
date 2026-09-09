import { useState, memo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Lead, WHATSAPP_STATUS_LABELS, WHATSAPP_STATUS_COLORS } from '@/hooks/useCRM';
import { cn } from '@/lib/utils';
import { Phone, MessageCircle, Pencil, Check, X, Mail, Archive, DollarSign, Paperclip, ArchiveRestore } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatPhoneShort } from '@/lib/phoneUtils';
import { useLeadScores } from '@/hooks/useLeadScores';
import { toIntel100 } from '@/lib/intelligence';
import { useLeadIntelligence, NEXT_ACTION_LABELS } from '@/hooks/useLeadIntelligence';
import { usePhonePrivacy, maskPhoneTail } from '@/hooks/usePhonePrivacy';
import { LeadPotentialValueCompact } from './LeadPotentialValueCompact';
import { ResponsibleAvatar, type ResponsibleMember } from './ResponsibleAvatar';

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
  onDragStart: (leadId: string, event: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  onUpdateName?: (leadId: string, newName: string) => Promise<void>;
  members?: ResponsibleMember[];
  onChangeResponsible?: (leadId: string, userId: string | null) => Promise<void>;
  canChangeResponsible?: boolean;
  hideValue?: boolean;
  onOpenTab?: (lead: Lead, tab: 'deals' | 'files') => void;
  onToggleArchive?: (lead: Lead) => Promise<void> | void;
}

const LeadCardComponent = ({
  lead,
  onSelect,
  onDragStart,
  isDragging,
  isSelected,
  onUpdateName,
  members = [],
  onChangeResponsible,
  canChangeResponsible = true,
  hideValue = false,
  onOpenTab,
  onToggleArchive,
}: LeadCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(lead.contact_name || '');
  const [isHovered, setIsHovered] = useState(false);
  const suppressNextClickRef = useRef(false);
  const onDragStartRef = useRef(onDragStart);
  const leadIdRef = useRef(lead.id);
  const navigate = useNavigate();
  const { getScoreForPhone } = useLeadScores();
  const { getByPhone: getIntelForPhone } = useLeadIntelligence();
  const { hidden: phoneHidden } = usePhonePrivacy();
  
  const scoreData = getScoreForPhone(lead.phone);
  const intel = lead.phone ? getIntelForPhone(lead.phone) : undefined;
  const phoneFormatted = formatPhoneShort(lead.phone);
  const phoneDisplay = phoneHidden ? maskPhoneTail(phoneFormatted) : phoneFormatted;
  const displayName = lead.contact_name || lead.company_name || phoneDisplay;
  const hasResponse = !!lead.last_response_at;
  onDragStartRef.current = onDragStart;
  leadIdRef.current = lead.id;

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

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditingName || e.button !== 0) return;

    const target = e.target;
    if (target instanceof HTMLElement && target.closest('button,input,textarea,select,a,[role="button"]')) {
      return;
    }

    const card = e.currentTarget;
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    const cleanup = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (started) return;
      const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (distance < 5) return;

      started = true;
      suppressNextClickRef.current = true;
      moveEvent.preventDefault();
      onDragStartRef.current(leadIdRef.current, { clientX: moveEvent.clientX, clientY: moveEvent.clientY, currentTarget: card });
      document.removeEventListener('pointermove', handlePointerMove);
    };

    const handlePointerUp = () => cleanup();

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', handlePointerUp, { once: true });
    document.addEventListener('pointercancel', handlePointerUp, { once: true });
  }, [isEditingName]);

  const isArchived = !!lead.archived_at;
  const quickActions = [
    {
      key: 'chat',
      label: 'Abrir conversa',
      icon: MessageCircle,
      disabled: false,
      run: () => navigate(`/chat?phone=${encodeURIComponent(lead.phone)}`),
    },
    {
      key: 'email',
      label: lead.email ? `Enviar e-mail para ${lead.email}` : 'Contato sem e-mail cadastrado',
      icon: Mail,
      disabled: !lead.email,
      run: () => { if (lead.email) window.location.href = `mailto:${lead.email}`; },
    },
    {
      key: 'sale',
      label: 'Cadastrar venda',
      icon: DollarSign,
      disabled: !onOpenTab,
      run: () => onOpenTab?.(lead, 'deals'),
    },
    {
      key: 'files',
      label: 'Arquivos do contato',
      icon: Paperclip,
      disabled: !onOpenTab,
      run: () => onOpenTab?.(lead, 'files'),
    },
    {
      key: 'archive',
      label: isArchived ? 'Desarquivar contato' : 'Arquivar contato',
      icon: isArchived ? ArchiveRestore : Archive,
      disabled: !onToggleArchive,
      run: async () => {
        if (!onToggleArchive) return;
        await onToggleArchive(lead);
        toast.success(isArchived ? 'Contato desarquivado' : 'Contato arquivado');
      },
    },
  ];

  return (
    <div
      data-lead-id={lead.id}
      className={cn(
        "w-full max-w-full bg-card border border-border/60 rounded-[18px] p-5 cursor-pointer transition-all duration-200 relative",
        "shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-px",
        isSelected && "ring-2 ring-inset ring-primary border-primary",
        isDragging && "opacity-60 ring-1 ring-primary/30 shadow-sm scale-[0.995]"
      )}
      onClick={(e) => {
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onSelect(lead);
      }}
      draggable={false}
      onPointerDown={handlePointerDown}
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
              className="font-semibold text-[15px] leading-snug text-foreground min-w-0 flex-1 w-0 overflow-hidden text-ellipsis whitespace-nowrap" 
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
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2 min-w-0">
        <Phone className="w-3 h-3 shrink-0" />
        <span className="truncate min-w-0">{phoneDisplay}</span>
      </div>

      {/* Inteligência — resultado 0-100 do motor central (logo abaixo do nome/telefone) */}
      {(() => {
        const s = intel
          ? Math.max(0, Math.min(100, Math.round(intel.opportunity_score)))
          : toIntel100(scoreData?.score_total);
        if (!s) return null;
        return (
          <div
            className="mb-2.5 flex items-center gap-2 cursor-pointer"
            onClick={(e) => { e.stopPropagation(); navigate(`/crm/inteligencia?phone=${encodeURIComponent(lead.phone)}`); }}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Inteligência</span>
            <span className="text-xs font-semibold tabular-nums text-primary">{s} de 100</span>
            <div className="relative flex-1 h-1 rounded-full bg-muted/60 overflow-hidden ml-1">
              <div className="h-full rounded-full transition-[width] duration-700 bg-primary" style={{ width: `${s}%` }} />
            </div>
          </div>
        );
      })()}




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

      {/* Inteligência: próxima ação sugerida pelo motor central */}
      {intel && intel.opportunity_score >= 40 && (
        <div className="mt-2 flex items-center gap-1.5 min-w-0">
          {intel.is_hot && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
          <span className="text-[10px] font-medium text-primary truncate">
            {NEXT_ACTION_LABELS[intel.next_best_action] || intel.next_best_action}
          </span>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="mt-3">
      <div className="wiize-hairline" />
      <div className="-mx-2 pt-2 pb-0 flex items-center gap-1">
        {quickActions.map(({ key, label, icon: Icon, run, disabled }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={label}
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); run(); }}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground transition-colors",
                  disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      </div>
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
    prevProps.lead.archived_at === nextProps.lead.archived_at &&
    prevProps.lead.email === nextProps.lead.email &&
    JSON.stringify(prevProps.lead.tags) === JSON.stringify(nextProps.lead.tags) &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.members === nextProps.members &&
    prevProps.canChangeResponsible === nextProps.canChangeResponsible &&
    prevProps.hideValue === nextProps.hideValue
  );
});
