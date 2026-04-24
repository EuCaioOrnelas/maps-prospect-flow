import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const { action, user_id, event_name, metadata, source } = body;

    if (action === "track_event") {
      return await trackEvent(supabase, user_id, event_name, metadata, source);
    } else if (action === "recalculate") {
      return await recalculateUser(supabase, user_id);
    } else if (action === "recalculate_all") {
      return await recalculateAll(supabase);
    } else if (action === "get_dashboard") {
      return await getDashboard(supabase);
    } else if (action === "get_user_detail") {
      return await getUserDetail(supabase, user_id);
    } else if (action === "get_ranking") {
      return await getRanking(supabase, body.limit || 50, body.sort_by || "total_score");
    } else {
      return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("Score processor error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return json({ error: errorMessage }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ========== TRACK EVENT ==========
async function trackEvent(supabase: any, userId: string, eventName: string, metadata: any = {}, source = "system") {
  // 1. Get rule
  const { data: rule, error: ruleError } = await supabase
    .from("score_rules")
    .select("*")
    .eq("event_name", eventName)
    .eq("is_active", true)
    .single();

  if (ruleError || !rule) {
    console.log(`[score-processor] Skipping event "${eventName}": ${ruleError?.message || "no active rule"}`);
    return json({ skipped: true, reason: "No active rule", event: eventName });
  }

  // 2. Check rate limit
  if (rule.max_applications_per_period && rule.period_type) {
    const periodStart = getPeriodStart(rule.period_type);
    const { count } = await supabase
      .from("user_score_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_name", eventName)
      .gte("event_occurred_at", periodStart);

    if ((count || 0) >= rule.max_applications_per_period) {
      return json({ skipped: true, reason: "Rate limit reached", event: eventName });
    }
  }

  // 3. Get decay multiplier
  const decayMultiplier = rule.apply_decay ? 1.0 : 1.0; // For new events, decay is 1.0
  const adjustedPoints = rule.is_negative ? -Math.abs(rule.points) : rule.points;

  // 4. Insert event
  await supabase.from("user_score_events").insert({
    user_id: userId,
    event_name: eventName,
    event_category: rule.category,
    base_points: rule.points,
    decay_multiplier: decayMultiplier,
    adjusted_points: adjustedPoints,
    metadata,
    source,
  });

  // 5. Recalculate user score
  const result = await recalculateUser(supabase, userId);
  return result;
}

// ========== RECALCULATE USER ==========
async function recalculateUser(supabase: any, userId: string) {
  // Get decay config
  const { data: decayConfig } = await supabase
    .from("score_decay_config")
    .select("*")
    .order("min_days", { ascending: true });

  // Get all events for user
  const { data: events } = await supabase
    .from("user_score_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_occurred_at", { ascending: false });

  if (!events || events.length === 0) {
    // No events, set score to 0
    await upsertScore(supabase, userId, {
      activation_score: 0, engagement_score: 0, value_score: 0,
      purchase_intent_score: 0, churn_risk_score: 0,
      raw_score: 0, normalized_score: 0, total_score: 0,
      score_label: "Frio", score_band: "0-20", trend: "stable",
    });
    return json({ success: true, total_score: 0 });
  }

  const now = new Date();
  const categories: Record<string, number> = {
    activation: 0, engagement: 0, value: 0, purchase_intent: 0, churn_risk: 0,
  };

  for (const event of events) {
    const eventDate = new Date(event.event_occurred_at);
    const daysDiff = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let multiplier = 0.3; // default for very old
    if (decayConfig) {
      for (const dc of decayConfig) {
        if (daysDiff >= dc.min_days && daysDiff <= dc.max_days) {
          multiplier = Number(dc.multiplier);
          break;
        }
      }
    }

    const decayedPoints = Number(event.base_points) * multiplier;
    const cat = event.event_category;
    if (cat in categories) {
      if (event.adjusted_points < 0) {
        categories[cat] += -Math.abs(decayedPoints);
      } else {
        categories[cat] += decayedPoints;
      }
    }
  }

  // Ensure no negative category scores (except churn_risk which is subtracted)
  const activation = Math.max(0, categories.activation);
  const engagement = Math.max(0, categories.engagement);
  const value = Math.max(0, categories.value);
  const purchaseIntent = Math.max(0, categories.purchase_intent);
  const churnRisk = Math.max(0, Math.abs(categories.churn_risk));

  // Raw score = sum of positives minus churn_risk
  const rawScore = activation + engagement + value + purchaseIntent - churnRisk;

  // Normalize to 0-100
  // Max theoretical positive: ~30 activation + ~20 engagement + ~60 value + ~30 purchase = 140
  // We use a dynamic normalization based on a reasonable maximum
  const maxExpected = 120; // Reasonable max for active user
  const normalized = Math.min(100, Math.max(0, (rawScore / maxExpected) * 100));
  const totalScore = Math.round(normalized * 100) / 100;

  const { label, band } = getClassification(totalScore);

  // Get previous score for trend
  const { data: prevScore } = await supabase
    .from("user_scores")
    .select("total_score")
    .eq("user_id", userId)
    .single();

  const previousTotal = prevScore?.total_score || 0;
  const diff = totalScore - Number(previousTotal);
  const trend = diff > 2 ? "rising" : diff < -2 ? "falling" : "stable";

  const scoreData = {
    activation_score: Math.round(activation * 100) / 100,
    engagement_score: Math.round(engagement * 100) / 100,
    value_score: Math.round(value * 100) / 100,
    purchase_intent_score: Math.round(purchaseIntent * 100) / 100,
    churn_risk_score: Math.round(churnRisk * 100) / 100,
    raw_score: Math.round(rawScore * 100) / 100,
    normalized_score: totalScore,
    total_score: totalScore,
    score_label: label,
    score_band: band,
    trend,
    previous_score: Number(previousTotal),
    last_event_at: events[0]?.event_occurred_at,
    last_calculated_at: new Date().toISOString(),
  };

  await upsertScore(supabase, userId, scoreData);

  // Save history
  await supabase.from("user_score_history").insert({
    user_id: userId,
    previous_score: Number(previousTotal),
    new_score: totalScore,
    variation: Math.round(diff * 100) / 100,
    reason: "recalculation",
    snapshot: scoreData,
  });

  return json({ success: true, ...scoreData });
}

// ========== RECALCULATE ALL ==========
async function recalculateAll(supabase: any) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .limit(1000);

  let processed = 0;
  for (const p of (profiles || [])) {
    await recalculateUser(supabase, p.id);
    processed++;
  }

  return json({ success: true, processed });
}

// ========== DASHBOARD ==========
async function getDashboard(supabase: any) {
  const { data: scores } = await supabase
    .from("user_scores")
    .select("total_score, score_label, trend, activation_score, engagement_score, value_score, purchase_intent_score, churn_risk_score");

  if (!scores || scores.length === 0) {
    return json({
      total_users: 0, avg_score: 0, median_score: 0,
      by_band: {}, high_score: 0, at_risk: 0, ready_upgrade: 0,
      trends: { rising: 0, stable: 0, falling: 0 },
    });
  }

  const totals = scores.map((s: any) => Number(s.total_score)).sort((a: number, b: number) => a - b);
  const avg = totals.reduce((a: number, b: number) => a + b, 0) / totals.length;
  const median = totals[Math.floor(totals.length / 2)];

  const byBand: Record<string, number> = {};
  const trends = { rising: 0, stable: 0, falling: 0 };
  let highScore = 0, atRisk = 0, readyUpgrade = 0;

  for (const s of scores) {
    const label = s.score_label || "Frio";
    byBand[label] = (byBand[label] || 0) + 1;
    if (s.trend === "rising") trends.rising++;
    else if (s.trend === "falling") trends.falling++;
    else trends.stable++;
    if (Number(s.total_score) >= 61) highScore++;
    if (Number(s.churn_risk_score) > 5) atRisk++;
    if (Number(s.total_score) >= 81) readyUpgrade++;
  }

  // Top events
  const { data: topPositive } = await supabase
    .from("user_score_events")
    .select("event_name")
    .gt("adjusted_points", 0)
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: topNegative } = await supabase
    .from("user_score_events")
    .select("event_name")
    .lt("adjusted_points", 0)
    .order("created_at", { ascending: false })
    .limit(500);

  const countEvents = (events: any[]) => {
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.event_name] = (counts[e.event_name] || 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  };

  return json({
    total_users: scores.length,
    avg_score: Math.round(avg * 100) / 100,
    median_score: Math.round(median * 100) / 100,
    by_band: byBand,
    high_score: highScore,
    at_risk: atRisk,
    ready_upgrade: readyUpgrade,
    trends,
    top_positive_events: countEvents(topPositive || []),
    top_negative_events: countEvents(topNegative || []),
  });
}

