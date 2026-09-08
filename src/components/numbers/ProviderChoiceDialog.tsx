import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Headset, Megaphone, ArrowRight, ShieldCheck, AlertTriangle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (provider: "evolution" | "meta") => void;
}

export function ProviderChoiceDialog({ open, onOpenChange, onChoose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] overflow-hidden border-border/80 bg-popover p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/70 px-6 pb-5 pt-6 sm:px-7">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/20">
              <Megaphone size={18} />
            </span>
            Qual tipo de número você quer conectar?
          </DialogTitle>
          <DialogDescription className="sm:pl-[52px]">
            Os dois tipos contam no limite de números do seu plano. Escolha conforme o uso que você vai dar ao número.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 px-6 pt-6 sm:grid-cols-2 sm:px-7">
          <Button
            variant="outline"
            type="button"
            onClick={() => onChoose("evolution")}
            className="group h-auto min-h-[270px] w-full items-stretch justify-start whitespace-normal rounded-card border-border/90 bg-card p-5 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md focus-visible:ring-primary"
          >
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Headset size={20} />
                </div>
                <ArrowRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">Número de Atendimento</h3>
              <p className="mt-1.5 min-h-[60px] text-sm leading-relaxed text-muted-foreground">
                Usa o seu WhatsApp Web para atender. Conecta por QR code em segundos, sem custo por mensagem.
              </p>
              <div className="mt-4 flex min-h-[58px] items-start gap-2.5 rounded-hover border border-warning/30 bg-warning/10 px-3 py-2.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
                <p className="text-[11px] font-normal leading-snug text-foreground/80">
                  Funciona só para atender contatos com quem você já conversou. Risco de bloqueio se usado para marketing.
                </p>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={() => onChoose("meta")}
            className="group h-auto min-h-[270px] w-full items-stretch justify-start whitespace-normal rounded-card border-border/90 bg-card p-5 text-left shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md focus-visible:ring-primary"
          >
            <div className="flex w-full flex-col">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Megaphone size={20} />
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/meta-api-guide"
                    onClick={(e) => { e.stopPropagation(); onOpenChange(false); }}
                    title="Guia de conexão da API oficial da Meta"
                    className="flex h-7 w-7 items-center justify-center rounded-hover border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                  >
                    <HelpCircle size={14} />
                  </Link>
                  <ArrowRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </div>
              <h3 className="mt-5 text-base font-semibold text-foreground">Número de Marketing</h3>
              <p className="mt-1.5 min-h-[60px] text-sm leading-relaxed text-muted-foreground">
                Conecta via Meta Cloud API. Serve para tudo: atendimento, campanhas de mensagem e automações.
              </p>
              <div className="mt-4 flex min-h-[58px] items-start gap-2.5 rounded-hover border border-primary/35 bg-primary/10 px-3 py-2.5">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-[11px] font-medium leading-snug text-foreground">
                  Sem risco de bloqueio. A Meta cobra um valor por conversa enviada.
                </p>
              </div>
            </div>
          </Button>
        </div>

        <p className="px-6 pb-6 pt-5 text-center text-xs text-muted-foreground sm:px-7">
          Em dúvida?{" "}
          <Link to="/numeros/comparativo" className="text-primary hover:underline font-medium" onClick={() => onOpenChange(false)}>
            Veja como funciona e a diferença entre os dois
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
