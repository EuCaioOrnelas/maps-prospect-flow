import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Lightbulb, Send, CheckCircle2, Loader2, Type, Tag, Flame, AlignLeft,
  ArrowLeft, ShieldCheck, MessagesSquare, Rocket, Clock, CircleDot,
  TrendingUp, OctagonAlert, Asterisk, ChevronDown, HelpCircle, Wrench, Gift,
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_IMPORTANCE,
  SUGGESTION_TITLE_MAX,
  SUGGESTION_DESCRIPTION_MAX,
  SUGGESTION_FIELD_MAX,
  type SuggestionImportance,
} from "@/lib/suggestions";

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

export default function SuggestionForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [importance, setImportance] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [expectedBenefit, setExpectedBenefit] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
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

  // Limite: 1 sugestão a cada 24h por usuário (checagem de UI; regra real no banco)
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
        is_public: true,
        ai_status: "pendente",
        problem: problem.trim() ? problem.trim().slice(0, SUGGESTION_FIELD_MAX) : null,
        expected_behavior: expectedBehavior.trim() ? expectedBehavior.trim().slice(0, SUGGESTION_FIELD_MAX) : null,
        expected_benefit: expectedBenefit.trim() ? expectedBenefit.trim().slice(0, SUGGESTION_FIELD_MAX) : null,
      } as any);
      if (error) throw error;
      setTitle("");
      setCategory("");
      setImportance("");
      setDescription("");
      setProblem("");
      setExpectedBehavior("");
      setExpectedBenefit("");
      setExtraOpen(false);
      setSuccess(true);
      setLimitReached(true);
      onSubmitted?.();
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

  if (success) {
    return (
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="animate-fade-in text-center py-6 sm:py-10 px-2 space-y-5">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
              <CheckCircle2 size={30} className="text-primary" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                Sugestão enviada com sucesso!
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Obrigado por ajudar a construir a Wiize. Nossa equipe irá analisar sua ideia.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 max-w-2xl mx-auto text-left pt-2">
              {[
                { icon: MessagesSquare, title: "Análise", text: "Nossa equipe e a IA analisam sua sugestão." },
                { icon: Rocket, title: "Priorização", text: "Ideias de maior impacto entram no planejamento mensal." },
                { icon: ShieldCheck, text: "Você é avisado no sininho a cada evolução.", title: "Retorno" },
              ].map((s) => (
                <div key={s.title} className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <s.icon size={16} className="text-primary mb-2" />
                  <p className="text-xs font-medium text-foreground">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/dashboard">
                  <ArrowLeft size={16} className="mr-2" />
                  Voltar ao painel
                </Link>
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5 justify-center">
              <Clock size={12} />
              Você poderá enviar uma nova sugestão em 24 horas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 overflow-hidden">
      <div className="relative border-b border-border/60 px-4 sm:px-6 py-4 flex items-center gap-3 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent">
        <div className="h-10 w-10 rounded-xl bg-primary border border-primary flex items-center justify-center shrink-0">
          <Lightbulb size={20} className="text-white" />
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

      <CardContent className="p-4 sm:p-6 space-y-5">
        {limitReached && (
          <Alert className="border-amber-500/30 bg-amber-500/5">
            <Clock className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-foreground">Limite diário atingido</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Você já enviou uma sugestão nas últimas 24 horas. Para manter a qualidade da
              fila, aceitamos 1 sugestão por dia por usuário.
            </AlertDescription>
          </Alert>
        )}

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
                  Categoria
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
                      <SelectItem key={i.value} value={i.value} className="group">
                        <span className="inline-flex items-center gap-2">
                          <Icon
                            size={14}
                            className={`${IMPORTANCE_ICON_CLASS[i.value]} group-focus:text-accent-foreground group-data-[highlighted]:text-accent-foreground`}
                          />
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
                Descrição detalhada
              </span>
              <RequiredMark />
            </Label>
            <Textarea
              id="suggestion-description"
              value={description}
              required
              rows={6}
              disabled={limitReached}
              maxLength={SUGGESTION_DESCRIPTION_MAX}
              placeholder="Conte a situação atual e o que você gostaria de encontrar na Wiize."
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {description.length}/{SUGGESTION_DESCRIPTION_MAX}
            </p>
          </div>

          {/* Campos progressivos (opcionais) */}
          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground -ml-2">
                <ChevronDown size={15} className={`mr-1.5 transition-transform ${extraOpen ? "rotate-180" : ""}`} />
                {extraOpen ? "Ocultar detalhes opcionais" : "Adicionar mais detalhes (opcional)"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-3">
              <div className="space-y-2">
                <Label htmlFor="suggestion-problem" className="flex items-center gap-2">
                  <HelpCircle size={14} className="text-primary" />
                  Qual problema você quer resolver?
                </Label>
                <Textarea
                  id="suggestion-problem"
                  value={problem}
                  rows={3}
                  disabled={limitReached}
                  maxLength={SUGGESTION_FIELD_MAX}
                  placeholder="Ex.: Perco oportunidades porque não sei quando um lead ficou parado."
                  onChange={(e) => setProblem(e.target.value)}
                  className="resize-none text-sm leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestion-behavior" className="flex items-center gap-2">
                  <Wrench size={14} className="text-primary" />
                  Como você imagina que deveria funcionar?
                </Label>
                <Textarea
                  id="suggestion-behavior"
                  value={expectedBehavior}
                  rows={3}
                  disabled={limitReached}
                  maxLength={SUGGESTION_FIELD_MAX}
                  placeholder="Ex.: Receber um aviso no sininho quando um lead ficar 3 dias sem movimentação."
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  className="resize-none text-sm leading-relaxed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestion-benefit" className="flex items-center gap-2">
                  <Gift size={14} className="text-primary" />
                  Qual benefício isso traria para você?
                </Label>
                <Textarea
                  id="suggestion-benefit"
                  value={expectedBenefit}
                  rows={3}
                  disabled={limitReached}
                  maxLength={SUGGESTION_FIELD_MAX}
                  placeholder="Ex.: Não perder vendas por falta de acompanhamento."
                  onChange={(e) => setExpectedBenefit(e.target.value)}
                  className="resize-none text-sm leading-relaxed"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

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
  );
}