// ========== USER DETAIL ==========
async function getUserDetail(supabase: any, userId: string) {
  const { data: score } = await supabase
    .from("user_scores")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: events } = await supabase
    .from("user_score_events")
    .select("*")
    .eq("user_id", userId)
    .order("event_occurred_at", { ascending: false })
    .limit(100);

  const { data: history } = await supabase
    .from("user_score_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, plan, created_at")
    .eq("id", userId)
    .single();

  // Generate insights
  const insights: string[] = [];
  if (score) {
    const ts = Number(score.total_score);
    if (ts >= 81) insights.push("Usuário com alto engajamento, pronto para upgrade");
    else if (ts >= 61) insights.push("Usuário de alto valor, potencial para upgrade");
    else if (ts >= 41) insights.push("Usuário engajado, trabalhar intenção de compra");
    else if (ts >= 21) insights.push("Usuário com baixo engajamento, precisa ativação");
    else insights.push("Usuário frio, risco de churn elevado");

    if (Number(score.purchase_intent_score) > 10 && Number(score.value_score) < 5) {
      insights.push("Forte intenção de compra, mas baixo uso de features premium");
    }
    if (Number(score.value_score) > 15 && Number(score.purchase_intent_score) < 3) {
      insights.push("Alto uso de features, mas sem sinais de compra — oportunidade comercial");
    }
    if (Number(score.churn_risk_score) > 8) {
      insights.push("⚠️ Risco alto de churn — ação imediata recomendada");
    }
    if (score.trend === "falling") {
      insights.push("📉 Score em queda — possível desengajamento");
    }
    if (score.trend === "rising") {
      insights.push("📈 Score subindo — bom momento para ação comercial");
    }
  }

  return json({ score, events, history, profile, insights });
}

