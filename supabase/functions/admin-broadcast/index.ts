import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      subject,
      content,
      segment = "all",
      score_level = "all",
    } = body as {
      subject: string;
      content: string;
      segment?: string;
      score_level?: string;
    };

    if (!subject || !content) {
      return new Response(
        JSON.stringify({ error: "subject and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Determine target plans ────────────────────────────────────────────────
    const getPlans = (): string[] => {
      switch (segment) {
        case "free_only": return ["free"];
        case "paid_only": return ["start", "growth", "scale"];
        case "start": return ["start"];
        case "growth": return ["growth"];
        case "scale": return ["scale"];
        default: return ["free", "start", "growth", "scale"];
      }
    };

    const plans = getPlans();

    // ── Fetch eligible users (paginated) ──────────────────────────────────────
    const PAGE = 1000;
    let allUsers: any[] = [];
    let page = 0;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, name, plan")
        .in("plan", plans)
        .eq("is_blocked", false)
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error) throw error;
      if (data) allUsers.push(...data);
      hasMore = (data?.length || 0) === PAGE;
      page++;
    }

    // ── Filter by score level ─────────────────────────────────────────────────
    if (score_level !== "all" && allUsers.length > 0) {
      const CHUNK = 500;
      const scoredIds = new Set<string>();
      for (let i = 0; i < allUsers.length; i += CHUNK) {
        const chunk = allUsers.slice(i, i + CHUNK).map((u: any) => u.id);
        const { data } = await supabase
          .from("user_scores" as any)
          .select("user_id")
          .in("user_id", chunk)
          .eq("score_label", score_level);
        (data || []).forEach((s: any) => scoredIds.add(s.user_id));
      }
      allUsers = allUsers.filter((u: any) => scoredIds.has(u.id));
    }

    // ── Filter opt-outs ───────────────────────────────────────────────────────
    const optedOutIds = new Set<string>();
    if (allUsers.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < allUsers.length; i += CHUNK) {
        const chunk = allUsers.slice(i, i + CHUNK).map((u: any) => u.id);
        const { data } = await supabase
          .from("email_preferences")
          .select("user_id")
          .in("user_id", chunk)
          .eq("marketing_enabled", false);
        (data || []).forEach((p: any) => optedOutIds.add(p.user_id));
      }
    }

    const eligibleUsers = allUsers.filter((u: any) => !optedOutIds.has(u.id));
    const skipped = allUsers.length - eligibleUsers.length;

    console.log(`[admin-broadcast] Starting: ${eligibleUsers.length} eligible, ${skipped} opted-out`);

    // ── Send emails with rate limiting ────────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    let sent = 0;
    let failed = 0;
    const batchTimestamp = Date.now();

    for (let i = 0; i < eligibleUsers.length; i++) {
      const u = eligibleUsers[i];

      // Rate limit: 600ms delay between sends
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      try {
        // Call send-email function internally via HTTP for tracking/logging
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: u.id,
            email_type: "ADMIN_BROADCAST",
            payload: { subject, content },
            idempotency_key: `broadcast_${batchTimestamp}_${u.id}`,
          }),
        });

        if (sendResponse.ok) {
          sent++;
        } else {
          const errText = await sendResponse.text();
          console.error(`[admin-broadcast] Failed for ${u.email}: ${errText}`);
          failed++;
        }
      } catch (err) {
        console.error(`[admin-broadcast] Exception for ${u.email}:`, err);
        failed++;
      }
    }

    console.log(`[admin-broadcast] Done: ${sent} sent, ${failed} failed, ${skipped} opt-out`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, skipped, total: eligibleUsers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[admin-broadcast] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
