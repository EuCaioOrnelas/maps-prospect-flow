import { memo, useMemo, useCallback } from 'react';
import { type Lead, type PipelineStage } from '@/hooks/useCRM';
import { LeadCard } from './LeadCard';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';

export type ColumnWidth = 'compact' | 'medium' | 'large';

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
  showTotalValue?: boolean;
  bulkSelectMode?: boolean;
  selectedLeadIds?: Set<string>;
  onSelectAllInColumn?: (stageId: string, leadIds: string[]) => void;
  onUpdateLeadName?: (leadId: string, newName: string) => Promise<void>;
  columnWidth?: ColumnWidth;
  isAgentSilenced?: boolean;
  onAddLead?: (stageId: string) => void;
}

const getColumnWidthClass = (width: ColumnWidth, isExpanded: boolean): string => {
  if (isExpanded) return 'w-full max-w-2xl';
  
  switch (width) {
    case 'compact':
      return 'w-[75vw] min-w-[224px] sm:w-56 snap-center';
    case 'large':
      return 'w-[80vw] min-w-[280px] sm:w-80 snap-center';
    case 'medium':
    default:
      return 'w-[78vw] min-w-[260px] sm:w-72 snap-center';
  }
};

const KanbanColumnComponent = ({
  stage,
  leads,
  onLeadClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragOver,
  selectedLeadId,
  isDragging = false,
  isExpanded = false,
  showTotalValue = true,
  bulkSelectMode = false,
  selectedLeadIds,
  onSelectAllInColumn,
  onUpdateLeadName,
  columnWidth = 'medium',
  isAgentSilenced = false,
  onAddLead,
}: KanbanColumnProps) => {
  const totalValue = useMemo(() => 
    leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0),
    [leads]
  );
  
  const allLeadsInColumnSelected = useMemo(() => 
    leads.length > 0 && leads.every(l => selectedLeadIds?.has(l.id)),
    [leads, selectedLeadIds]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOver();
  }, [onDragOver]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDrop();
  }, [onDrop]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver();
  }, [onDragOver]);

  return (
    <div
      className={cn(
        "flex flex-col bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-white/[0.02] backdrop-blur-xl rounded-xl border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] transition-all duration-200 h-full overflow-hidden will-change-transform",
        getColumnWidthClass(columnWidth, isExpanded),
        isDragOver 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
          : "border-border/50",
        isDragging && !isDragOver && "opacity-70"
      )}
      style={{ transform: 'translateZ(0)' }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="p-3 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 min-w-0">
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
                "w-3 h-3 rounded-full shrink-0 transition-transform duration-200",
                isDragOver && "scale-125"
              )}
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-medium text-sm text-foreground truncate">
              {stage.name}
            </h3>
          </div>
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors duration-200",
            isDragOver 
              ? "bg-primary text-primary-foreground" 
              : "bg-primary/15 text-primary"
          )}>
            {leads.length}
          </span>
        </div>
        {isAgentSilenced && (
          <p className="text-[10px] text-muted-foreground/70 mt-1 leading-tight">
            🤖 Agente não responde leads nesta coluna
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1" style={{ transform: 'translateZ(0)', willChange: 'scroll-position' }}>
        <div className="p-2 space-y-2 w-full min-w-0">
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
              "text-center py-8 text-sm border-2 border-dashed rounded-lg transition-colors duration-200",
              isDragOver 
                ? "border-primary bg-primary/10 text-primary font-medium" 
                : "border-muted-foreground/30 text-muted-foreground"
            )}>
              {isDragOver ? "Solte aqui" : "Nenhum lead"}
            </div>
          )}
          {onAddLead && (
            <button
              onClick={() => onAddLead(stage.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 mt-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground/60 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo lead
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const KanbanColumn = memo(KanbanColumnComponent);
