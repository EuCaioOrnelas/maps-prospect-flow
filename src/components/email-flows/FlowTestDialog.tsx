import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TestTube, CheckCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
}

export function FlowTestDialog({ open, onOpenChange, flowId }: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);

    try {
      // Validate flow
      const { data: nodes } = await supabase.from("email_flow_nodes").select("*").eq("flow_id", flowId);
      const { data: edges } = await supabase.from("email_flow_edges").select("*").eq("flow_id", flowId);

      const issues: string[] = [];
      const entryNodes = (nodes || []).filter(n => n.node_type === "entry");
      if (entryNodes.length === 0) issues.push("Sem bloco de entrada");
      if (entryNodes.length > 1) issues.push("Mais de 1 bloco de entrada");

      const entry = entryNodes[0];
      if (entry && !(entry.config as any)?.trigger_type) issues.push("Gatilho não configurado");

      const emailNodes = (nodes || []).filter(n => n.node_type === "email");
      emailNodes.forEach(n => {
        const cfg = n.config as any;
        if (!cfg?.subject) issues.push(`Email "${n.name}" sem assunto`);
        if (!cfg?.body) issues.push(`Email "${n.name}" sem conteúdo`);
      });

      const waitNodes = (nodes || []).filter(n => n.node_type === "wait");
      waitNodes.forEach(n => {
        const cfg = n.config as any;
        if (!cfg?.delay_value || cfg.delay_value <= 0) issues.push(`Espera "${n.name}" sem duração`);
      });

      // Check orphan nodes
      (nodes || []).forEach(n => {
        if (n.node_type === "entry") return;
        const hasIncoming = (edges || []).some(e => e.target_node_id === n.id);
        if (!hasIncoming) issues.push(`Bloco "${n.name}" desconectado`);
      });

      if (issues.length > 0) {
        setResult(`⚠ ${issues.length} problema(s):\n${issues.map(i => `• ${i}`).join("\n")}`);
      } else {
        // Send test email if provided
        if (testEmail) {
          const firstEmail = emailNodes[0];
          if (firstEmail) {
            const cfg = firstEmail.config as any;
            await supabase.functions.invoke("send-email", {
              body: { to: testEmail, subject: `[TESTE FLUXO] ${cfg.subject}`, html: cfg.body },
            });
            setResult(`✅ Fluxo validado! Email de teste enviado para ${testEmail}`);
          } else {
            setResult("✅ Fluxo validado! (Sem email para enviar teste)");
          }
        } else {
          setResult("✅ Fluxo validado com sucesso! Nenhum problema encontrado.");
        }
      }
    } catch (err) {
      setResult("❌ Erro ao validar fluxo");
    }

    setTesting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TestTube size={18} /> Testar Fluxo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Valida o fluxo e opcionalmente envia o primeiro email como teste.
          </p>
          <div>
            <Label>Email de teste (opcional)</Label>
            <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="seu@email.com" type="email" />
          </div>
          <Button onClick={runTest} disabled={testing} className="w-full gap-2">
            {testing ? "Validando..." : "Executar Teste"}
          </Button>

          {result && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-line">
              {result}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
