import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ========== TEXT NORMALIZATION ==========
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ========== CLASSIFICATION ENGINE ==========
interface ClassificationResult {
  intent_category: string;
  intent_subtype: string;
  matched_keywords: string[];
  confidence_score: number;
  event_type: string;
  points: number;
}

// Precedence: NEGATIVE_HARD > NEGATIVE_MODERATE > OBJECTION > POSITIVE > NEUTRAL
const NEGATIVE_HARD_PATTERNS: Record<string, string[]> = {
  OPT_OUT: [
    "pare", "para de mandar", "remove meu numero", "nao me chama",
    "exclui meu contato", "me tira da lista", "bloqueia",
    "para de me mandar", "nao mande mais", "tire meu numero",
  ],
  NO_INTEREST: [
    "nao quero", "nao tenho interesse", "pode cancelar",
    "nao preciso", "desiste", "sem interesse", "nao me interessa",
  ],
};

const NEGATIVE_MODERATE_PATTERNS: string[] = [
  "nao sei", "nao tenho certeza", "talvez depois", "nao agora",
  "nao e prioridade", "estou resolvendo outra coisa", "nao faz sentido agora",
  "nao e pra agora", "nao e momento",
];

const OBJECTION_FINANCIAL: string[] = [
  "nao tenho dinheiro", "nao cabe no orcamento", "esta fora do meu orcamento",
  "preciso organizar", "nao posso agora", "fora do orcamento",
  "sem orcamento", "sem verba", "sem budget", "nao tem budget",
  "fora do budget", "budget apertado",
];

const OBJECTION_DELAY: string[] = [
  "preciso pensar", "depois eu vejo", "vou analisar", "vou falar com socio",
  "preciso conversar", "mais tarde", "depois vejo", "vou pensar",
  "vou avaliar", "deixa eu ver", "vou ver e te falo", "vou ver",
  "preciso falar com", "vou conversar com", "vou consultar",
  "deixa eu pensar", "me da um tempo",
];

const OBJECTION_PRICE_NEGATIVE_TERMS = [
  "caro", "muito caro", "alto", "acima do esperado", "pesado", "absurdo", "salgado",
];
const PRICE_VALUE_TERMS = ["preco", "valor", "custo"];

const POSITIVE_PATTERNS: Record<string, string[]> = {
  BUY_INTENT: [
    "quero fechar", "quero contratar", "vamos fechar", "pode mandar contrato",
    "como assino", "onde pago", "pode emitir", "pode gerar boleto",
    "faz o pix", "como pagar", "parcelamento", "forma de pagamento",
    "quero comprar", "fechar hoje", "fechar agora", "fecha",
  ],
  PROPOSAL: [
    "proposta", "cotacao", "envia pdf", "manda a proposta",
    "detalhamento", "escopo", "condicoes", "manda proposta",
    "enviar proposta",
  ],
  PAYMENT: [
    "pix", "cartao", "boleto", "parcelar", "pagamento", "parcela",
  ],
  AVAILABILITY: [
    "tem vaga", "quando comeca", "disponivel", "agenda", "prazo",
    "entrega quando", "tempo de entrega", "disponibilidade",
  ],
  URGENT: [
    "urgente", "pra hoje", "imediato", "preciso ja", "pra ontem",
  ],
  PRICE_REQUEST: [
    "quanto custa", "qual o valor", "orcamento", "tabela", "investimento",
    "quanto fica", "quanto e", "qual o preco", "qual preco", "qual valor",
  ],
};

