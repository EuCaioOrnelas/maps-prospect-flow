import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestModeDialog({ open, onOpenChange }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("lifecycle-admin", {
      body: { action: "simulate", email: email.trim() },
    });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || "Não foi possível simular");
      return;
    }
    setResult(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Modo de teste — elegibilidade</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="email@dousuario.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={run} disabled={loading || !email.trim()}>{loading ? "Verificando..." : "Verificar"}</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Nenhum e-mail é enviado nesta verificação.</p>

        {result && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-border/60 p-3 space-y-1">
              <p className="text-sm font-medium">{result.user?.name || "—"} · {result.user?.email}</p>
              <p className="text-xs text-muted-foreground">Plano atual: {result.user?.plan || "free"}</p>
              <p className="text-xs text-muted-foreground">Trial: {fmt(result.trial?.start)} → {fmt(result.trial?.end)}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground mb-1">Etapa atual</p>
                <p className="text-sm font-medium">
                  {result.current_step ? `Dia ${result.current_step.day} — ${result.current_step.name}` : "Nenhuma enviada"}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-[11px] uppercase text-muted-foreground mb-1">Próxima etapa</p>
                <p className="text-sm font-medium">
                  {result.next_step ? `Dia ${result.next_step.day} — ${result.next_step.name}` : "Fluxo concluído"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Previsto: {fmt(result.next_step?.scheduled_at)}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase text-muted-foreground mb-2">Condições avaliadas</p>
              <div className="space-y-1.5">
                {(result.checks || []).map((c: any) => (
                  <div key={c.label} className="flex items-center gap-2 text-sm">
                    {c.pass ? (
                      <CheckCircle2 size={15} className="text-emerald-500" />
                    ) : (
                      <XCircle size={15} className="text-destructive" />
                    )}
                    <span>{c.label}</span>
                    <span className="text-xs text-muted-foreground">— {c.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <Badge className={result.eligible ? "bg-emerald-500/15 text-emerald-600 border-0" : "bg-muted text-muted-foreground border-0"}>
              {result.eligible ? "ELEGÍVEL PARA O PRÓXIMO ENVIO" : "NÃO ELEGÍVEL AGORA"}
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
