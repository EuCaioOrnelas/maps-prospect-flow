import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, Share2, MessageCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string;
  password: string;
}

export const UserCreatedSuccessDialog = ({ open, onClose, email, password }: Props) => {
  const { toast } = useToast();
  const url = typeof window !== "undefined" ? window.location.origin + "/login" : "";

  const message = `Sua conta Wiize foi criada!\n\nEmail: ${email}\nSenha: ${password}\n\nAcesse: ${url}\n\nRecomendamos alterar a senha após o primeiro login.`;

  useEffect(() => {
    if (!open) return;
    // pequena animação de confete via emoji shower (sem dep extra)
    const root = document.createElement("div");
    root.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
    document.body.appendChild(root);
    const emojis = ["✨","🎉","💚","⭐","🟢"];
    for (let i = 0; i < 24; i++) {
      const el = document.createElement("span");
      el.textContent = emojis[i % emojis.length];
      el.style.cssText = `position:absolute;top:-20px;left:${Math.random()*100}%;font-size:${14+Math.random()*14}px;opacity:0;transition:transform 1.6s ease-out, opacity 1.6s;`;
      root.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = "1";
        el.style.transform = `translateY(${60+Math.random()*40}vh) rotate(${Math.random()*360}deg)`;
      });
    }
    const t = setTimeout(() => root.remove(), 2000);
    return () => { clearTimeout(t); root.remove(); };
  }, [open]);

  const copyData = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nSenha: ${password}\nAcesse: ${url}`);
    toast({ title: "Dados copiados" });
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };
  const shareGmail = () => {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Sua conta Wiize foi criada")}&body=${encodeURIComponent(message)}`, "_blank");
  };
  const shareOutlook = () => {
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${encodeURIComponent("Sua conta Wiize foi criada")}&body=${encodeURIComponent(message)}`, "_blank");
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(message);
    toast({ title: "Mensagem copiada" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 animate-in zoom-in-50 duration-300">
            <Check size={28} strokeWidth={3} />
          </div>
          <DialogTitle className="text-center">Usuário criado com sucesso</DialogTitle>
          <DialogDescription className="text-center">
            Um email com os dados de acesso foi enviado para o usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm font-mono">
          <div><span className="text-muted-foreground">Email:</span> {email}</div>
          <div><span className="text-muted-foreground">Senha:</span> {password}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={copyData}>
            <Copy size={14} className="mr-2" /> Copiar Dados
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Share2 size={14} className="mr-2" /> Compartilhar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={shareWhatsApp}><MessageCircle size={14} className="mr-2"/>WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={shareGmail}><Mail size={14} className="mr-2"/>Gmail</DropdownMenuItem>
              <DropdownMenuItem onClick={shareOutlook}><Mail size={14} className="mr-2"/>Outlook</DropdownMenuItem>
              <DropdownMenuItem onClick={copyLink}><Copy size={14} className="mr-2"/>Copiar Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button variant="ghost" onClick={onClose} className="mt-1">Fechar</Button>
      </DialogContent>
    </Dialog>
  );
};
