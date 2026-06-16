import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Loader2, Sparkles, ArrowLeft, Wand2, PencilRuler, LayoutTemplate,
  Phone, Headphones, Wallet, SendIcon, CheckCircle2,
} from "lucide-react";
import { useCreateEquipe, useSaveCanvas } from "@/hooks/useEquipeIA";
import { toast } from "sonner";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";
import { AIProvidersConnector } from "@/components/equipe-ia/AIProvidersConnector";
import { MandatoryProviderDialog } from "@/components/equipe-ia/MandatoryProviderDialog";
import { useUserAICredentials } from "@/hooks/useUserAICredentials";
import { AI_PROVIDERS, ProviderId } from "@/lib/aiProviders";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EquipeNodeKind } from "@/components/equipe-ia/nodeTypes";

type Mode = "blank" | "templates" | "ai";
type TemplateStep = "pick" | "connect";

const TEMPLATES = [
  { id: "sdr", icon: Phone,
    name: "SDR IA", role: "Qualificador de leads B2B",
    description: "Qualifica leads, faz perguntas estratégicas e agenda reunião com o time comercial." },
  { id: "support", icon: Headphones,
    name: "Atendimento", role: "Suporte ao cliente",
    description: "Resolve dúvidas frequentes, abre tickets e escala para humano quando necessário." },
  { id: "billing", icon: Wallet,
    name: "Cobrança Amigável", role: "Negociação de pagamentos",
    description: "Aborda inadimplentes com tom consultivo, negocia e registra acordos no CRM." },
];

const AI_SUGGESTIONS = [
  { preview: "SDR para imobiliária", full: "Quero um colaborador SDR que qualifica leads de imobiliária, descobre faixa de valor, região desejada e agenda visita." },
  { preview: "Pós-venda SaaS", full: "Quero um colaborador que faz pós-venda de SaaS, acompanha onboarding, mede satisfação e identifica oportunidades de upsell." },
  { preview: "Agendamento em clínica", full: "Quero um colaborador que agenda consultas em clínica, confirma horários, envia lembretes e remarca quando necessário." },
  { preview: "Recuperação de carrinho", full: "Quero um colaborador que recupera carrinhos abandonados de e-commerce com mensagens consultivas e cupons de incentivo." },
  { preview: "Cobrança amigável", full: "Quero um colaborador de cobrança amigável que aborda inadimplentes, negocia parcelamento e registra acordos." },
  { preview: "Suporte técnico", full: "Quero um colaborador de suporte técnico que faz triagem, resolve dúvidas comuns e escala para humano apenas quando necessário." },
];

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback((reset?: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (reset) { ta.style.height = `${minHeight}px`; ta.style.overflowY = "hidden"; return; }
    ta.style.height = `${minHeight}px`;
    const max = maxHeight ?? Infinity;
    const newHeight = Math.max(minHeight, Math.min(ta.scrollHeight, max));
    ta.style.height = `${newHeight}px`;
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  }, [minHeight, maxHeight]);
  useEffect(() => {
    if (textareaRef.current) { textareaRef.current.style.height = `${minHeight}px`; textareaRef.current.style.overflowY = "hidden"; }
  }, [minHeight]);
  return { textareaRef, adjustHeight };
}

