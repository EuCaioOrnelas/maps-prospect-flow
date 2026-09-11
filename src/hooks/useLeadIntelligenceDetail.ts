import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Leitura consolidada de TODOS os dados reais que alimentam o motor central
 * de Inteligencia para um unico contato. Nada e recalculado aqui: apenas
 * agregamos e interpretamos o que ja existe no banco (conversas Evolution/Meta,
 * sinais do motor, historico de pontuacao, prospeccao, vendas e padroes).
 *
 * Regra: se o dado nao existe, o campo volta vazio/null. Nunca inventar.
 */

const key8 = (p?: string | null) => (p || "").replace(/\D/g, "").slice(-8);

export interface ConversationEvidence {
  key: string;
  label: string;
  quote: string;
  at: string;
  source: string;
}

export interface ConversationAnalysis {
  total: number;
  inbound: number;
  outbound: number;
  reciprocity: number;         // 0-100
  turns: number;               // idas e vindas reais
  avgResponseMinutes: number | null;
  leadAvgResponseMinutes: number | null;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastMessageAt: string | null;
  firstMessageAt: string | null;
  waitingReplyHours: number | null; // inbound sem resposta
  silenceHours: number | null;      // tempo desde a ultima mensagem
  activeDays: number;
  inboundStreak: number;
  audioCount: number;
  transcribedAudioCount: number;
  sources: string[];           // Evolution / Meta
  intents: ConversationEvidence[];
  objections: ConversationEvidence[];
  leadMessages: { content: string; at: string; direction: string; type: string }[];
}

export interface IntelSignalRow {
  id: string;
  signal_type: string;
  signal_group: string | null;
  confidence: number;
  source: string | null;
  occurred_at: string;
  meta: Record<string, unknown> | null;
}

export interface ScoreHistoryRow {
  created_at: string;
  event_type: string | null;
  category: string | null;
  points_applied: number;
  score_after: number | null;
}

export interface ProspectData {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  website: string | null;
  origin: string | null;
  prospected_at: string | null;
  rating: number | null;
  review_count: number | null;
  google_maps_link: string | null;
  social_media: Record<string, unknown> | null;
  enrichment_data: Record<string, unknown> | null;
  ai_diagnosis: string | null;
  ai_recommended_action: string | null;
  ai_approach_message: string | null;
  opportunity_level: string | null;
  closing_probability: string | null;
  estimated_value: number | null;
  tags: string[] | null;
}

/* --------------------------------------------------- deteccao textual real */

const INTENT_RULES: { key: string; label: string; re: RegExp }[] = [
  { key: "PRICE", label: "Perguntou preço", re: /\b(quanto custa|qual (o )?(valor|preç|preco)|preç|preco|valores?|orçament|orcament|investiment)/i },
  { key: "BUY", label: "Falou em fechar", re: /\b(quero fechar|vamos fechar|pode fechar|quero contratar|fechado|topo)\b/i },
  { key: "PROPOSAL", label: "Pediu proposta", re: /\b(propost|me manda|envia (a|o)|apresenta[çc][ãa]o|simula[çc][ãa]o)/i },
  { key: "PAYMENT", label: "Falou sobre pagamento", re: /\b(pagament|pix|boleto|cart[ãa]o|parcel|assinatur|fatur)/i },
  { key: "URGENCY", label: "Demonstrou urgência", re: /\b(urgent|com pressa|pra hoje|para hoje|o quanto antes|imediat|agora mesmo)/i },
  { key: "AVAILABILITY", label: "Perguntou disponibilidade", re: /\b(tem (dispon|hor[áa]rio|vaga)|dispon[íi]vel|consegue (hoje|amanh[ãa])|agenda)/i },
  { key: "MEETING", label: "Falou em reunião/visita", re: /\b(reuni[ãa]o|call|visita|conversa por telefone|liga[çc][ãa]o)\b/i },
];

