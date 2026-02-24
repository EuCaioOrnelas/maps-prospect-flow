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
      direction, // "inbound" or "outbound"
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

      // 4. Generate events
      const eventsToCreate: any[] = [];
      let scoreChange = 0;

      if (direction === "inbound") {
        // INBOUND_MESSAGE
        const inboundRule = rulesMap.get("INBOUND_MESSAGE");
        if (inboundRule) {
          eventsToCreate.push({
            user_id,
            lead_id: leadId,
            number_instance_id,
            event_type: "INBOUND_MESSAGE",
            event_value: inboundRule.points,
            event_meta: {},
          });
          scoreChange += inboundRule.points;
        }

        // Detect intents
        if (message_content) {
          for (const [intentKey, pattern] of Object.entries(INTENT_PATTERNS)) {
            if (pattern.test(message_content)) {
              const rule = rulesMap.get(intentKey);
              const points = rule?.points || 0;
              eventsToCreate.push({
                user_id,
                lead_id: leadId,
                number_instance_id,
                event_type: intentKey,
                event_value: points,
                event_meta: {
                  matched_text: message_content.substring(0, 200),
                },
              });
              scoreChange += points;

              // INTENT_NEGATIVE → mark at risk
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

        // Check SLA: time since last outbound
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
                eventsToCreate.push({
                  user_id,
                  lead_id: leadId,
                  number_instance_id,
                  event_type: "OUTBOUND_REPLY_RECEIVED_WITHIN_1H",
                  event_value: rule.points,
                  event_meta: { response_time_minutes: Math.round(diffMin) },
                });
                scoreChange += rule.points;
              }
            }
          }
        }
      }

      // 5. Insert events
      if (eventsToCreate.length > 0) {
        await supabase.from("revenue_events").insert(eventsToCreate);
      }

      // 6. Update score
      const newScore = Math.max(0, Math.min(1000, previousScore + scoreChange));
      const newBucket = scoreToBucket(newScore);

      // Update risk state
      let riskState = existingLead?.risk_state || "OK";
      let riskReason = existingLead?.risk_reason || null;

      if (direction === "inbound" && riskState !== "AT_RISK") {
        // Activity resets cooling
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

      // Load settings
      const { data: settings } = await supabase
        .from("revenue_settings")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      const decayRate = settings?.cooldown_decay_per_day || 0.06;

      // Get all leads
      const { data: leads } = await supabase
        .from("revenue_leads")
        .select("id, score_total, last_activity_at, status_bucket, risk_state")
        .eq("user_id", user_id);

      let updated = 0;
      const now = Date.now();

      for (const lead of leads || []) {
        const lastActivity = new Date(lead.last_activity_at).getTime();
        const daysSince = (now - lastActivity) / (1000 * 60 * 60 * 24);

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

      return new Response(
        JSON.stringify({ success: true, leads_updated: updated }),
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
