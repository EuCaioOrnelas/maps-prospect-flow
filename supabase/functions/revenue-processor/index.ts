import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Intent detection patterns
const INTENT_PATTERNS: Record<string, RegExp> = {
  INTENT_PRICE: /\b(pre[cç]o|valor|quanto custa|or[cç]amento|quanto [eé])\b/i,
  INTENT_BUY_NOW: /\b(quero fechar|fechar hoje|pode mandar contrato|vou fechar|quero comprar|fecha)\b/i,
  INTENT_AVAILABILITY: /\b(tem vaga|quando come[cç]a|agenda|dispon[ií]vel|disponibilidade)\b/i,
  INTENT_PAYMENT: /\b(pix|cart[aã]o|boleto|parcelar|pagamento|parcela)\b/i,
  INTENT_PROPOSAL: /\b(proposta|cota[cç][aã]o|envia|pdf|apresenta[cç][aã]o)\b/i,
  INTENT_URGENT: /\b(urgente|pra hoje|agora|imediato|preciso j[aá])\b/i,
  INTENT_OBJECTION: /\b(caro|muito caro|n[aã]o tenho dinheiro|depois vejo|vou pensar)\b/i,
  INTENT_NEGATIVE: /\b(n[aã]o quero|pare|n[aã]o me chama|sair|cancelar|bloquear)\b/i,
};

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
  INTENT_NEGATIVE: "penalty",
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
        await supabase
          .from("revenue_leads")
          .update({
            last_activity_at: new Date().toISOString(),
            name: lead_name || existingLead.name,
          })
          .eq("id", leadId);
      } else {
        const { data: newLead, error: insertErr } = await supabase
          .from("revenue_leads")
          .insert({
            user_id,
            phone_e164,
            name: lead_name || null,
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

      if (direction === "inbound") {
        const inboundRule = rulesMap.get("INBOUND_MESSAGE");
        if (inboundRule) {
          addEvent("INBOUND_MESSAGE", inboundRule.points);
        }

        // Detect intents
        if (message_content) {
          for (const [intentKey, pattern] of Object.entries(INTENT_PATTERNS)) {
            if (pattern.test(message_content)) {
              const rule = rulesMap.get(intentKey);
              const points = rule?.points || 0;
              addEvent(intentKey, points, { matched_text: message_content.substring(0, 200) });

              if (intentKey === "INTENT_NEGATIVE") {
                await supabase
                  .from("revenue_leads")
                  .update({
                    risk_state: "AT_RISK",
                    risk_reason: "Lead sinalizou desinteresse ou opt-out",
                    tags: existingLead
                      ? [...(existingLead.tags || []), "do_not_contact"]
                      : ["do_not_contact"],
                  })
                  .eq("id", leadId);
              }
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

        // Link event IDs to score logs
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

      // 7. Update score
      const newScore = Math.max(0, Math.min(1000, previousScore + scoreChange));
      const newBucket = scoreToBucket(newScore);

      let riskState = existingLead?.risk_state || "OK";
      let riskReason = existingLead?.risk_reason || null;

      if (direction === "inbound" && riskState !== "AT_RISK") {
        riskState = "OK";
        riskReason = null;
      }

      await supabase
        .from("revenue_leads")
        .update({
          score_total: newScore,
          score_last_calc_at: new Date().toISOString(),
          status_bucket: newBucket,
          risk_state: riskState,
          risk_reason: riskReason,
        })
        .eq("id", leadId);

      return new Response(
        JSON.stringify({
          success: true,
          lead_id: leadId,
          score: newScore,
          bucket: newBucket,
          events_created: eventsToCreate.length,
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

        // Create daily snapshot for all leads
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

      // Upsert snapshots
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
