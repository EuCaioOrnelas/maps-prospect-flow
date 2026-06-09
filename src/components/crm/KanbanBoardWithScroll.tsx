import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';

import { type Lead, type PipelineStage, WHATSAPP_STATUS_COLORS, WHATSAPP_STATUS_LABELS } from '@/hooks/useCRM';
import { KanbanColumn, type ColumnWidth } from './KanbanColumn';
import { cn } from '@/lib/utils';
import { Phone, MessageCircle, User as UserIcon } from 'lucide-react';
import { formatPhoneShort } from '@/lib/phoneUtils';
import { useLeadScores } from '@/hooks/useLeadScores';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface KanbanBoardWithScrollProps {
  stages: PipelineStage[];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadMove: (leadId: string, stageId: string) => void;
  selectedLead: Lead | null;
  filteredStageId?: string;
  bulkSelectMode?: boolean;
  selectedLeadIds?: Set<string>;
  onSelectAllInColumn?: (stageId: string, leadIds: string[]) => void;
  onUpdateLeadName?: (leadId: string, newName: string) => Promise<void>;
  columnWidth?: ColumnWidth;
  agentSilencedStages?: Set<string>;
  onAddLead?: (stageId: string) => void;
  members?: import('./ResponsibleAvatar').ResponsibleMember[];
  onChangeResponsible?: (leadId: string, userId: string | null) => Promise<void>;
  canChangeResponsible?: boolean;
  hideValue?: boolean;
}