export default function EquipeCreator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const create = useCreateEquipe();
  const saveCanvas = useSaveCanvas();
  const qc = useQueryClient();
  const credsQ = useUserAICredentials();

  const urlMode = (searchParams.get("mode") as Mode | null);
  const validMode = urlMode && ["blank", "templates", "ai"].includes(urlMode) ? urlMode : null;
  const [mode, setMode] = useState<Mode>(validMode ?? "blank");

  // No "choose" page: if no/invalid mode → redirect to home of Equipe IA.
  useEffect(() => {
    if (!validMode) { navigate("/equipe-ia", { replace: true }); return; }
    setMode(validMode);
  }, [validMode, navigate]);

  // Blank form
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");

  // Templates flow
  const [tplStep, setTplStep] = useState<TemplateStep>("pick");
  const [selectedTpl, setSelectedTpl] = useState<(typeof TEMPLATES)[number] | null>(null);

  // Inline credentials state (used in blank + templates "connect")
  const savedProviders = (credsQ.data ?? []).filter((c) => c.is_active && c.api_key).map((c) => c.provider);
  const savedSet = new Set(savedProviders);

  const [enabled, setEnabled] = useState<Record<ProviderId, boolean>>({
    openai: true, claude: false, gemini: false, deepseek: false, meta: false,
  });
  const [keys, setKeys] = useState<Record<ProviderId, string>>({
    openai: "", claude: "", gemini: "", deepseek: "", meta: "",
  });

  useEffect(() => {
    if (!credsQ.data) return;
    setEnabled((prev) => {
      const next = { ...prev };
      for (const c of credsQ.data) {
        if (c.is_active && c.api_key) (next as Record<string, boolean>)[c.provider] = true;
      }
      return next;
    });
  }, [credsQ.data]);

  // AI mode
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCreatedId, setAiCreatedId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 80, maxHeight: 220 });

  async function persistCredentialsInline() {
    const rows = AI_PROVIDERS
      .filter((p) => enabled[p.id] && keys[p.id].trim())
      .map((p) => ({ provider: p.id, api_key: keys[p.id].trim(), is_active: true }));
    if (rows.length === 0) return;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) throw new Error("Sessão expirada.");
    const { error } = await supabase
      .from("user_ai_credentials")
      .upsert(rows.map((r) => ({ ...r, user_id: uid })) as never, { onConflict: "user_id,provider" as never });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ["user_ai_credentials"] });
  }

  function hasAnyConfigured() {
    const fromSaved = savedSet.size > 0;
    const fromForm = AI_PROVIDERS.some((p) => enabled[p.id] && (keys[p.id].trim() || savedSet.has(p.id)));
    return fromSaved || fromForm;
  }

  async function submitBlank() {
    if (!name.trim()) { toast.error("Dê um nome ao colaborador."); return; }
    if (!hasAnyConfigured()) { toast.error("Ative pelo menos uma IA."); return; }
    try {
      await persistCredentialsInline();
      const w = await create.mutateAsync({ name: name.trim(), role: role.trim(), description: description.trim() });
      toast.success("Colaborador criado!");
      navigate(`/equipe-ia/colaboradores/${w.id}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar"); }
  }

  async function confirmTemplate() {
    if (!selectedTpl) return;
    if (!hasAnyConfigured()) { toast.error("Ative pelo menos uma IA."); return; }
    try {
      await persistCredentialsInline();
      const w = await create.mutateAsync({
        name: selectedTpl.name, role: selectedTpl.role, description: selectedTpl.description,
      });
      toast.success("Colaborador criado!");
      navigate(`/equipe-ia/colaboradores/${w.id}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar"); }
  }

  // AI: send prompt → generate full blueprint → create worker → save canvas → ask for IA
  async function submitAI() {
    if (!prompt.trim()) { toast.error("Descreva o que esse colaborador deve fazer."); return; }
    setAiLoading(true);
    try {
      const p = prompt.trim();

      // 1. Generate full blueprint with AI
      const { data: gen, error: genErr } = await supabase.functions.invoke("generate-equipe-ai", {
        body: { prompt: p },
      });
      if (genErr) throw new Error(genErr.message || "Falha ao gerar colaborador");
      if (!gen || gen.error) throw new Error(gen?.error || "Falha ao gerar colaborador");

      const aiName: string = gen.name || "Colaborador IA";
      const aiRole: string = gen.role || p.slice(0, 80);
      const aiDescription: string = gen.description || p;
      const aiPersona: string = gen.persona || "";
      const aiSystemPrompt: string = gen.system_prompt || "";
      const aiNodes: Array<{ kind: EquipeNodeKind; title: string; summary: string; fields?: unknown[] }> =
        Array.isArray(gen.nodes) ? gen.nodes : [];

      // 2. Create the equipe row
      const w = await create.mutateAsync({
        name: aiName, role: aiRole, description: aiDescription,
      });

      // 3. Persist persona + system_prompt into the row
      try {
        await supabase
          .from("ai_workforce")
          .update({
            persona: aiPersona,
            config: { system_prompt: aiSystemPrompt, generated_by_ai: true },
          } as never)
          .eq("id", w.id);
      } catch { /* non-fatal */ }

      // 4. Build canvas: core + AI nodes positioned radially
      const cx = 600, cy = 280;
      const ring = aiNodes.map((n, i) => {
        const angle = (i / Math.max(aiNodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const r = 360;
        return {
          id: `node_${n.kind}_${i}`,
          type: "equipe" as const,
          position: { x: Math.round(cx + Math.cos(angle) * r), y: Math.round(cy + Math.sin(angle) * r) },
          data: {
            kind: n.kind,
            title: n.title || n.kind,
            summary: n.summary || "",
            ...(n.fields ? { fields: n.fields } : {}),
          },
        };
      });
      const nodes = [
        {
          id: "core",
          type: "equipe" as const,
          position: { x: cx, y: cy },
          data: { kind: "core" as EquipeNodeKind, title: aiName, summary: aiRole },
        },
        ...ring,
      ];
      const edges = ring.map((n) => ({
        id: `e_core_${n.id}`, source: "core", target: n.id, animated: true,
      }));

      await saveCanvas.mutateAsync({
        equipeId: w.id,
        state: { nodes: nodes as never, edges: edges as never },
      });

      setAiCreatedId(w.id);
      toast.success("Colaborador montado! Agora conecte uma IA para abrir o construtor.");
      setAiDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar colaborador");
    } finally {
      setAiLoading(false);
    }
  }

  function SectionHeader({ icon: Icon, title, subtitle }: { icon: typeof Bot; title: string; subtitle: string }) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <EquipePageLayout>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/equipe-ia")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Voltar para Equipe IA
        </button>

        {/* BLANK MODE */}
        {mode === "blank" && (
          <div className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-5">
                <SectionHeader
                  icon={PencilRuler}
                  title="Colaborador em branco"
                  subtitle="Defina o básico e refine no construtor visual."
                />
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Nome do colaborador</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: SDR IA Wiize" />
                  </div>
                  <div>
                    <Label className="text-xs">Função / cargo</Label>
                    <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex.: Qualificador de leads B2B" />
                  </div>
                  <div>
                    <Label className="text-xs">Descrição</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                      placeholder="O que esse colaborador faz?" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <AIProvidersConnector enabled={enabled} setEnabled={setEnabled} keys={keys} setKeys={setKeys} savedProviders={savedSet} />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => navigate("/equipe-ia")}>Cancelar</Button>
              <Button onClick={submitBlank} disabled={create.isPending || !name.trim()}>
                {create.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                Criar colaborador
              </Button>
            </div>
          </div>
        )}

        {/* TEMPLATES MODE — step 1: pick, step 2: connect */}
        {mode === "templates" && (
          <div className="space-y-5">
            <SectionHeader
              icon={LayoutTemplate}
              title={tplStep === "pick" ? "1. Escolha um modelo pronto" : "2. Conecte uma IA para o modelo"}
              subtitle={tplStep === "pick"
                ? "Selecione o template que mais se aproxima do seu objetivo."
                : `Modelo selecionado: ${selectedTpl?.name ?? ""}`}
            />

            {tplStep === "pick" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const isSel = selectedTpl?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setSelectedTpl(t); setTplStep("connect"); }}
                      className={cn(
                        "text-left rounded-2xl border bg-card p-5 transition-all",
                        isSel ? "border-primary ring-2 ring-primary/20" : "hover:border-primary/40 hover:shadow-sm",
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                        <Icon size={22} />
                      </div>
                      <p className="font-semibold mt-4">{t.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t.role}</p>
                      <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {tplStep === "connect" && selectedTpl && (
              <>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 ring-1 ring-primary/20 flex items-center justify-center text-primary">
                      <selectedTpl.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{selectedTpl.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{selectedTpl.role}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setTplStep("pick")}>Trocar</Button>
                  </CardContent>
                </Card>

                <AIProvidersConnector enabled={enabled} setEnabled={setEnabled} keys={keys} setKeys={setKeys} savedProviders={savedSet} />

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" onClick={() => setTplStep("pick")}>Voltar</Button>
                  <Button onClick={confirmTemplate} disabled={create.isPending}>
                    {create.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Criar com este modelo
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* AI MODE — design inspired by Flow AI creator */}
        {mode === "ai" && (
          <div className="min-h-[70vh] flex items-center justify-center px-2 relative overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[128px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full filter blur-[128px] animate-pulse pointer-events-none" style={{ animationDelay: "700ms" }} />

            <div className="w-full max-w-2xl mx-auto relative z-10 space-y-10">
              <motion.div
                className="text-center space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card text-sm text-muted-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Descreva. Nós montamos o colaborador.
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                  Crie seu <span className="text-shimmer-highlight whitespace-nowrap">colaborador IA</span><br />em segundos
                </h1>

                <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                  Descreva o objetivo e a IA monta nome, função, descrição e o construtor pronto pra usar.
                </p>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/40 tracking-widest uppercase font-medium select-none">
                  <span>powered by</span>
                  <span className="text-primary/50 font-bold tracking-wider">Wiize IA</span>
                </div>
              </motion.div>

              <motion.div
                className="relative backdrop-blur-2xl bg-card/50 rounded-2xl border border-border/50 shadow-2xl p-3"
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(e) => { setPrompt(e.target.value); adjustHeight(); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (prompt.trim() && !aiLoading && !create.isPending) submitAI();
                    }
                  }}
                  placeholder="Quero um colaborador para..."
                  disabled={aiLoading}
                  className={cn(
                    "w-full px-4 py-3 resize-none bg-transparent border-none text-foreground text-sm",
                    "focus:outline-none placeholder:text-muted-foreground/40 min-h-[56px]",
                    "[direction:ltr] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full",
                  )}
                />

                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-[10px] text-muted-foreground/50">{prompt.length} caracteres</span>
                  <motion.button
                    type="button"
                    onClick={submitAI}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={!prompt.trim() || aiLoading || create.isPending}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 relative overflow-hidden",
                      prompt.trim() ? "text-white shadow-lg" : "bg-muted text-muted-foreground",
                    )}
                    style={prompt.trim() ? {
                      background: "linear-gradient(135deg, #4285F4, #34A853, #8BC34A)",
                      boxShadow: "0 4px 16px rgba(66, 133, 244, 0.3)",
                    } : undefined}
                  >
                    {(aiLoading || create.isPending) ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <motion.svg width="16" height="16" viewBox="0 0 24 24" fill="white"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                        <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z" />
                      </motion.svg>
                    )}
                    <span>Criar colaborador</span>
                  </motion.button>
                </div>
              </motion.div>

              {aiCreatedId && !aiDialogOpen && (
                <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 bg-emerald-500/5 text-emerald-700 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" />
                  <span>
                    Colaborador criado. Conecte uma IA para abrir o construtor.{" "}
                    <button className="underline" onClick={() => setAiDialogOpen(true)}>Conectar agora</button>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mandatory IA dialog for AI mode */}
      <MandatoryProviderDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onConfigured={() => {
          if (aiCreatedId) navigate(`/equipe-ia/colaboradores/${aiCreatedId}`);
        }}
        onSkip={() => {
          toast.message("Colaborador salvo como rascunho. Configure uma IA depois para abrir o construtor.");
          navigate("/equipe-ia");
        }}
      />
    </EquipePageLayout>
  );
}
