import { useState } from 'react';
import { useCRM, type Lead, type PipelineStage } from '@/hooks/useCRM';
import { KanbanColumn } from './KanbanColumn';
import { LeadDetailPanel } from './LeadDetailPanel';
import { cn } from '@/lib/utils';

interface KanbanBoardProps {
  stages: PipelineStage[];
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadMove: (leadId: string, stageId: string) => void;
  selectedLead: Lead | null;
  onUpdateLeadName?: (leadId: string, newName: string) => Promise<void>;
}

export const KanbanBoard = ({
  stages,
  leads,
  onLeadClick,
  onLeadMove,
  selectedLead,
  onUpdateLeadName,
}: KanbanBoardProps) => {
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
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
  };

  const getLeadsByStage = (stageId: string) => {
    return leads.filter(lead => lead.pipeline_stage_id === stageId);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {stages.map((stage) => (
        <KanbanColumn
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
          onUpdateLeadName={onUpdateLeadName}
        />
      ))}
    </div>
  );
};
