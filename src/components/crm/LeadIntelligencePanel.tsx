import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useLeadIntelligenceProfile,
  NEXT_ACTION_LABELS,
  PRIORITY_LABELS,
  STAGE_LABELS,
  BEHAVIOR_LABELS,
  MOMENTUM_LABELS,
} from "@/hooks/useLeadIntelligence";
import {
  Brain, Target, Flame, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Sparkles, Building2, Gauge, ListChecks, Lightbulb,
} from "lucide-react";
import { useLeadScores } from "@/hooks/useLeadScores";
import { toIntel100 } from "@/lib/intelligence";

interface Props {
  phone?: string | null;
  className?: string;
}

const EVENT_LABELS: Record<string, string> = {
  message_received: "Mensagem recebida do contato",
  message_sent: "Mensagem enviada",
  reply_fast: "Resposta rápida",
  keyword_intent: "Palavra de intenção de compra",
  meeting_scheduled: "Reunião agendada",
  stage_change: "Mudança de etapa no funil",
  inactivity: "Inatividade",
  no_reply: "Sem resposta",
  audio_received: "Áudio recebido",
  link_click: "Clique em link",
  niche_fit: "Aderência ao nicho",
  profile_enrichment: "Dados da empresa enriquecidos",
};

const CATEGORY_LABELS: Record<string, string> = {
  engagement: "Interação",
  interaction: "Interação",
  intent: "Intenção",
  niche: "Nicho e perfil",
  fit: "Nicho e perfil",
  quality: "Qualidade dos dados",
  risk: "Risco",
  decay: "Perda por tempo",
};

