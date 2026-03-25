import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TestTube, Loader2 } from "lucide-react";

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

      (nodes || []).forEach(n => {
        if (n.node_type === "entry") return;
        const hasIncoming = (edges || []).some(e => e.target_node_id === n.id);
        if (!hasIncoming) issues.push(`Bloco "${n.name}" desconectado`);
      });

      if (issues.length > 0) {
        setResult(`⚠ ${issues.length} problema(s):\n${issues.map(i => `• ${i}`).join("\n")}`);
        setTesting(false);
        return;
      }

      if (testEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResult("❌ Usuário não autenticado");
          setTesting(false);
          return;
        }

        // Walk the flow from entry node following edges
        const emailsSent: string[] = [];
        const flowPath: string[] = [];
        let currentNodeId: string | null = entry?.id || null;
        const visited = new Set<string>();

        while (currentNodeId && !visited.has(currentNodeId)) {
          visited.add(currentNodeId);
          const node = (nodes || []).find(n => n.id === currentNodeId);
          if (!node) break;

          const unitLabels: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

          if (node.node_type === "entry") {
            flowPath.push(`🟢 Entrada: ${node.name}`);
          } else if (node.node_type === "email") {
            const cfg = node.config as any;
            flowPath.push(`📧 Email: ${node.name}`);
            if (cfg?.subject && cfg?.body) {
              const { error } = await supabase.functions.invoke("send-email", {
                body: {
                  user_id: user.id,
                  email_type: "ADMIN_BROADCAST",
                  payload: {
                    subject: `[TESTE FLUXO] ${cfg.subject}`,
                    content: cfg.body,
                  },
                  override_email: testEmail,
                },
              });
              if (error) {
                issues.push(`Erro ao enviar "${node.name}": ${error.message}`);
              } else {
                emailsSent.push(cfg.subject);
              }
              await new Promise(r => setTimeout(r, 800));
            }
          } else if (node.node_type === "wait") {
            const cfg = node.config as any;
            flowPath.push(`⏳ Espera: ${cfg.delay_value || 1} ${unitLabels[cfg.delay_unit] || cfg.delay_unit}`);
          } else if (node.node_type === "condition") {
            flowPath.push(`🔀 Condição: ${node.name} (seguindo caminho "Sim")`);
          } else if (node.node_type === "end") {
            flowPath.push(`🔴 Fim: ${node.name}`);
            break;
          }

          // Find next node
          let nextEdge;
          if (node.node_type === "condition") {
            nextEdge = (edges || []).find(e => e.source_node_id === currentNodeId && e.source_handle === "yes")
              || (edges || []).find(e => e.source_node_id === currentNodeId);
          } else {
            nextEdge = (edges || []).find(e => e.source_node_id === currentNodeId);
          }
          currentNodeId = nextEdge?.target_node_id || null;
        }

        if (issues.length > 0) {
          setResult(`⚠ Erros durante o teste:\n${issues.map(i => `• ${i}`).join("\n")}`);
        } else if (emailsSent.length > 0) {
          setResult(`✅ ${emailsSent.length} email(s) enviado(s) para ${testEmail}:\n\n${emailsSent.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n📋 Caminho percorrido:\n${flowPath.join("\n")}`);
        } else {
          setResult(`✅ Fluxo validado! (Nenhum email no caminho)\n\n📋 Caminho:\n${flowPath.join("\n")}`);
        }
      } else {
        setResult("✅ Fluxo validado com sucesso! Nenhum problema encontrado.");
      }
    } catch (err) {
      console.error(err);
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
            Valida o fluxo e envia <strong>todos</strong> os emails do caminho principal para o email de teste.
          </p>
          <div>
            <Label>Email de teste (opcional)</Label>
            <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="seu@email.com" type="email" />
          </div>
          <Button onClick={runTest} disabled={testing} className="w-full gap-2">
            {testing ? <><Loader2 size={14} className="animate-spin" /> Testando...</> : "Executar Teste"}
          </Button>

          {result && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-line max-h-[300px] overflow-y-auto">
              {result}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
