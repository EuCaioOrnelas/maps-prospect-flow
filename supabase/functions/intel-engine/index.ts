// WIIZE CENTRAL INTELLIGENCE ENGINE
// Camada central que consolida: prospeccao (empresa + diagnostico),
// conversa (motor Revenue existente) e vendas (lead_deals / pipeline).
// Regras: nao recalcula engajamento (reutiliza revenue_leads), IA so devolve
// sinais, o motor decide o score. Tudo isolado por conta (owner_user_id).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENGINE_VERSION = "v1";
const ANALYZER_VERSION = "v1";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(n)));
const digits = (s: string) => (s || "").replace(/\D/g, "");
const suffix8 = (s: string) => digits(s).slice(-8);
const daysBetween = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 86400000;

// ---------------------------------------------------------------------------
// LEXICOS COMPLEMENTARES (o motor Revenue ja cobre preco/compra/pagamento/etc.
// aqui expandimos para problema, necessidade, comparacao, decisao, proximo passo)
// ---------------------------------------------------------------------------
const LEX: Record<string, RegExp[]> = {
  PROBLEM_DETECTED: [
    /\b(estou|estamos|tenho|temos)\s+(perdendo|tendo\s+problema|com\s+dificuldade|com\s+problema)/i,
    /\b(nao|n[aã]o)\s+(consigo|conseguimos|dou\s+conta|damos\s+conta)/i,
    /\b(problema|dificuldade|gargalo|prejuizo|preju[ií]zo|reclama[cç][aã]o|demora\s+demais)\b/i,
    /\b(perdendo\s+(cliente|venda|dinheiro))/i,
  ],
  NEED_DETECTED: [
    /\b(preciso|precisamos|precisava|necessito|necessitamos)\b/i,
    /\b(quero|queremos|gostaria|gostariamos|gostar[ií]amos)\s+(de\s+)?(melhorar|resolver|organizar|aumentar|automatizar)/i,
    /\b(t[aá]\s+na\s+hora|chegou\s+a\s+hora)\s+de\b/i,
  ],
  GOAL_DETECTED: [
    /\b(meta|objetivo|quero\s+chegar|pretendo|planejo|expandir|crescer|escalar)\b/i,
  ],
  INTENT_COMPARISON: [
    /\b(compar(ar|ando|a[cç][aã]o)|diferen[cç]a\s+entre|versus|melhor\s+que|outro\s+fornecedor|concorrente)\b/i,
    /\b(estou\s+vendo\s+(outras|outro)|cotando|or[cç]amento\s+com\s+outr)/i,
  ],
  INTENT_DECISION: [
    /\b(vou\s+fechar|pode\s+fechar|fechado|bora|vamos\s+fechar|aceito|topo)\b/i,
    /\b(decidi|decidimos|escolhi)\b/i,
  ],
  INTENT_APPROVAL: [
    /\b(preciso\s+(falar|alinhar|ver)\s+com\s+(meu|minha|o|a)\s+(s[oó]cio|sócia|chefe|gerente|diretor|esposa|marido))/i,
    /\b(vou\s+levar\s+pra|apresentar\s+pra|aprova[cç][aã]o)\b/i,
  ],
  INTENT_RESEARCH: [
    /\b(s[oó]\s+(estou|to|t[oô])\s+(vendo|olhando|pesquisando)|por\s+curiosidade|s[oó]\s+pesquisando)\b/i,
  ],
  INTENT_NEXT_STEP: [
    /\b(qual\s+o\s+pr[oó]ximo\s+passo|como\s+funciona\s+(pra|para)\s+come[cç]ar|como\s+fa[cç]o\s+pra\s+come[cç]ar|manda\s+o\s+contrato|como\s+prosseguir)\b/i,
  ],
  INTENT_CONTRACT: [
    /\b(contrato|assinar|assinatura|documento|nota\s+fiscal|cnpj\s+pra)\b/i,
  ],
  INTENT_SOLUTION: [
    /\b(voc[eê]s?\s+(fazem|conseguem|atendem)|voc[eê]\s+resolve|d[aá]\s+pra\s+(fazer|resolver))\b/i,
  ],
};

// mapeia intent_category do motor Revenue para sinais centrais
const REVENUE_INTENT_MAP: Record<string, string> = {
  INTENT_BUY_NOW: "INTENT_BUY",
  BUY_INTENT: "INTENT_BUY",
  INTENT_PRICE: "INTENT_PRICE",
  PRICE_REQUEST: "INTENT_PRICE",
  INTENT_PAYMENT: "INTENT_PAYMENT",
  PAYMENT: "INTENT_PAYMENT",
  INTENT_PROPOSAL: "INTENT_PROPOSAL",
  PROPOSAL: "INTENT_PROPOSAL",
  INTENT_AVAILABILITY: "INTENT_AVAILABILITY",
  AVAILABILITY: "INTENT_AVAILABILITY",
  INTENT_URGENT: "INTENT_URGENCY",
  URGENT: "INTENT_URGENCY",
  INTENT_DEMO: "INTENT_DEMO",
  INTENT_OBJECTION: "OBJECTION",
  OBJECTION: "OBJECTION",
  INTENT_NEGATIVE_HARD: "NEGATIVE_INTENT",
  INTENT_NEGATIVE: "NEGATIVE_INTENT",
  NEGATIVE_MODERATE: "NEGATIVE_INTENT",
};

// peso base de cada sinal para a dimensao INTENT (0-100 apos normalizacao)
const INTENT_WEIGHTS: Record<string, number> = {
  INTENT_BUY: 30,
  INTENT_PAYMENT: 26,
  INTENT_PROPOSAL: 22,
  INTENT_CONTRACT: 22,
  INTENT_DECISION: 28,
  INTENT_PRICE: 18,
  INTENT_AVAILABILITY: 14,
  INTENT_NEXT_STEP: 18,
  INTENT_URGENCY: 14,
  INTENT_DEMO: 12,
  INTENT_SOLUTION: 10,
  INTENT_APPROVAL: 10,
  INTENT_COMPARISON: 8,
  NEED_DETECTED: 10,
  PROBLEM_DETECTED: 8,
  GOAL_DETECTED: 6,
  INTENT_RESEARCH: -6,
  OBJECTION: -8,
  NEGATIVE_INTENT: -35,
};

