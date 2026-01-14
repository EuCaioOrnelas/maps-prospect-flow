import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface KanbanColumnDraggableProps {
  stage: PipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDragStart: (leadId: string) => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  isDragOver: boolean;
  selectedLeadId?: string;
  isDragging?: boolean;
  isExpanded?: boolean;
  bulkSelectMode?: boolean;
  selectedLeadIds?: Set<string>;
}

export const KanbanColumnDraggable = ({
  stage,
  leads,
  onLeadClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  selectedLeadId,
  isDragging,
  isExpanded,
  bulkSelectMode,
  selectedLeadIds,
}: KanbanColumnDraggableProps) => {

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver();
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-muted/30 rounded-xl border-2 transition-all duration-300 ease-out",
        isExpanded ? "w-full max-w-2xl" : "w-72 min-w-[288px]",
        isDragOver 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
          : "border-border/50",
        isDragging && !isDragOver && "opacity-70"
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full transition-transform duration-300",
                isDragOver && "scale-125"
              )}
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-sm text-foreground truncate">
              {stage.name}
            </h3>
          </div>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full transition-colors duration-300",
            isDragOver 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10 text-primary"
          )}>
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {leads.map((lead) => (
            <div key={lead.id} className="relative">
              {bulkSelectMode && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox 
                    checked={selectedLeadIds?.has(lead.id)}
                    onCheckedChange={() => onLeadClick(lead)}
                  />
                </div>
              )}
              <LeadCard
                lead={lead}
                onClick={() => onLeadClick(lead)}
                onDragStart={() => onDragStart(lead.id)}
                onDragEnd={onDragEnd}
                isSelected={bulkSelectMode ? selectedLeadIds?.has(lead.id) : selectedLeadId === lead.id}
              />
            </div>
          ))}
          {leads.length === 0 && (
            <div className={cn(
              "text-center py-8 text-sm border-2 border-dashed rounded-lg transition-all duration-300",
              isDragOver 
                ? "border-primary bg-primary/10 text-primary font-medium" 
                : "border-muted-foreground/30 text-muted-foreground"
            )}>
              {isDragOver ? "Solte aqui" : "Nenhum lead"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
