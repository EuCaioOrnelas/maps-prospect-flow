// chat-auto-reply: triggered by DB trigger on inbound chat_messages.
// Sends an off-hours auto-reply ONLY if:
//  - auto-reply is enabled for the connection
//  - the current local time is OUTSIDE the configured business window/weekdays
//  - the WABA connection has NO active automation flows
//  - (optional) once_per_day was not already used for this conversation today
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nowInTz(tz: string) {
  // Returns {weekday: 0..6 (Sun=0), minutes: 0..1439} in tz
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wdMap[parts.find((p) => p.type === "weekday")?.value ?? "Mon"] ?? 1;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { weekday, minutes: hour * 60 + minute };
}

function toMinutes(t: string) {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { conversation_id } = await req.json();
    if (!conversation_id) return new Response(JSON.stringify({ skipped: "no conversation" }), { headers: corsHeaders });

    const { data: conv } = await supabase
      .from("chat_conversations")
      .select("id, user_id, waba_connection_id, contact_phone, contact_name, last_auto_reply_at")
      .eq("id", conversation_id)
      .single();
    if (!conv) return new Response(JSON.stringify({ skipped: "no conv" }), { headers: corsHeaders });

    // Load auto-reply config
    const { data: cfg } = await supabase
      .from("chat_auto_replies")
      .select("*")
      .eq("waba_connection_id", conv.waba_connection_id)
      .maybeSingle();
    if (!cfg || !cfg.enabled) return new Response(JSON.stringify({ skipped: "disabled" }), { headers: corsHeaders });

    // Check active automation flows on this WABA connection (text field in flows)
    const { data: activeFlows } = await supabase
      .from("wa_automation_flows")
      .select("id")
      .eq("user_id", conv.user_id)
      .eq("waba_connection_id", String(conv.waba_connection_id))
      .eq("status", "active")
      .limit(1);
    if (activeFlows && activeFlows.length > 0) {
      return new Response(JSON.stringify({ skipped: "active flows present" }), { headers: corsHeaders });
    }

    // Is now OUTSIDE the business window?
    const { weekday, minutes } = nowInTz(cfg.timezone || "America/Sao_Paulo");
    const start = toMinutes(cfg.start_time);
    const end = toMinutes(cfg.end_time);
    const weekdays: number[] = cfg.weekdays || [1, 2, 3, 4, 5];
    const insideWindow = weekdays.includes(weekday) && minutes >= start && minutes < end;
    if (insideWindow) {
      return new Response(JSON.stringify({ skipped: "inside business hours" }), { headers: corsHeaders });
    }

    // Once per day dedupe
    if (cfg.once_per_day && conv.last_auto_reply_at) {
      const last = new Date(conv.last_auto_reply_at).getTime();
      if (Date.now() - last < 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({ skipped: "already sent today" }), { headers: corsHeaders });
      }
    }

    // Get connection credentials
    const { data: conn } = await supabase
      .from("user_waba_connections")
      .select("access_token, phone_number_id, status")
      .eq("id", conv.waba_connection_id)
      .single();
    if (!conn?.access_token || !conn.phone_number_id) {
      return new Response(JSON.stringify({ skipped: "connection missing" }), { headers: corsHeaders });
    }

    // Send via Meta Cloud API
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conv.contact_phone,
      type: "text",
      text: { body: cfg.message },
    };
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const metaJson = await metaRes.json();
    const wabaMsgId = metaJson?.messages?.[0]?.id;

    // Persist outbound message
    await supabase.from("chat_messages").insert({
      conversation_id: conv.id,
      user_id: conv.user_id,
      owner_user_id: conv.user_id,
      waba_message_id: wabaMsgId ?? null,
      direction: "outbound",
      message_type: "text",
      content: cfg.message,
      status: metaRes.ok ? "sent" : "failed",
      status_updated_at: new Date().toISOString(),
      metadata: { auto_reply: true },
    });

    await supabase
      .from("chat_conversations")
      .update({
        last_auto_reply_at: new Date().toISOString(),
        last_message_text: cfg.message,
        last_message_at: new Date().toISOString(),
        last_message_direction: "outbound",
        last_message_type: "text",
      })
      .eq("id", conv.id);

    return new Response(JSON.stringify({ ok: true, meta: metaJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[chat-auto-reply] error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
