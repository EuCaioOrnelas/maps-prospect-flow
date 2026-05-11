import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAGE_SIZE_DEFAULT = 15;
const PAGE_SIZE_MAX = 100;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error("[admin-email-logs] Missing backend environment variables");
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("[admin-email-logs] has_role error:", roleError);
      return jsonResponse({ error: "Could not verify admin access" }, 500);
    }

    if (!isAdmin) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const mode = typeof body.mode === "string" ? body.mode : "list";

    if (mode === "recipients") {
      const page = Math.max(0, Number(body.page) || 0);
      const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number(body.page_size) || PAGE_SIZE_DEFAULT));
      const emailType = typeof body.email_type === "string" ? body.email_type : "";
      const batchKey = typeof body.batch_key === "string" ? body.batch_key : null;
      const exactIdempotencyKey = typeof body.exact_idempotency_key === "string" ? body.exact_idempotency_key : null;
      const subject = typeof body.subject === "string" ? body.subject : null;
      const searchRecipient = typeof body.search_recipient === "string" ? body.search_recipient.trim() : "";

      if (!emailType) {
        return jsonResponse({ error: "email_type is required" }, 400);
      }

      let query = supabase
        .from("email_logs")
        .select("*", { count: "exact" })
        .eq("email_type", emailType)
        .order("created_at", { ascending: false });

      if (batchKey) {
        query = query.ilike("idempotency_key", `broadcast_${batchKey}_%`);
      } else if (exactIdempotencyKey) {
        query = query.eq("idempotency_key", exactIdempotencyKey);
      } else if (subject && subject !== "Sem assunto") {
        query = query.eq("subject", subject);
      }

      if (searchRecipient) {
        query = query.ilike("to_email", `%${searchRecipient}%`);
      }

      const { data, error, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) {
        console.error("[admin-email-logs] recipients query error:", error);
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ logs: data || [], count: count || 0 });
    }

    const typeFilter = typeof body.type_filter === "string" ? body.type_filter : "all";
    const dateFrom = typeof body.date_from === "string" && body.date_from ? body.date_from : null;
    const dateTo = typeof body.date_to === "string" && body.date_to ? body.date_to : null;

    let query = supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (typeFilter !== "all") {
      query = query.eq("email_type", typeFilter);
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[admin-email-logs] list query error:", error);
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ logs: data || [] });
  } catch (error) {
    console.error("[admin-email-logs] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});