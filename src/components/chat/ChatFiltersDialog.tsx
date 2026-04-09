import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { Tag, BarChart3, Columns3, Loader2 } from "lucide-react";
...
              <div className="flex flex-wrap gap-2">
                {availableTags.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground">Nenhuma tag encontrada no CRM</span>
                ) : (
                  availableTags.map(tag => (
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
