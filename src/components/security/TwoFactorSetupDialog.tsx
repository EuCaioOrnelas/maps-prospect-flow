import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, Copy, Download, KeyRound, Smartphone, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { call2FA } from "@/hooks/use2FA";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEnabled: () => void;
}

type Step = "intro" | "scan" | "codes";

export function TwoFactorSetupDialog({ open, onOpenChange, onEnabled }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setStep("intro"); setSecret(""); setQr(""); setCode(""); setRecoveryCodes([]);
    }
  }, [open]);

  const startEnroll = async () => {
    setLoading(true);
    const { data, error } = await call2FA<{ otpauth_url: string; secret: string }>("enroll_start");
    setLoading(false);
    if (error || !data) {
      toast({ title: "Não foi possível iniciar", description: "Tente novamente em instantes.", variant: "destructive" });
      return;
    }
    setSecret(data.secret);
    setQr(await QRCode.toDataURL(data.otpauth_url, { margin: 1, width: 240 }));
    setStep("scan");
  };

  const confirmCode = async () => {
    setLoading(true);
    const { data, error } = await call2FA<{ recovery_codes: string[] }>("enroll_verify", { code });
    setLoading(false);
    if (error || !data) {
      toast({
        title: error === "locked" ? "Muitas tentativas" : "Código inválido",
        description: error === "locked"
          ? "Aguarde 15 minutos antes de tentar novamente."
          : "Confira o código de 6 dígitos no seu aplicativo autenticador.",
        variant: "destructive",
      });
      setCode("");
      return;
    }
    setRecoveryCodes(data.recovery_codes || []);
    setStep("codes");
    onEnabled();
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast({ title: "Códigos copiados" });
  };

  const downloadCodes = () => {
    const blob = new Blob(
      [`Wiize — códigos de recuperação (uso único)\n\n${recoveryCodes.join("\n")}\n`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wiize-codigos-recuperacao.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={step === "codes" ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Proteja sua conta
              </DialogTitle>
              <DialogDescription>
                A autenticação de dois fatores adiciona uma camada extra de segurança. Mesmo que sua senha
                seja descoberta, será necessário confirmar um segundo fator para concluir o acesso.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/40 p-4">
                <Smartphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Use um aplicativo autenticador (TOTP)</p>
                  <p className="text-muted-foreground">
                    Google Authenticator, Microsoft Authenticator, Authy, 1Password ou qualquer app compatível.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/40 p-4">
                <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="text-sm">
                  <p className="font-medium">Códigos de recuperação</p>
                  <p className="text-muted-foreground">
                    Você receberá códigos de uso único para acessar caso perca o aplicativo.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={startEnroll} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "scan" && (
          <>
            <DialogHeader>
              <DialogTitle>Escaneie o QR Code</DialogTitle>
              <DialogDescription>
                Abra seu aplicativo autenticador e escaneie o código abaixo. Depois digite o código de 6 dígitos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              {qr && <img src={qr} alt="QR Code para configurar a autenticação de dois fatores" className="rounded-lg border border-border bg-white p-2" />}
              <div className="w-full rounded-lg border border-border/50 bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground">Não consegue escanear? Use a chave:</p>
                <code className="break-all text-xs font-mono">{secret}</code>
              </div>
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={confirmCode} disabled={loading || code.length !== 6} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Ativar 2FA
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "codes" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                2FA ativado
              </DialogTitle>
              <DialogDescription>
                Guarde seus códigos de recuperação. Eles são exibidos apenas uma vez e cada um funciona só uma vez.
              </DialogDescription>
            </DialogHeader>
            <Alert className="border-amber-500/40">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                Sem o aplicativo autenticador e sem estes códigos, você precisará do reset administrativo.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-muted/40 p-4 font-mono text-sm">
              {recoveryCodes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyCodes} className="gap-2">
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={downloadCodes} className="gap-2">
                  <Download className="h-4 w-4" /> Baixar
                </Button>
              </div>
              <Button onClick={() => onOpenChange(false)}>Salvei meus códigos</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
