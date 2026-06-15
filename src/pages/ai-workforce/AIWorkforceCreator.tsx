import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useCreateWorkforce } from "@/hooks/useAIWorkforce";
import { toast } from "sonner";
import { WorkforcePageLayout } from "@/components/ai-workforce/WorkforcePageLayout";

const PRESETS = [
  { name: "SDR IA", role: "Qualificador de leads B2B", description: "Qualifica leads e agenda reunião com SDR humano." },
  { name: "Agente de Suporte", role: "Atendimento ao cliente", description: "Resolve dúvidas, abre tickets e escala quando necessário." },
  { name: "Agente de Cobrança", role: "Cobrança amigável", description: "Negocia pagamentos atrasados respeitando regras da empresa." },
  { name: "Agente de Agendamento", role: "Marca reuniões", description: "Coordena horários e confirma compromissos." },
  { name: "Recuperação de Leads", role: "Reengajamento", description: "Reativa leads frios com abordagem consultiva." },
  { name: "Pós-venda", role: "Sucesso do cliente", description: "Acompanha cliente novo e coleta feedback inicial." },
];

export default function AIWorkforceCreator() {
  const navigate = useNavigate();
  const create = useCreateWorkforce();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");

  function applyPreset(p: typeof PRESETS[number]) {
    setName(p.name); setRole(p.role); setDescription(p.description);
  }

  async function submit() {
    if (!name.trim()) { toast.error("Dê um nome ao colaborador."); return; }
    try {
      const w = await create.mutateAsync({ name: name.trim(), role: role.trim(), description: description.trim() });
      toast.success("Colaborador criado!");
      navigate(`/ai-workforce/colaboradores/${w.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar");
    }
  }

  return (
    <WorkforcePageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
          <Sparkles className="size-3.5" /> Novo colaborador
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Criar AI Workforce</h1>
        <p className="text-muted-foreground mt-1">
          Escolha um modelo pronto ou descreva o colaborador do zero. Você poderá editar tudo no construtor visual.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="text-left rounded-xl border bg-card hover:border-primary/60 p-4 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="rounded-md p-1.5 bg-primary/10 text-primary"><Bot className="size-4" /></div>
                <p className="font-medium">{p.name}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{p.description}</p>
            </button>
          ))}
        </div>

        <Card className="mt-8">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label>Nome do colaborador</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: SDR IA Wiize" />
            </div>
            <div>
              <Label>Função / cargo</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Qualificador de leads B2B" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="O que esse colaborador faz?" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => navigate("/ai-workforce")}>Cancelar</Button>
              <Button onClick={submit} disabled={create.isPending}>
                {create.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Criar colaborador
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </WorkforcePageLayout>
  );
}
