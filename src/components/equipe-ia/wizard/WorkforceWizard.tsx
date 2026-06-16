import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Phone, Headphones, Wallet, Calendar, Heart, Users, MessageCircle, Megaphone,
  Target, CheckCircle2, ArrowLeft, ArrowRight, Sparkles, Loader2,
  MessageSquare, Instagram, Facebook, Layers, Database, BookOpen, History,
  ListChecks, X, Plus,
} from "lucide-react";
import { blueprintFromWizard } from "./workforceTemplates";
import type { WorkforceBlueprint } from "./workforceTemplates";

type StepKey = "funcao" | "objetivo" | "canais" | "acessos" | "campos" | "personalidade" | "descricao";

const FUNCOES = [
  { id: "SDR", icon: Phone, desc: "Qualifica leads e agenda reunião" },
  { id: "Atendimento", icon: MessageCircle, desc: "Primeiro contato e dúvidas" },
  { id: "Suporte", icon: Headphones, desc: "Triagem e resolução técnica" },
  { id: "Cobrança", icon: Wallet, desc: "Recupera valores em aberto" },
  { id: "Agendamento", icon: Calendar, desc: "Marca, confirma e remarca" },
  { id: "Pós-venda", icon: Heart, desc: "Satisfação e upsell" },
  { id: "Qualificador", icon: Target, desc: "Filtra os melhores leads" },
  { id: "Captação", icon: Megaphone, desc: "Engaja e nutre" },
];

const OBJETIVOS = [
  "Agendar reunião", "Coletar informações", "Resolver dúvidas",
  "Abrir chamado", "Qualificar lead", "Recuperar cliente", "Fechar venda", "Confirmar presença",
];

const CANAIS = [
  { id: "WhatsApp", icon: MessageSquare },
  { id: "Instagram", icon: Instagram },
  { id: "Chat web", icon: MessageCircle },
  { id: "Facebook", icon: Facebook },
  { id: "Multicanal", icon: Layers },
];

const ACESSOS = [
  { id: "CRM", icon: Database, desc: "Histórico, etapa e tags do lead" },
  { id: "Histórico de conversas", icon: History, desc: "Mensagens anteriores" },
  { id: "Pipeline", icon: Target, desc: "Negócios e estágios" },
  { id: "Agenda", icon: Calendar, desc: "Google Calendar" },
  { id: "Conhecimento interno", icon: BookOpen, desc: "FAQs, PDFs e site" },
];

const PERSONALIDADES = [
  { id: "Consultivo", desc: "Faz perguntas, escuta antes de propor" },
  { id: "Profissional", desc: "Sério, corporativo, direto ao ponto" },
  { id: "Comercial", desc: "Persuasivo e focado em conversão" },
  { id: "Amigável", desc: "Caloroso, próximo, descontraído" },
  { id: "Objetivo", desc: "Respostas curtas, sem rodeios" },
];

const CAMPOS_SUG: { key: string; label: string; type: "text" | "email" | "phone" | "number" | "date" }[] = [
  { key: "nome", label: "Nome", type: "text" },
  { key: "telefone", label: "Telefone", type: "phone" },
  { key: "email", label: "E-mail", type: "email" },
  { key: "empresa", label: "Empresa", type: "text" },
  { key: "cidade", label: "Cidade", type: "text" },
  { key: "orcamento", label: "Orçamento", type: "text" },
];

const STEPS: { key: StepKey; title: string; subtitle: string }[] = [
  { key: "funcao", title: "Qual será a função deste colaborador?", subtitle: "Escolha o papel que ele vai desempenhar." },
  { key: "objetivo", title: "Qual objetivo ele deve atingir?", subtitle: "O resultado principal que ele precisa entregar." },
  { key: "canais", title: "Onde ele irá atuar?", subtitle: "Canais que ele vai operar." },
  { key: "acessos", title: "Ele precisa acessar informações da plataforma?", subtitle: "Marque tudo que faz sentido." },
  { key: "campos", title: "Ele precisa coletar dados?", subtitle: "Selecione os campos a serem extraídos durante a conversa." },
  { key: "personalidade", title: "Como deve ser sua personalidade?", subtitle: "Como ele se comunica com as pessoas." },
  { key: "descricao", title: "Descreva em poucas palavras", subtitle: "Detalhe livre que vai personalizar tudo." },
];

interface Props {
  onCancel: () => void;
  onComplete: (blueprint: WorkforceBlueprint) => Promise<void>;
}