function classifyMessage(normalized: string, rulesMap: Map<string, any>): ClassificationResult {
  // 1. NEGATIVE HARD (highest precedence)
  for (const [subtype, patterns] of Object.entries(NEGATIVE_HARD_PATTERNS)) {
    const matched = patterns.filter(p => normalized.includes(p));
    if (matched.length > 0) {
      const rule = rulesMap.get("INTENT_NEGATIVE_HARD");
      const basePoints = subtype === "OPT_OUT" ? -400 : -300;
      return {
        intent_category: "INTENT_NEGATIVE_HARD",
        intent_subtype: subtype,
        matched_keywords: matched,
        confidence_score: Math.min(100, 70 + matched.length * 10),
        event_type: "INTENT_NEGATIVE_HARD",
        points: rule?.points ?? basePoints,
      };
    }
  }

  // 2. NEGATIVE MODERATE
  const moderateMatched = NEGATIVE_MODERATE_PATTERNS.filter(p => normalized.includes(p));
  if (moderateMatched.length > 0) {
    const rule = rulesMap.get("INTENT_NEGATIVE_MODERATE");
    return {
      intent_category: "INTENT_NEGATIVE_MODERATE",
      intent_subtype: "DISINTEREST",
      matched_keywords: moderateMatched,
      confidence_score: Math.min(100, 60 + moderateMatched.length * 10),
      event_type: "INTENT_NEGATIVE_MODERATE",
      points: rule?.points ?? -80,
    };
  }

  // 3. OBJECTION (contextual: price+negative, financial, delay)
  // Price objection: must contain price term + negative term
  const hasPriceTerm = PRICE_VALUE_TERMS.some(t => normalized.includes(t));
  const negativeTermsMatched = OBJECTION_PRICE_NEGATIVE_TERMS.filter(t => normalized.includes(t));

  if (hasPriceTerm && negativeTermsMatched.length > 0) {
    const rule = rulesMap.get("INTENT_OBJECTION");
    const priceTermFound = PRICE_VALUE_TERMS.filter(t => normalized.includes(t));
    return {
      intent_category: "INTENT_OBJECTION",
      intent_subtype: "PRICE_OBJECTION",
      matched_keywords: [...priceTermFound, ...negativeTermsMatched],
      confidence_score: 85,
      event_type: "INTENT_OBJECTION",
      points: rule?.points ?? -10,
    };
  }

  const financialMatched = OBJECTION_FINANCIAL.filter(p => normalized.includes(p));
  if (financialMatched.length > 0) {
    const rule = rulesMap.get("INTENT_OBJECTION");
    return {
      intent_category: "INTENT_OBJECTION",
      intent_subtype: "FINANCIAL_OBJECTION",
      matched_keywords: financialMatched,
      confidence_score: 75,
      event_type: "INTENT_OBJECTION",
      points: rule?.points ?? -10,
    };
  }

  const delayMatched = OBJECTION_DELAY.filter(p => normalized.includes(p));
  if (delayMatched.length > 0) {
    const rule = rulesMap.get("INTENT_OBJECTION");
    return {
      intent_category: "INTENT_OBJECTION",
      intent_subtype: "DELAY_OBJECTION",
      matched_keywords: delayMatched,
      confidence_score: 70,
      event_type: "INTENT_OBJECTION",
      points: rule?.points ?? -10,
    };
  }

  // 4. POSITIVE INTENT (ordered by value: BUY > PROPOSAL > PAYMENT > AVAILABILITY > URGENT > PRICE)
  const positiveChecks: { subtype: string; ruleKey: string; patterns: string[]; basePoints: number }[] = [
    { subtype: "BUY_INTENT", ruleKey: "INTENT_BUY_NOW", patterns: POSITIVE_PATTERNS.BUY_INTENT, basePoints: 140 },
    { subtype: "PROPOSAL", ruleKey: "INTENT_PROPOSAL", patterns: POSITIVE_PATTERNS.PROPOSAL, basePoints: 100 },
    { subtype: "PAYMENT", ruleKey: "INTENT_PAYMENT", patterns: POSITIVE_PATTERNS.PAYMENT, basePoints: 90 },
    { subtype: "AVAILABILITY", ruleKey: "INTENT_AVAILABILITY", patterns: POSITIVE_PATTERNS.AVAILABILITY, basePoints: 70 },
    { subtype: "URGENT", ruleKey: "INTENT_URGENT", patterns: POSITIVE_PATTERNS.URGENT, basePoints: 60 },
    { subtype: "PRICE_REQUEST", ruleKey: "INTENT_PRICE", patterns: POSITIVE_PATTERNS.PRICE_REQUEST, basePoints: 80 },
  ];

  for (const check of positiveChecks) {
    const matched = check.patterns.filter(p => normalized.includes(p));
    if (matched.length > 0) {
      const rule = rulesMap.get(check.ruleKey);
      return {
        intent_category: "INTENT_POSITIVE",
        intent_subtype: check.subtype,
        matched_keywords: matched,
        confidence_score: Math.min(100, 65 + matched.length * 10),
        event_type: check.ruleKey,
        points: rule?.points ?? check.basePoints,
      };
    }
  }

  // 5. Bare price/value mention without negative = PRICE_REQUEST
  if (hasPriceTerm) {
    const rule = rulesMap.get("INTENT_PRICE");
    const priceTermFound = PRICE_VALUE_TERMS.filter(t => normalized.includes(t));
    return {
      intent_category: "INTENT_POSITIVE",
      intent_subtype: "PRICE_REQUEST",
      matched_keywords: priceTermFound,
      confidence_score: 55,
      event_type: "INTENT_PRICE",
      points: rule?.points ?? 80,
    };
  }

  // 6. NEUTRAL
  return {
    intent_category: "NEUTRAL",
    intent_subtype: "GENERAL",
    matched_keywords: [],
    confidence_score: 0,
    event_type: "INBOUND_MESSAGE",
    points: 0,
  };
}

