import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X, ArrowLeft } from "lucide-react";

const SUGGESTIONS = [
  "Crie um SDR para imobiliárias focado em qualificar interessados e agendar visitas.",
  "Crie um atendente para uma clínica odontológica que tira dúvidas e agenda avaliação.",
  "Crie um cobrador amigável para parcelamento de cursos online.",
  "Crie um pós-venda para SaaS B2B que mede NPS e identifica upsell.",
  "Crie um suporte técnico nível 1 para um ERP, que abre ticket quando necessário.",
  "Crie um captador de leads para uma agência de marketing.",
];

interface Props {
  onCancel: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  onBack?: () => void;
}

export function WorkforcePromptCreator({ onCancel, onSubmit, onBack }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (prompt.trim().length < 10) return;
    setLoading(true);
    try { await onSubmit(prompt.trim()); } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> Criação por IA
        </div>
        <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <h2 className="text-2xl font-semibold tracking-tight">Descreva o colaborador</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A IA monta tudo automaticamente: objetivo, regras, memória, conhecimento, coleta de dados e escalonamento.
        </p>

        <Textarea
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: Crie um SDR para imobiliárias focado em qualificar interessados e agendar visitas."
          className="mt-5 text-sm resize-none"
        />

        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-6 mb-2 font-semibold">Sugestões</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => setPrompt(s)}
              className="text-left text-xs p-3 rounded-lg border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all">
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={onBack ?? onCancel} disabled={loading}>
          <ArrowLeft className="size-4 mr-1" /> Voltar
        </Button>
        <Button onClick={submit} disabled={prompt.trim().length < 10 || loading}>
          {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Gerando…</> : <><Sparkles className="size-4 mr-2" /> Gerar com IA</>}
        </Button>
      </div>
    </div>
  );
}
