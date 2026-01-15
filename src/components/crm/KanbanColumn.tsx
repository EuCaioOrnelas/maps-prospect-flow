import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

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
  isDragging?: boolean;
  isExpanded?: boolean;
  bulkSelectMode?: boolean;
  selectedLeadIds?: Set<string>;
  onSelectAllInColumn?: (stageId: string, leadIds: string[]) => void;
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
  isDragging,
  isExpanded,
  bulkSelectMode,
  selectedLeadIds,
  onSelectAllInColumn,
  onUpdateLeadName,
}: KanbanColumnProps) => {
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0);
  const allLeadsInColumnSelected = leads.length > 0 && leads.every(l => selectedLeadIds?.has(l.id));

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
        "flex flex-col bg-muted/30 rounded-xl border-2 transition-all duration-300 ease-out shrink-0",
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
      <div className="p-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {bulkSelectMode && leads.length > 0 && (
              <Checkbox
                checked={allLeadsInColumnSelected}
                onCheckedChange={() => {
                  if (onSelectAllInColumn) {
                    onSelectAllInColumn(stage.id, leads.map(l => l.id));
                  }
                }}
              />
            )}
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-transform duration-300",
                isDragOver && "scale-125"
              )}
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="text-xs font-medium text-foreground truncate">
              {stage.name}
            </h3>
          </div>
          <span className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors duration-300",
            isDragOver 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/10 text-primary"
          )}>
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <p className="text-[10px] text-muted-foreground">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1" viewportClassName="pr-3">
        <div className="space-y-1 p-1.5 w-full">
          {leads.map((lead) => (
            <div key={lead.id} className="relative">
              {bulkSelectMode && (
                <div 
                  className="absolute top-2 right-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
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
                onUpdateName={onUpdateLeadName}
              />
            </div>
          ))}
          {leads.length === 0 && (
            <div className={cn(
              "py-4 text-center text-sm border-2 border-dashed rounded-lg transition-all duration-300",
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