// ========== RANKING ==========
async function getRanking(supabase: any, limit: number, sortBy: string) {
  const validSorts: Record<string, string> = {
    total_score: "total_score",
    purchase_intent: "purchase_intent_score",
    churn_risk: "churn_risk_score",
    activation: "activation_score",
    engagement: "engagement_score",
    value: "value_score",
  };

  const orderCol = validSorts[sortBy] || "total_score";

  const { data } = await supabase
    .from("user_scores")
    .select("*, profiles(name, email, plan)")
    .order(orderCol, { ascending: sortBy === "churn_risk" ? true : false })
    .limit(limit);

  return json({ ranking: data || [] });
}

// ========== HELPERS ==========
function getPeriodStart(periodType: string): string {
  const now = new Date();
  switch (periodType) {
    case "day": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "week": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "month": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  }
}

function getClassification(score: number): { label: string; band: string } {
  if (score >= 81) return { label: "Pronto para upgrade", band: "81-100" };
  if (score >= 61) return { label: "Alto valor", band: "61-80" };
  if (score >= 41) return { label: "Engajado", band: "41-60" };
  if (score >= 21) return { label: "Baixo engajamento", band: "21-40" };
  return { label: "Frio", band: "0-20" };
}

async function upsertScore(supabase: any, userId: string, data: any) {
  const { data: existing } = await supabase
    .from("user_scores")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase.from("user_scores").update(data).eq("user_id", userId);
  } else {
    await supabase.from("user_scores").insert({ user_id: userId, ...data });
  }
}
