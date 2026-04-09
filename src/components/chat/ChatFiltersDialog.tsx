import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tag, BarChart3, Columns3, Loader2, Search } from "lucide-react";

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
  availableTags: string[];
  availableStages: string[];
  loading?: boolean;
}

export function ChatFiltersDialog({
  open,
  onOpenChange,
  filters,
  onApply,
  availableTags,
  availableStages,
  loading = false,
}: ChatFiltersDialogProps) {
  const [local, setLocal] = useState<ChatFilterConfig>(filters);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    if (open) {
      setLocal(filters);
      setTagSearch("");
    }
  }, [open, filters]);

  const filteredTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase();

    if (!normalizedSearch) return availableTags;

    return availableTags.filter((tag) => tag.toLowerCase().includes(normalizedSearch));
  }, [availableTags, tagSearch]);

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
    setTagSearch("");
    onApply(cleared);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-background border border-border rounded-2xl p-0 overflow-hidden gap-0 [&>button]:hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-[16px] font-semibold text-foreground flex items-center gap-2">
            Filtros personalizados
            {activeCount > 0 && (
              <span className="text-[11px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">
                {activeCount}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Tags */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-primary" />
                <span className="text-[13px] font-semibold text-foreground">Tags do CRM</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Inclui status como <strong className="text-foreground">Respondeu</strong>, <strong className="text-foreground">Em conversa</strong>, <strong className="text-foreground">Sem resposta</strong> e tags personalizadas.
              </p>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tagSearch}
                  onChange={(event) => setTagSearch(event.target.value)}
                  placeholder="Pesquisar tags do CRM"
                  className="h-9 rounded-xl border-border bg-muted/20 pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground">Nenhuma tag encontrada no CRM</span>
                ) : filteredTags.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground">Nenhuma tag encontrada para essa busca</span>
                ) : (
                  filteredTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 border",
                        local.tags.includes(tag)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {tag}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* CRM Stages */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Columns3 size={14} className="text-primary" />
                <span className="text-[13px] font-semibold text-foreground">Etapa no CRM</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableStages.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground">Nenhuma etapa encontrada</span>
                ) : (
                  availableStages.map(stage => (
                    <button
                      key={stage}
                      onClick={() => toggleStage(stage)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-150 border",
                        local.crmStages.includes(stage)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "text-muted-foreground border-border hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {stage}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Score */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-primary" />
                <span className="text-[13px] font-semibold text-foreground">Score do contato</span>
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
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{local.scoreMin} pts</span>
                  <span>{local.scoreMax} pts</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-border">
          <button
            onClick={handleClear}
            className="flex-1 py-2 rounded-full text-[13px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Limpar filtros
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2 rounded-full text-[13px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
          >
            Aplicar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