const KanbanBoardWithScrollComponent = ({
  stages,
  leads,
  onLeadClick,
  onLeadMove,
  selectedLead,
  filteredStageId,
  bulkSelectMode,
  selectedLeadIds,
  onSelectAllInColumn,
  onUpdateLeadName,
  columnWidth = 'medium',
  agentSilencedStages,
  onAddLead,
  members,
  onChangeResponsible,
  canChangeResponsible,
  hideValue,
}: KanbanBoardWithScrollProps) => {
  const { getScoreForPhone } = useLeadScores();
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    lead: Lead;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const topScrollInnerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);
  const animationRef = useRef<number | null>(null);
  const scrollVelocity = useRef(0);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const tolerance = 2;
    setCanScrollLeft(el.scrollLeft > tolerance);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance);
    if (topScrollInnerRef.current) {
      topScrollInnerRef.current.style.width = `${el.scrollWidth}px`;
    }
  }, []);

  const handleDragStart = useCallback((leadId: string, event: React.DragEvent<HTMLDivElement>) => {
    const lead = leads.find((item) => item.id === leadId);
    const rect = event.currentTarget.getBoundingClientRect();
    setDraggedLead(leadId);
    if (lead) {
      setDragPreview({
        lead,
        x: event.clientX,
        y: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        width: rect.width,
      });
    }
  }, [leads]);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStage(null);
    setDragPreview(null);
    scrollVelocity.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleDragOver = useCallback((stageId: string) => {
    setDragOverStage(stageId);
  }, []);

  const handleDrop = useCallback((stageId: string) => {
    if (draggedLead) {
      onLeadMove(draggedLead, stageId);
    }
    handleDragEnd();
  }, [draggedLead, onLeadMove, handleDragEnd]);

  // Memoize leads by stage to avoid recalculating on every render
  const leadsByStage = useMemo(() => {
    const map = new Map<string, Lead[]>();
    stages.forEach(stage => {
      map.set(stage.id, leads.filter(lead => lead.pipeline_stage_id === stage.id));
    });
    return map;
  }, [leads, stages]);

  // Smooth scroll animation
  const smoothScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    if (Math.abs(scrollVelocity.current) > 0.5) {
      containerRef.current.scrollLeft += scrollVelocity.current;
      scrollVelocity.current *= 0.95;
      animationRef.current = requestAnimationFrame(smoothScroll);
    } else {
      scrollVelocity.current = 0;
      animationRef.current = null;
    }
  }, []);

  const calculateScrollVelocity = useCallback((mouseX: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const edgeThreshold = 150;
    const maxSpeed = 10;
    
    let targetVelocity = 0;
    
    const leftEdge = Math.min(rect.left, edgeThreshold);
    if (mouseX < leftEdge + edgeThreshold) {
      const distance = leftEdge + edgeThreshold - mouseX;
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = -maxSpeed * intensity * intensity;
    } else if (mouseX > viewportWidth - edgeThreshold) {
      const distance = mouseX - (viewportWidth - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    } else if (mouseX > rect.right - edgeThreshold && mouseX <= rect.right) {
      const distance = mouseX - (rect.right - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    }
    
    scrollVelocity.current += (targetVelocity - scrollVelocity.current) * 0.15;
    
    if (!animationRef.current && Math.abs(scrollVelocity.current) > 0.1) {
      animationRef.current = requestAnimationFrame(smoothScroll);
    }
  }, [smoothScroll]);

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
      setDragPreview((current) => current ? { ...current, x: e.clientX, y: e.clientY } : current);
      calculateScrollVelocity(e.clientX);
    }
  }, [draggedLead, calculateScrollVelocity]);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
      setDragPreview((current) => current ? { ...current, x: e.clientX, y: e.clientY } : current);
      calculateScrollVelocity(e.clientX);
    }
  }, [draggedLead, calculateScrollVelocity]);

  useEffect(() => {
    if (draggedLead) {
      document.addEventListener('dragover', handleGlobalDragOver);
      return () => {
        document.removeEventListener('dragover', handleGlobalDragOver);
      };
    }
  }, [draggedLead, handleGlobalDragOver]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [handleGlobalDragOver]);

  const displayedStages = useMemo(() => 
    filteredStageId 
      ? stages.filter(stage => stage.id === filteredStageId)
      : stages,
    [stages, filteredStageId]
  );

  useEffect(() => {
    updateScrollIndicators();
  }, [displayedStages, updateScrollIndicators]);

  useEffect(() => {
    const el = containerRef.current;
    const top = topScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      updateScrollIndicators();
      if (syncingRef.current === 'top') { syncingRef.current = null; return; }
      if (top) {
        syncingRef.current = 'bottom';
        top.scrollLeft = el.scrollLeft;
      }
    };
    const onTopScroll = () => {
      if (syncingRef.current === 'bottom') { syncingRef.current = null; return; }
      syncingRef.current = 'top';
      el.scrollLeft = top!.scrollLeft;
    };
    const onResize = () => updateScrollIndicators();
    el.addEventListener('scroll', onScroll, { passive: true });
    top?.addEventListener('scroll', onTopScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollIndicators) : null;
    if (ro) ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      top?.removeEventListener('scroll', onTopScroll);
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, [updateScrollIndicators]);

  const previewDisplayName = dragPreview
    ? dragPreview.lead.contact_name || dragPreview.lead.company_name || formatPhoneShort(dragPreview.lead.phone)
    : '';

  return (
    <div className="relative flex-1 h-full flex flex-col">
      {/* Top horizontal scroll proxy */}
      <div
        ref={topScrollRef}
        className="kanban-scroll overflow-x-auto overflow-y-hidden mb-1"
        style={{ height: 8 }}
      >
        <div ref={topScrollInnerRef} style={{ height: 1 }} />
      </div>
      <div
        ref={containerRef}
        className={cn(
          "kanban-scroll-hide flex gap-3 sm:gap-4 overflow-x-auto overflow-y-hidden flex-1 snap-x snap-mandatory sm:snap-none",
          draggedLead && "cursor-grabbing select-none",
          filteredStageId && "justify-center"
        )}
        onDragOver={handleContainerDragOver}
      >
        {displayedStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage.get(stage.id) || []}
            onLeadClick={onLeadClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={() => handleDragOver(stage.id)}
            onDrop={() => handleDrop(stage.id)}
            isDragOver={dragOverStage === stage.id}
            isDragging={!!draggedLead}
            isExpanded={!!filteredStageId}
            selectedLeadId={selectedLead?.id}
            bulkSelectMode={bulkSelectMode}
            selectedLeadIds={selectedLeadIds}
            onSelectAllInColumn={onSelectAllInColumn}
            onUpdateLeadName={onUpdateLeadName}
            columnWidth={columnWidth}
            isAgentSilenced={agentSilencedStages?.has(stage.name)}
            onAddLead={onAddLead}
            members={members}
            onChangeResponsible={onChangeResponsible}
            canChangeResponsible={canChangeResponsible}
            hideValue={hideValue}
          />
        ))}
      </div>

      {dragPreview && (
        <div
          className="pointer-events-none fixed left-0 top-0 z-[80] opacity-100 will-change-transform"
          style={{
            width: dragPreview.width,
            transform: `translate3d(${dragPreview.x - dragPreview.offsetX}px, ${dragPreview.y - dragPreview.offsetY}px, 0) rotate(-1deg)`,
          }}
        >
          <div className="rounded-[18px] border border-primary/35 bg-card p-5 shadow-2xl shadow-foreground/20 ring-2 ring-primary/20">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h4 className="font-medium text-sm text-foreground min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                {previewDisplayName}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5 min-w-0">
              <Phone className="w-3 h-3 shrink-0" />
              <span className="truncate min-w-0">{formatPhoneShort(dragPreview.lead.phone)}</span>
            </div>
            {dragPreview.lead.whatsapp_status && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0 text-[10px] font-medium",
                  WHATSAPP_STATUS_COLORS[dragPreview.lead.whatsapp_status]
                )}
              >
                {WHATSAPP_STATUS_LABELS[dragPreview.lead.whatsapp_status]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>

  );
};

export const KanbanBoardWithScroll = memo(KanbanBoardWithScrollComponent);
