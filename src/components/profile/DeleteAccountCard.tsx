import { useState } from "react";
import { AlertTriangle, Loader2, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function callDelete(action: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { action, ...payload },
  });
  if (error) {
    const ctx: any = (error as any).context;
    let parsed: any = null;
    try {
      parsed = await ctx?.json?.();
    } catch {}
    return { data: null, error: parsed?.error || error.message };
  }
  if ((data as any)?.error) return { data: null, error: (data as any).error as string };
  return { data, error: null as string | null };
}

export const DeleteAccountCard = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"warning" | "code">("warning");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const reset = () => {
    setStep("warning");
    setCode("");
    setConfirmation("");
  };

  const requestCode = async () => {
    setSending(true);
    const { data, error } = await callDelete("request_code");
    setSending(false);
    if (error) {
      toast({ title: "Não foi possível enviar o código", description: error, variant: "destructive" });
      return;
    }
    toast({
      title: "Código enviado",
      description: `Enviamos um código de verificação para ${(data as any)?.email || "seu e-mail"}.`,
    });
    setStep("code");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const { error } = await callDelete("confirm", { code: code.trim(), confirmation });
    if (error) {
      setDeleting(false);
      toast({ title: "Exclusão não concluída", description: error, variant: "destructive" });
      return;
    }
    toast({ title: "Conta excluída", description: "Todos os seus dados foram removidos." });
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/";
  };

  return (
    <>
      <Card className="border-destructive/30 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Zona de risco
          </CardTitle>
          <CardDescription className="text-xs">
            Exclusão permanente da conta e de todos os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <span className="font-medium">Excluir minha conta</span>
              <p className="text-sm text-muted-foreground">
                Apaga leads, contatos, números, conversas, relatórios e pagamentos. Cancela
                assinaturas ativas e interrompe todos os e-mails. Não há como recuperar.
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              className="gap-2 shrink-0"
              onClick={() => {
                reset();
                setOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!deleting) {
            setOpen(v);
            if (!v) reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription>
              {step === "warning"
                ? "Esta ação é irreversível. Para continuar, verificaremos sua identidade por e-mail."
                : "Digite o código enviado para o seu e-mail e confirme a exclusão."}
            </DialogDescription>
          </DialogHeader>

          {step === "warning" ? (
            <div className="space-y-3 py-2 text-sm">
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Leads, contatos, conversas, números e relatórios serão apagados.</li>
                <li>Assinaturas ativas no cartão e no Pix serão canceladas.</li>
                <li>Você deixa de receber qualquer e-mail, inclusive promocionais.</li>
                <li>Não é possível recuperar os dados depois.</li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Registros exigidos por lei (fiscais e de segurança) são mantidos pelo prazo legal,
                sem uso comercial.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="del-code" className="text-xs">
                  Código de verificação (6 dígitos)
                </Label>
                <Input
                  id="del-code"
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="del-confirm" className="text-xs">
                  Digite <span className="font-semibold">EXCLUIR</span> para confirmar
                </Label>
                <Input
                  id="del-confirm"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  placeholder="EXCLUIR"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" disabled={deleting} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            {step === "warning" ? (
              <Button variant="destructive" className="gap-2" disabled={sending} onClick={requestCode}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar código
              </Button>
            ) : (
              <Button
                variant="destructive"
                className="gap-2"
                disabled={
                  deleting || code.length !== 6 || confirmation.trim().toUpperCase() !== "EXCLUIR"
                }
                onClick={confirmDelete}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir definitivamente
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
