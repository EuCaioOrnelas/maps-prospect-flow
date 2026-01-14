import { useState, useRef, useCallback, useEffect } from 'react';
import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { KanbanColumnDraggable } from './KanbanColumnDraggable';
import { cn } from '@/lib/utils';

interface KanbanBoardWithScrollProps {
  stages: PipelineStage[];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadMove: (leadId: string, stageId: string) => void;
  selectedLead: Lead | null;
}

export const KanbanBoardWithScroll = ({
  stages,
  leads,
  onLeadClick,
  onLeadMove,
  selectedLead,
}: KanbanBoardWithScrollProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
    stopAutoScroll();
  };

  const handleDragOver = (stageId: string) => {
    setDragOverStage(stageId);
  };

  const handleDrop = (stageId: string) => {
    if (draggedLead) {
      onLeadMove(draggedLead, stageId);
    }
    setDraggedLead(null);
    setDragOverStage(null);
    stopAutoScroll();
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  // Auto-scroll logic
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!containerRef.current || !draggedLead) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX;
    
    const edgeThreshold = 100; // pixels from edge to start scrolling
    const scrollSpeed = 15; // pixels per frame
    
    // Check if near left edge
    if (mouseX < rect.left + edgeThreshold) {
      const distance = rect.left + edgeThreshold - mouseX;
      const speed = Math.min(scrollSpeed, (distance / edgeThreshold) * scrollSpeed);
      container.scrollLeft -= speed;
    }
    // Check if near right edge
    else if (mouseX > rect.right - edgeThreshold) {
      const distance = mouseX - (rect.right - edgeThreshold);
      const speed = Math.min(scrollSpeed, (distance / edgeThreshold) * scrollSpeed);
      container.scrollLeft += speed;
    }
  }, [draggedLead]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex gap-4 overflow-x-auto pb-4 h-full scroll-smooth",
        draggedLead && "cursor-grabbing"
      )}
      onDragOver={handleContainerDragOver}
      style={{ scrollBehavior: draggedLead ? 'auto' : 'smooth' }}
    >
      {stages.map((stage) => (
        <KanbanColumnDraggable
          key={stage.id}
          stage={stage}
          leads={getLeadsByStage(stage.id)}
          onLeadClick={onLeadClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={() => handleDragOver(stage.id)}
          onDrop={() => handleDrop(stage.id)}
          isDragOver={dragOverStage === stage.id}
          selectedLeadId={selectedLead?.id}
          isDragging={!!draggedLead}
        />
      ))}
    </div>
  );
};
