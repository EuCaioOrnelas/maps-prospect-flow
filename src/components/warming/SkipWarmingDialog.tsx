import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Shield, Wifi, Flame } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface SkipWarmingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  numberName: string;
}

export function SkipWarmingDialog({ open, onOpenChange, onConfirm, numberName }: SkipWarmingDialogProps) {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = () => {
    if (!accepted) return;
    setAccepted(false);
    onConfirm();
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setAccepted(false);
    onOpenChange(val);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            Pular Aquecimento
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Você está prestes a pular o aquecimento do número <strong className="text-foreground">{numberName}</strong>.
              </p>

              <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <p className="font-medium text-amber-500 text-xs uppercase tracking-wider">
                  Por que recomendamos o aquecimento?
                </p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Wifi className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>O IP da nossa ferramenta é <strong className="text-foreground">diferente do IP do seu celular</strong>. O WhatsApp detecta essa mudança e pode considerar atividade suspeita.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Flame className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>O aquecimento simula uso gradual e natural, reduzindo significativamente o risco de bloqueio ao usar uma nova plataforma.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <span>Mesmo números antigos ou já aquecidos podem ser bloqueados ao trocar de IP/plataforma sem um período de adaptação.</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-xs text-destructive font-medium mb-1">⚠️ Aviso importante</p>
                <p className="text-xs">
                  Nossa ferramenta <strong>não impede bloqueios</strong> — ela ajuda a gerenciar seus números de forma que o bloqueio não seja o problema real. Ao pular o aquecimento, <strong>não nos responsabilizamos por possíveis bloqueios</strong> do número.
                </p>
              </div>

              <p className="text-xs">
                Se o número é antigo, já está aquecido ou você já usou ele em outra ferramenta similar, pode ser seguro pular. Mas a decisão e o risco são seus.
              </p>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="accept-skip"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  className="mt-0.5"
                />
                <label htmlFor="accept-skip" className="text-xs cursor-pointer leading-relaxed">
                  Entendo os riscos e desejo pular o aquecimento. Estou ciente de que não há garantia contra bloqueios.
                </label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!accepted}
            className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50"
          >
            Pular Aquecimento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