const SIGNAL_GROUP: Record<string, string> = {
  PROBLEM_DETECTED: "PROBLEM",
  NEED_DETECTED: "PROBLEM",
  GOAL_DETECTED: "PROBLEM",
  OBJECTION: "OBJECTION",
  NEGATIVE_INTENT: "OBJECTION",
  DIAGNOSIS_GAP: "COMPANY",
  DIAGNOSIS_REPUTATION: "COMPANY",
  FAST_RESPONSE: "BEHAVIOR",
};

// assinatura canonica usada para padroes historicos
const CANONICAL = [
  "INTENT_BUY", "INTENT_PRICE", "INTENT_PAYMENT", "INTENT_PROPOSAL", "INTENT_AVAILABILITY",
  "INTENT_URGENCY", "INTENT_NEXT_STEP", "INTENT_DECISION", "INTENT_CONTRACT", "INTENT_COMPARISON",
  "PROBLEM_DETECTED", "NEED_DETECTED", "OBJECTION", "NEGATIVE_INTENT", "FAST_RESPONSE", "DIAGNOSIS_GAP",
];

const DEFAULT_CONFIG = {
  weights: {
    opportunity: { fit: 0.25, intent: 0.3, engagement: 0.15, quality: 0.1, momentum: 0.1, pattern: 0.1 },
    fit: { niche: 0.3, region: 0.2, digital_maturity: 0.25, reputation: 0.15, contactability: 0.1 },
  },
  thresholds: {
    hot_opportunity: 70, high_intent: 65, high_fit: 65, high_risk: 60, pattern_match_high: 70,
    priority: { p0: 85, p1: 72, p2: 58, p3: 40 },
  },
  decay: { half_life_days: { INTENT: 14, PROBLEM: 30, OBJECTION: 21, ACTION: 10, DEFAULT: 21 }, momentum_window_days: 7 },
  compound_rules: [
    { key: "BUYING_JOURNEY", signals: ["INTENT_PRICE", "INTENT_AVAILABILITY", "INTENT_PAYMENT"], bonus: 18 },
    { key: "PROBLEM_AWARE", signals: ["PROBLEM_DETECTED", "NEED_DETECTED", "INTENT_PRICE"], bonus: 15 },
    { key: "DIAGNOSIS_MATCH", signals: ["DIAGNOSIS_GAP", "PROBLEM_DETECTED"], bonus: 12 },
    { key: "CLOSING_SIGNALS", signals: ["INTENT_PROPOSAL", "INTENT_PAYMENT", "FAST_RESPONSE"], bonus: 20 },
  ],
  ai_enabled: true,
};

type Cfg = typeof DEFAULT_CONFIG & Record<string, any>;

async function loadConfig(sb: any, owner: string): Promise<Cfg> {
  const { data } = await sb.from("intel_config").select("*").eq("owner_user_id", owner).maybeSingle();
  if (data) return { ...DEFAULT_CONFIG, ...data } as Cfg;
  await sb.from("intel_config").insert({ owner_user_id: owner }).select().maybeSingle();
  return { ...DEFAULT_CONFIG } as Cfg;
}

function decayFactor(group: string, ageDays: number, cfg: Cfg) {
  const hl = cfg.decay?.half_life_days?.[group] ?? cfg.decay?.half_life_days?.DEFAULT ?? 21;
  return Math.pow(0.5, Math.max(0, ageDays) / hl);
}

// ---------------------------------------------------------------------------
// EXTRACAO DE SINAIS (regra local, sem IA)
// ---------------------------------------------------------------------------
function ruleSignals(text: string): { type: string; confidence: number }[] {
  const out: { type: string; confidence: number }[] = [];
  for (const [type, regs] of Object.entries(LEX)) {
    const hits = regs.filter((r) => r.test(text)).length;
    if (hits > 0) out.push({ type, confidence: Math.min(1, 0.7 + hits * 0.1) });
  }
  return out;
}

// IA apenas para mensagens ambiguas (sem sinal por regra, texto longo).
// A IA devolve SINAIS, nunca score.
async function aiSignals(texts: { id: string; text: string }[]): Promise<Record<string, { type: string; confidence: number }[]>> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || texts.length === 0) return {};
  const allowed = [...Object.keys(LEX), "OBJECTION", "NEGATIVE_INTENT", "INTENT_BUY", "INTENT_PRICE", "INTENT_PAYMENT", "INTENT_PROPOSAL", "INTENT_AVAILABILITY", "INTENT_URGENCY"];
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `Voce extrai SINAIS comerciais de mensagens de clientes em portugues. Nunca atribua score ou nota. ` +
              `Responda JSON: {"results":[{"id":"...","signals":[{"type":"...","confidence":0.0}]}]}. ` +
              `Tipos permitidos: ${allowed.join(", ")}. Se a mensagem nao tiver sinal, retorne signals vazio.`,
          },
          { role: "user", content: JSON.stringify(texts.slice(0, 8)) },
        ],
      }),
    });
    if (!res.ok) return {};
    const data = await res.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    const map: Record<string, { type: string; confidence: number }[]> = {};
    for (const r of parsed?.results || []) {
      map[r.id] = (r.signals || [])
        .filter((s: any) => allowed.includes(s.type))
        .map((s: any) => ({ type: s.type, confidence: Math.max(0.3, Math.min(1, Number(s.confidence) || 0.6)) }));
    }
    return map;
  } catch (_e) {
    return {};
  }
}

