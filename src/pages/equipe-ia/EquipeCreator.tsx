import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Loader2, Sparkles, ArrowLeft, Wand2,
  PencilRuler, LayoutTemplate, Phone, Headphones, Wallet,
} from "lucide-react";
import { useCreateEquipe } from "@/hooks/useEquipeIA";
import { toast } from "sonner";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";
import { cn } from "@/lib/utils";

type Mode = "choose" | "blank" | "templates" | "ai";

const TEMPLATES = [
  { id: "sdr", icon: Phone, color: "text-emerald-500", bg: "bg-emerald-500/10",
    name: "SDR IA", role: "Qualificador de leads B2B",
    description: "Qualifica leads, faz perguntas estratégicas e agenda reunião com o time comercial." },
  { id: "support", icon: Headphones, color: "text-sky-500", bg: "bg-sky-500/10",
    name: "Atendimento", role: "Suporte ao cliente",
    description: "Resolve dúvidas frequentes, abre tickets e escala para humano quando necessário." },
  { id: "billing", icon: Wallet, color: "text-amber-500", bg: "bg-amber-500/10",
    name: "Cobrança Amigável", role: "Negociação de pagamentos",
    description: "Aborda inadimplentes com tom consultivo, negocia e registra acordos no CRM." },
];

const AI_SUGGESTIONS = [
  "Quero um colaborador que qualifica leads de imobiliária",
  "Quero um colaborador que faz pós-venda de SaaS",
  "Quero um colaborador que agenda consultas em clínica",
  "Quero um colaborador que recupera carrinhos abandonados",
];

export default function EquipeCreator() {
  const navigate = useNavigate();
  const create = useCreateEquipe();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  async function create_(payload: { name: string; role: string; description: string }) {
    if (!payload.name.trim()) { toast.error("Dê um nome ao colaborador."); return; }
    const w = await create.mutateAsync(payload);
    toast.success("Colaborador criado!");
    navigate(`/equipe-ia/colaboradores/${w.id}`);
  }

  async function submitBlank() {
    try { await create_({ name: name.trim(), role: role.trim(), description: description.trim() }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar"); }
  }

  async function useTemplate(t: (typeof TEMPLATES)[number]) {
    try { await create_({ name: t.name, role: t.role, description: t.description }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar"); }
  }

  async function submitAI() {
    if (!prompt.trim()) { toast.error("Descreva o que esse colaborador deve fazer."); return; }
    setAiLoading(true);
    try {
      const p = prompt.trim();
      const firstSentence = p.split(/[.!?\n]/)[0].slice(0, 80);
      await create_({ name: "Colaborador IA", role: firstSentence, description: p });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar colaborador");
    } finally {
      setAiLoading(false);
    }
  }

  function MethodCard({
    icon: Icon, title, subtitle, onClick, accent, badge,
  }: {
    icon: typeof Bot; title: string; subtitle: string; onClick: () => void;
    accent?: string; badge?: string;
  }) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "group relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border bg-card",
          "hover:border-primary/40 hover:bg-primary/5 transition-all",
        )}
      >
        {badge && (
          <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px] px-2.5 py-0.5 shadow-md">
            {badge}
          </Badge>
        )}
        <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center transition-colors", accent ?? "bg-muted")}>
          <Icon size={26} className={accent ? "text-primary" : "text-muted-foreground group-hover:text-primary"} />
        </div>
        <div>
          <p className="font-semibold text-sm mb-1">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
        </div>
      </button>
    );
  }

  return (
    <EquipePageLayout>
      <div className="max-w-4xl mx-auto">
        {mode === "choose" && (
          <>
            <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
              <Sparkles className="size-3.5" /> Novo colaborador
            </div>
            <h1 className="text-3xl font-semibold tracking-tight mt-1">Criar colaborador</h1>
            <p className="text-muted-foreground mt-1">Escolha como deseja começar.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <MethodCard icon={PencilRuler} title="Em branco"
                subtitle="Comece do zero e monte tudo no construtor visual."
                onClick={() => setMode("blank")} />
              <MethodCard icon={LayoutTemplate} title="Usar modelo pronto"
                subtitle="Templates prontos para SDR, suporte, cobrança e mais."
                onClick={() => setMode("templates")} />
              <MethodCard icon={Wand2} title="Criar com IA"
                subtitle="Descreva o que precisa e a IA monta seu colaborador."
                onClick={() => setMode("ai")}
                accent="bg-primary/10" badge="Recomendado" />
            </div>
          </>
        )}

        {mode !== "choose" && (
          <button
            onClick={() => setMode("choose")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}

        {mode === "blank" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Colaborador em branco</h2>
                <p className="text-xs text-muted-foreground">Defina o básico e refine no construtor.</p>
              </div>
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
                <Button variant="ghost" onClick={() => setMode("choose")}>Cancelar</Button>
                <Button onClick={submitBlank} disabled={create.isPending}>
                  {create.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Criar colaborador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "templates" && (
          <div>
            <div className="mb-5">
              <h2 className="text-lg font-semibold">Modelos prontos</h2>
              <p className="text-xs text-muted-foreground">Comece com uma configuração testada e refine depois.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => useTemplate(t)}
                    disabled={create.isPending}
                    className="text-left rounded-2xl border bg-card hover:border-primary/60 p-5 transition-colors disabled:opacity-60"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", t.bg)}>
                      <Icon size={22} className={t.color} />
                    </div>
                    <p className="font-semibold mt-4">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.role}</p>
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === "ai" && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Wand2 size={20} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Crie um colaborador com IA</h2>
                  <p className="text-xs text-muted-foreground">Descreva seu objetivo e a IA gera um colaborador pronto pra usar.</p>
                </div>
              </div>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Quero um colaborador que atenda clientes de uma clínica de estética, qualifique e agende avaliação."
                className="min-h-[110px] resize-none"
              />
              <div>
                <p className="text-[11px] text-muted-foreground font-medium mb-2">💡 Sugestões rápidas</p>
                <div className="flex flex-wrap gap-1.5">
                  {AI_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPrompt(s)}
                      className="text-[11px] px-3 py-1.5 rounded-full border bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode("choose")}>Cancelar</Button>
                <Button onClick={submitAI} disabled={aiLoading || create.isPending || !prompt.trim()}>
                  {(aiLoading || create.isPending) ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </EquipePageLayout>
  );
}
