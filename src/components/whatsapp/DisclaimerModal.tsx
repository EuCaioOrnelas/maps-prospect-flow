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
import { AlertTriangle, Shield, MessageSquare, Clock } from "lucide-react";
import { usePagePopupDismiss } from "@/hooks/usePagePopupDismiss";

export function DisclaimerModal() {
  const { showPopup, dismiss, canClose, countdown } = usePagePopupDismiss("whatsapp_disclaimer");

  return (
    <Dialog open={showPopup} onOpenChange={() => { if (canClose) dismiss(); }}>
      <DialogContent className="sm:max-w-lg border-border/50 bg-gradient-to-b from-card to-card/95" onPointerDownOutside={(e) => { if (!canClose) e.preventDefault(); }}>
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Aviso Importante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A Wiize utiliza diversas estratégias para reduzir riscos e prolongar a vida útil dos números, como:
          </p>

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
              <span className="text-xs">Mensagens aleatórias</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 border border-border/50">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs">API oficial do WhatsApp</span>
            </div>
          </div>

          <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mesmo assim, <strong className="text-foreground">bloqueios podem acontecer</strong> por motivos que não dependem da ferramenta, como:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Denúncias de usuários</li>
              <li>Suspeita de spam ou golpe</li>
              <li>Número recente sem aquecimento</li>
              <li>Conteúdo das mensagens</li>
              <li>Outros critérios do próprio WhatsApp</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground text-center italic">
            A Wiize não se responsabiliza por bloqueios, pois essas decisões são exclusivas do WhatsApp.
          </p>
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
            Ao continuar, você declara estar ciente desses riscos.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
