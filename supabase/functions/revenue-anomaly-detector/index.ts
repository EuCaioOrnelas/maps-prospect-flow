import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get events for current and previous periods
    const { data: currentEvents } = await supabase
      .from("revenue_events")
      .select("event_type, created_at")
      .eq("user_id", user_id)
      .gte("created_at", sevenDaysAgo.toISOString());

    const { data: previousEvents } = await supabase
      .from("revenue_events")
      .select("event_type, created_at")
      .eq("user_id", user_id)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString());

    // Get current leads
    const { data: leads } = await supabase
      .from("revenue_leads")
      .select("status_bucket, risk_state, last_activity_at")
      .eq("user_id", user_id);

    // Get conversations
    const { data: convs } = await supabase
      .from("revenue_conversations")
      .select("avg_response_time_seconds, unreplied_inbound_count")
      .eq("user_id", user_id);

    const allLeads = leads || [];
    const allConvs = convs || [];
    const curr = currentEvents || [];
    const prev = previousEvents || [];

    const alertsToCreate: any[] = [];
    const THRESHOLD = 30; // 30% variation triggers alert

    // Metric 1: Intent events
    const currIntents = curr.filter((e) => e.event_type.startsWith("INTENT_") && !["INTENT_OBJECTION", "INTENT_NEGATIVE"].includes(e.event_type)).length;
    const prevIntents = prev.filter((e) => e.event_type.startsWith("INTENT_") && !["INTENT_OBJECTION", "INTENT_NEGATIVE"].includes(e.event_type)).length;
    if (prevIntents > 0) {
      const variation = ((currIntents - prevIntents) / prevIntents) * 100;
      if (variation < -THRESHOLD) {
        alertsToCreate.push({
          user_id,
          alert_type: "anomaly",
          alert_message: "Queda significativa de sinais de intenção",
          alert_severity: "warning",
          metric_name: "Sinais de Intenção",
          current_value: currIntents,
          previous_value: prevIntents,
          variation_pct: Math.round(variation),
        });
      }
    }

    // Metric 2: Ignored leads (unreplied)
    const totalUnreplied = allConvs.reduce((sum: number, c: any) => sum + (c.unreplied_inbound_count || 0), 0);
    const totalConvs = allConvs.length || 1;
    const ignoredRate = (totalUnreplied / totalConvs) * 100;

    // Compare with a baseline of 20% (arbitrary but reasonable)
    if (ignoredRate > 40) {
      alertsToCreate.push({
        user_id,
        alert_type: "anomaly",
        alert_message: "Aumento de leads ignorados sem resposta",
        alert_severity: ignoredRate > 60 ? "critical" : "warning",
        metric_name: "Taxa de Ignorados",
        current_value: Math.round(ignoredRate),
        previous_value: 20,
        variation_pct: Math.round(ignoredRate - 20),
      });
    }

    // Metric 3: Response time
    const responseTimes = allConvs.filter((c: any) => c.avg_response_time_seconds > 0).map((c: any) => c.avg_response_time_seconds);
    if (responseTimes.length > 0) {
      const avgResponseMin = responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length / 60;
      if (avgResponseMin > 30) {
        alertsToCreate.push({
          user_id,
          alert_type: "anomaly",
          alert_message: "Tempo médio de resposta acima de 30 minutos",
          alert_severity: avgResponseMin > 60 ? "critical" : "warning",
          metric_name: "Tempo Médio de Resposta",
          current_value: Math.round(avgResponseMin),
          previous_value: 5,
          variation_pct: Math.round(((avgResponseMin - 5) / 5) * 100),
        });
      }
    }

    // Metric 4: Cooling leads spike
    const coolingLeads = allLeads.filter((l: any) => l.risk_state === "COOLING" || l.risk_state === "AT_RISK").length;
    const coolingPct = allLeads.length > 0 ? (coolingLeads / allLeads.length) * 100 : 0;
    if (coolingPct > 50) {
      alertsToCreate.push({
        user_id,
        alert_type: "anomaly",
        alert_message: "Mais de 50% dos leads estão esfriando ou em risco",
        alert_severity: "critical",
        metric_name: "Leads em Risco",
        current_value: Math.round(coolingPct),
        previous_value: 20,
        variation_pct: Math.round(coolingPct - 20),
      });
    }

    // Insert new alerts (avoid duplicates within 24h)
    let alertsCreated = 0;
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    for (const alert of alertsToCreate) {
      // Check if similar alert exists in last 24h
      const { data: existing } = await supabase
        .from("revenue_alerts")
        .select("id")
        .eq("user_id", user_id)
        .eq("metric_name", alert.metric_name)
        .gte("created_at", oneDayAgo.toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("revenue_alerts").insert(alert);
        alertsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_evaluated: alertsToCreate.length,
        alerts_created: alertsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Anomaly detector error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
