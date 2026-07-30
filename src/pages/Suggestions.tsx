import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Lightbulb, Send, CheckCircle2, Loader2, Type, Tag, Flame, AlignLeft,
  ArrowLeft, ShieldCheck, Sparkles, MessagesSquare, Rocket, Clock,
  CircleDot, TrendingUp, OctagonAlert, Asterisk,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_IMPORTANCE,
  SUGGESTION_TITLE_MAX,
  SUGGESTION_DESCRIPTION_MAX,
  type SuggestionImportance,
} from "@/lib/suggestions";

const HIGHLIGHTS = [
  {
    icon: MessagesSquare,
    title: "Lida por gente de verdade",
    text: "Cada sugestão é revisada pelo time de produto. Nada de formulário no vácuo.",
  },
  {
    icon: Rocket,
    title: "Vira roadmap",
    text: "Ideias recorrentes e bloqueios de trabalho entram na fila de desenvolvimento.",
  },
  {
    icon: ShieldCheck,
    title: "Você é avisado",
    text: "Quando sua sugestão entrar em desenvolvimento, enviamos um e-mail para você.",
  },
];

const IMPORTANCE_ICON: Record<SuggestionImportance, typeof CircleDot> = {
  comodidade: CircleDot,
  melhoraria: TrendingUp,
  bloqueio: OctagonAlert,
};

const IMPORTANCE_ICON_CLASS: Record<SuggestionImportance, string> = {
  comodidade: "text-blue-500",
  melhoraria: "text-amber-500",
  bloqueio: "text-red-500",
};

function RequiredMark() {
  return (
    <Asterisk size={11} className="text-primary shrink-0" aria-label="Campo obrigatório" />
  );
}