// ---------------------------------------------------------------------------
// COMPUTE PROFILE
// ---------------------------------------------------------------------------
async function computeProfile(sb: any, owner: string, phone: string) {
  const cfg = await loadConfig(sb, owner);
  const now = new Date();
  const norm = digits(phone);
  const sfx = suffix8(norm);

  // --- lead de conversa (motor Revenue) ---
  const { data: rlAll } = await sb
    .from("revenue_leads")
    .select("*")
    .or(`owner_user_id.eq.${owner},user_id.eq.${owner}`)
    .limit(3000);
  const rl = (rlAll || []).find((r: any) => suffix8(r.phone_e164) === sfx);
  if (!rl) return { skipped: true, reason: "revenue lead not found", phone };

  // --- empresa prospectada (CRM) ---
  const { data: crmAll } = await sb
    .from("leads")
    .select("id, company_name, contact_name, phone, category, city, region, website, rating, review_count, ai_score, opportunity_level, ai_diagnosis, enrichment_data, pipeline_stage_id, estimated_value, social_media, last_response_at")
    .eq("user_id", owner)
    .limit(5000);
  const crm = (crmAll || []).find((l: any) => suffix8(l.phone || "") === sfx) || null;
  if (crm && rl.crm_lead_id !== crm.id) {
    await sb.from("revenue_leads").update({ crm_lead_id: crm.id }).eq("id", rl.id);
  }

  // --- perfil da conta (ICP do vendedor) ---
  const { data: cp } = await sb
    .from("company_profiles")
    .select("*")
    .eq("user_id", owner)
    .maybeSingle();

  // --- conversa ---
  const since90 = new Date(now.getTime() - 90 * 86400000).toISOString();
  const { data: conv } = await sb
    .from("revenue_conversations")
    .select("*")
    .eq("lead_id", rl.id)
    .maybeSingle();
  const { data: intentLogs } = await sb
    .from("revenue_intent_logs")
    .select("intent_category, intent_subtype, confidence_score, created_at, raw_message")
    .eq("lead_id", rl.id)
    .gte("created_at", since90)
    .order("created_at", { ascending: false })
    .limit(300);
  const { data: scoreLogs } = await sb
    .from("revenue_score_logs")
    .select("event_type, points_applied, category, created_at, score_after")
    .eq("lead_id", rl.id)
    .gte("created_at", since90)
    .order("created_at", { ascending: false })
    .limit(500);

  // mensagens reais (para qualidade + sinais semanticos)
  let messages: any[] = [];
  const { data: contact } = await sb
    .from("chat_contacts")
    .select("id")
    .eq("owner_user_id", owner)
    .limit(5000);
  const { data: convRows } = await sb
    .from("chat_conversations")
    .select("id, contact_phone")
    .eq("owner_user_id", owner)
    .limit(5000);
  const convIds = (convRows || []).filter((c: any) => suffix8(c.contact_phone || "") === sfx).map((c: any) => c.id);
  if (convIds.length) {
    const { data: msgs } = await sb
      .from("chat_messages")
      .select("id, content, direction, created_at, message_type")
      .in("conversation_id", convIds)
      .gte("created_at", since90)
      .order("created_at", { ascending: false })
      .limit(200);
    messages = msgs || [];
  }
  void contact;

  // ---------------- SINAIS ----------------
  type Sig = { type: string; confidence: number; at: Date; source: string; message_id?: string };
  const signals: Sig[] = [];

  for (const il of intentLogs || []) {
    const mapped = REVENUE_INTENT_MAP[il.intent_category] || REVENUE_INTENT_MAP[il.intent_subtype || ""] || null;
    if (mapped) {
      signals.push({
        type: mapped,
        confidence: Number(il.confidence_score) || 0.8,
        at: new Date(il.created_at),
        source: "revenue",
      });
    }
    if (il.raw_message) {
      for (const s of ruleSignals(il.raw_message)) {
        signals.push({ type: s.type, confidence: s.confidence, at: new Date(il.created_at), source: "rule" });
      }
    }
  }

  const inbound = messages.filter((m) => m.direction === "inbound");
  const ambiguous: { id: string; text: string }[] = [];
  const persist: any[] = [];
  for (const m of inbound.slice(0, 60)) {
    const text = (m.content || "").replace(/^🎤\s*/, "");
    if (!text || text.length < 3) continue;
    const rs = ruleSignals(text);
    if (rs.length) {
      for (const s of rs) {
        signals.push({ type: s.type, confidence: s.confidence, at: new Date(m.created_at), source: "rule", message_id: m.id });
        persist.push({
          owner_user_id: owner, phone_e164: rl.phone_e164, revenue_lead_id: rl.id, crm_lead_id: crm?.id ?? null,
          signal_type: s.type, signal_group: SIGNAL_GROUP[s.type] || "INTENT", confidence: s.confidence,
          source: "rule", message_id: m.id, analyzer_version: ANALYZER_VERSION, occurred_at: m.created_at,
        });
      }
    } else if (cfg.ai_enabled !== false && text.length > 45 && ambiguous.length < 8) {
      ambiguous.push({ id: m.id, text: text.slice(0, 400) });
    }
  }

  if (ambiguous.length) {
    // cache: nao reprocessa mensagem ja analisada por esta versao do analisador
    const { data: cached } = await sb
      .from("intel_signals")
      .select("message_id, signal_type, confidence, occurred_at")
      .eq("owner_user_id", owner)
      .eq("analyzer_version", ANALYZER_VERSION)
      .in("message_id", ambiguous.map((a) => a.id));
    const cachedIds = new Set((cached || []).map((c: any) => c.message_id));
    for (const c of cached || []) {
      signals.push({ type: c.signal_type, confidence: Number(c.confidence), at: new Date(c.occurred_at), source: "ai" });
    }
    const todo = ambiguous.filter((a) => !cachedIds.has(a.id));
    if (todo.length) {
      const ai = await aiSignals(todo);
      for (const a of todo) {
        const list = ai[a.id] || [];
        const at = inbound.find((m) => m.id === a.id)?.created_at || now.toISOString();
        if (!list.length) {
          persist.push({
            owner_user_id: owner, phone_e164: rl.phone_e164, revenue_lead_id: rl.id, crm_lead_id: crm?.id ?? null,
            signal_type: "NO_SIGNAL", signal_group: "INTENT", confidence: 1, source: "ai",
            message_id: a.id, analyzer_version: ANALYZER_VERSION, occurred_at: at,
          });
          continue;
        }
        for (const s of list) {
          signals.push({ type: s.type, confidence: s.confidence, at: new Date(at), source: "ai", message_id: a.id });
          persist.push({
            owner_user_id: owner, phone_e164: rl.phone_e164, revenue_lead_id: rl.id, crm_lead_id: crm?.id ?? null,
            signal_type: s.type, signal_group: SIGNAL_GROUP[s.type] || "INTENT", confidence: s.confidence,
            source: "ai", message_id: a.id, analyzer_version: ANALYZER_VERSION, occurred_at: at,
          });
        }
      }
    }
  }

  // sinais do diagnostico da prospeccao
  const enrich = (crm?.enrichment_data || {}) as any;
  const breakdown = enrich?.score_breakdown || {};
  const hasSite = !!crm?.website;
  const reviewCount = Number(crm?.review_count || 0);
  const rating = Number(crm?.rating || 0);
  if (crm) {
    const gaps: string[] = [];
    if (!hasSite) gaps.push("sem site");
    if (reviewCount < 20) gaps.push("poucas avaliacoes");
    if (Number(breakdown.estrutura_digital || 0) && Number(breakdown.estrutura_digital) < 50) gaps.push("estrutura digital fraca");
    if (Array.isArray(enrich?.pontos_fracos)) gaps.push(...enrich.pontos_fracos.slice(0, 3));
    if (gaps.length) {
      signals.push({ type: "DIAGNOSIS_GAP", confidence: 0.9, at: now, source: "prospecting" });
    }
    if (rating && rating < 4) signals.push({ type: "DIAGNOSIS_REPUTATION", confidence: 0.8, at: now, source: "prospecting" });
  }

  // resposta rapida do lead (comportamento)
  const avgResp = Number(conv?.avg_response_time_seconds || 0);
  if (avgResp > 0 && avgResp <= 600) signals.push({ type: "FAST_RESPONSE", confidence: 0.9, at: now, source: "rule" });

  if (persist.length) {
    await sb.from("intel_signals").upsert(persist, {
      onConflict: "owner_user_id,message_id,signal_type,analyzer_version",
      ignoreDuplicates: true,
    });
  }

  const present = new Set(signals.map((s) => s.type));

  // ---------------- DIMENSOES ----------------
  // ENGAGEMENT: reutiliza integralmente o score do motor atual (0-1000 -> 0-100)
  const engagement = clamp(Number(rl.score_total || 0) / 10);

  // INTENT: soma ponderada com decay por recencia
  let intentRaw = 0;
  for (const s of signals) {
    const w = INTENT_WEIGHTS[s.type];
    if (!w) continue;
    const group = SIGNAL_GROUP[s.type] || "INTENT";
    intentRaw += w * s.confidence * decayFactor(group, daysBetween(now, s.at), cfg);
  }
  const intent = clamp(intentRaw);

  // QUALITY: profundidade, perguntas, reciprocidade, progressao
  const inbLen = inbound.map((m) => (m.content || "").length);
  const avgLen = inbLen.length ? inbLen.reduce((a, b) => a + b, 0) / inbLen.length : 0;
  const questions = inbound.filter((m) => (m.content || "").includes("?")).length;
  const outboundCount = messages.length - inbound.length;
  const reciprocity = messages.length ? Math.min(1, Math.min(inbound.length, outboundCount) / Math.max(1, Math.max(inbound.length, outboundCount))) : 0;
  const distinctDays = new Set(messages.map((m) => (m.created_at || "").slice(0, 10))).size;
  const quality = clamp(
    Math.min(35, (avgLen / 90) * 35) +
    Math.min(20, questions * 4) +
    reciprocity * 25 +
    Math.min(20, distinctDays * 4)
  );

  // FIT: nicho + regiao + maturidade digital + reputacao + contatabilidade
  const fw = cfg.weights?.fit || DEFAULT_CONFIG.weights.fit;
  const nicheCfg = (cfg.niche_weights || {}) as Record<string, number>;
  const regionCfg = (cfg.region_weights || {}) as Record<string, number>;
  const icpNiche = (cp?.company_niche || "").toLowerCase();
  const leadNiche = (crm?.category || "").toLowerCase();
  let nicheScore = crm ? 55 : 40;
  if (leadNiche && icpNiche) {
    const tokens = icpNiche.split(/[\s,/]+/).filter((t: string) => t.length > 3);
    nicheScore = tokens.some((t: string) => leadNiche.includes(t)) ? 90 : 55;
  }
  if (leadNiche && nicheCfg[leadNiche] != null) nicheScore = clamp(nicheCfg[leadNiche]);
  const leadCity = (crm?.city || "").toLowerCase();
  let regionScore = leadCity ? 60 : 45;
  if (leadCity && regionCfg[leadCity] != null) regionScore = clamp(regionCfg[leadCity]);
  const digitalMaturity = clamp(
    (hasSite ? 45 : 5) + Math.min(30, reviewCount / 2) + (Array.isArray(crm?.social_media) || crm?.social_media ? 15 : 0)
  );
  // maturidade BAIXA = necessidade ALTA (potencial de melhoria)
  const needFromMaturity = clamp(100 - digitalMaturity);
  const reputation = clamp(rating ? (rating / 5) * 100 : 50);
  const contactability = clamp((crm?.phone || rl.phone_e164 ? 60 : 20) + (hasSite ? 20 : 0) + (crm?.city ? 20 : 0));
  const fit = clamp(
    nicheScore * fw.niche +
    regionScore * fw.region +
    needFromMaturity * fw.digital_maturity +
    reputation * fw.reputation +
    contactability * fw.contactability
  );

  // MOMENTUM: variacao de pontos nas ultimas janelas
  const win = Number(cfg.decay?.momentum_window_days || 7);
  const t1 = new Date(now.getTime() - win * 86400000);
  const t2 = new Date(now.getTime() - 2 * win * 86400000);
  let cur = 0, prev = 0;
  for (const l of scoreLogs || []) {
    const d = new Date(l.created_at);
    const p = Number(l.points_applied || 0);
    if (d >= t1) cur += p;
    else if (d >= t2) prev += p;
  }
  const momentumValue = Math.round(cur - prev);
  const momentumState =
    momentumValue >= 150 ? "STRONGLY_RISING" :
    momentumValue >= 40 ? "RISING" :
    momentumValue <= -150 ? "STRONGLY_DECLINING" :
    momentumValue <= -40 ? "DECLINING" : "STABLE";
  const momentumNorm = clamp(50 + momentumValue / 6);

  // RISK: contextual
  const lastActivity = rl.last_activity_at ? new Date(rl.last_activity_at) : null;
  const silenceDays = lastActivity ? daysBetween(now, lastActivity) : 999;
  const unreplied = Number(conv?.unreplied_inbound_count || 0);
  const lastInbound = conv?.last_inbound_at ? new Date(conv.last_inbound_at) : null;
  const lastOutbound = conv?.last_outbound_at ? new Date(conv.last_outbound_at) : null;
  const awaitingUsMin = lastInbound && (!lastOutbound || lastInbound > lastOutbound)
    ? Math.round((now.getTime() - lastInbound.getTime()) / 60000) : 0;
  const riskFactors: any[] = [];
  let risk = 0;
  if (awaitingUsMin > 30) { risk += Math.min(35, 10 + awaitingUsMin / 20); riskFactors.push({ key: "SELLER_DELAY", label: `vendedor sem responder ha ${awaitingUsMin} min`, weight: 35 }); }
  if (unreplied > 0) { risk += Math.min(20, unreplied * 7); riskFactors.push({ key: "UNREPLIED", label: `${unreplied} mensagem(ns) do lead sem resposta`, weight: 20 }); }
  if (silenceDays > 3 && silenceDays < 900) { risk += Math.min(25, silenceDays * 3); riskFactors.push({ key: "SILENCE", label: `sem interacao ha ${Math.round(silenceDays)} dia(s)`, weight: 25 }); }
  if (momentumState.includes("DECLINING")) { risk += 15; riskFactors.push({ key: "MOMENTUM_DOWN", label: "interesse em queda", weight: 15 }); }
  if (present.has("OBJECTION")) { risk += 10; riskFactors.push({ key: "OBJECTION", label: "objecao registrada", weight: 10 }); }
  if (present.has("NEGATIVE_INTENT")) { risk += 30; riskFactors.push({ key: "NEGATIVE", label: "sinal negativo explicito", weight: 30 }); }
  risk = clamp(risk);

  // COMPOUND SIGNALS
  const compound: string[] = [];
  let compoundBonus = 0;
  for (const rule of (cfg.compound_rules || DEFAULT_CONFIG.compound_rules) as any[]) {
    const hits = (rule.signals || []).filter((s: string) => present.has(s)).length;
    if (hits >= Math.max(2, (rule.signals || []).length - 1)) {
      compound.push(rule.key);
      compoundBonus += Number(rule.bonus || 0) * (hits / (rule.signals || []).length);
    }
  }

  // PATTERN MATCH (padroes historicos da propria conta)
  const { data: patterns } = await sb
    .from("intel_patterns")
    .select("*")
    .eq("owner_user_id", owner)
    .limit(200);
  const signature = CANONICAL.filter((c) => present.has(c));
  let patternMatch = 0, patternKey: string | null = null, lossMatch = 0;
  for (const p of patterns || []) {
    const sig: string[] = p.signature || [];
    if (!sig.length) continue;
    const covered = sig.filter((s) => present.has(s)).length / sig.length;
    if (covered < 0.6) continue;
    const strength = Math.round(covered * Number(p.rate || 0) * 100);
    if (p.pattern_kind === "CONVERSION" && strength > patternMatch) { patternMatch = strength; patternKey = p.pattern_key; }
    if ((p.pattern_kind === "LOSS" || p.pattern_kind === "GHOSTING") && strength > lossMatch) lossMatch = strength;
  }
  patternMatch = clamp(patternMatch);
  lossMatch = clamp(lossMatch);
  if (lossMatch >= 50) { risk = clamp(risk + 10); riskFactors.push({ key: "LOSS_PATTERN", label: `comportamento parecido com leads perdidos (${lossMatch}%)`, weight: 10 }); }

  // OPPORTUNITY
  const ow = cfg.weights?.opportunity || DEFAULT_CONFIG.weights.opportunity;
  let opportunity =
    fit * ow.fit + intent * ow.intent + engagement * ow.engagement +
    quality * ow.quality + momentumNorm * ow.momentum + patternMatch * ow.pattern;
  opportunity += compoundBonus;
  if (present.has("NEGATIVE_INTENT")) opportunity *= 0.35;
  opportunity = clamp(opportunity);

  // BEHAVIOR
  const behaviors: string[] = [];
  if (avgResp > 0 && avgResp <= 600) behaviors.push("FAST_RESPONDER");
  else if (avgResp > 3600) behaviors.push("SLOW_RESPONDER");
  const inb7 = Number(conv?.inbound_count_7d || 0);
  if (inb7 >= 8) behaviors.push("HIGH_FREQUENCY");
  else if (inb7 <= 1) behaviors.push("LOW_FREQUENCY");
  if (present.has("INTENT_PRICE") || present.has("OBJECTION")) behaviors.push("PRICE_SENSITIVE");
  if (present.has("INTENT_URGENCY")) behaviors.push("URGENT");
  if (present.has("INTENT_APPROVAL")) behaviors.push("HESITANT");
  if (present.has("INTENT_COMPARISON") || present.has("INTENT_RESEARCH")) behaviors.push("RESEARCHER");
  if (present.has("INTENT_DECISION") || present.has("INTENT_CONTRACT")) behaviors.push("DECISION_MAKER");
  if (present.has("OBJECTION") && present.has("INTENT_PAYMENT")) behaviors.push("NEGOTIATOR");
  if (intent >= 70 && (present.has("INTENT_PAYMENT") || present.has("INTENT_BUY"))) behaviors.push("READY_TO_BUY");
  if (silenceDays > 7 && silenceDays < 900) behaviors.push("GHOSTING");
  if (silenceDays <= 2 && momentumState.includes("RISING") && inb7 > 0) behaviors.push("REACTIVATED");

  // STAGE
  let stage = "DISCOVERY";
  if (present.has("INTENT_CONTRACT") || present.has("INTENT_DECISION")) stage = "CLOSING";
  else if (present.has("INTENT_PAYMENT") || present.has("INTENT_PROPOSAL") || present.has("OBJECTION")) stage = "NEGOTIATION";
  else if (present.has("INTENT_PRICE") || present.has("INTENT_AVAILABILITY") || present.has("INTENT_DEMO")) stage = "CONSIDERATION";
  else if (present.has("PROBLEM_DETECTED") || present.has("NEED_DETECTED")) stage = "QUALIFICATION";
  if (present.has("NEGATIVE_INTENT")) stage = "DISQUALIFIED";
  if (intent >= 75 && (present.has("INTENT_BUY") || present.has("INTENT_PAYMENT"))) stage = "READY_TO_BUY";

  // NEXT BEST ACTION
  let nba = "QUALIFY";
  if (stage === "DISQUALIFIED") nba = "DO_NOT_PRIORITIZE";
  else if (awaitingUsMin > 15 && intent >= 40) nba = "RESPOND_NOW";
  else if (present.has("OBJECTION") && !present.has("NEGATIVE_INTENT")) nba = "HANDLE_OBJECTION";
  else if (present.has("INTENT_PAYMENT") || stage === "CLOSING") nba = "REQUEST_PAYMENT";
  else if (present.has("INTENT_PROPOSAL") || (intent >= 60 && stage === "NEGOTIATION")) nba = "SEND_PROPOSAL";
  else if (silenceDays > 7 && silenceDays < 900 && intent >= 30) nba = "REACTIVATE";
  else if (silenceDays > 1 && intent >= 40) nba = "FOLLOW_UP";
  else if (opportunity < 30) nba = "NURTURE";
  else if (intent < 30 && fit >= 60) nba = "QUALIFY";
  else if (silenceDays <= 1 && awaitingUsMin === 0) nba = "WAIT";

  // PRIORITY
  const th = cfg.thresholds || DEFAULT_CONFIG.thresholds;
  const urgencyBoost = (awaitingUsMin > 30 ? 8 : 0) + (momentumState === "STRONGLY_RISING" ? 5 : 0);
  const prioScore = opportunity + urgencyBoost;
  const priority =
    prioScore >= (th.priority?.p0 ?? 85) ? "P0" :
    prioScore >= (th.priority?.p1 ?? 72) ? "P1" :
    prioScore >= (th.priority?.p2 ?? 58) ? "P2" :
    prioScore >= (th.priority?.p3 ?? 40) ? "P3" : "P4";

  // EXPLICABILIDADE
  const factors: any[] = [];
  const push = (cond: boolean, label: string, impact: number) => { if (cond) factors.push({ label, impact }); };
  push(fit >= (th.high_fit ?? 65), `alto fit com o perfil ideal (${fit}/100)`, Math.round(fit * ow.fit));
  push(intent >= (th.high_intent ?? 65), `forte intencao de compra (${intent}/100)`, Math.round(intent * ow.intent));
  push(present.has("INTENT_PRICE"), "perguntou sobre preco", INTENT_WEIGHTS.INTENT_PRICE);
  push(present.has("INTENT_AVAILABILITY"), "perguntou sobre disponibilidade", INTENT_WEIGHTS.INTENT_AVAILABILITY);
  push(present.has("INTENT_PAYMENT"), "perguntou sobre pagamento", INTENT_WEIGHTS.INTENT_PAYMENT);
  push(present.has("PROBLEM_DETECTED"), "lead reconheceu um problema", INTENT_WEIGHTS.PROBLEM_DETECTED);
  push(present.has("NEED_DETECTED"), "lead declarou uma necessidade", INTENT_WEIGHTS.NEED_DETECTED);
  push(present.has("DIAGNOSIS_GAP"), "diagnostico da empresa indica necessidade", 10);
  push(momentumState.includes("RISING"), `interesse em alta (${momentumValue > 0 ? "+" : ""}${momentumValue})`, 10);
  push(patternMatch >= (th.pattern_match_high ?? 70), `comportamento semelhante a clientes convertidos (${patternMatch}%)`, Math.round(patternMatch * ow.pattern));
  push(compound.length > 0, `combinacao de sinais: ${compound.join(", ")}`, Math.round(compoundBonus));

  const isHot =
    opportunity >= (th.hot_opportunity ?? 70) &&
    (intent >= 50 || patternMatch >= (th.pattern_match_high ?? 70)) &&
    stage !== "DISQUALIFIED";
  const hotReason = isHot
    ? `${factors.slice(0, 3).map((f) => f.label).join("; ")}${riskFactors.length ? ` | risco: ${riskFactors[0].label}` : ""}`
    : null;

  // --- diff / auditoria ---
  const { data: prevProfile } = await sb
    .from("intel_lead_profiles")
    .select("*")
    .eq("owner_user_id", owner)
    .eq("phone_e164", rl.phone_e164)
    .maybeSingle();

  const features = {
    engagement, intent, quality, fit, momentum: momentumValue, risk, opportunity,
    pattern_match: patternMatch, loss_match: lossMatch, niche: crm?.category || null,
    region: crm?.city || null, avg_response_seconds: avgResp, inbound_7d: inb7,
    distinct_days: distinctDays, silence_days: Math.round(silenceDays), stage,
    signature,
  };

  const row = {
    owner_user_id: owner,
    phone_e164: rl.phone_e164,
    revenue_lead_id: rl.id,
    crm_lead_id: crm?.id ?? null,
    company_name: crm?.company_name || rl.name || null,
    niche: crm?.category || null,
    city: crm?.city || null,
    region: crm?.region || crm?.city || null,
    fit_score: fit,
    engagement_score: engagement,
    intent_score: intent,
    quality_score: quality,
    momentum_value: momentumValue,
    momentum_state: momentumState,
    risk_score: risk,
    opportunity_score: opportunity,
    pattern_match_score: patternMatch,
    pattern_matched_key: patternKey,
    loss_pattern_match_score: lossMatch,
    behaviors,
    compound_signals: compound,
    stage,
    next_best_action: nba,
    priority,
    is_hot: isHot,
    hot_reason: hotReason,
    factors,
    risk_factors: riskFactors,
    diagnosis_summary: crm?.ai_diagnosis ? String(crm.ai_diagnosis).slice(0, 800) : null,
    features,
    last_change: prevProfile
      ? {
          opportunity_before: prevProfile.opportunity_score,
          opportunity_after: opportunity,
          intent_before: prevProfile.intent_score,
          intent_after: intent,
          risk_before: prevProfile.risk_score,
          risk_after: risk,
          at: now.toISOString(),
        }
      : { created: true, at: now.toISOString() },
    engine_version: ENGINE_VERSION,
    computed_at: now.toISOString(),
  };

  await sb.from("intel_lead_profiles").upsert(row, { onConflict: "owner_user_id,phone_e164" });

  const audits: any[] = [];
  const dims: [string, number, number][] = [
    ["opportunity", Number(prevProfile?.opportunity_score ?? 0), opportunity],
    ["intent", Number(prevProfile?.intent_score ?? 0), intent],
    ["fit", Number(prevProfile?.fit_score ?? 0), fit],
    ["risk", Number(prevProfile?.risk_score ?? 0), risk],
    ["engagement", Number(prevProfile?.engagement_score ?? 0), engagement],
  ];
  for (const [dim, before, after] of dims) {
    if (Math.abs(after - before) >= 3 || !prevProfile) {
      audits.push({
        owner_user_id: owner, phone_e164: rl.phone_e164, dimension: dim,
        score_before: before, score_after: after,
        reason: factors.slice(0, 2).map((f) => f.label).join("; ") || "recalculo",
        signal_source: "intel-engine", engine_version: ENGINE_VERSION,
      });
    }
  }
  if (audits.length) await sb.from("intel_audit").insert(audits);

  return { success: true, profile: row };
}