export function WorkforceWizard({ onCancel, onComplete }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [funcao, setFuncao] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [canais, setCanais] = useState<string[]>([]);
  const [acessos, setAcessos] = useState<string[]>([]);
  const [campos, setCampos] = useState<typeof CAMPOS_SUG>([]);
  const [personalidade, setPersonalidade] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const canAdvance = () => {
    switch (step.key) {
      case "funcao": return !!funcao;
      case "objetivo": return !!objetivo;
      case "canais": return canais.length > 0;
      case "acessos": return true;
      case "campos": return true;
      case "personalidade": return !!personalidade;
      case "descricao": return descricao.trim().length >= 5;
    }
  };

  async function finish() {
    setLoading(true);
    try {
      const blueprint = blueprintFromWizard({
        funcao, objetivo, canais, acessos, campos: campos.map((c) => ({ ...c, required: c.key === "nome" || c.key === "telefone" })),
        personalidade, descricao,
      });
      await onComplete(blueprint);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Assistente Inteligente · Passo {stepIdx + 1} de {STEPS.length}
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <Progress value={((stepIdx + 1) / STEPS.length) * 100} className="h-1" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
        <h2 className="text-2xl font-semibold tracking-tight">{step.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{step.subtitle}</p>

        <div className="mt-6">
          {step.key === "funcao" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {FUNCOES.map((f) => {
                const Icon = f.icon; const sel = funcao === f.id;
                return (
                  <button key={f.id} onClick={() => setFuncao(f.id)}
                    className={cn("text-left p-4 rounded-xl border bg-card transition-all",
                      sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center",
                      sel ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                      <Icon size={18} />
                    </div>
                    <p className="font-semibold text-sm mt-3">{f.id}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "objetivo" && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {OBJETIVOS.map((o) => {
                const sel = objetivo === o;
                return (
                  <button key={o} onClick={() => setObjetivo(o)}
                    className={cn("text-left p-4 rounded-xl border bg-card transition-all",
                      sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <CheckCircle2 className={cn("size-5", sel ? "text-primary" : "text-muted-foreground/30")} />
                    <p className="font-medium text-sm mt-3">{o}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "canais" && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {CANAIS.map((c) => {
                const Icon = c.icon; const sel = canais.includes(c.id);
                return (
                  <button key={c.id} onClick={() => toggle(canais, setCanais, c.id)}
                    className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border bg-card transition-all",
                      sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <Icon size={22} className={sel ? "text-primary" : "text-muted-foreground"} />
                    <p className="font-medium text-sm">{c.id}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "acessos" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACESSOS.map((a) => {
                const Icon = a.icon; const sel = acessos.includes(a.id);
                return (
                  <button key={a.id} onClick={() => toggle(acessos, setAcessos, a.id)}
                    className={cn("flex items-center gap-3 p-4 rounded-xl border bg-card text-left transition-all",
                      sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      sel ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{a.id}</p>
                      <p className="text-[11px] text-muted-foreground">{a.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "campos" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAMPOS_SUG.map((c) => {
                  const sel = campos.some((x) => x.key === c.key);
                  return (
                    <button key={c.key} onClick={() => setCampos((cs) => sel ? cs.filter((x) => x.key !== c.key) : [...cs, c])}
                      className={cn("flex items-center gap-2 p-3 rounded-lg border bg-card text-left transition-all",
                        sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                      <ListChecks className={cn("size-4", sel ? "text-primary" : "text-muted-foreground/40")} />
                      <span className="text-sm font-medium">{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <button onClick={() => {
                  const key = window.prompt("Nome do campo (ex.: cnpj)")?.trim();
                  if (!key) return;
                  setCampos((cs) => [...cs, { key, label: key, type: "text" }]);
                }} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <Plus className="size-3" /> Adicionar campo customizado
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Pule este passo se ele não precisa coletar dados.</p>
            </div>
          )}

          {step.key === "personalidade" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PERSONALIDADES.map((p) => {
                const sel = personalidade === p.id;
                return (
                  <button key={p.id} onClick={() => setPersonalidade(p.id)}
                    className={cn("text-left p-4 rounded-xl border bg-card transition-all",
                      sel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40")}>
                    <p className="font-semibold text-sm">{p.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {step.key === "descricao" && (
            <div className="space-y-3">
              <Textarea rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Qualificar leads interessados em software para clínicas odontológicas. Pergunte sobre número de cadeiras e principal dor."
                className="text-sm" />
              <p className="text-xs text-muted-foreground">Quanto mais específico, melhor a IA personaliza o colaborador.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-card px-6 py-4 flex items-center justify-between shrink-0">
        <Button variant="ghost" onClick={() => stepIdx === 0 ? onCancel() : setStepIdx((s) => s - 1)} disabled={loading}>
          <ArrowLeft className="size-4 mr-1" /> {stepIdx === 0 ? "Cancelar" : "Voltar"}
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={!canAdvance() || loading}>
            {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Montando colaborador…</> : <><Sparkles className="size-4 mr-2" /> Gerar colaborador</>}
          </Button>
        ) : (
          <Button onClick={() => setStepIdx((s) => s + 1)} disabled={!canAdvance()}>
            Continuar <ArrowRight className="size-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
