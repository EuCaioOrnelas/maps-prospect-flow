import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ComingSoonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
}

export const ComingSoonDialog = ({ open, onOpenChange, title }: ComingSoonDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md border-border/50 bg-card">
      <DialogHeader className="text-center items-center space-y-4 pt-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring" }}
          className="w-20 h-20 rounded-[22px] bg-primary/10 border border-primary/20 flex items-center justify-center"
        >
          <Lock size={32} className="text-primary" />
        </motion.div>
        <DialogTitle className="text-xl font-bold text-foreground">
          Conteúdo em desenvolvimento
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm">
          {title ? (
            <>
              <span className="font-medium text-foreground/80">"{title}"</span> ainda está sendo preparado pela nossa equipe.
            </>
          ) : (
            "Este conteúdo ainda está sendo preparado pela nossa equipe."
          )}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
          <Clock size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Será liberado em breve</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estamos finalizando o material para garantir a melhor qualidade possível.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
          <Sparkles size={18} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Conteúdo exclusivo</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estratégias avançadas e práticas para maximizar seus resultados com a Wiize.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onOpenChange(false)}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
      >
        Entendi, vou aguardar!
      </button>
    </DialogContent>
  </Dialog>
);