// ---------------------------------------------------------------------------
// OUTCOMES + PATTERNS (aprendizado por conta)
// ---------------------------------------------------------------------------
async function signatureFor(sb: any, owner: string, phone: string | null, crmLeadId: string | null) {
  let prof: any = null;
  if (phone) {
    const { data } = await sb.from("intel_lead_profiles").select("*").eq("owner_user_id", owner).eq("phone_e164", phone).maybeSingle();
    prof = data;
  }
  if (!prof && crmLeadId) {
    const { data } = await sb.from("intel_lead_profiles").select("*").eq("owner_user_id", owner).eq("crm_lead_id", crmLeadId).maybeSingle();
    prof = data;
  }
  return prof;
}

async function recordOutcome(sb: any, body: any) {
  const owner = body.owner_user_id;
  const outcome = body.outcome as string; // CONVERTED | LOST | NO_CONVERSION
  const prof = await signatureFor(sb, owner, body.phone_e164 || null, body.crm_lead_id || null);
  const row = {
    owner_user_id: owner,
    phone_e164: body.phone_e164 || prof?.phone_e164 || null,
    crm_lead_id: body.crm_lead_id || prof?.crm_lead_id || null,
    revenue_lead_id: prof?.revenue_lead_id || null,
    deal_id: body.deal_id || null,
    outcome,
    ticket: body.ticket ?? null,
    days_to_close: body.days_to_close ?? null,
    niche: prof?.niche || body.niche || null,
    region: prof?.region || body.region || null,
    signature: (prof?.features?.signature as string[]) || [],
    features: prof?.features || {},
    predicted_opportunity: prof?.opportunity_score ?? null,
    predicted_pattern_match: prof?.pattern_match_score ?? null,
    occurred_at: body.occurred_at || new Date().toISOString(),
  };
  await sb.from("intel_outcomes").upsert(row, { onConflict: "owner_user_id,outcome,crm_lead_id,deal_id", ignoreDuplicates: false });
  return { success: true, outcome: row };
}