// ========== SCORE HELPERS ==========
const EVENT_CATEGORIES: Record<string, string> = {
  INBOUND_MESSAGE: "engagement",
  OUTBOUND_MESSAGE: "engagement",
  INBOUND_STREAK_3: "engagement",
  INBOUND_AFTER_24H_SILENCE: "engagement",
  INBOUND_AFTER_7D_SILENCE: "engagement",
  OUTBOUND_REPLY_RECEIVED_WITHIN_1H: "sla",
  INTENT_PRICE: "intent",
  INTENT_BUY_NOW: "intent",
  INTENT_AVAILABILITY: "intent",
  INTENT_PAYMENT: "intent",
  INTENT_PROPOSAL: "intent",
  INTENT_URGENT: "intent",
  INTENT_OBJECTION: "penalty",
  INTENT_NEGATIVE_MODERATE: "penalty",
  INTENT_NEGATIVE_HARD: "penalty",
  SLA_FIRST_RESPONSE_UNDER_5MIN: "sla",
  SLA_FIRST_RESPONSE_5_TO_30MIN: "sla",
  SLA_FIRST_RESPONSE_OVER_30MIN: "penalty",
  UNREPLIED_INBOUND_OVER_2H: "penalty",
  UNREPLIED_INBOUND_OVER_24H: "penalty",
  CONVERSATION_ACTIVE_3D: "engagement",
  CONVERSATION_ACTIVE_5D: "engagement",
  BACK_AND_FORTH_5_TURNS: "engagement",
  LINK_CLICK: "action",
  FORM_SUBMIT: "action",
  CALL_REQUEST: "action",
};

// ========== ACTION DETECTION (LINK_CLICK / FORM_SUBMIT / CALL_REQUEST) ==========
const URL_REGEX = /\b(?:https?:\/\/|www\.)\S+/i;
const CALL_REQUEST_PATTERNS = [
  "me liga", "me ligue", "me ligar", "pode ligar", "podem ligar",
  "ligacao", "ligação", "uma ligada", "uma ligacao", "agendar ligacao",
  "agendar ligação", "pode me chamar no telefone", "fala comigo por telefone",
  "ligar pra mim", "liga pra mim", "liga aqui", "telefone agora",
];
const FORM_SUBMIT_PATTERNS = [
  "preenchi o formulario", "preenchi o formulário", "enviei o formulario",
  "enviei o formulário", "form enviado", "formulario enviado", "formulário enviado",
  "acabei de enviar o form", "submeti o formulario", "submeti o formulário",
];

function detectActions(normalized: string, rawText: string): string[] {
  const events: string[] = [];
  if (URL_REGEX.test(rawText)) events.push("LINK_CLICK");
  if (FORM_SUBMIT_PATTERNS.some((p) => normalized.includes(p))) events.push("FORM_SUBMIT");
  if (CALL_REQUEST_PATTERNS.some((p) => normalized.includes(p))) events.push("CALL_REQUEST");
  return events;
}

function scoreToBucket(score: number): string {
  if (score >= 650) return "VERY_HOT";
  if (score >= 350) return "HOT";
  if (score >= 150) return "ENGAGED";
  return "COLD";
}

function normalizeRevenuePhone(phone: string): string | null {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("120363")) return null;

  const isPlaceholder = (subscriber: string) => {
    if (/^(\d)\1{7}$/.test(subscriber)) return true;
    if (["12345678", "87654321", "01234567"].includes(subscriber)) return true;
    if (subscriber.startsWith("9999")) return true;
    if (/(0000|1234|4321)/.test(subscriber)) return true;
    if (subscriber.endsWith("0000") || subscriber.endsWith("0001") || subscriber.endsWith("0002")) return true;
    return false;
  };

  const isValidBrazilDdd = (ddd: string) => {
    const dddNum = Number(ddd);
    return !Number.isNaN(dddNum) && dddNum >= 11 && dddNum <= 99;
  };

  if (digits.startsWith("55") && digits.length === 13) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (!isValidBrazilDdd(ddd) || local.length !== 9 || !local.startsWith("9")) return null;
    if (isPlaceholder(local.slice(1))) return null;
    return digits;
  }

  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    if (!isValidBrazilDdd(ddd) || !["6", "7", "8", "9"].includes(local[0] || "")) return null;
    const candidate = `55${ddd}9${local}`;
    if (isPlaceholder(candidate.slice(-8))) return null;
    return candidate;
  }

  if (digits.length === 11) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (!isValidBrazilDdd(ddd) || !local.startsWith("9")) return null;
    if (isPlaceholder(local.slice(1))) return null;
    return `55${digits}`;
  }

  if (digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    if (!isValidBrazilDdd(ddd) || !["6", "7", "8", "9"].includes(local[0] || "")) return null;
    const candidate = `55${ddd}9${local}`;
    if (isPlaceholder(candidate.slice(-8))) return null;
    return candidate;
  }

  if (digits.length >= 10 && !digits.startsWith("55")) {
    return digits;
  }

  return null;
}

function isValidRevenuePhone(phone: string): boolean {
  return normalizeRevenuePhone(phone) !== null;
}

const DIRECTION_EVENT_TYPES = new Set(["INBOUND_MESSAGE", "OUTBOUND_MESSAGE"]);

function getDirectionFromEventType(eventType: string): "inbound" | "outbound" | null {
  if (eventType === "INBOUND_MESSAGE") return "inbound";
  if (eventType === "OUTBOUND_MESSAGE") return "outbound";
  return null;
}

function getDayKey(dateLike: string | Date): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return date.toISOString().slice(0, 10);
}

function isSameUtcDay(a: string | Date, b: string | Date): boolean {
  return getDayKey(a) === getDayKey(b);
}

function diffMinutes(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 60000;
}

function diffHours(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / (60 * 60 * 1000);
}

