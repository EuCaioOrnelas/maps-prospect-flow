import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';

import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { KanbanColumn, type ColumnWidth } from './KanbanColumn';
import { cn } from '@/lib/utils';
import { MessageCircle, Phone } from 'lucide-react';
import { formatPhoneShort } from '@/lib/phoneUtils';
import { useLeadScores } from '@/hooks/useLeadScores';
import { usePhonePrivacy, maskPhoneTail } from '@/hooks/usePhonePrivacy';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type CardDragStartEvent = { clientX: number; clientY: number; currentTarget: HTMLDivElement };

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
  const { hidden: phoneHidden } = usePhonePrivacy();
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
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const dragPositionRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const dragScrollBoundsRef = useRef<{ left: number; right: number; viewportWidth: number } | null>(null);
  const dragOverStageRef = useRef<string | null>(null);
  const syncingRef = useRef<'top' | 'bottom' | null>(null);
  const animationRef = useRef<number | null>(null);
  const dragPreviewAnimationRef = useRef<number | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
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

  const getDragPreviewTransform = useCallback(() => {
    const { x, y, offsetX, offsetY } = dragPositionRef.current;
    return `translate3d(${Math.round(x - offsetX)}px, ${Math.round(y - offsetY)}px, 0) rotate(-0.5deg)`;
  }, []);

  const applyDragPreviewPosition = useCallback(() => {
    dragPreviewAnimationRef.current = null;
    const preview = dragPreviewRef.current;
    if (!preview) return;

    preview.style.transform = getDragPreviewTransform();
  }, [getDragPreviewTransform]);

  const scheduleDragPreviewPosition = useCallback((x: number, y: number) => {
    dragPositionRef.current.x = x;
    dragPositionRef.current.y = y;

    if (dragPreviewAnimationRef.current === null) {
      dragPreviewAnimationRef.current = requestAnimationFrame(applyDragPreviewPosition);
    }
  }, [applyDragPreviewPosition]);

  const getStageIdFromPoint = useCallback((x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    return element instanceof HTMLElement ? element.closest<HTMLElement>('[data-stage-id]')?.dataset.stageId || null : null;
  }, []);

  const handleDragStart = useCallback((leadId: string, event: CardDragStartEvent) => {
    const lead = leads.find((item) => item.id === leadId);
    const rect = event.currentTarget.getBoundingClientRect();
    const previewWidth = Math.min(240, rect.width);
    const offsetX = Math.min(Math.max(event.clientX - rect.left, 28), previewWidth - 28);
    const offsetY = Math.min(Math.max(event.clientY - rect.top, 18), 44);

    dragPositionRef.current = { x: event.clientX, y: event.clientY, offsetX, offsetY };
    const containerRect = containerRef.current?.getBoundingClientRect();
    dragScrollBoundsRef.current = containerRect
      ? { left: containerRect.left, right: containerRect.right, viewportWidth: window.innerWidth }
      : null;
    setDraggedLead(leadId);
    if (lead) {
      setDragPreview({
        lead,
        x: event.clientX,
        y: event.clientY,
        offsetX,
        offsetY,
        width: previewWidth,
      });
      scheduleDragPreviewPosition(event.clientX, event.clientY);
    }
  }, [leads, scheduleDragPreviewPosition]);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStage(null);
    dragOverStageRef.current = null;
    setDragPreview(null);
    dragScrollBoundsRef.current = null;
    scrollVelocity.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (dragPreviewAnimationRef.current) {
      cancelAnimationFrame(dragPreviewAnimationRef.current);
      dragPreviewAnimationRef.current = null;
    }
    if (pointerFrameRef.current) {
      cancelAnimationFrame(pointerFrameRef.current);
      pointerFrameRef.current = null;
    }
  }, []);

  const handleDragOver = useCallback((stageId: string) => {
    if (dragOverStageRef.current === stageId) return;
    dragOverStageRef.current = stageId;
    setDragOverStage(stageId);
  }, []);

  const handleDrop = useCallback((stageId: string | null) => {
    if (draggedLead) {
      const lead = leads.find((item) => item.id === draggedLead);
      if (stageId && lead?.pipeline_stage_id !== stageId) {
        onLeadMove(draggedLead, stageId);
      }
    }
    handleDragEnd();
  }, [draggedLead, leads, onLeadMove, handleDragEnd]);

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
    
    const bounds = dragScrollBoundsRef.current || (() => {
      const rect = containerRef.current?.getBoundingClientRect();
      return rect ? { left: rect.left, right: rect.right, viewportWidth: window.innerWidth } : null;
    })();
    if (!bounds) return;
    const edgeThreshold = 110;
    const maxSpeed = 6;
    
    let targetVelocity = 0;
    
    const leftEdge = Math.min(bounds.left, edgeThreshold);
    if (mouseX < leftEdge + edgeThreshold) {
      const distance = leftEdge + edgeThreshold - mouseX;
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = -maxSpeed * intensity * intensity;
    } else if (mouseX > bounds.viewportWidth - edgeThreshold) {
      const distance = mouseX - (bounds.viewportWidth - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    } else if (mouseX > bounds.right - edgeThreshold && mouseX <= bounds.right) {
      const distance = mouseX - (bounds.right - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    }
    
    scrollVelocity.current += (targetVelocity - scrollVelocity.current) * 0.08;
    
    if (!animationRef.current && Math.abs(scrollVelocity.current) > 0.1) {
      animationRef.current = requestAnimationFrame(smoothScroll);
    }
  }, [smoothScroll]);


  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!draggedLead) return;
    e.preventDefault();
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    // Update the visual preview transform every frame (cheap).
    scheduleDragPreviewPosition(e.clientX, e.clientY);
    // Throttle the expensive work (elementFromPoint + edge scroll) to one RAF.
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      const p = lastPointerRef.current;
      if (!p) return;
      const nextStageId = getStageIdFromPoint(p.x, p.y);
      if (dragOverStageRef.current !== nextStageId) {
        dragOverStageRef.current = nextStageId;
        setDragOverStage(nextStageId);
      }
      calculateScrollVelocity(p.x);
    });
  }, [draggedLead, calculateScrollVelocity, getStageIdFromPoint, scheduleDragPreviewPosition]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    handleDrop(getStageIdFromPoint(e.clientX, e.clientY));
  }, [getStageIdFromPoint, handleDrop]);

  useEffect(() => {
    if (draggedLead) {
      document.addEventListener('pointermove', handlePointerMove, { passive: false });
      document.addEventListener('pointerup', handlePointerUp, { once: true });
      document.addEventListener('pointercancel', handleDragEnd, { once: true });
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handleDragEnd);
      };
    }
  }, [draggedLead, handleDragEnd, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (dragPreviewAnimationRef.current) {
        cancelAnimationFrame(dragPreviewAnimationRef.current);
      }
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handleDragEnd);
    };
  }, [handleDragEnd, handlePointerMove, handlePointerUp]);

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
  const previewPhone = dragPreview
    ? (phoneHidden ? maskPhoneTail(formatPhoneShort(dragPreview.lead.phone)) : formatPhoneShort(dragPreview.lead.phone))
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
      >
        {displayedStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={leadsByStage.get(stage.id) || []}
            onLeadClick={onLeadClick}
            onDragStart={handleDragStart}
            onDragOver={() => handleDragOver(stage.id)}
            isDragOver={dragOverStage === stage.id}
            draggedLeadId={draggedLead}
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

      {dragPreview && (() => {
        const lead = dragPreview.lead;
        const score = getScoreForPhone(lead.phone);
        const s = score ? Math.max(0, Math.min(score.score_total, 1000)) : 0;
        const pct = (s / 1000) * 100;
        const bg = s >= 750 ? 'bg-emerald-500' : s >= 500 ? 'bg-blue-500' : s >= 250 ? 'bg-orange-500' : 'bg-red-500';
        const fg = s >= 750 ? 'text-emerald-500' : s >= 500 ? 'text-blue-500' : s >= 250 ? 'text-orange-500' : 'text-red-500';
        return (
          <div
            ref={dragPreviewRef}
            className="pointer-events-none fixed left-0 top-0 z-[80] will-change-transform"
            style={{
              width: dragPreview.width,
              transform: getDragPreviewTransform(),
            }}
          >
            <div className="rounded-xl border border-primary/30 bg-card px-3 py-2.5 shadow-md shadow-foreground/5 overflow-hidden">
              <div className="flex flex-col gap-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {previewDisplayName}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="truncate min-w-0">{previewPhone}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 min-w-0">
                {score && score.score_total > 0 && (
                  <>
                    <span className={cn("text-[11px] font-semibold tabular-nums shrink-0", fg)}>{s}</span>
                    <div className="relative h-1 flex-1 rounded-full bg-muted/60 overflow-hidden">
                      <div className={cn("h-full rounded-full", bg)} style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
                {lead.last_response_at && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto min-w-0 shrink-0">
                    <MessageCircle className="w-3 h-3 shrink-0" />
                    <span className="truncate min-w-0">
                      {formatDistanceToNow(new Date(lead.last_response_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>

  );
};

export const KanbanBoardWithScroll = memo(KanbanBoardWithScrollComponent);
