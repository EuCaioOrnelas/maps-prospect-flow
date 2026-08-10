import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Inline E.164 formatter para Meta Cloud API (sem "+"). Suporta global (BR + intl).
function formatPhoneForMeta(phone: string): string {
  const raw = String(phone || "").trim();
  if (!raw) return "";
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  let explicitIntl = hasPlus;
  if (!hasPlus && digits.startsWith("00") && digits.length > 4) {
    digits = digits.slice(2);
    explicitIntl = true;
  }
  if (!explicitIntl && digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
    digits = "55" + digits;
  }
  if (digits.startsWith("55") && digits.length === 12) {
    const ddd = parseInt(digits.slice(2, 4), 10);
    if (ddd >= 11 && ddd <= 99) {
      digits = digits.slice(0, 4) + "9" + digits.slice(4);
    }
  }
  if (digits.length < 10 || digits.length > 15) return "";
  return digits;
}

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

    // "scheduled" é o estado reservado pelo webhook (claim atômico); "pending" cobre
    // chamadas manuais. Qualquer outro estado significa que o follow-up já saiu.
    const pendingStates = ["pending", "scheduled"];
    if (!lead || !pendingStates.includes(String(lead.follow_up_status)) || !lead.follow_up_message) {
      return new Response(JSON.stringify({ success: false, error: "Follow-up não pendente" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Claim de envio: garante que apenas uma execução dispare a mensagem.
    const { data: claimed } = await supabase
      .from("leads")
      .update({ follow_up_status: "sending" } as any)
      .eq("id", leadId)
      .in("follow_up_status", pendingStates)
      .select("id");
    if (!claimed || claimed.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Follow-up já em envio" }), {
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

    // Normalize phone (E.164 global, sem "+")
    const phone = formatPhoneForMeta(lead.phone || "");
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "Telefone do lead inválido (E.164)." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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
