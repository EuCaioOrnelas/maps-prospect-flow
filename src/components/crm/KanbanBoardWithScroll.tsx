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
  const animationRef = useRef<number | null>(null);
  const scrollVelocity = useRef(0);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
    scrollVelocity.current = 0;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
    scrollVelocity.current = 0;
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  // Smooth scroll animation loop
  const smoothScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    if (Math.abs(scrollVelocity.current) > 0.5) {
      containerRef.current.scrollLeft += scrollVelocity.current;
      // Apply friction to slow down gradually
      scrollVelocity.current *= 0.95;
      animationRef.current = requestAnimationFrame(smoothScroll);
    } else {
      scrollVelocity.current = 0;
      animationRef.current = null;
    }
  }, []);

  // Handle container drag over with smooth acceleration
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    if (!containerRef.current || !draggedLead) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX;
    
    const edgeThreshold = 120; // pixels from edge to start scrolling
    const maxSpeed = 8; // maximum scroll speed
    
    let targetVelocity = 0;
    
    // Check if near left edge
    if (mouseX < rect.left + edgeThreshold) {
      const distance = rect.left + edgeThreshold - mouseX;
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = -maxSpeed * intensity * intensity; // Quadratic for smoother start
    }
    // Check if near right edge
    else if (mouseX > rect.right - edgeThreshold) {
      const distance = mouseX - (rect.right - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity; // Quadratic for smoother start
    }
    
    // Smoothly interpolate to target velocity
    scrollVelocity.current += (targetVelocity - scrollVelocity.current) * 0.15;
    
    // Start animation if not running and we have velocity
    if (!animationRef.current && Math.abs(scrollVelocity.current) > 0.1) {
      animationRef.current = requestAnimationFrame(smoothScroll);
    }
  }, [draggedLead, smoothScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex gap-4 overflow-x-auto pb-4 h-full",
        draggedLead && "cursor-grabbing select-none"
      )}
      onDragOver={handleContainerDragOver}
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
