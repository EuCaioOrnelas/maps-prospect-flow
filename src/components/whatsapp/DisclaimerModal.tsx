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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border/50 bg-gradient-to-b from-card to-card/95" hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-semibold flex items-center justify-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Prospecção Ativa — Leia antes de prosseguir
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

          {/* CRITICAL: Number must be warmed */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <Flame size={20} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm text-red-500">⚠️ Seu número PRECISA estar aquecido</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Disparar prospecção fria com um número <strong className="text-foreground">novo ou frio</strong> é a 
                <strong className="text-foreground"> principal causa de bloqueio</strong>. Antes de iniciar campanhas, 
                use o módulo de <strong className="text-foreground">Aquecimento</strong> e aguarde o número atingir o 
                status <strong className="text-foreground">🔥 Aquecido (nível 4)</strong>. Números mornos ou frios 
                têm risco extremamente alto de banimento permanente.
              </p>
            </div>
          </div>

          {/* CRITICAL: First contact rules */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <Ban size={20} className="text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm text-destructive">Proibido no primeiro contato (prospecção fria)</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                A Meta monitora padrões de spam. <strong className="text-foreground">NUNCA</strong> envie no primeiro 
                contato com um lead frio:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong className="text-foreground">Áudios</strong> — sinal forte de spam massivo</li>
                <li><strong className="text-foreground">Imagens, vídeos ou figurinhas</strong></li>
                <li><strong className="text-foreground">Documentos (PDF, DOCX etc.)</strong></li>
                <li><strong className="text-foreground">Links de qualquer tipo</strong> (encurtados são os piores)</li>
                <li><strong className="text-foreground">Mensagens longas demais</strong> ou copiadas e coladas iguais</li>
                <li><strong className="text-foreground">Pedidos de PIX, ofertas agressivas ou gatilhos de venda fortes</strong></li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Use apenas <strong className="text-foreground">texto curto, personalizado e conversacional</strong>. 
                Mídias e links só após o lead responder e demonstrar interesse.
              </p>
            </div>
          </div>

          {/* Best practices */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <FileText size={20} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm text-green-500">Boas práticas obrigatórias</p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                <li>Respeite horário comercial (9h–18h, dias úteis)</li>
                <li>Sempre ofereça opção de opt-out ("responda SAIR para não receber mais")</li>
                <li>Pare imediatamente se o lead pedir para não ser contatado</li>
                <li>Use variações de mensagem (a IA já gera, não copie texto fixo)</li>
                <li>Comece com volume baixo e aumente gradualmente</li>
              </ul>
            </div>
          </div>

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

          {/* Reality check: blocks are normal */}
          <div className="rounded-lg bg-muted/40 border border-border/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium">Bloqueios fazem parte do jogo — entenda o porquê</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Em campanhas de prospecção fria, <strong className="text-foreground">bloqueios são normais e esperados</strong>. 
              A maioria deles é apenas o WhatsApp <strong className="text-foreground">analisando o comportamento do número</strong> — 
              muitos são temporários e o chip volta a funcionar em horas ou dias.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O WhatsApp realiza <strong className="text-foreground">análises constantes em todos os números</strong> para proteger 
              seus usuários contra golpes, spam e fraudes. Isso faz parte da segurança da plataforma e contribui até para a 
              <strong className="text-foreground"> segurança digital nacional</strong>, evitando que criminosos abusem do canal.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Com as <strong className="text-foreground">estratégias certas</strong> — aquecimento, delays, variações de mensagem 
              e respeito às diretrizes — você <strong className="text-foreground">prolonga muito a vida útil do chip</strong> e 
              reduz drasticamente os bloqueios. Mas mais cedo ou mais tarde, <strong className="text-foreground">um bloqueio 
              vai acontecer</strong>, e isso é completamente normal nesse tipo de operação.
            </p>
            <p className="text-xs text-foreground/90 font-medium leading-relaxed border-t border-border/50 pt-3">
              💡 Boas operações tratam o chip como <strong>insumo da operação</strong>: tenha números reservas 
              e nunca use seu número pessoal em campanhas frias.
            </p>
          </div>

          {/* Final warning */}
          <p className="text-xs text-amber-500 text-center font-medium">
            ⚠️ Bloqueios fazem parte da prospecção fria — esteja preparado.
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
