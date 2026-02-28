import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active users with paid plans (or all users if you prefer)
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, email, name, plan")
      .eq("is_blocked", false);

    if (usersError) throw usersError;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();
    const periodLabel = `${weekAgo.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} — ${now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of users || []) {
      // Check email preferences
      const { data: prefs } = await supabase
        .from("email_preferences")
        .select("transactional_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (prefs?.transactional_enabled === false) {
        skippedCount++;
        continue;
      }

      // Get weekly stats for this user
      const [campaignMsgs, responses, newLeads] = await Promise.all([
        // Messages sent via campaigns this week
        supabase
          .from("whatsapp_campaigns")
          .select("sent_count")
          .eq("user_id", user.id)
          .gte("updated_at", weekAgoISO),
        // Responses received this week
        supabase
          .from("campaign_responses")
          .select("id")
          .eq("user_id", user.id)
          .gte("created_at", weekAgoISO),
        // New leads this week
        supabase
          .from("leads")
          .select("id")
          .eq("user_id", user.id)
          .gte("created_at", weekAgoISO),
      ]);

      const messagesSent = (campaignMsgs.data || []).reduce(
        (sum: number, c: any) => sum + (c.sent_count || 0),
        0
      );
      const responsesCount = responses.data?.length || 0;
      const newLeadsCount = newLeads.data?.length || 0;
      const responseRate =
        messagesSent > 0
          ? Math.round((responsesCount / messagesSent) * 100)
          : 0;

      // Skip if no activity
      if (messagesSent === 0 && responsesCount === 0 && newLeadsCount === 0) {
        skippedCount++;
        continue;
      }

      // Send weekly summary email
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            user_id: user.id,
            email_type: "WEEKLY_SUMMARY",
            payload: {
              period: periodLabel,
              messages_sent: messagesSent,
              responses: responsesCount,
              response_rate: responseRate,
              new_leads: newLeadsCount,
            },
            idempotency_key: `weekly_${user.id}_${now.toISOString().slice(0, 10)}`,
          },
        });
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send weekly summary to ${user.email}:`, emailErr);
      }
    }

    console.log(
      `[weekly-summary] Done: ${sentCount} sent, ${skippedCount} skipped, ${users?.length || 0} total users`
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        skipped: skippedCount,
        total_users: users?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[weekly-summary] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
