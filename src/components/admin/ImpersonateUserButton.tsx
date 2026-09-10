import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, Loader2, Copy, ExternalLink } from "lucide-react";

interface Props {
  userId: string;
  userEmail: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}

export const ImpersonateUserButton = ({ userId, userEmail, size = "sm", variant = "outline" }: Props) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const { toast } = useToast();

  const generate = async () => {
    setLoading(true);
    setLink(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate", {
        body: {
          user_id: userId,
          redirect_to: `${window.location.origin}/dashboard`,
          reason,
        },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message);
      }
      setLink((data as any).action_link as string);
    } catch (e: any) {
      toast({
        title: "Erro ao gerar acesso",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className="gap-2"
        onClick={() => {
          setLink(null);
          setReason("");
          setOpen(true);
        }}
      >
        <LogIn size={14} />
        Entrar como usuário
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entrar como usuário</DialogTitle>
            <DialogDescription>
              Gera um acesso temporário e de uso único à conta de <strong>{userEmail}</strong>. O acesso
              fica registrado na auditoria.
            </DialogDescription>
          </DialogHeader>

          {!link ? (
            <div className="space-y-1.5">
              <Label htmlFor="impersonate-reason-btn">Motivo do acesso (registrado)</Label>
              <Input
                id="impersonate-reason-btn"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: suporte — verificar prospecção sem resultados"
                autoComplete="off"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Abra o link em uma janela anônima para não desconectar sua conta de admin.
              </p>
              <div className="flex gap-2">
                <Input readOnly value={link} className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast({ title: "Link copiado" });
                  }}
                >
                  <Copy size={14} />
                </Button>
                <Button variant="outline" size="icon" onClick={() => window.open(link, "_blank")}>
                  <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            {!link && (
              <Button onClick={generate} disabled={loading} className="gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Gerar acesso
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