const OBJECTION_RULES: { key: string; label: string; re: RegExp }[] = [
  { key: "PRICE", label: "Objeção de preço", re: /\b(caro|muito alto|acima do (meu )?or[çc]amento|sem verba|n[ãa]o tenho (esse )?valor|desconto)\b/i },
  { key: "TIME", label: "Objeção de tempo", re: /\b(depois|mais pra frente|mais para frente|outro momento|agora n[ãa]o|sem tempo|semana que vem)\b/i },
  { key: "TRUST", label: "Objeção de confiança", re: /\b(garantia|funciona mesmo|golpe|refer[êe]ncia|comprova[çc][ãa]o|resultado real)\b/i },
  { key: "COMPETITOR", label: "Citou concorrente", re: /\b(j[áa] (tenho|uso|trabalho com)|outra empresa|concorrent|contratei outro)\b/i },
  { key: "DECISION", label: "Depende de outra pessoa", re: /\b(preciso falar com|meu s[óo]cio|minha esposa|meu marido|com a diretoria|vou avaliar com)\b/i },
];

function extract(rules: { key: string; label: string; re: RegExp }[], msgs: any[], source: string) {
  const out: ConversationEvidence[] = [];
  for (const rule of rules) {
    const hit = [...msgs].reverse().find((m) => typeof m.content === "string" && rule.re.test(m.content));
    if (hit) {
      out.push({
        key: rule.key,
        label: rule.label,
        quote: String(hit.content).slice(0, 220),
        at: hit.created_at,
        source,
      });
    }
  }
  return out;
}

