import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { call2FA } from "@/hooks/use2FA";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDisabled: () => void;
}

export function TwoFactorDisableDialog({ open, onOpenChange, onDisabled }: Props) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) { setPassword(""); setCode(""); } }, [open]);

  const submit = async () => {
    setLoading(true);
    const { error } = await call2FA("disable", { password, code });
    setLoading(false);
    if (error) {
      toast({
        title: error === "invalid_password" ? "Senha incorreta" : "Código inválido",
        description: "Confirme sua senha atual e o código do aplicativo autenticador.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "2FA desativado", description: "Recomendamos reativar assim que possível." });
    onDisabled();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-destructive" />
            Desativar autenticação de dois fatores
          </DialogTitle>
          <DialogDescription>
            Por segurança, confirme sua senha atual e um código do seu aplicativo autenticador.
            O segredo e os códigos de recuperação atuais serão invalidados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="2fa-pass">Senha atual</Label>
            <Input id="2fa-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="2fa-code">Código de 6 dígitos</Label>
            <Input id="2fa-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={loading || !password || code.length !== 6} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Desativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
