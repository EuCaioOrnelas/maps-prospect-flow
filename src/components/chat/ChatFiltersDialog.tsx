import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Tag, BarChart3, Columns3, X } from "lucide-react";

export interface ChatFilterConfig {
  tags: string[];
  crmStages: string[];
  scoreMin: number;
  scoreMax: number;
}

interface ChatFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ChatFilterConfig;
  onApply: (filters: ChatFilterConfig) => void;
  availableTags?: string[];
  availableStages?: string[];
}

const DEFAULT_TAGS = ["Cliente", "Lead", "Parceiro", "VIP", "Suporte", "Novo"];
const DEFAULT_STAGES = ["Novo Lead", "Em contato", "Qualificado", "Proposta", "Fechado"];

export function ChatFiltersDialog({
  open,
  onOpenChange,
  filters,
  onApply,
  availableTags = DEFAULT_TAGS,
  availableStages = DEFAULT_STAGES,
}: ChatFiltersDialogProps) {
  const [local, setLocal] = useState<ChatFilterConfig>(filters);

  const toggleTag = (tag: string) => {
    setLocal(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const toggleStage = (stage: string) => {
    setLocal(prev => ({
      ...prev,
      crmStages: prev.crmStages.includes(stage)
        ? prev.crmStages.filter(s => s !== stage)
        : [...prev.crmStages, stage],
    }));
  };

  const activeCount = local.tags.length + local.crmStages.length + (local.scoreMin > 0 || local.scoreMax < 1000 ? 1 : 0);

  const handleApply = () => {
    onApply(local);
    onOpenChange(false);
  };

  const handleClear = () => {
    const cleared: ChatFilterConfig = { tags: [], crmStages: [], scoreMin: 0, scoreMax: 1000 };
    setLocal(cleared);
    onApply(cleared);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] wa-dropdown-bg border wa-border rounded-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] font-semibold wa-text-primary flex items-center gap-2">
            Filtros personalizados
            {activeCount > 0 && (
              <span className="text-[11px] bg-[#00a884] text-white px-2 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-5 max-h-[60vh] overflow-y-auto wa-scrollbar">
          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-[#00a884]" />
              <span className="text-[13px] font-semibold wa-text-primary">Tags do CRM</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 border",
                    local.tags.includes(tag)
                      ? "bg-[#00a884] text-white border-[#00a884]"
                      : "wa-text-muted border-white/10 hover:border-[#00a884]/40 hover:text-[#00a884]"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* CRM Stages */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Columns3 size={14} className="text-[#00a884]" />
              <span className="text-[13px] font-semibold wa-text-primary">Etapa no CRM</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableStages.map(stage => (
                <button
                  key={stage}
                  onClick={() => toggleStage(stage)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 border",
                    local.crmStages.includes(stage)
                      ? "bg-[#00a884] text-white border-[#00a884]"
                      : "wa-text-muted border-white/10 hover:border-[#00a884]/40 hover:text-[#00a884]"
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[#00a884]" />
              <span className="text-[13px] font-semibold wa-text-primary">Score do contato</span>
            </div>
            <div className="px-1">
              <Slider
                value={[local.scoreMin, local.scoreMax]}
                min={0}
                max={1000}
                step={50}
                onValueChange={([min, max]) => setLocal(prev => ({ ...prev, scoreMin: min, scoreMax: max }))}
                className="mb-2"
              />
              <div className="flex justify-between text-[11px] wa-text-muted">
                <span>{local.scoreMin} pts</span>
                <span>{local.scoreMax} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t wa-border-light">
          <button
            onClick={handleClear}
            className="flex-1 py-2 rounded-lg text-[13px] font-medium wa-text-muted hover:bg-white/5 transition-colors"
          >
            Limpar filtros
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 rounded-lg text-[13px] font-semibold bg-[#00a884] hover:bg-[#06cf9c] text-white transition-colors"
          >
            Aplicar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
