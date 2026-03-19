import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type BroadcastUser = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const {
      data: { user },
    } = await anonClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const getPlans = (): string[] => {
      switch (segment) {
        case "free_only":
          return ["free"];
        case "paid_only":
          return ["start", "growth", "scale"];
        case "start":
          return ["start"];
        case "growth":
          return ["growth"];
        case "scale":
          return ["scale"];
        default:
          return ["free", "start", "growth", "scale"];
      }
    };

    const plans = getPlans();

    // Fetch all candidate users
    let allUsers: BroadcastUser[] = [];

    if (segment === "churned") {
      const PAGE = 1000;
      let completedCheckoutUserIds: string[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("checkout_leads" as any)
          .select("user_id")
          .eq("checkout_completed", true)
          .range(page * PAGE, (page + 1) * PAGE - 1);

        if (error) throw error;

        if (data?.length) {
          completedCheckoutUserIds.push(...data.map((row: any) => row.user_id).filter(Boolean));
        }

        hasMore = (data?.length || 0) === PAGE;
        page++;
      }

      const uniqueUserIds = [...new Set(completedCheckoutUserIds)];

      if (uniqueUserIds.length > 0) {
        const CHUNK = 500;
        for (let i = 0; i < uniqueUserIds.length; i += CHUNK) {
          const chunk = uniqueUserIds.slice(i, i + CHUNK);
          const { data, error } = await supabase
            .from("profiles")
            .select("id, email, name, plan")
            .in("id", chunk)
            .eq("plan", "free")
            .eq("is_blocked", false);

          if (error) throw error;
          if (data?.length) {
            allUsers.push(...(data as BroadcastUser[]));
          }
        }
      }
    } else {
      const PAGE = 1000;
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

        if (data?.length) {
          allUsers.push(...(data as BroadcastUser[]));
        }

        hasMore = (data?.length || 0) === PAGE;
        page++;
      }
    }

    // Score-level filtering
    if (score_level !== "all" && allUsers.length > 0) {
      const CHUNK = 500;
      const scoredIds = new Set<string>();

      for (let i = 0; i < allUsers.length; i += CHUNK) {
        const chunk = allUsers.slice(i, i + CHUNK).map((u) => u.id);
        const { data } = await supabase
          .from("user_scores" as any)
          .select("user_id")
          .in("user_id", chunk)
          .eq("score_label", score_level);

        (data || []).forEach((s: any) => scoredIds.add(s.user_id));
      }

      allUsers = allUsers.filter((u) => scoredIds.has(u.id));
    }

    // Marketing opt-out filtering
    const optedOutIds = new Set<string>();
    if (allUsers.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < allUsers.length; i += CHUNK) {
        const chunk = allUsers.slice(i, i + CHUNK).map((u) => u.id);
        const { data } = await supabase
          .from("email_preferences")
          .select("user_id")
          .in("user_id", chunk)
          .eq("marketing_enabled", false);

        (data || []).forEach((p: any) => optedOutIds.add(p.user_id));
      }
    }

    const eligibleUsers = allUsers.filter((u) => !optedOutIds.has(u.id));
    const skipped = allUsers.length - eligibleUsers.length;

    const batchTimestamp = Date.now();
    const batchId = `broadcast_${batchTimestamp}`;

    const sendWithRetry = async (targetUser: BroadcastUser) => {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              user_id: targetUser.id,
              email_type: "ADMIN_BROADCAST",
              payload: { subject, content },
              idempotency_key: `${batchId}_${targetUser.id}`,
            }),
          });

          if (sendResponse.ok) {
            return { ok: true as const, status: sendResponse.status };
          }

          const errText = await sendResponse.text();
          const shouldRetry = (sendResponse.status === 429 || sendResponse.status >= 500) && attempt < maxAttempts;

          if (shouldRetry) {
            await sleep(700 * attempt);
            continue;
          }

          return {
            ok: false as const,
            status: sendResponse.status,
            error: errText || "unknown_error",
          };
        } catch (err) {
          const shouldRetry = attempt < maxAttempts;
          if (shouldRetry) {
            await sleep(700 * attempt);
            continue;
          }

          return {
            ok: false as const,
            status: 0,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      return { ok: false as const, status: 0, error: "retry_exhausted" };
    };

    const processBroadcast = async () => {
      let sent = 0;
      let failed = 0;
      const reasonCounter: Record<string, number> = {};

      console.log(`[admin-broadcast] Batch ${batchId} started: ${eligibleUsers.length} eligible, ${skipped} opted-out`);

      for (let i = 0; i < eligibleUsers.length; i++) {
        const targetUser = eligibleUsers[i];

        if (i > 0) {
          await sleep(650);
        }

        const result = await sendWithRetry(targetUser);

        if (result.ok) {
          sent++;
        } else {
          failed++;
          const reasonKey = `${result.status}:${(result.error || "unknown").slice(0, 160)}`;
          reasonCounter[reasonKey] = (reasonCounter[reasonKey] || 0) + 1;
          console.error(`[admin-broadcast] Failed ${targetUser.email} [${result.status}] ${result.error}`);
        }

        if ((i + 1) % 25 === 0 || i + 1 === eligibleUsers.length) {
          console.log(`[admin-broadcast] Batch ${batchId} progress: ${i + 1}/${eligibleUsers.length} (sent=${sent}, failed=${failed})`);
        }
      }

      console.log(`[admin-broadcast] Batch ${batchId} done: sent=${sent}, failed=${failed}, skipped=${skipped}`);

      if (failed > 0) {
        console.log(`[admin-broadcast] Batch ${batchId} failure summary:`, reasonCounter);
      }
    };

    const edgeRuntime = (globalThis as unknown as {
      EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void };
    }).EdgeRuntime;

    const backgroundTask = processBroadcast();

    if (edgeRuntime?.waitUntil) {
      edgeRuntime.waitUntil(backgroundTask);
    } else {
      backgroundTask.catch((err) => {
        console.error("[admin-broadcast] Background task error:", err);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        started: true,
        batch_id: batchId,
        queued: eligibleUsers.length,
        skipped,
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[admin-broadcast] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});