import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { KanbanColumn, type ColumnWidth } from './KanbanColumn';
import { cn } from '@/lib/utils';

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
}: KanbanBoardWithScrollProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const scrollVelocity = useRef(0);

  const handleDragStart = useCallback((leadId: string) => {
    setDraggedLead(leadId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDragOverStage(null);
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
      calculateScrollVelocity(e.clientX);
    }
  }, [draggedLead, calculateScrollVelocity]);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
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

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex gap-3 sm:gap-4 overflow-x-auto pb-4 h-full snap-x snap-mandatory sm:snap-none",
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
        />
      ))}
    </div>
  );
};

export const KanbanBoardWithScroll = memo(KanbanBoardWithScrollComponent);