/** Pontos reais registrados pelo motor para este contato, agrupados. */
function useScoreBreakdown(leadId?: string) {
  return useQuery({
    queryKey: ["intel-breakdown", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("revenue_score_logs")
        .select("event_type, category, points_applied, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const groups = new Map<string, { key: string; label: string; points: number; count: number }>();
      for (const row of data || []) {
        const key = row.category || row.event_type || "outros";
        const label =
          CATEGORY_LABELS[row.category || ""] ||
          EVENT_LABELS[row.event_type || ""] ||
          (row.category || row.event_type || "Outros sinais");
        const g = groups.get(key) || { key, label, points: 0, count: 0 };
        g.points += Number(row.points_applied || 0);
        g.count += 1;
        groups.set(key, g);
      }
      return Array.from(groups.values()).sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
    },
    enabled: !!leadId,
    staleTime: 60_000,
  });
}

/** Recomendação comercial derivada da leitura atual — sem criar novo cálculo. */
function actionAdvice(score: number) {
  if (score >= 81)
    return {
      title: "Fechar agora — prioridade máxima",
      window: "Aja hoje, nas próximas 2 horas",
      channel: "Ligação e, se não atender, áudio no WhatsApp",
      lines: [
        "Ligue agora: o contato está no melhor momento de decisão e a chance cai a cada dia parado.",
        "Leve a proposta pronta, com valor, prazo de entrega e forma de pagamento definidos.",
        "Ofereça uma condição com data de validade curta para criar decisão.",
        "Antes de encerrar, marque na agenda a próxima etapa (assinatura, reunião ou pagamento).",
      ],
      script:
        "Oi [nome], tudo bem? Preparei a proposta do jeito que conversamos. Posso te explicar em 5 minutos agora e já deixamos fechado hoje?",
      avoid: "Não mande só texto e espere. Sem chamada, este contato esfria rápido.",
    };
  if (score >= 61)
    return {
      title: "Avançar para proposta",
      window: "Nas próximas 24 horas",
      channel: "Chamada curta de diagnóstico + resumo por WhatsApp",
      lines: [
        "Faça uma chamada de 10 minutos para confirmar necessidade, prazo e orçamento.",
        "Mostre um caso real parecido com o nicho dele, com resultado em número.",
        "Envie a proposta ainda no mesmo dia, enquanto o interesse está alto.",
        "Combine data e hora exatas para retomar — não deixe em aberto.",
      ],
      script:
        "Oi [nome], pelo que você me contou dá pra resolver isso rápido. Tem 10 minutinhos hoje pra eu te mostrar como ficaria e já te passar valores?",
      avoid: "Evite mandar proposta genérica antes de confirmar o que ele precisa.",
    };
  if (score >= 41)
    return {
      title: "Aquecer e qualificar",
      window: "Nos próximos 2 dias",
      channel: "WhatsApp com pergunta objetiva",
      lines: [
        "Retome com uma pergunta direta sobre o problema dele, não sobre o seu produto.",
        "Confirme os três pontos que destravam a venda: necessidade, prazo e quem decide.",
        "Traga uma prova rápida (print, número, depoimento) ligada ao que ele falou.",
        "Só apresente preço depois que ele confirmar o problema.",
      ],
      script:
        "Oi [nome]! Fiquei pensando no que você comentou. Hoje isso está te atrapalhando mais no [ponto A] ou no [ponto B]?",
      avoid: "Não insista com follow-up vazio do tipo 'e aí, pensou?'.",
    };
  if (score >= 21)
    return {
      title: "Nutrir com conteúdo",
      window: "Um contato a cada 5 a 7 dias",
      channel: "WhatsApp com material curto e útil",
      lines: [
        "Envie algo de valor sem cobrar resposta: um caso, uma dica prática, um resultado.",
        "Espace os contatos para não queimar o relacionamento.",
        "Observe qualquer sinal de retorno — leitura, resposta, clique — e suba a intensidade.",
        "Reavalie a leitura em alguns dias antes de investir tempo de vendedor.",
      ],
      script:
        "Oi [nome], separei um exemplo de um cliente do seu setor que resolveu esse mesmo problema. Te mando aqui, dá uma olhada quando puder.",
      avoid: "Não gaste ligações e propostas com quem ainda não deu sinal claro.",
    };
  return {
    title: "Reativar ou despriorizar",
    window: "Uma última tentativa nesta semana",
    channel: "Mensagem curta de reativação",
    lines: [
      "Faça uma última tentativa com abordagem diferente da anterior.",
      "Use uma pergunta de saída, que é fácil de responder com sim ou não.",
      "Se não houver resposta, tire da fila ativa e foque em contatos com sinais reais.",
      "Deixe o contato salvo: se ele voltar a interagir, a inteligência reativa sozinha.",
    ],
    script:
      "Oi [nome], só pra eu não te incomodar à toa: faz sentido eu te procurar mais pra frente ou prefere que eu encerre por aqui?",
    avoid: "Não mantenha follow-up eterno em contato sem nenhum sinal — custa tempo e queima a lista.",
  };
}

function Breakdown({ leadId }: { leadId?: string }) {
  const { data: rows = [] } = useScoreBreakdown(leadId);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Por que esta pontuação
        </p>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate">
              {r.label}
              <span className="text-muted-foreground text-xs"> · {r.count} sinal(is)</span>
            </span>
            <span className={cn("tabular-nums font-semibold shrink-0", r.points >= 0 ? "text-emerald-600" : "text-destructive")}>
              {r.points > 0 ? "+" : ""}{Math.round(r.points / 10)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
        Cada sinal registrado (conversa, intenção, nicho, tempo de resposta) soma ou desconta pontos.
        Sinais repetidos valem menos a cada repetição e sinais antigos perdem peso com o tempo.
        O total é convertido para a escala de 0 a 100 exibida como Oportunidade.
      </p>
    </div>
  );
}

function ActionIntelligence({ score }: { score: number }) {
  const advice = actionAdvice(score);
  return (
    <div className="rounded-xl border border-primary/25 bg-card overflow-hidden">
      <div className="flex items-center gap-2 bg-primary/8 border-b border-primary/20 px-4 py-3">
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium leading-none">
            Inteligência de ação
          </p>
          <p className="text-sm font-semibold text-foreground mt-1 truncate">{advice.title}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Quando agir</p>
            <p className="text-sm text-foreground mt-0.5">{advice.window}</p>
          </div>
          <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Melhor canal</p>
            <p className="text-sm text-foreground mt-0.5">{advice.channel}</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Passo a passo</p>
          <ol className="space-y-2">
            {advice.lines.map((l, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 w-5 h-5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{l}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Mensagem sugerida</p>
          <p className="text-sm text-foreground leading-relaxed border-l-2 border-primary/40 pl-3 italic">
            {advice.script}
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium">O que evitar</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{advice.avoid}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dimension({ label, value, suffix = "/100", help }: { label: string; value: number; suffix?: string; help?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-foreground leading-tight">
        {value}
        <span className="text-[11px] font-normal text-muted-foreground">{suffix}</span>
      </p>
      <div className="mt-1.5 h-1 rounded-full bg-muted/60 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {help && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{help}</p>}
    </div>
  );
}

export function LeadIntelligencePanel({ phone, className }: Props) {
  const { data: intel, isLoading } = useLeadIntelligenceProfile(phone);
  const { getScoreForPhone } = useLeadScores();
  const legacy = phone ? getScoreForPhone(phone) : undefined;
  const legacyScore = toIntel100(legacy?.score_total);


  if (isLoading) {
    return (
      <div className={cn("rounded-xl border border-border/60 bg-card p-4", className)}>
        <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (!intel) {
    // Sem perfil consolidado ainda: mostramos o mesmo valor exibido no card,
    // vindo do motor de pontuacao existente, para nao haver divergencia.
    return (
      <div className={cn("space-y-3", className)}>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Inteligência Wiize
              </p>
              <p className="text-sm font-semibold text-foreground">Oportunidade {legacyScore} de 100</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${legacyScore}%` }} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            Esta é a leitura atual do motor de pontuação. A análise detalhada por dimensões
            (intenção, engajamento, risco) está sendo processada e aparece assim que ficar pronta.
          </p>
        </div>
        <Breakdown leadId={legacy?.id} />
        <ActionIntelligence score={legacyScore} />
      </div>
    );
  }



  const MomentumIcon =
    intel.momentum_state.includes("RISING") ? TrendingUp :
    intel.momentum_state.includes("DECLINING") ? TrendingDown : Minus;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Cabeçalho: oportunidade + prioridade + ação */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-[18px] h-[18px] text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Inteligência Wiize
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {intel.company_name || "Contato"}
                {intel.niche ? <span className="text-muted-foreground font-normal"> · {intel.niche}</span> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {intel.is_hot && (
              <Badge className="bg-primary text-primary-foreground gap-1 rounded-md">
                <Flame className="w-3 h-3" /> Quente
              </Badge>
            )}
            <Badge variant="outline" className="rounded-md">
              {PRIORITY_LABELS[intel.priority] || intel.priority}
            </Badge>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-primary">
            <Target className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Oportunidade {intel.opportunity_score} de 100</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
            <MomentumIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">
              {MOMENTUM_LABELS[intel.momentum_state] || intel.momentum_state}
              {intel.momentum_value !== 0 && (
                <span className="tabular-nums text-muted-foreground"> ({intel.momentum_value > 0 ? "+" : ""}{intel.momentum_value})</span>
              )}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5">
            <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{STAGE_LABELS[intel.stage] || intel.stage}</span>
          </span>
        </div>

        <div className="mt-3 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wider text-primary/80 font-medium">Próxima ação</p>
          <p className="text-sm font-semibold text-foreground">
            {NEXT_ACTION_LABELS[intel.next_best_action] || intel.next_best_action}
          </p>
        </div>
      </div>

      {/* Dimensões */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
          Análise da inteligência
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Dimension label="Fit" value={intel.fit_score} help="O quanto o perfil e o nicho do contato combinam com o que você vende." />
          <Dimension label="Intenção de compra" value={intel.intent_score} help="Sinais de que ele quer comprar: pergunta preço, prazo, condições." />
          <Dimension label="Engajamento" value={intel.engagement_score} help="Frequência e rapidez das respostas dele nas conversas." />
          <Dimension label="Qualidade" value={intel.quality_score} help="Quanto de informação confiável existe sobre o contato e a empresa." />
          <Dimension label="Risco" value={intel.risk_score} help="Chance de esfriar ou sumir: silêncio, recusas, respostas evasivas." />
          <Dimension label="Semelhança" value={intel.pattern_match_score} suffix="%" help="Parecido com contatos que já viraram clientes na sua conta." />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
          A Oportunidade de 0 a 100 é o resumo dessas dimensões. Ela sobe com conversa, intenção e
          aderência ao nicho, e cai com silêncio e sinais de risco.
        </p>
      </div>


      {/* Comportamento */}
      {intel.behaviors?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Comportamento
          </p>
          <div className="flex flex-wrap gap-1.5">
            {intel.behaviors.map((b) => (
              <Badge key={b} variant="secondary" className="rounded-md text-[11px]">
                {BEHAVIOR_LABELS[b] || b}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Por que está assim */}
      {intel.factors?.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Principais fatores
          </p>
          <ul className="space-y-1.5">
            {intel.factors.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span className="capitalize-first">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Riscos */}
      {intel.risk_factors?.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-2">
            Atenção
          </p>
          <ul className="space-y-1.5">
            {intel.risk_factors.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <span>{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Diagnóstico da empresa */}
      {intel.diagnosis_summary && (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Diagnóstico da empresa
            </p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{intel.diagnosis_summary}</p>
        </div>
      )}

      <Breakdown leadId={legacy?.id} />
      <ActionIntelligence score={intel.opportunity_score} />
    </div>
  );
}
