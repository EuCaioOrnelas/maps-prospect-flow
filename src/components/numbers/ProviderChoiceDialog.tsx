import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Headset, Megaphone, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (provider: "evolution" | "meta") => void;
}

export function ProviderChoiceDialog({ open, onOpenChange, onChoose }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Qual tipo de número você quer conectar?</DialogTitle>
          <DialogDescription>
            Os dois tipos contam no limite de números do seu plano. Escolha conforme o uso que você vai dar ao número.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => onChoose("evolution")}
            className="group text-left rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Headset size={20} />
              </div>
              <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">Número de Atendimento</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Usa o seu WhatsApp Web para atender. Conecta por QR code em segundos, sem custo por mensagem.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-2.5 py-2">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-400">
                Funciona só para atender contatos com quem você já conversou. Risco de bloqueio se usado para marketing.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChoose("meta")}
            className="group text-left rounded-2xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Megaphone size={20} />
              </div>
              <ArrowRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">Número de Marketing</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              API oficial da Meta. Serve para tudo: atendimento, campanhas, automações e disparos em massa.
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600" />
              <p className="text-[11px] leading-snug text-emerald-700 dark:text-emerald-400">
                Sem risco de bloqueio. A Meta cobra um valor por conversa enviada.
              </p>
            </div>
          </button>
        </div>

        <p className="mt-1 text-center text-xs text-muted-foreground">
          Em dúvida?{" "}
          <Link to="/numeros/comparativo" className="text-primary hover:underline font-medium" onClick={() => onOpenChange(false)}>
            Veja como funciona e a diferença entre os dois
          </Link>
        </p>
      </DialogContent>
    </Dialog>
  );
}