export function useLeadIntelligenceDetail(phone?: string | null, crmLeadId?: string | null) {
  const { accountOwnerId } = useAuth();
  const target = key8(phone);

  const conversation = useQuery({
    queryKey: ["intel-detail-conversation", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<ConversationAnalysis | null> => {
      const { data: convs } = await supabase
        .from("chat_conversations")
        .select("id, contact_phone, phone_number_id, waba_connection_id, last_message_at")
        .eq("owner_user_id", accountOwnerId!);
      const mine = (convs || []).filter((c: any) => key8(c.contact_phone) === target);
      if (!mine.length) return null;

      const secureBatches = await Promise.all(mine.map((c: any) =>
        supabase.functions.invoke("chat-secure-read", {
          body: { action: "messages", conversation_id: c.id, limit: 500 },
        })
      ));
      const msgs = secureBatches.flatMap(({ data }) => data?.messages || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(-500);

      const rows = msgs;
      if (!rows.length) return null;

      const inboundRows = rows.filter((m: any) => m.direction === "inbound");
      const outboundRows = rows.filter((m: any) => m.direction !== "inbound");

      // tempo medio de resposta do vendedor (inbound -> proximo outbound)
      const sellerDeltas: number[] = [];
      const leadDeltas: number[] = [];
      let turns = 0;
      for (let i = 0; i < rows.length; i++) {
        const cur: any = rows[i];
        const next: any = rows[i + 1];
        if (!next) break;
        if (cur.direction !== next.direction) turns++;
        const d = (new Date(next.created_at).getTime() - new Date(cur.created_at).getTime()) / 60000;
        if (d < 0 || d > 60 * 48) continue;
        if (cur.direction === "inbound" && next.direction !== "inbound") sellerDeltas.push(d);
        if (cur.direction !== "inbound" && next.direction === "inbound") leadDeltas.push(d);
      }

      const last: any = rows[rows.length - 1];
      const first: any = rows[0];
      const lastInbound: any = [...inboundRows].pop();
      const lastOutbound: any = [...outboundRows].pop();

      let inboundStreak = 0;
      for (let i = rows.length - 1; i >= 0; i--) {
        if ((rows[i] as any).direction === "inbound") inboundStreak++;
        else break;
      }

      const waitingReplyHours =
        last?.direction === "inbound"
          ? (Date.now() - new Date(last.created_at).getTime()) / 3600000
          : null;

      const days = new Set(rows.map((m: any) => new Date(m.created_at).toISOString().slice(0, 10)));
      const sources = Array.from(
        new Set(
          mine.map((c: any) => (c.phone_number_id ? "WhatsApp Oficial (Meta)" : "WhatsApp (Evolution)"))
        )
      );
      const primarySource = sources[0] || "WhatsApp";

      const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);

      const audios = rows.filter((m: any) => m.message_type === "audio");

      return {
        total: rows.length,
        inbound: inboundRows.length,
        outbound: outboundRows.length,
        reciprocity: rows.length ? Math.round((inboundRows.length / rows.length) * 100) : 0,
        turns,
        avgResponseMinutes: avg(sellerDeltas),
        leadAvgResponseMinutes: avg(leadDeltas),
        lastInboundAt: lastInbound?.created_at || null,
        lastOutboundAt: lastOutbound?.created_at || null,
        lastMessageAt: last?.created_at || null,
        firstMessageAt: first?.created_at || null,
        waitingReplyHours,
        silenceHours: last ? (Date.now() - new Date(last.created_at).getTime()) / 3600000 : null,
        activeDays: days.size,
        inboundStreak,
        audioCount: audios.length,
        transcribedAudioCount: audios.filter((m: any) => !!m.content).length,
        sources,
        intents: extract(INTENT_RULES, inboundRows, primarySource),
        objections: extract(OBJECTION_RULES, inboundRows, primarySource),
        leadMessages: inboundRows
          .slice(-30)
          .map((m: any) => ({
            content: m.content || (m.message_type === "audio" ? "(áudio sem transcrição)" : "(mídia)"),
            at: m.created_at,
            direction: m.direction,
            type: m.message_type,
          })),
      };
    },
  });

  const signals = useQuery({
    queryKey: ["intel-detail-signals", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<IntelSignalRow[]> => {
      const { data } = await supabase
        .from("intel_signals")
        .select("id, signal_type, signal_group, confidence, source, occurred_at, meta, phone_e164")
        .eq("owner_user_id", accountOwnerId!)
        .order("occurred_at", { ascending: false })
        .limit(400);
      return ((data || []) as any[])
        .filter((s) => key8(s.phone_e164) === target)
        .slice(0, 60) as IntelSignalRow[];
    },
  });

  const history = useQuery({
    queryKey: ["intel-detail-history", accountOwnerId, target],
    enabled: !!accountOwnerId && !!target,
    staleTime: 60_000,
    queryFn: async (): Promise<ScoreHistoryRow[]> => {
      const { data: rl } = await supabase
        .from("revenue_leads")
        .select("id, phone_e164")
        .eq("owner_user_id", accountOwnerId!);
      const lead = (rl || []).find((r: any) => key8(r.phone_e164) === target);
      if (!lead) return [];
      const { data } = await supabase
        .from("revenue_score_logs")
        .select("created_at, event_type, category, points_applied, score_after")
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: false })
        .limit(120);
      return (data || []) as ScoreHistoryRow[];
    },
  });

  const deals = useQuery({
    queryKey: ["intel-detail-deals", crmLeadId],
    enabled: !!crmLeadId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_deals")
        .select("id, title, value, status, closed_at, created_at, notes, sale_type")
        .eq("lead_id", crmLeadId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const prospect = useQuery({
    queryKey: ["intel-detail-prospect", crmLeadId],
    enabled: !!crmLeadId,
    staleTime: 120_000,
    queryFn: async (): Promise<ProspectData | null> => {
      const { data } = await supabase
        .from("leads")
        .select(
          "id, company_name, contact_name, phone, email, category, city, region, address, website, origin, prospected_at, rating, review_count, google_maps_link, social_media, enrichment_data, ai_diagnosis, ai_recommended_action, ai_approach_message, opportunity_level, closing_probability, estimated_value, tags"
        )
        .eq("id", crmLeadId!)
        .maybeSingle();
      return (data || null) as unknown as ProspectData | null;
    },
  });

  const patterns = useQuery({
    queryKey: ["intel-detail-patterns", accountOwnerId],
    enabled: !!accountOwnerId,
    staleTime: 300_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("intel_patterns")
        .select("pattern_kind, pattern_key, niche, region, sample_size, outcome_count, rate, avg_ticket, avg_days_to_close")
        .eq("owner_user_id", accountOwnerId!)
        .order("sample_size", { ascending: false })
        .limit(40);
      return data || [];
    },
  });

  return {
    conversation: conversation.data || null,
    conversationLoading: conversation.isLoading,
    signals: signals.data || [],
    history: history.data || [],
    deals: deals.data || [],
    prospect: prospect.data || null,
    patterns: patterns.data || [],
    isLoading:
      conversation.isLoading || signals.isLoading || history.isLoading || deals.isLoading || prospect.isLoading,
  };
}
