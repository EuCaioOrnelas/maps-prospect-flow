// Daily cron: sends per-user Meta operation summary email.
// Respects meta_user_settings.notify_daily_summary (default off).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Only users who opted in
    const { data: optedIn, error: prefsErr } = await supabase
      .from("meta_user_settings")
      .select("user_id")
      .eq("notify_daily_summary", true);

    if (prefsErr) throw prefsErr;

    const now = new Date();
    const dayAgoISO = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const today = now.toISOString().slice(0, 10);
    const periodLabel = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < (optedIn || []).length; i++) {
      const { user_id } = optedIn![i];
      if (i > 0) await new Promise((r) => setTimeout(r, 500));

      // Active Meta numbers
      const { data: conns } = await supabase
        .from("user_waba_connections")
        .select("id")
        .eq("user_id", user_id)
        .eq("status", "active");
      const activeNumbers = conns?.length || 0;
      const connIds = (conns || []).map((c: any) => c.id);

      // Outbound stats from chat_messages (last 24h)
      const [outbound, inbound, newConvs] = await Promise.all([
        supabase
          .from("chat_messages")
          .select("status", { count: "exact" })
          .eq("user_id", user_id)
          .eq("direction", "outbound")
          .gte("created_at", dayAgoISO),
        supabase
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id)
          .eq("direction", "inbound")
          .gte("created_at", dayAgoISO),
        connIds.length > 0
          ? supabase
              .from("chat_conversations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user_id)
              .in("waba_connection_id", connIds)
              .gte("created_at", dayAgoISO)
          : Promise.resolve({ count: 0 } as any),
      ]);

      const outRows = (outbound.data || []) as Array<{ status: string }>;
      const messagesSent = outRows.length;
      const messagesDelivered = outRows.filter((m) => m.status === "delivered" || m.status === "read").length;
      const messagesRead = outRows.filter((m) => m.status === "read").length;
      const messagesFailed = outRows.filter((m) => m.status === "failed").length;
      const inboundMessages = inbound.count || 0;
      const newConversations = (newConvs as any).count || 0;

      // Skip when there is zero activity
      if (messagesSent === 0 && inboundMessages === 0 && newConversations === 0) {
        skipped++;
        continue;
      }

      try {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id,
            email_type: "META_DAILY_SUMMARY",
            idempotency_key: `meta-daily-${user_id}-${today}`,
            meta_pref_key: "notify_daily_summary",
            payload: {
              period: periodLabel,
              messages_sent: messagesSent,
              messages_delivered: messagesDelivered,
              messages_read: messagesRead,
              messages_failed: messagesFailed,
              inbound_messages: inboundMessages,
              new_conversations: newConversations,
              active_numbers: activeNumbers,
            },
          },
        });
        sent++;
      } catch (e) {
        console.error(`[meta-daily-summary] email error for ${user_id}:`, e);
      }
    }

    console.log(`[meta-daily-summary] done sent=${sent} skipped=${skipped} total=${optedIn?.length || 0}`);
    return new Response(
      JSON.stringify({ sent, skipped, total: optedIn?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[meta-daily-summary] Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
