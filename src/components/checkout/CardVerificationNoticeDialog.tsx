import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Smartphone, BadgeCheck, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  /** "trial" muda a copy para ativação do teste grátis. */
  mode?: "trial" | "purchase";
}

/**
 * Explica ao usuário, ANTES de disparar o 3D Secure, que o banco vai pedir
 * autorização de uma verificação temporária do cartão (sem cobrança real).
 */
export function CardVerificationNoticeDialog({ open, onOpenChange, onConfirm, loading, mode = "purchase" }: Props) {
  const isTrial = mode === "trial";

  const items = [
    {
      icon: Smartphone,
      title: "Seu banco vai pedir uma autorização",
      desc: "Você vai receber uma notificação no app do seu banco (ou um SMS) pedindo para aprovar uma verificação do cartão.",
    },
    {
      icon: BadgeCheck,
      title: isTrial ? "Nada será cobrado agora" : "É apenas uma validação de segurança",
      desc: isTrial
        ? "É só uma verificação temporária para confirmar que o cartão é válido. O valor não é debitado e o teste continua gratuito."
        : "A verificação temporária confirma que o cartão é seu. Se aparecer algum valor, ele é liberado automaticamente pelo banco.",
    },
    {
      icon: ShieldCheck,
      title: "Pagamento protegido",
      desc: "O processo é feito pelo padrão 3D Secure. A Wiize não armazena os dados do seu cartão.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-[11px] bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
            Confirmação do seu banco
          </DialogTitle>
          <DialogDescription>
            Antes de continuar, veja o que vai acontecer nos próximos segundos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3">
              <span className="h-8 w-8 shrink-0 rounded-[11px] bg-muted text-primary flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Voltar
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isTrial ? "Entendi, ativar meu teste" : "Entendi, continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
