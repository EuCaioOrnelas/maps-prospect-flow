import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export const SDR_AI_MODELS = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    tag: "Recomendado",
    desc: "Rápido e muito barato. Ideal para volume alto de conversas.",
    price: "≈ US$ 0,15 / 1M tokens de entrada",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    tag: "Mais inteligente",
    desc: "Melhor raciocínio comercial e negociações complexas.",
    price: "≈ US$ 2,50 / 1M tokens de entrada",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    tag: "Equilibrado",
    desc: "Um passo acima do mini, mantendo custo baixo.",
    price: "≈ US$ 0,40 / 1M tokens de entrada",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    tag: "Máxima qualidade",
    desc: "Para tickets altos onde cada conversa vale muito.",
    price: "≈ US$ 2,00 / 1M tokens de entrada",
  },
];

const STEPS_GUIDE: { title: string; text: string; link?: { label: string; url: string } }[] = [
  {
    title: "Crie sua conta na OpenAI",
    text: "A conta é gratuita e leva menos de 2 minutos. Use o e-mail da sua empresa.",
    link: { label: "platform.openai.com/signup", url: "https://platform.openai.com/signup" },
  },
  {
    title: "Adicione um método de pagamento e créditos",
    text: "Em Billing, cadastre o cartão e adicione crédito (US$ 10 já atendem milhares de mensagens no GPT-4o mini). Sem crédito, a chave existe mas não responde.",
    link: {
      label: "platform.openai.com/settings/organization/billing",
      url: "https://platform.openai.com/settings/organization/billing/overview",
    },
  },
  {
    title: "Gere a chave de API",
    text: 'Vá em API keys → "Create new secret key", dê um nome (ex.: Wiize SDR) e copie a chave. Ela começa com sk- e só aparece uma vez.',
    link: { label: "platform.openai.com/api-keys", url: "https://platform.openai.com/api-keys" },
  },
  {
    title: "Cole a chave aqui",
    text: "Validamos a chave direto na OpenAI e guardamos criptografada (AES-256). Ela nunca fica visível no app nem para a equipe da Wiize.",
  },
  {
    title: "Defina um limite de gasto (opcional, recomendado)",
    text: "Em Limits você define um teto mensal em dólares. Assim você controla exatamente quanto o SDR pode consumir.",
    link: { label: "platform.openai.com/settings/organization/limits", url: "https://platform.openai.com/settings/organization/limits" },
  },
];

type Status = {
  connected: boolean;
  key_hint: string | null;
  model: string;
  last_validated_at: string | null;
};

export function SDRIntelligenceStep({
  model,
  onModelChange,
  onConnectedChange,
}: {
  model: string;
  onModelChange: (model: string) => void;
  onConnectedChange?: (connected: boolean) => void;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("ai-credentials", {
      body: { action: "status" },
    });
    if (!error && data) {
      setStatus(data as Status);
      onConnectedChange?.(!!data.connected);
      if (data.model && !model) onModelChange(data.model);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (nextModel = model, key = apiKey) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-credentials", {
        body: { action: "save", apiKey: key.trim(), model: nextModel },
      });
      if ((data as any)?.error) throw new Error((data as any).error);
      if (error) {
        // supabase-js não expõe o corpo em respostas não-2xx; lemos manualmente.
        let detail = "";
        try {
          const res = (error as any)?.context;
          if (res && typeof res.json === "function") {
            const body = await res.clone().json();
            detail = body?.error || "";
          }
        } catch {
          /* corpo não é JSON */
        }
        throw new Error(detail || (error as any)?.message || "Não foi possível validar a chave.");
      }
      setApiKey("");
      toast.success("Chave conectada e validada na OpenAI.");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar a chave.");
    } finally {
      setSaving(false);
    }
  };


  const remove = async () => {
    setSaving(true);
    await supabase.functions.invoke("ai-credentials", { body: { action: "delete" } });
    setSaving(false);
    toast.success("Chave removida.");
    await load();
  };

  const handleModel = async (id: string) => {
    onModelChange(id);
    if (status?.connected) {
      await supabase.functions.invoke("ai-credentials", { body: { action: "save", model: id } });
    }
  };

  return (
    <div className="space-y-6">
      {/* Conexão da chave */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <KeyRound className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Sua chave da OpenAI</p>
            <p className="text-xs text-muted-foreground">
              O SDR roda na sua própria conta da OpenAI. Você paga apenas o consumo real e mantém o
              controle total do limite de gasto.
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : status?.connected ? (
            <Badge className="bg-primary/10 text-primary border-0 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Conectada
            </Badge>
          ) : (
            <Badge variant="secondary">Não conectada</Badge>
          )}
        </div>

        {status?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{status.key_hint}</p>
              <p className="text-xs text-muted-foreground">
                Validada em{" "}
                {status.last_validated_at
                  ? new Date(status.last_validated_at).toLocaleString("pt-BR")
                  : "—"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setStatus({ ...status, connected: false })}>
                Trocar chave
              </Button>
              <Button variant="ghost" size="sm" onClick={remove} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="sdr-openai-key" className="text-xs">
              Chave secreta (sk-...)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="sdr-openai-key"
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  placeholder="sk-proj-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button onClick={() => save()} disabled={saving || apiKey.trim().length < 20}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Testamos a chave na OpenAI antes de salvar e guardamos
              criptografada com AES-256. Ninguém consegue visualizá-la depois.
            </p>
          </div>
        )}
      </div>

      {/* Modelos */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Modelo que o SDR vai usar</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SDR_AI_MODELS.map((m) => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModel(m.id)}
                className={cn(
                  "relative text-left p-4 rounded-xl border transition-all duration-200",
                  active
                    ? "border-primary bg-card ring-2 ring-primary/20 shadow-md"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                {active && (
                  <span className="absolute top-3 right-3 h-5 w-5 rounded-[6px] bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{m.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {m.tag}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
                <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> {m.price}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Passo a passo */}
      <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">
            Como conseguir sua chave da OpenAI (passo a passo)
          </p>
        </div>
        <ol className="space-y-3">
          {STEPS_GUIDE.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="h-6 w-6 shrink-0 rounded-[7px] bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.text}</p>
                {s.link && (
                  <a
                    href={s.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    {s.link.label} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
