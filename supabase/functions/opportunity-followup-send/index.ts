import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sends the FOLLOW-UP message for a lead. Triggered by meta-webhook after
// detecting the contact's reply, with the configured delay.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ success: false, error: "leadId obrigatório" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("id, user_id, phone, follow_up_message, follow_up_status, whatsapp_number_id")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead || lead.follow_up_status !== "pending" || !lead.follow_up_message) {
      return new Response(JSON.stringify({ success: false, error: "Follow-up não pendente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find the active Meta connection for this user
    const { data: conn } = await supabase
      .from("user_waba_connections")
      .select("id, phone_number_id, access_token")
      .eq("user_id", lead.user_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!conn?.phone_number_id || !conn?.access_token) {
      await supabase
        .from("leads")
        .update({ follow_up_status: "failed" } as any)
        .eq("id", leadId);
      return new Response(JSON.stringify({ success: false, error: "Sem conexão Meta ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Normalize BR phone to E.164 (must include DDI 55 for Meta Cloud API)
    const normalizeBrMobile = (raw: string) => {
      let p = (raw || "").replace(/\D/g, "");
      if (p.startsWith("55") && (p.length === 12 || p.length === 13)) return p;
      if (p.length === 10 || p.length === 11) return `55${p}`;
      return p;
    };
    const phone = normalizeBrMobile(lead.phone || "");

    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: lead.follow_up_message },
        }),
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      console.error("[opportunity-followup-send] Meta error:", data);
      await supabase
        .from("leads")
        .update({ follow_up_status: "failed" } as any)
        .eq("id", leadId);
      return new Response(JSON.stringify({ success: false, error: data?.error?.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        follow_up_status: "sent",
        follow_up_sent_at: nowIso,
        last_message_sent: lead.follow_up_message,
        last_message_sent_at: nowIso,
        whatsapp_status: "in_conversation",
      } as any)
      .eq("id", leadId);

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: lead.user_id,
      owner_user_id: lead.user_id,
      activity_type: "message_sent",
      description: "Follow-up automático de campanha enviado",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[opportunity-followup-send] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
