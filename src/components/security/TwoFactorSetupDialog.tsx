import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Separator } from "@/components/ui/separator";
import { Loader2, ShieldCheck, Copy, Download, KeyRound, Smartphone, AlertTriangle, Check, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { call2FA } from "@/hooks/use2FA";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEnabled: () => void;
}

type Step = "intro" | "scan" | "codes";

const STEPS: Step[] = ["intro", "scan", "codes"];

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
    setQr(await QRCode.toDataURL(data.otpauth_url, { margin: 1, width: 260 }));
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

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    toast({ title: "Chave copiada" });
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

  const stepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={open} onOpenChange={step === "codes" ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92dvh] overflow-y-auto">
        {/* Indicador de etapas */}
        <div className="flex items-center gap-2 pb-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        {step === "intro" && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <DialogTitle className="text-xl">Ativar autenticação de dois fatores</DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Além da senha, o acesso à sua conta passará a exigir um código temporário gerado no seu
                celular. Mesmo que alguém descubra sua senha, não conseguirá entrar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="flex items-start gap-4 rounded-xl border border-border/60 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <Smartphone className="h-5 w-5 text-foreground" />
                </div>
                <div className="space-y-0.5 text-sm">
                  <p className="font-medium">1. Aplicativo autenticador</p>
                  <p className="text-muted-foreground">
                    Google Authenticator, Microsoft Authenticator, Authy, 1Password ou similar.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl border border-border/60 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <KeyRound className="h-5 w-5 text-foreground" />
                </div>
                <div className="space-y-0.5 text-sm">
                  <p className="font-medium">2. Códigos de recuperação</p>
                  <p className="text-muted-foreground">
                    Códigos de uso único para acessar caso perca o celular.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={startEnroll} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Começar
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "scan" && (
          <>
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-xl">Escaneie o QR Code</DialogTitle>
              <DialogDescription className="text-sm">
                Abra o aplicativo autenticador, escaneie o código e digite os 6 dígitos exibidos.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-5 py-1">
              {qr && (
                <img
                  src={qr}
                  alt="QR Code para configurar a autenticação de dois fatores"
                  className="h-[220px] w-[220px] rounded-xl border border-border bg-white p-3"
                />
              )}

              <div className="w-full space-y-2">
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">ou insira a chave manualmente</span>
                  <Separator className="flex-1" />
                </div>
                <button
                  type="button"
                  onClick={copySecret}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted"
                >
                  <code className="break-all font-mono text-xs">{secret}</code>
                  <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </div>

              <div className="w-full space-y-2">
                <p className="text-center text-sm font-medium">Código de verificação</p>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={code} onChange={setCode}>
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" className="gap-2" onClick={() => setStep("intro")}>
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <Button onClick={confirmCode} disabled={loading || code.length !== 6} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Ativar proteção
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "codes" && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10">
                <Check className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-xl">Proteção ativada</DialogTitle>
              <DialogDescription className="text-sm">
                Guarde os códigos de recuperação abaixo. Eles aparecem uma única vez e cada um só pode ser usado uma vez.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm">
                Sem o aplicativo autenticador e sem estes códigos, apenas o administrador da conta poderá
                restaurar seu acesso.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-4 font-mono text-sm">
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
