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

  // Calculate scroll velocity based on mouse position - works globally
  const calculateScrollVelocity = useCallback((mouseX: number) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Use the full viewport width for edge detection
    const viewportWidth = window.innerWidth;
    const edgeThreshold = 150; // pixels from viewport edge to start scrolling
    const maxSpeed = 10; // maximum scroll speed
    
    let targetVelocity = 0;
    
    // Check if near left edge of viewport OR container
    const leftEdge = Math.min(rect.left, edgeThreshold);
    if (mouseX < leftEdge + edgeThreshold) {
      const distance = leftEdge + edgeThreshold - mouseX;
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = -maxSpeed * intensity * intensity;
    }
    // Check if near right edge of viewport OR container
    else if (mouseX > viewportWidth - edgeThreshold) {
      const distance = mouseX - (viewportWidth - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    }
    // Also check if near right edge of container
    else if (mouseX > rect.right - edgeThreshold && mouseX <= rect.right) {
      const distance = mouseX - (rect.right - edgeThreshold);
      const intensity = Math.min(1, distance / edgeThreshold);
      targetVelocity = maxSpeed * intensity * intensity;
    }
    
    // Smoothly interpolate to target velocity
    scrollVelocity.current += (targetVelocity - scrollVelocity.current) * 0.15;
    
    // Start animation if not running and we have velocity
    if (!animationRef.current && Math.abs(scrollVelocity.current) > 0.1) {
      animationRef.current = requestAnimationFrame(smoothScroll);
    }
  }, [smoothScroll]);

  // Global drag handler - works anywhere on the page
  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
      calculateScrollVelocity(e.clientX);
    }
  }, [draggedLead, calculateScrollVelocity]);

  // Container drag over handler
  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedLead) {
      calculateScrollVelocity(e.clientX);
    }
  }, [draggedLead, calculateScrollVelocity]);

  // Add global drag listener when dragging starts
  useEffect(() => {
    if (draggedLead) {
      document.addEventListener('dragover', handleGlobalDragOver);
      return () => {
        document.removeEventListener('dragover', handleGlobalDragOver);
      };
    }
  }, [draggedLead, handleGlobalDragOver]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      document.removeEventListener('dragover', handleGlobalDragOver);
    };
  }, [handleGlobalDragOver]);

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
