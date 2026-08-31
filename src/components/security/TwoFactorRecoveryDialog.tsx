import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, Copy, Download, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { call2FA } from "@/hooks/use2FA";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}

export function TwoFactorRecoveryDialog({ open, onOpenChange, onDone }: Props) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);

  useEffect(() => { if (!open) { setCode(""); setCodes([]); } }, [open]);

  const submit = async () => {
    setLoading(true);
    const { data, error } = await call2FA<{ recovery_codes: string[] }>("regenerate_recovery", { code });
    setLoading(false);
    if (error || !data) {
      toast({ title: "Código inválido", description: "Digite o código atual do aplicativo autenticador.", variant: "destructive" });
      return;
    }
    setCodes(data.recovery_codes);
    onDone();
  };

  const download = () => {
    const blob = new Blob([`Wiize — códigos de recuperação (uso único)\n\n${codes.join("\n")}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "wiize-codigos-recuperacao.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center">Códigos de recuperação</DialogTitle>
          <DialogDescription className="text-center">
            {codes.length
              ? "Guarde estes códigos em local seguro. Os anteriores foram invalidados."
              : "Gerar novos códigos invalida imediatamente os anteriores."}
          </DialogDescription>
        </DialogHeader>

        {codes.length === 0 ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="rec-code">Código do aplicativo autenticador</Label>
              <Input
                id="rec-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-[0.4em]"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={loading || code.length !== 6} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Gerar novos códigos
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>Cada código funciona uma única vez e não será exibido novamente.</span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/60 bg-muted/40 p-4 font-mono text-sm">
              {codes.map((c) => <span key={c}>{c}</span>)}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => { navigator.clipboard.writeText(codes.join("\n")); toast({ title: "Códigos copiados" }); }}>
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
                <Button size="sm" variant="outline" className="gap-2" onClick={download}>
                  <Download className="h-4 w-4" /> Baixar
                </Button>
              </div>
              <Button onClick={() => onOpenChange(false)}>Concluir</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
