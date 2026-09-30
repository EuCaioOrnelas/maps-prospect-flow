import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, MessageCircle, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  expiresAt?: string | null;
  phone?: string | null;
  email?: string | null;
  title?: string | null;
}

/** Link de pagamento do Wiize Pay: copiar e enviar ao cliente. */
export function WiizePayLinkShare({ url, expiresAt, phone, email, title }: Props) {
  const text = `Olá! Segue o link para pagamento${title ? ` de "${title}"` : ""}: ${url}`;
  const phoneDigits = (phone || "").replace(/\D/g, "");
  const waPhone = phoneDigits && !phoneDigits.startsWith("55") && phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado."); }
    catch { toast.error("Não foi possível copiar. Selecione o link e copie manualmente."); }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <Button onClick={copy} className="shrink-0 gap-1.5"><Copy className="h-4 w-4" /> Copiar</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="gap-1.5" disabled={!waPhone}
          onClick={() => window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, "_blank", "noopener")}>
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </Button>
        <Button variant="outline" className="gap-1.5" disabled={!email}
          onClick={() => window.open(`mailto:${email}?subject=${encodeURIComponent("Link de pagamento")}&body=${encodeURIComponent(text)}`, "_blank", "noopener")}>
          <Mail className="h-4 w-4" /> E-mail
        </Button>
      </div>
      {expiresAt && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Link válido até {new Date(expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}. Depois, gere um novo na venda.
        </p>
      )}
    </div>
  );
}