function pickLatestIso(a?: string | null, b?: string | null): string | null {
  if (!a) return b || null;
  if (!b) return a || null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function coerceOccurredAt(value: unknown): Date {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function applyNumberInstanceFilter(query: any, numberInstanceId?: string | null) {
  return numberInstanceId ? query.eq("number_instance_id", numberInstanceId) : query.is("number_instance_id", null);
}

function mergeConversationRows(rows: any[] = []) {
  return rows.reduce(
    (acc, row) => ({
      id: acc.id || row.id,
      last_inbound_at: pickLatestIso(acc.last_inbound_at, row.last_inbound_at),
      last_outbound_at: pickLatestIso(acc.last_outbound_at, row.last_outbound_at),
      inbound_count_7d: acc.inbound_count_7d + Number(row.inbound_count_7d || 0),
      outbound_count_7d: acc.outbound_count_7d + Number(row.outbound_count_7d || 0),
      avg_response_time_seconds: Math.max(acc.avg_response_time_seconds, Number(row.avg_response_time_seconds || 0)),
      unreplied_inbound_count: Math.max(acc.unreplied_inbound_count, Number(row.unreplied_inbound_count || 0)),
    }),
    {
      id: null as string | null,
      last_inbound_at: null as string | null,
      last_outbound_at: null as string | null,
      inbound_count_7d: 0,
      outbound_count_7d: 0,
      avg_response_time_seconds: 0,
      unreplied_inbound_count: 0,
    }
  );
}

function computeConsecutiveDirectionCount(eventsAsc: any[], currentDirection: "inbound" | "outbound") {
  let count = 1;
  for (let i = eventsAsc.length - 1; i >= 0; i--) {
    const direction = getDirectionFromEventType(eventsAsc[i].event_type);
    if (direction !== currentDirection) break;
    count += 1;
  }
  return count;
}

function computeAlternatingTurnCount(eventsAsc: any[], currentDirection: "inbound" | "outbound") {
  let turns = 1;
  let expected: "inbound" | "outbound" = currentDirection === "inbound" ? "outbound" : "inbound";

  for (let i = eventsAsc.length - 1; i >= 0; i--) {
    const direction = getDirectionFromEventType(eventsAsc[i].event_type);
    if (!direction || direction !== expected) break;
    turns += 1;
    expected = expected === "inbound" ? "outbound" : "inbound";
  }

  return turns;
}

function getTrailingRunStart(eventsAsc: any[], direction: "inbound" | "outbound") {
  let oldest: any = null;
  for (let i = eventsAsc.length - 1; i >= 0; i--) {
    const currentDirection = getDirectionFromEventType(eventsAsc[i].event_type);
    if (currentDirection !== direction) break;
    oldest = eventsAsc[i];
  }
  return oldest;
}

function computeActiveDayStreak(eventsAsc: any[], currentAt: Date) {
  const dayKeys = new Set<string>(eventsAsc.map((event: any) => getDayKey(event.created_at)));
  dayKeys.add(getDayKey(currentAt));

  let streak = 0;
  let cursor = new Date(`${getDayKey(currentAt)}T00:00:00.000Z`);

  while (dayKeys.has(getDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

async function calculateLeadScoreComponents(supabase: any, leadId: string) {
  const { data: logs } = await supabase
    .from("revenue_score_logs")
    .select("category, points_applied")
    .eq("lead_id", leadId);

  let engagement = 0;
  let intent = 0;
  let urgency = 0;
  let risk = 0;

  for (const log of logs || []) {
    const points = Number(log.points_applied || 0);
    const category = log.category || "engagement";

    if (category === "engagement") engagement += points;
    else if (category === "intent") intent += points;
    else if (category === "sla") urgency += points;
    else if (category === "penalty") risk += Math.abs(points);
  }

  return {
    score_engagement: Math.max(0, Math.min(1000, engagement)),
    score_intent: Math.max(0, Math.min(1000, intent)),
    score_urgency: Math.max(0, Math.min(1000, urgency)),
    score_risk: Math.max(0, Math.min(1000, risk)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      action,
      user_id,
      phone_e164,
      number_instance_id,
      direction,
      message_content,
      source,
      lead_name,
      occurred_at,
    } = body;

    // === ACTION: process_message ===
    if (action === "process_message") {
      if (!user_id || !phone_e164 || !direction || !["inbound", "outbound"].includes(direction)) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalizedPhone = normalizeRevenuePhone(phone_e164);
      if (!normalizedPhone) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Invalid or placeholder phone" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const occurredAt = coerceOccurredAt(occurred_at);
      const occurredAtIso = occurredAt.toISOString();
      const messageExcerpt = typeof message_content === "string" ? message_content.substring(0, 200) : null;

      if (number_instance_id && source !== "meta") {
        const { data: numConfig } = await supabase
          .from("revenue_number_config")
          .select("is_enabled")
          .eq("user_id", user_id)
          .eq("whatsapp_number_id", number_instance_id)
          .maybeSingle();

        if (numConfig && numConfig.is_enabled === false) {
          return new Response(
            JSON.stringify({ success: false, skipped: true, reason: "Number not enabled for Revenue analysis" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { data: exactLeadMatches } = await supabase
        .from("revenue_leads")
        .select("*")
        .eq("user_id", user_id)
        .eq("phone_e164", normalizedPhone)
        .order("updated_at", { ascending: false })
        .limit(1);

      const { data: plusLeadMatches } = exactLeadMatches?.length
        ? { data: [] }
        : await supabase
            .from("revenue_leads")
            .select("*")
            .eq("user_id", user_id)
            .eq("phone_e164", `+${normalizedPhone}`)
            .order("updated_at", { ascending: false })
            .limit(1);

      let existingLead = exactLeadMatches?.[0] || plusLeadMatches?.[0] || null;
      let leadId: string;
      let previousScore = 0;

      if (existingLead) {
        leadId = existingLead.id;
        previousScore = Number(existingLead.score_total || 0);

        const leadUpdate: any = {
          last_activity_at: occurredAtIso,
          source_number_instance_id: number_instance_id || existingLead.source_number_instance_id,
        };

        if (existingLead.phone_e164 !== normalizedPhone) {
          leadUpdate.phone_e164 = normalizedPhone;
          existingLead = { ...existingLead, phone_e164: normalizedPhone };
        }

        await supabase.from("revenue_leads").update(leadUpdate).eq("id", leadId);
      } else {
        if (direction !== "inbound") {
          return new Response(
            JSON.stringify({ success: false, skipped: true, reason: "Outbound message without existing lead" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: newLead, error: insertErr } = await supabase
          .from("revenue_leads")
          .insert({
            user_id,
            phone_e164: normalizedPhone,
            name: lead_name || null,
            source_number_instance_id: number_instance_id || null,
            first_seen_at: occurredAtIso,
            last_activity_at: occurredAtIso,
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        leadId = newLead.id;
      }

      let conversationQuery = supabase
        .from("revenue_conversations")
        .select("*")
        .eq("user_id", user_id)
        .eq("lead_id", leadId)
        .order("updated_at", { ascending: false })
        .limit(10);
      conversationQuery = applyNumberInstanceFilter(conversationQuery, number_instance_id || null);
      const { data: conversationRows } = await conversationQuery;
      const conversationState = mergeConversationRows(conversationRows || []);
      const conversationRowId = conversationRows?.[0]?.id || null;

      let { data: rules } = await supabase
        .from("revenue_score_rules")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_enabled", true);

      // Auto-seed defensivo: garante que todo usuário tenha as 25 regras padrão.
      // Sem isso, rulesMap.get(...) retorna undefined e nenhuma regra dispara.
      if (!rules || rules.length === 0) {
        console.log(`[revenue-processor] No rules found for user ${user_id}. Seeding defaults...`);
        const { error: seedErr } = await supabase.rpc("seed_revenue_score_rules", { p_user_id: user_id });
        if (seedErr) {
          console.error("[revenue-processor] Failed to seed rules:", seedErr);
        } else {
          const { data: reseeded } = await supabase
            .from("revenue_score_rules")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_enabled", true);
          rules = reseeded || [];
          console.log(`[revenue-processor] Seeded ${rules.length} rules for user ${user_id}`);
        }
      }
      const rulesMap = new Map((rules || []).map((rule: any) => [rule.rule_key, rule]));

      const { data: recentEvents } = await supabase
        .from("revenue_events")
        .select("event_type, created_at, event_value, event_meta")
        .eq("user_id", user_id)
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(250);

      const scoreLogsCutoff = new Date(occurredAt.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentScoreLogs } = await supabase
        .from("revenue_score_logs")
        .select("event_type, created_at")
        .eq("user_id", user_id)
        .eq("lead_id", leadId)
        .gte("created_at", scoreLogsCutoff)
        .order("created_at", { ascending: false })
        .limit(250);

      const scoredEventTimes = new Map<string, Date[]>();
      for (const log of recentScoreLogs || []) {
        const eventDate = new Date(log.created_at);
        const bucket = scoredEventTimes.get(log.event_type) || [];
        bucket.push(eventDate);
        scoredEventTimes.set(log.event_type, bucket);
      }

      const pendingScoreEventTimes = new Map<string, Date[]>();
      const eventEntries: Array<{ event: any; scoreLog: any | null }> = [];
      let runningScore = previousScore;

      const countTriggeredToday = (ruleKey: string) => {
        const existing = (scoredEventTimes.get(ruleKey) || []).filter((date) => isSameUtcDay(date, occurredAt)).length;
        const pending = (pendingScoreEventTimes.get(ruleKey) || []).filter((date) => isSameUtcDay(date, occurredAt)).length;
        return existing + pending;
      };

      const getLastTriggeredAt = (ruleKey: string) => {
        const allDates = [
          ...(scoredEventTimes.get(ruleKey) || []),
          ...(pendingScoreEventTimes.get(ruleKey) || []),
        ].sort((a, b) => b.getTime() - a.getTime());
        return allDates[0] || null;
      };

      const canTriggerRule = (
        ruleKey: string,
        options: { maxPerDayOverride?: number | null; ignoreCooldown?: boolean } = {}
      ) => {
        const rule = rulesMap.get(ruleKey);
        if (!rule) return false;

        const effectiveMaxPerDay = options.maxPerDayOverride ?? rule.max_per_day ?? null;
        if (effectiveMaxPerDay && countTriggeredToday(ruleKey) >= Number(effectiveMaxPerDay)) {
          return false;
        }

        if (!options.ignoreCooldown && rule.cooldown_minutes) {
          const lastTriggeredAt = getLastTriggeredAt(ruleKey);
          if (lastTriggeredAt && diffMinutes(occurredAt, lastTriggeredAt) < Number(rule.cooldown_minutes)) {
            return false;
          }
        }

        return true;
      };

      const recordEvent = (eventType: string, points: number, meta: any = {}, includeScoreLog = points !== 0) => {
        const safePoints = Math.trunc(Number(points || 0));
        const scoreBefore = runningScore;
        const scoreAfter = includeScoreLog
          ? Math.max(0, Math.min(1000, scoreBefore + safePoints))
          : scoreBefore;

        eventEntries.push({
          event: {
            user_id,
            lead_id: leadId,
            number_instance_id: number_instance_id || null,
            event_type: eventType,
            event_value: safePoints,
            event_meta: meta,
            intent_category: meta.intent_category || null,
            intent_subtype: meta.intent_subtype || null,
            intent_confidence_score: meta.confidence_score || 0,
            created_at: occurredAtIso,
          },
          scoreLog: includeScoreLog
            ? {
                user_id,
                lead_id: leadId,
                event_type: eventType,
                points_applied: safePoints,
                score_before: scoreBefore,
                score_after: scoreAfter,
                category: EVENT_CATEGORIES[eventType] || "engagement",
                created_at: occurredAtIso,
              }
            : null,
        });

        if (includeScoreLog) {
          runningScore = scoreAfter;
          const bucket = pendingScoreEventTimes.get(eventType) || [];
          bucket.push(new Date(occurredAtIso));
          pendingScoreEventTimes.set(eventType, bucket);
        }
      };

      const addRuleEvent = (
        ruleKey: string,
        meta: any = {},
        options: { maxPerDayOverride?: number | null; ignoreCooldown?: boolean } = {}
      ) => {
        const rule = rulesMap.get(ruleKey);
        if (!rule || !canTriggerRule(ruleKey, options)) return false;
        recordEvent(ruleKey, Number(rule.points || 0), meta, true);
        return true;
      };

      const interactionEventsAsc = (recentEvents || [])
        .filter((event: any) => DIRECTION_EVENT_TYPES.has(event.event_type))
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const lastInteractionEvent = interactionEventsAsc[interactionEventsAsc.length - 1] || null;
      const lastInteractionDirection = lastInteractionEvent
        ? getDirectionFromEventType(lastInteractionEvent.event_type)
        : null;

      const currentDirection = direction as "inbound" | "outbound";
      const currentMessageEventType = currentDirection === "inbound" ? "INBOUND_MESSAGE" : "OUTBOUND_MESSAGE";
      const trailingSameDirectionStart = getTrailingRunStart(interactionEventsAsc, currentDirection);
      const activeDayStreak = computeActiveDayStreak(interactionEventsAsc, occurredAt);
      const alternatingTurnCount = computeAlternatingTurnCount(interactionEventsAsc, currentDirection);

      recordEvent(
        currentMessageEventType,
        currentDirection === "inbound" && canTriggerRule("INBOUND_MESSAGE")
          ? Number(rulesMap.get("INBOUND_MESSAGE")?.points || 0)
          : 0,
        {
          source: source || null,
          direction: currentDirection,
          raw_message: true,
          message_excerpt: messageExcerpt,
        },
        currentDirection === "inbound" && canTriggerRule("INBOUND_MESSAGE")
      );

      let classificationResult: ClassificationResult | null = null;

      if (currentDirection === "inbound") {
        if (lastInteractionEvent) {
          const silenceHours = diffHours(occurredAt, new Date(lastInteractionEvent.created_at));
          if (silenceHours >= 24 * 7) {
            addRuleEvent("INBOUND_AFTER_7D_SILENCE", { silence_hours: Math.round(silenceHours) });
          } else if (silenceHours >= 24) {
            addRuleEvent("INBOUND_AFTER_24H_SILENCE", { silence_hours: Math.round(silenceHours) });
          }
        }

        const pendingOutboundStart = getTrailingRunStart(interactionEventsAsc, "outbound");
        if (lastInteractionDirection === "outbound" && pendingOutboundStart?.created_at) {
          const replyMinutes = diffMinutes(occurredAt, new Date(pendingOutboundStart.created_at));
          if (replyMinutes <= 60) {
            addRuleEvent("OUTBOUND_REPLY_RECEIVED_WITHIN_1H", {
              response_time_minutes: Math.round(replyMinutes),
            });
          }
        }

        const inboundStreak = computeConsecutiveDirectionCount(interactionEventsAsc, "inbound");
        if (inboundStreak >= 3 && inboundStreak % 3 === 0) {
          addRuleEvent("INBOUND_STREAK_3", { streak_count: inboundStreak });
        }

        if (message_content) {
          const normalizedText = normalizeText(message_content);
          classificationResult = classifyMessage(normalizedText, rulesMap);

          // Action detection (LINK_CLICK / FORM_SUBMIT / CALL_REQUEST)
          for (const actionRule of detectActions(normalizedText, message_content)) {
            addRuleEvent(actionRule, {
              matched_text: message_content.substring(0, 200),
              intent_category: "ACTION",
              intent_subtype: actionRule,
            });
          }

          if (classificationResult.intent_category !== "NEUTRAL") {
            addRuleEvent(classificationResult.event_type, {
              matched_text: message_content.substring(0, 200),
              intent_category: classificationResult.intent_category,
              intent_subtype: classificationResult.intent_subtype,
              matched_keywords: classificationResult.matched_keywords,
              confidence_score: classificationResult.confidence_score,
            }, { ignoreCooldown: true });

            if (classificationResult.intent_category === "INTENT_NEGATIVE_HARD") {
              const updatePayload: any = {
                risk_state: "AT_RISK",
                risk_reason: classificationResult.intent_subtype === "OPT_OUT"
                  ? "Lead pediu opt-out explícito"
                  : "Lead sinalizou desinteresse explícito",
                last_intent_category: classificationResult.intent_category,
                last_intent_subtype: classificationResult.intent_subtype,
              };

              if (classificationResult.intent_subtype === "OPT_OUT") {
                updatePayload.tags = existingLead
                  ? [...new Set([...(existingLead.tags || []), "do_not_contact"])]
                  : ["do_not_contact"];
              }

              await supabase.from("revenue_leads").update(updatePayload).eq("id", leadId);
            }
          }
        }
      }

      if (currentDirection === "outbound") {
        const pendingInboundStart = getTrailingRunStart(interactionEventsAsc, "inbound");
        if (lastInteractionDirection === "inbound" && pendingInboundStart?.created_at) {
          const responseMinutes = diffMinutes(occurredAt, new Date(pendingInboundStart.created_at));

          if (responseMinutes <= 5) {
            addRuleEvent("SLA_FIRST_RESPONSE_UNDER_5MIN", { response_time_minutes: Math.round(responseMinutes) });
          } else if (responseMinutes <= 30) {
            addRuleEvent("SLA_FIRST_RESPONSE_5_TO_30MIN", { response_time_minutes: Math.round(responseMinutes) });
          } else {
            addRuleEvent("SLA_FIRST_RESPONSE_OVER_30MIN", { response_time_minutes: Math.round(responseMinutes) });
          }

          if (responseMinutes >= 24 * 60) {
            addRuleEvent("UNREPLIED_INBOUND_OVER_24H", { unreplied_minutes: Math.round(responseMinutes) });
          } else if (responseMinutes >= 120) {
            addRuleEvent("UNREPLIED_INBOUND_OVER_2H", { unreplied_minutes: Math.round(responseMinutes) });
          }
        }
      }

      if (alternatingTurnCount >= 5 && alternatingTurnCount % 5 === 0) {
        addRuleEvent("BACK_AND_FORTH_5_TURNS", { turn_count: alternatingTurnCount });
      }

      if (activeDayStreak >= 5) {
        addRuleEvent("CONVERSATION_ACTIVE_5D", { active_day_streak: activeDayStreak }, { maxPerDayOverride: 1 });
      } else if (activeDayStreak >= 3) {
        addRuleEvent("CONVERSATION_ACTIVE_3D", { active_day_streak: activeDayStreak }, { maxPerDayOverride: 1 });
      }

      let avgResponseTimeSeconds = conversationState.avg_response_time_seconds || 0;
      let unrepliedInboundCount = conversationState.unreplied_inbound_count || 0;

      if (currentDirection === "inbound") {
        unrepliedInboundCount += 1;
      } else if (lastInteractionDirection === "inbound" && trailingSameDirectionStart?.created_at) {
        const responseSeconds = Math.max(0, Math.round((occurredAt.getTime() - new Date(trailingSameDirectionStart.created_at).getTime()) / 1000));
        avgResponseTimeSeconds = avgResponseTimeSeconds > 0
          ? Math.round((avgResponseTimeSeconds + responseSeconds) / 2)
          : responseSeconds;
        unrepliedInboundCount = 0;
      }

      const conversationPayload: any = {
        user_id,
        lead_id: leadId,
        number_instance_id: number_instance_id || null,
        last_inbound_at: currentDirection === "inbound"
          ? pickLatestIso(conversationState.last_inbound_at, occurredAtIso)
          : conversationState.last_inbound_at,
        last_outbound_at: currentDirection === "outbound"
          ? pickLatestIso(conversationState.last_outbound_at, occurredAtIso)
          : conversationState.last_outbound_at,
        inbound_count_7d: conversationState.inbound_count_7d + (currentDirection === "inbound" ? 1 : 0),
        outbound_count_7d: conversationState.outbound_count_7d + (currentDirection === "outbound" ? 1 : 0),
        avg_response_time_seconds: avgResponseTimeSeconds,
        unreplied_inbound_count: unrepliedInboundCount,
        updated_at: occurredAtIso,
      };

      if (conversationRowId) {
        await supabase.from("revenue_conversations").update(conversationPayload).eq("id", conversationRowId);
      } else {
        await supabase.from("revenue_conversations").insert({
          ...conversationPayload,
          created_at: occurredAtIso,
        });
      }

      if (eventEntries.length > 0) {
        const { data: insertedEvents, error: insertEventsError } = await supabase
          .from("revenue_events")
          .insert(eventEntries.map((entry) => entry.event))
          .select("id");

        if (insertEventsError) throw insertEventsError;

        insertedEvents?.forEach((insertedEvent: any, index: number) => {
          if (eventEntries[index]?.scoreLog) {
            eventEntries[index].scoreLog.event_id = insertedEvent.id;
          }
        });
      }

      const scoreLogsToCreate = eventEntries
        .map((entry) => entry.scoreLog)
        .filter(Boolean);

      if (scoreLogsToCreate.length > 0) {
        await supabase.from("revenue_score_logs").insert(scoreLogsToCreate);
      }

      if (classificationResult && classificationResult.intent_category !== "NEUTRAL" && message_content) {
        await supabase.from("revenue_intent_logs").insert({
          lead_id: leadId,
          raw_message: message_content.substring(0, 500),
          intent_category: classificationResult.intent_category,
          intent_subtype: classificationResult.intent_subtype,
          matched_keywords: classificationResult.matched_keywords,
          confidence_score: classificationResult.confidence_score,
        });
      }

      const newScore = runningScore;
      const newBucket = scoreToBucket(newScore);

      let riskState = existingLead?.risk_state || "OK";
      let riskReason = existingLead?.risk_reason || null;

      if (currentDirection === "inbound" && riskState !== "AT_RISK") {
        if (classificationResult?.intent_category !== "INTENT_NEGATIVE_HARD") {
          riskState = "OK";
          riskReason = null;
        }
      }

      const componentScores = await calculateLeadScoreComponents(supabase, leadId);
      const leadUpdate: any = {
        score_total: newScore,
        ...componentScores,
        score_last_calc_at: occurredAtIso,
        last_activity_at: occurredAtIso,
        status_bucket: newBucket,
        risk_state: riskState,
        risk_reason: riskReason,
      };

      if (classificationResult && classificationResult.intent_category !== "NEUTRAL") {
        leadUpdate.last_intent_category = classificationResult.intent_category;
        leadUpdate.last_intent_subtype = classificationResult.intent_subtype;
      }

      await supabase.from("revenue_leads").update(leadUpdate).eq("id", leadId);

      return new Response(
        JSON.stringify({
          success: true,
          lead_id: leadId,
          phone_e164: normalizedPhone,
          score: newScore,
          bucket: newBucket,
          events_created: eventEntries.length,
          score_logs_created: scoreLogsToCreate.length,
          classification: classificationResult
            ? {
                category: classificationResult.intent_category,
                subtype: classificationResult.intent_subtype,
                confidence: classificationResult.confidence_score,
              }
            : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === ACTION: decay_scores (daily job) ===
    if (action === "decay_scores") {
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: settings } = await supabase
        .from("revenue_settings")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      const decayRate = settings?.cooldown_decay_per_day || 0.06;

      const { data: leads } = await supabase
        .from("revenue_leads")
        .select("id, score_total, last_activity_at, status_bucket, risk_state")
        .eq("user_id", user_id);

      let updated = 0;
      const now = Date.now();
      const snapshotsToCreate: any[] = [];

      for (const lead of leads || []) {
        const lastActivity = new Date(lead.last_activity_at).getTime();
        const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);

        snapshotsToCreate.push({
          lead_id: lead.id,
          user_id,
          score_value: lead.score_total,
          status_bucket: lead.status_bucket,
          snapshot_date: new Date().toISOString().split("T")[0],
        });

        if (daysSince < 1) continue;

        const totalDecay = 1 - Math.pow(1 - decayRate, daysSince);
        const newScore = Math.max(0, Math.round(lead.score_total * (1 - totalDecay)));
        const newBucket = scoreToBucket(newScore);

        let riskState = lead.risk_state;
        let riskReason = null;

        if (daysSince >= 7) {
          riskState = "AT_RISK";
          riskReason = `Sem atividade há ${Math.round(daysSince)} dias`;
        } else if (daysSince >= 3) {
          riskState = "COOLING";
          riskReason = `Sem atividade há ${Math.round(daysSince)} dias`;
        }

        await supabase
          .from("revenue_leads")
          .update({
            score_total: newScore,
            status_bucket: newBucket,
            risk_state: riskState,
            risk_reason: riskReason,
            score_last_calc_at: new Date().toISOString(),
          })
          .eq("id", lead.id);

        updated++;
      }

      if (snapshotsToCreate.length > 0) {
        await supabase
          .from("revenue_score_snapshots")
          .upsert(snapshotsToCreate, { onConflict: "lead_id,snapshot_date" });
      }

      return new Response(
        JSON.stringify({ success: true, leads_updated: updated, snapshots_created: snapshotsToCreate.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Revenue processor error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
