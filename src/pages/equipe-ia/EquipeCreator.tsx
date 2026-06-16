import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Bot, Loader2, Sparkles, ArrowLeft, Wand2, CheckCircle2, AlertCircle,
  PencilRuler, LayoutTemplate, Phone, Headphones, Wallet,
} from "lucide-react";
import { useCreateEquipe } from "@/hooks/useEquipeIA";
import { toast } from "sonner";
import { EquipePageLayout } from "@/components/equipe-ia/EquipePageLayout";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type Mode = "choose" | "blank" | "templates" | "ai";

type ProviderId = "openai" | "claude" | "gemini" | "deepseek" | "meta";
const PROVIDERS: { id: ProviderId; name: string; placeholder: string; helper: string }[] = [
  { id: "openai",   name: "OpenAI",   placeholder: "sk-...",            helper: "Chave de API da OpenAI (plataform.openai.com)." },
  { id: "claude",   name: "Claude (Anthropic)", placeholder: "sk-ant-...", helper: "Chave da Anthropic (console.anthropic.com)." },
  { id: "gemini",   name: "Gemini (Google)",    placeholder: "AIza...",    helper: "Chave do Google AI Studio." },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-...",            helper: "Chave da DeepSeek (platform.deepseek.com)." },
  { id: "meta",     name: "Meta (Llama)", placeholder: "Token...",        helper: "Token de acesso da Meta para Llama API." },
];

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

function useUserCredentials() {
  return useQuery({
    queryKey: ["user_ai_credentials"],
    refetchOnWindowFocus: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_ai_credentials")
        .select("provider,api_key,is_active");
      if (error) throw error;
      return (data ?? []) as { provider: string; api_key: string | null; is_active: boolean }[];
    },
  });
}

function AIProvidersConfig({
  enabled, setEnabled, keys, setKeys, savedProviders,
}: {
  enabled: Record<ProviderId, boolean>;
  setEnabled: (v: Record<ProviderId, boolean>) => void;
  keys: Record<ProviderId, string>;
  setKeys: (v: Record<ProviderId, string>) => void;
  savedProviders: Set<string>;
}) {
  return (
    <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <p className="text-sm font-semibold">Conectar IAs do colaborador</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Ative pelo menos uma IA e informe a chave. Sem isso, o colaborador não pode operar.
      </p>
      <div className="space-y-2">
        {PROVIDERS.map((p) => {
          const isOn = enabled[p.id];
          const hasSaved = savedProviders.has(p.id);
          return (
            <div key={p.id} className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{p.name}</p>
                    {hasSaved && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded ring-1 ring-emerald-500/20">
                        <CheckCircle2 className="size-3" /> conectado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.helper}</p>
                </div>
                <Switch
                  checked={isOn}
                  onCheckedChange={(v) => setEnabled({ ...enabled, [p.id]: v })}
                />
              </div>
              {isOn && (
                <div className="mt-3">
                  <Input
                    type="password"
                    placeholder={hasSaved ? "•••••• (chave salva — preencha para substituir)" : p.placeholder}
                    value={keys[p.id]}
                    onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EquipeCreator() {
  const navigate = useNavigate();
  const create = useCreateEquipe();
  const qc = useQueryClient();
  const credsQ = useUserCredentials();
  const savedProviders = useMemo(
    () => new Set((credsQ.data ?? []).filter((c) => c.is_active && c.api_key).map((c) => c.provider)),
    [credsQ.data],
  );

  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [enabled, setEnabled] = useState<Record<ProviderId, boolean>>({
    openai: false, claude: false, gemini: false, deepseek: false, meta: false,
  });
  const [keys, setKeys] = useState<Record<ProviderId, string>>({
    openai: "", claude: "", gemini: "", deepseek: "", meta: "",
  });

  // Pre-enable providers the user already saved.
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

  const validation = useMemo(() => {
    const active = PROVIDERS.filter((p) => enabled[p.id]);
    if (active.length === 0) return { ok: false, msg: "Ative pelo menos uma IA." };
    const missing = active.filter((p) => !savedProviders.has(p.id) && !keys[p.id].trim());
    if (missing.length > 0) return { ok: false, msg: `Informe a chave de: ${missing.map((m) => m.name).join(", ")}.` };
    return { ok: true, msg: "Configuração válida." };
  }, [enabled, keys, savedProviders]);

  async function persistCredentials(uid: string) {
    const rows = PROVIDERS
      .filter((p) => enabled[p.id] && keys[p.id].trim())
      .map((p) => ({ user_id: uid, provider: p.id, api_key: keys[p.id].trim(), is_active: true }));
    if (rows.length === 0) return;
    const { error } = await supabase
      .from("user_ai_credentials")
      .upsert(rows as never, { onConflict: "user_id,provider" as never });
    if (error) throw error;
  }

  async function create_(payload: { name: string; role: string; description: string }) {
    if (!payload.name.trim()) { toast.error("Dê um nome ao colaborador."); return; }
    if (!validation.ok) { toast.error(validation.msg); return; }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) { toast.error("Sessão expirada."); return; }
    await persistCredentials(uid);
    qc.invalidateQueries({ queryKey: ["user_ai_credentials"] });
    const w = await create.mutateAsync(payload);
    toast.success("Colaborador criado!");
    navigate(`/equipe-ia/colaboradores/${w.id}`);
  }

  async function submitBlank() {
    try { await create_({ name: name.trim(), role: role.trim(), description: description.trim() }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao criar"); }
  }

  async function useTemplate(t: (typeof TEMPLATES)[number]) {
    if (!validation.ok) { toast.error(validation.msg); return; }
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

  function ValidationBanner() {
    return (
      <div className={cn(
        "flex items-start gap-2 text-xs rounded-lg px-3 py-2 ring-1",
        validation.ok ? "bg-emerald-500/5 text-emerald-700 ring-emerald-500/20"
                      : "bg-amber-500/5 text-amber-700 ring-amber-500/20",
      )}>
        {validation.ok ? <CheckCircle2 className="size-3.5 mt-0.5 shrink-0" /> : <AlertCircle className="size-3.5 mt-0.5 shrink-0" />}
        <span>{validation.msg}</span>
      </div>
    );
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
                <p className="text-xs text-muted-foreground">Defina o básico, conecte as IAs e refine no construtor.</p>
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
              <AIProvidersConfig enabled={enabled} setEnabled={setEnabled} keys={keys} setKeys={setKeys} savedProviders={savedProviders} />
              <ValidationBanner />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode("choose")}>Cancelar</Button>
                <Button onClick={submitBlank} disabled={create.isPending || !validation.ok || !name.trim()}>
                  {create.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Criar colaborador
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {mode === "templates" && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Modelos prontos</h2>
              <p className="text-xs text-muted-foreground">Conecte as IAs e escolha um modelo para começar.</p>
            </div>
            <AIProvidersConfig enabled={enabled} setEnabled={setEnabled} keys={keys} setKeys={setKeys} savedProviders={savedProviders} />
            <ValidationBanner />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => useTemplate(t)}
                    disabled={create.isPending || !validation.ok}
                    className="text-left rounded-2xl border bg-card hover:border-primary/60 p-5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                  <p className="text-xs text-muted-foreground">Descreva seu objetivo, conecte as IAs e a IA gera o colaborador.</p>
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
              <AIProvidersConfig enabled={enabled} setEnabled={setEnabled} keys={keys} setKeys={setKeys} savedProviders={savedProviders} />
              <ValidationBanner />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setMode("choose")}>Cancelar</Button>
                <Button onClick={submitAI} disabled={aiLoading || create.isPending || !prompt.trim() || !validation.ok}>
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
