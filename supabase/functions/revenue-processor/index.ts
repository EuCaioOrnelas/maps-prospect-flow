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
};

function scoreToBucket(score: number): string {
  if (score >= 650) return "VERY_HOT";
  if (score >= 350) return "HOT";
  if (score >= 150) return "ENGAGED";
  return "COLD";
}

function isValidRevenuePhone(phone: string): boolean {
  const digits = String(phone || "").replace(/\D/g, "");

  // Revenue aceita apenas WhatsApp BR em E.164: 55 + DDD + 9 dígitos (13 no total)
  if (!digits.startsWith("55") || digits.length !== 13) return false;

  const ddd = digits.slice(2, 4);
  const local = digits.slice(4); // 9 dígitos

  // DDD brasileiro válido (11-99)
  const dddNum = Number(ddd);
  if (Number.isNaN(dddNum) || dddNum < 11 || dddNum > 99) return false;

  // Celular brasileiro deve iniciar com 9 após DDD
  if (local.length !== 9 || !local.startsWith("9")) return false;

  const subscriber = local.slice(1); // últimos 8 dígitos

  // Bloqueia placeholders clássicos e sequências artificiais
  if (/^(\d)\1{7}$/.test(subscriber)) return false;
  if (["12345678", "87654321", "01234567"].includes(subscriber)) return false;
  if (subscriber.startsWith("9999")) return false;
  if (/(0000|1234|4321)/.test(subscriber)) return false;
  if (subscriber.endsWith("0000") || subscriber.endsWith("0001") || subscriber.endsWith("0002")) return false;

  return true;
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
    } = body;

    // === ACTION: process_message ===
    if (action === "process_message") {
      if (!user_id || !phone_e164 || !direction) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!isValidRevenuePhone(phone_e164)) {
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: "Invalid or placeholder phone" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 0. Check if number is enabled for Revenue analysis
      // Skip check for Meta API sources (they use waba_connections, not whatsapp_numbers)
      if (number_instance_id && source !== "meta") {
        const { data: numConfig } = await supabase
          .from("revenue_number_config")
          .select("is_enabled")
          .eq("user_id", user_id)
          .eq("whatsapp_number_id", number_instance_id)
          .maybeSingle();

        // Default seguro: se não houver configuração explícita do número, mantém o Revenue ativo.
        // Só bloqueia quando o número foi desabilitado manualmente.
        if (numConfig && numConfig.is_enabled === false) {
          return new Response(
            JSON.stringify({ success: false, skipped: true, reason: "Number not enabled for Revenue analysis" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // 1. Upsert revenue_lead
      const { data: existingLead } = await supabase
        .from("revenue_leads")
        .select("*")
        .eq("user_id", user_id)
        .eq("phone_e164", phone_e164)
        .maybeSingle();

      let leadId: string;
      let previousScore = 0;

      if (existingLead) {
        leadId = existingLead.id;
        previousScore = existingLead.score_total;
        // Update last activity and source number (tracks last number that interacted)
        await supabase
          .from("revenue_leads")
          .update({
            last_activity_at: new Date().toISOString(),
            source_number_instance_id: number_instance_id || existingLead.source_number_instance_id,
          })
          .eq("id", leadId);
      } else {
        // Do not create Revenue lead from outbound-only traffic
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
            phone_e164,
            source_number_instance_id: number_instance_id || null,
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        leadId = newLead.id;
      }

      // 2. Upsert revenue_conversation
      await supabase.from("revenue_conversations").upsert(
        {
          user_id,
          lead_id: leadId,
          number_instance_id: number_instance_id || null,
          ...(direction === "inbound"
            ? { last_inbound_at: new Date().toISOString() }
            : { last_outbound_at: new Date().toISOString() }),
        },
        { onConflict: "user_id,lead_id,number_instance_id" }
      );

      // 3. Load score rules
      const { data: rules } = await supabase
        .from("revenue_score_rules")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_enabled", true);

      const rulesMap = new Map(
        (rules || []).map((r: any) => [r.rule_key, r])
      );

      // 4. Generate events + score logs
      const eventsToCreate: any[] = [];
      const scoreLogsToCreate: any[] = [];
      let scoreChange = 0;
      let runningScore = previousScore;

      const addEvent = (eventType: string, points: number, meta: any = {}) => {
        eventsToCreate.push({
          user_id,
          lead_id: leadId,
          number_instance_id,
          event_type: eventType,
          event_value: points,
          event_meta: meta,
          intent_category: meta.intent_category || null,
          intent_subtype: meta.intent_subtype || null,
          intent_confidence_score: meta.confidence_score || 0,
        });
        const scoreBefore = runningScore;
        runningScore = Math.max(0, Math.min(1000, runningScore + points));
        scoreChange += points;
        scoreLogsToCreate.push({
          user_id,
          lead_id: leadId,
          event_type: eventType,
          points_applied: points,
          score_before: scoreBefore,
          score_after: runningScore,
          category: EVENT_CATEGORIES[eventType] || "engagement",
        });
      };

      let classificationResult: ClassificationResult | null = null;

      if (direction === "inbound") {
        // Always add base inbound message points
        const inboundRule = rulesMap.get("INBOUND_MESSAGE");
        if (inboundRule) {
          addEvent("INBOUND_MESSAGE", inboundRule.points);
        }

        // Classify message with contextual engine
        if (message_content) {
          const normalized = normalizeText(message_content);
          classificationResult = classifyMessage(normalized, rulesMap);

          // Only add intent event if not NEUTRAL (avoid double-counting with INBOUND_MESSAGE)
          if (classificationResult.intent_category !== "NEUTRAL") {
            addEvent(classificationResult.event_type, classificationResult.points, {
              matched_text: message_content.substring(0, 200),
              intent_category: classificationResult.intent_category,
              intent_subtype: classificationResult.intent_subtype,
              matched_keywords: classificationResult.matched_keywords,
              confidence_score: classificationResult.confidence_score,
            });

            // Handle NEGATIVE_HARD special behavior
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

              await supabase
                .from("revenue_leads")
                .update(updatePayload)
                .eq("id", leadId);
            }
          }
        }

        // Check SLA
        if (existingLead) {
          const { data: conv } = await supabase
            .from("revenue_conversations")
            .select("last_outbound_at")
            .eq("lead_id", leadId)
            .eq("user_id", user_id)
            .maybeSingle();

          if (conv?.last_outbound_at) {
            const outboundTime = new Date(conv.last_outbound_at).getTime();
            const now = Date.now();
            const diffMin = (now - outboundTime) / 60000;

            if (diffMin <= 60) {
              const rule = rulesMap.get("OUTBOUND_REPLY_RECEIVED_WITHIN_1H");
              if (rule) {
                addEvent("OUTBOUND_REPLY_RECEIVED_WITHIN_1H", rule.points, { response_time_minutes: Math.round(diffMin) });
              }
            }
          }
        }
      }

      // 5. Insert events
      if (eventsToCreate.length > 0) {
        const { data: insertedEvents } = await supabase
          .from("revenue_events")
          .insert(eventsToCreate)
          .select("id");

        if (insertedEvents && insertedEvents.length === scoreLogsToCreate.length) {
          for (let i = 0; i < scoreLogsToCreate.length; i++) {
            scoreLogsToCreate[i].event_id = insertedEvents[i].id;
          }
        }
      }

      // 6. Insert score logs
      if (scoreLogsToCreate.length > 0) {
        await supabase.from("revenue_score_logs").insert(scoreLogsToCreate);
      }

      // 7. Insert intent audit log
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

      // 8. Update score
      const newScore = Math.max(0, Math.min(1000, previousScore + scoreChange));
      const newBucket = scoreToBucket(newScore);

      let riskState = existingLead?.risk_state || "OK";
      let riskReason = existingLead?.risk_reason || null;

      // Don't override AT_RISK set by NEGATIVE_HARD
      if (direction === "inbound" && riskState !== "AT_RISK") {
        if (classificationResult?.intent_category !== "INTENT_NEGATIVE_HARD") {
          riskState = "OK";
          riskReason = null;
        }
      }

      // Recalculate multidimensional components from score logs (corrige legados inconsistentes)
      const componentScores = await calculateLeadScoreComponents(supabase, leadId);

      const leadUpdate: any = {
        score_total: newScore,
        ...componentScores,
        score_last_calc_at: new Date().toISOString(),
        status_bucket: newBucket,
        risk_state: riskState,
        risk_reason: riskReason,
      };

      // Update last intent on lead for display
      if (classificationResult && classificationResult.intent_category !== "NEUTRAL") {
        leadUpdate.last_intent_category = classificationResult.intent_category;
        leadUpdate.last_intent_subtype = classificationResult.intent_subtype;
      }

      await supabase
        .from("revenue_leads")
        .update(leadUpdate)
        .eq("id", leadId);

      return new Response(
        JSON.stringify({
          success: true,
          lead_id: leadId,
          score: newScore,
          bucket: newBucket,
          events_created: eventsToCreate.length,
          classification: classificationResult ? {
            category: classificationResult.intent_category,
            subtype: classificationResult.intent_subtype,
            confidence: classificationResult.confidence_score,
          } : null,
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
    console.error("Revenue processor error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