export default function Suggestions() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("company_profiles")
        .select("company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setCompanyName((data as any)?.company_name ?? null);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Rate limit: 1 sugestão a cada 24h por usuário (checagem de UI; regra real no banco)
  const checkLimit = useCallback(async () => {
    if (!user?.id) return;
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    setLimitReached((count || 0) > 0);
  }, [user?.id]);

  useEffect(() => { checkLimit(); }, [checkLimit]);

  const canSubmit =
    title.trim().length > 0 &&
    category !== "" &&
    importance !== "" &&
    description.trim().length > 0 &&
    !submitting &&
    !limitReached;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user?.id) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      const { error } = await supabase.from("suggestions").insert({
        user_id: user.id,
        account_owner_id: (profile as any)?.parent_owner_id ?? user.id,
        company_name: companyName,
        user_name: (profile as any)?.name ?? null,
        user_email: (profile as any)?.email ?? user.email ?? null,
        category,
        title: title.trim().slice(0, SUGGESTION_TITLE_MAX),
        description: description.trim().slice(0, SUGGESTION_DESCRIPTION_MAX),
        importance,
        status: "recebida",
      } as any);
      if (error) throw error;
      setTitle("");
      setCategory("");
      setImportance("");
      setDescription("");
      setSuccess(true);
      setLimitReached(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("SUGGESTION_RATE_LIMIT")) {
        setLimitReached(true);
        toast({
          title: "Limite diário atingido",
          description: "Você pode enviar 1 sugestão por dia. Tente novamente amanhã.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Não foi possível enviar",
          description: msg || "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Central de Sugestões · Wiize</title>
        <meta
          name="description"
          content="Envie sugestões de melhorias para a Wiize. Todas as ideias enviadas pelos clientes são analisadas pelo time de produto."
        />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Glow de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 h-[520px] opacity-70"
          style={{ background: "var(--gradient-glow)" }}
        />

        {/* Topbar */}
        <header className="relative z-10 border-b border-border/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
            <Logo />
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground shrink-0">
              <Link to="/dashboard">
                <ArrowLeft size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">Voltar ao painel</span>
              </Link>
            </Button>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14 space-y-6 sm:space-y-8">
          {/* Hero */}
          <section className="text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles size={13} />
              Central de Sugestões
            </span>
            <h1 className="font-bold tracking-tight text-foreground leading-[1.15]">
              <span className="block text-2xl sm:text-3xl md:text-4xl">
                A próxima melhoria da Wiize
              </span>
              <span className="block text-3xl sm:text-4xl md:text-5xl text-shimmer-highlight mt-1">
                começa com você
              </span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Conte o que está faltando, o que trava seu dia a dia ou aquela ideia que
              deixaria seu comercial mais rápido. Lemos todas as sugestões e priorizamos
              o que gera mais impacto real para quem usa a plataforma.
            </p>
          </section>

          {/* Diferenciais */}
          <section className="grid gap-3 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-xl border border-border/60 bg-card/60 p-4"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <h.icon size={17} className="text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">{h.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{h.text}</p>
              </div>
            ))}
          </section>

          {success && (
            <Alert className="border-primary/30 bg-primary/5 animate-fade-in">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertTitle className="text-foreground">Sugestão recebida. Obrigado!</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Sua ideia já está na fila de análise do time de produto. Se ela entrar em
                desenvolvimento, avisaremos você por e-mail.
              </AlertDescription>
            </Alert>
          )}

          {limitReached && !success && (
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Clock className="h-4 w-4 text-amber-500" />
              <AlertTitle className="text-foreground">Limite diário atingido</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Você já enviou uma sugestão nas últimas 24 horas. Para manter a qualidade da
                fila, aceitamos 1 sugestão por dia por usuário.
              </AlertDescription>
            </Alert>
          )}

          {/* Formulário */}
          <Card className="border-border/60 overflow-hidden">
            <div className="relative border-b border-primary/20 px-4 sm:px-6 py-4 flex items-center gap-3 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                <Lightbulb size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  Sugestão de melhoria
                </h2>
                <p className="text-xs text-muted-foreground">
                  Quanto mais detalhes, maior a chance de priorizarmos rápido.
                </p>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="suggestion-title" className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-2">
                      <Type size={14} className="text-primary" />
                      Título da sugestão
                    </span>
                    <RequiredMark />
                  </Label>
                  <Input
                    id="suggestion-title"
                    value={title}
                    maxLength={SUGGESTION_TITLE_MAX}
                    required
                    disabled={limitReached}
                    placeholder="Ex.: Importar contatos do CRM por planilha do Excel"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {title.length}/{SUGGESTION_TITLE_MAX}
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <Tag size={14} className="text-primary" />
                        Área da plataforma
                      </span>
                      <RequiredMark />
                    </Label>
                    <Select value={category} onValueChange={setCategory} disabled={limitReached}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUGGESTION_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <Flame size={14} className="text-primary" />
                        Nível de impacto
                      </span>
                      <RequiredMark />
                    </Label>
                    <Select value={importance} onValueChange={setImportance} disabled={limitReached}>
                      <SelectTrigger>
                        <SelectValue placeholder="Quanto isso te afeta hoje?" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUGGESTION_IMPORTANCE.map((i) => {
                          const Icon = IMPORTANCE_ICON[i.value];
                          return (
                            <SelectItem key={i.value} value={i.value}>
                              <span className="inline-flex items-center gap-2">
                                <Icon size={14} className={IMPORTANCE_ICON_CLASS[i.value]} />
                                {i.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="suggestion-description" className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="inline-flex items-center gap-2">
                      <AlignLeft size={14} className="text-primary" />
                      Descreva sua ideia
                    </span>
                    <RequiredMark />
                  </Label>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Descreva com o máximo de contexto possível. Um bom relato costuma
                    responder quatro pontos: a situação atual, o problema que ela causa,
                    o comportamento ideal e o ganho esperado para a sua operação.
                  </p>
                  <Textarea
                    id="suggestion-description"
                    value={description}
                    required
                    rows={8}
                    disabled={limitReached}
                    maxLength={SUGGESTION_DESCRIPTION_MAX}
                    placeholder={
                      "1. Situação atual: o que você faz hoje na Wiize para resolver isso?\n" +
                      "2. Problema: o que trava, demora ou dá retrabalho nesse caminho?\n" +
                      "3. Solução ideal: como você gostaria que a plataforma se comportasse?\n" +
                      "4. Impacto: quanto tempo, dinheiro ou oportunidades isso destravaria?\n\n" +
                      "Se puder, cite a tela exata, a frequência com que acontece e um exemplo real."
                    }
                    onChange={(e) => setDescription(e.target.value)}
                    className="resize-none text-sm leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground text-right">
                    {description.length}/{SUGGESTION_DESCRIPTION_MAX}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                  <p className="text-[11px] text-muted-foreground break-words">
                    Enviado como {(profile as any)?.name || user?.email}
                    {companyName ? ` · ${companyName}` : ""}
                    <span className="block mt-0.5">Limite de 1 sugestão por dia.</span>
                  </p>
                  <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
                    {submitting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Send size={16} className="mr-2" />
                    )}
                    Enviar sugestão
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground pb-6">
            Suas sugestões são usadas apenas para evolução do produto. Nada é compartilhado
            publicamente.
          </p>
        </main>
      </div>
    </>
  );
}