function combos(list: string[], size: number): string[][] {
  const res: string[][] = [];
  const rec = (start: number, acc: string[]) => {
    if (acc.length === size) { res.push([...acc]); return; }
    for (let i = start; i < list.length; i++) { acc.push(list[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return res;
}

async function recomputePatterns(sb: any, owner: string) {
  const { data: outcomes } = await sb
    .from("intel_outcomes")
    .select("outcome, signature, ticket, days_to_close, niche")
    .eq("owner_user_id", owner)
    .limit(5000);
  const list = outcomes || [];
  if (list.length < 3) return { success: true, patterns: 0, reason: "dados historicos insuficientes" };

  const stats = new Map<string, { sig: string[]; total: number; won: number; lost: number; ghost: number; ticket: number[]; days: number[] }>();
  for (const o of list) {
    const sig: string[] = (o.signature || []).filter((s: string) => CANONICAL.includes(s));
    if (!sig.length) continue;
    const cands = [...combos(sig, 2), ...combos(sig, 3)];
    for (const c of cands) {
      const key = c.slice().sort().join("+");
      const cur = stats.get(key) || { sig: c.slice().sort(), total: 0, won: 0, lost: 0, ghost: 0, ticket: [], days: [] };
      cur.total++;
      if (o.outcome === "CONVERTED") {
        cur.won++;
        if (o.ticket != null) cur.ticket.push(Number(o.ticket));
        if (o.days_to_close != null) cur.days.push(Number(o.days_to_close));
      } else if (o.outcome === "LOST") cur.lost++;
      else cur.ghost++;
      stats.set(key, cur);
    }
  }

  const rows: any[] = [];
  for (const [key, s] of stats) {
    if (s.total < 3) continue;
    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
    if (s.won > 0) rows.push({
      owner_user_id: owner, pattern_kind: "CONVERSION", pattern_key: key, signature: s.sig,
      sample_size: s.total, outcome_count: s.won, rate: s.won / s.total,
      avg_ticket: avg(s.ticket), avg_days_to_close: avg(s.days), computed_at: new Date().toISOString(),
    });
    if (s.lost > 0) rows.push({
      owner_user_id: owner, pattern_kind: "LOSS", pattern_key: key, signature: s.sig,
      sample_size: s.total, outcome_count: s.lost, rate: s.lost / s.total, computed_at: new Date().toISOString(),
    });
    if (s.ghost > 0) rows.push({
      owner_user_id: owner, pattern_kind: "GHOSTING", pattern_key: key, signature: s.sig,
      sample_size: s.total, outcome_count: s.ghost, rate: s.ghost / s.total, computed_at: new Date().toISOString(),
    });
  }
  if (rows.length) {
    await sb.from("intel_patterns").upsert(rows, { onConflict: "owner_user_id,pattern_kind,pattern_key" });
  }
  return { success: true, patterns: rows.length, outcomes: list.length };
}

// Backfill: transforma o historico ja existente (vendas ganhas + leads perdidos)
// em outcomes, sem inventar nada.
async function backfillOutcomes(sb: any, owner: string) {
  const { data: deals } = await sb
    .from("lead_deals")
    .select("id, lead_id, value, closed_at, created_at, status")
    .eq("owner_user_id", owner)
    .limit(2000);
  const { data: stages } = await sb
    .from("pipeline_stages")
    .select("id, name")
    .eq("user_id", owner);
  const lostStage = (stages || []).find((s: any) => /perdid/i.test(s.name || ""));
  const { data: leadsRows } = await sb
    .from("leads")
    .select("id, phone, category, city, pipeline_stage_id, created_at, prospected_at")
    .eq("user_id", owner)
    .limit(5000);
  const leadById = new Map((leadsRows || []).map((l: any) => [l.id, l]));

  let count = 0;
  for (const d of deals || []) {
    if (d.status === "cancelled") continue;
    const lead = leadById.get(d.lead_id);
    const days = d.closed_at && lead?.created_at
      ? Math.max(0, daysBetween(new Date(d.closed_at), new Date(lead.created_at)))
      : null;
    await recordOutcome(sb, {
      owner_user_id: owner, crm_lead_id: d.lead_id, deal_id: d.id, phone_e164: lead?.phone || null,
      outcome: "CONVERTED", ticket: d.value, days_to_close: days,
      niche: lead?.category, region: lead?.city, occurred_at: d.closed_at || d.created_at,
    });
    count++;
  }
  if (lostStage) {
    for (const l of (leadsRows || []).filter((x: any) => x.pipeline_stage_id === lostStage.id)) {
      await recordOutcome(sb, {
        owner_user_id: owner, crm_lead_id: l.id, phone_e164: l.phone, outcome: "LOST",
        niche: l.category, region: l.city,
      });
      count++;
    }
  }
  const patterns = await recomputePatterns(sb, owner);
  return { success: true, outcomes: count, patterns };
}

// Contexto pronto para o Wian (nunca recalcula nada, so le a inteligencia)
async function getContext(sb: any, owner: string, limit = 10, phone?: string) {
  if (phone) {
    const sfx = suffix8(phone);
    const { data: all } = await sb.from("intel_lead_profiles").select("*").eq("owner_user_id", owner).limit(3000);
    const prof = (all || []).find((p: any) => suffix8(p.phone_e164) === sfx) || null;
    if (!prof) return { profile: null };
    const { data: audit } = await sb
      .from("intel_audit").select("*").eq("owner_user_id", owner).eq("phone_e164", prof.phone_e164)
      .order("created_at", { ascending: false }).limit(20);
    const { data: sigs } = await sb
      .from("intel_signals").select("signal_type, confidence, occurred_at, source")
      .eq("owner_user_id", owner).eq("phone_e164", prof.phone_e164)
      .order("occurred_at", { ascending: false }).limit(50);
    return { profile: prof, recent_changes: audit || [], signals: sigs || [] };
  }
  const { data: top } = await sb
    .from("intel_lead_profiles").select("*").eq("owner_user_id", owner)
    .order("opportunity_score", { ascending: false }).limit(limit);
  const { data: patterns } = await sb
    .from("intel_patterns").select("pattern_kind, pattern_key, signature, sample_size, outcome_count, rate, avg_ticket, avg_days_to_close")
    .eq("owner_user_id", owner).order("rate", { ascending: false }).limit(20);
  return { top_opportunities: top || [], patterns: patterns || [] };
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json();
    const action = body.action as string;

    // resolve o dono da conta a partir do JWT quando chamado pelo app
    let owner: string | null = body.owner_user_id || null;
    if (!owner) {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (token) {
        const { data } = await sb.auth.getUser(token);
        if (data?.user) {
          const { data: prof } = await sb.from("profiles").select("id, parent_owner_id").eq("id", data.user.id).maybeSingle();
          owner = prof?.parent_owner_id || data.user.id;
        }
      }
    }
    if (!owner) return json({ error: "owner_user_id required" }, 400);

    switch (action) {
      case "compute_profile":
        return json(await computeProfile(sb, owner, body.phone_e164));
      case "record_outcome":
        return json(await recordOutcome(sb, { ...body, owner_user_id: owner }));
      case "recompute_patterns":
        return json(await recomputePatterns(sb, owner));
      case "backfill_outcomes":
        return json(await backfillOutcomes(sb, owner));
      case "get_context":
        return json(await getContext(sb, owner, body.limit || 10, body.phone_e164));
      case "recompute_account": {
        const { data: rls } = await sb
          .from("revenue_leads").select("phone_e164, last_activity_at")
          .or(`owner_user_id.eq.${owner},user_id.eq.${owner}`)
          .order("last_activity_at", { ascending: false })
          .limit(body.limit || 200);
        let done = 0;
        for (const r of rls || []) {
          try { await computeProfile(sb, owner, r.phone_e164); done++; } catch (_e) { /* segue */ }
        }
        return json({ success: true, processed: done });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("[intel-engine]", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
