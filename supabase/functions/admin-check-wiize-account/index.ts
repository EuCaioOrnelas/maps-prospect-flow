// Admin-only: checks if a given email already has a Wiize account.
// Used by the "create partner" dialog to hide the password field
// when the email belongs to an existing user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData } = await callerClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!callerData?.user) return json(401, { error: "Unauthorized" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) return json(403, { error: "Forbidden — admin only" });

    const { email } = await req.json();
    if (!email || typeof email !== "string") return json(400, { error: "email obrigatório" });
    const normalized = email.trim().toLowerCase();

    // Look up by paginating auth.users (no direct query API)
    let exists = false;
    let isAlreadyPartner = false;
    let userId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data: list, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      const match = list?.users?.find((u: any) => (u.email || "").toLowerCase() === normalized);
      if (match) {
        exists = true;
        userId = match.id;
        break;
      }
      if (!list?.users?.length || list.users.length < 200) break;
      page++;
    }

    if (exists && userId) {
      const { data: existingPartner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      isAlreadyPartner = !!existingPartner;
    }

    return json(200, { exists, isAlreadyPartner });
  } catch (e: any) {
    console.error("[admin-check-wiize-account] fatal:", e);
    return json(500, { error: e?.message || "Erro inesperado" });
  }
});
