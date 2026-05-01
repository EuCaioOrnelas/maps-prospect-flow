import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Shield, MessageSquare, Clock, AlertTriangle, Target, ExternalLink, Flame, Ban, FileText } from "lucide-react";
import { usePagePopupDismiss } from "@/hooks/usePagePopupDismiss";

export function DisclaimerModal() {
  const { showPopup, dismiss, canClose, countdown } = usePagePopupDismiss("whatsapp_disclaimer");

  return (
    <Dialog open={showPopup} onOpenChange={() => {}}>
      <DialogContent className="max-w-3xl border-border/50 bg-gradient-to-b from-card to-card/95" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold flex items-center justify-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Prospecção Ativa — API Inbound
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Leia atentamente antes de prosseguir
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* What this API is */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Zap size={20} className="text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">API exclusiva para aquisição de leads</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este módulo utiliza uma API inbound dedicada à <strong className="text-foreground">prospecção fria</strong>, 
                ideal para contatar leads que ainda não tiveram relacionamento prévio com você. 
                Diferente da API oficial da Meta (outbound/relacionamento), aqui você pode buscar novos clientes ativamente.
              </p>
            </div>
          </div>

          {/* Warning about Meta rules */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Cuidados e diretrizes obrigatórias</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mesmo sendo prospecção fria, é essencial seguir as <strong className="text-foreground">diretrizes de privacidade da Meta e do WhatsApp</strong>. 
                Quebrar essas regras, como enviar conteúdo abusivo, spam excessivo ou ignorar solicitações de opt-out, 
                pode resultar em <strong className="text-foreground">bloqueio do seu número</strong>.
              </p>
            </div>
          </div>

          {/* Protection strategies */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Nossas estratégias para reduzir riscos:</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs">Limite de 200 disparos/dia</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs">Delay e pausas inteligentes</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs">Variações aleatórias de texto</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
                <Shield className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs">Aquecimento progressivo</span>
              </div>
            </div>
          </div>

          {/* Final warning */}
          <p className="text-xs text-amber-500 text-center font-medium">
            ⚠️ Mesmo com todas as proteções, bloqueios podem ocorrer por fatores externos.
          </p>

          <a
            href="/diretrizes-de-envio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline justify-center"
          >
            <ExternalLink size={12} />
            Ver Diretrizes de Envio completas
          </a>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={dismiss} 
            disabled={!canClose}
            className="w-full"
            size="lg"
          >
            {canClose ? "Estou ciente, continuar" : `Aguarde ${countdown}s`}
          </Button>
          <p className="text-[10px] text-muted-foreground/70 text-center">
            A Wiize não se responsabiliza por bloqueios, pois essas decisões são exclusivas do WhatsApp.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
