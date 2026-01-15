import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface KanbanColumnProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  isDragOver: boolean;
  selectedLeadId?: string;
  onUpdateLeadName?: (leadId: string, newName: string) => Promise<void>;
}

export const KanbanColumn = ({
  stage,
  leads,
  onLeadClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  selectedLeadId,
  onUpdateLeadName,
}: KanbanColumnProps) => {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  };

  return (
    <div
      className={cn(
        "flex flex-col w-80 min-w-[320px] bg-muted/30 rounded-xl border border-border/50 transition-all duration-200",
        isDragOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-sm text-foreground truncate">
              {stage.name}
            </h3>
          </div>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-2">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              onDragStart={() => onDragStart(lead.id)}
              onDragEnd={onDragEnd}
              isSelected={selectedLeadId === lead.id}
              onUpdateName={onUpdateLeadName}
            />
          ))}
          {leads.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum lead nesta etapa
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
