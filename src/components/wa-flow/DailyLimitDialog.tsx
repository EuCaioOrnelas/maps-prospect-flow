import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface DailyLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remaining: number;
}

export function DailyLimitDialog({ open, onOpenChange, remaining }: DailyLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-border">
        {/* Header */}
        <div className="bg-amber-500/5 border-b border-border px-6 py-5 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-14 h-14 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center mx-auto mb-3"
          >
            <AlertTriangle className="w-7 h-7 text-amber-500" />
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">Limite diário atingido</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Você já criou <strong>3 fluxos com IA</strong> hoje
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Por que existe esse limite?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A geração com IA utiliza recursos intensivos de processamento. O limite de 3 criações 
                por dia garante uma experiência rápida e de qualidade para todos os usuários.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Clock size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Quando posso criar novamente?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O limite é resetado diariamente à meia-noite. Você também pode criar fluxos 
                em branco sem limite e montar manualmente via drag-and-drop.
              </p>
            </div>
          </div>
        </div>

        {/* Action */}
        <div className="px-6 py-4 border-t border-border bg-card/50">
          <Button onClick={() => onOpenChange(false)} className="w-full rounded-full">
            Entendi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
