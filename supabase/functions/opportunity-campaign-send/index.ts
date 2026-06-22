import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sends the INITIAL message via Meta Cloud API (free-form text) and persists
// the follow-up so it will be auto-sent when the contact replies.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      leadId,
      userId,
      initialMessage,
      followUpMessage,
      delaySeconds,
      connectionId,
      templateId,
    } = body;

    if (!leadId || !userId || !initialMessage || !connectionId) {
      return new Response(JSON.stringify({ success: false, error: "Parâmetros obrigatórios ausentes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get lead phone
    const { data: lead } = await supabase
      .from("leads")
      .select("id, phone, company_name, contact_name, whatsapp_status")
      .eq("id", leadId)
      .maybeSingle();

    if (!lead) {
      return new Response(JSON.stringify({ success: false, error: "Lead não encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if ((lead as any).whatsapp_status === "not_whatsapp") {
      return new Response(
        JSON.stringify({ success: false, error: "Número marcado como não-WhatsApp (Meta 131026). Disparo bloqueado." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get WABA connection
    const { data: conn } = await supabase
      .from("user_waba_connections")
      .select("id, phone_number_id, access_token, status")
      .eq("id", connectionId)
      .maybeSingle();

    if (!conn || !conn.phone_number_id || !conn.access_token) {
      return new Response(JSON.stringify({ success: false, error: "Conexão Meta inválida" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Normalize phone — Meta requires E.164 without "+". BR numbers MUST include DDI 55.
    const normalizeBrMobile = (raw: string) => {
      let p = (raw || "").replace(/\D/g, "");
      if (p.startsWith("55") && (p.length === 12 || p.length === 13)) return p;
      if (p.length === 10 || p.length === 11) return `55${p}`;
      return p;
    };
    const phone = normalizeBrMobile(lead.phone || "");

    // Send free-form text via Meta Cloud API
    const sendResp = await fetch(
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
          text: { body: initialMessage },
        }),
      }
    );

    const sendData = await sendResp.json();
    if (!sendResp.ok) {
      console.error("[opportunity-campaign-send] Meta error:", sendData);
      return new Response(
        JSON.stringify({
          success: false,
          error: sendData?.error?.message || "Erro ao enviar via Meta",
          meta_error: sendData?.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Persist on lead — initial sent + follow-up pending
    const nowIso = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        first_message_sent: true,
        first_message_sent_at: nowIso,
        last_message_sent: initialMessage,
        last_message_sent_at: nowIso,
        whatsapp_status: "message_sent",
        follow_up_message: followUpMessage || null,
        follow_up_delay_seconds: delaySeconds || 90,
        follow_up_status: followUpMessage ? "pending" : "none",
        initial_template_id: templateId || null,
      } as any)
      .eq("id", leadId);

    // Log activity
    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      user_id: userId,
      owner_user_id: userId,
      activity_type: "message_sent",
      description: `Campanha de oportunidade iniciada via Meta Cloud API`,
    });

    return new Response(
      JSON.stringify({ success: true, message_id: sendData?.messages?.[0]?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("[opportunity-campaign-send] error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
