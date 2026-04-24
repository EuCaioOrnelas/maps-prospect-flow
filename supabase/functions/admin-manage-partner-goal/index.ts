import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await caller.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const admin = createClient(url, serviceKey);
    const { data: roleCheck } = await admin.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleCheck) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json();
    const action = body.action || "create";

    if (action === "create") {
      const { partner_id, title, description, goal_type, target_value, prize_amount_cents, deadline_at, internal_notes } = body;
      if (!partner_id || !title?.trim() || !goal_type || !target_value || !deadline_at) {
        return new Response(JSON.stringify({ error: "partner_id, title, goal_type, target_value e deadline_at são obrigatórios" }), { status: 400, headers: corsHeaders });
      }
      if (!["revenue", "paid_clients", "leads", "mrr"].includes(goal_type)) {
        return new Response(JSON.stringify({ error: "goal_type inválido" }), { status: 400, headers: corsHeaders });
      }
      const { data, error } = await admin.from("partner_goals").insert({
        partner_id,
        title: title.trim(),
        description: description || null,
        goal_type,
        target_value: Number(target_value),
        prize_amount_cents: Math.max(0, Math.round(Number(prize_amount_cents) || 0)),
        deadline_at,
        internal_notes: internal_notes || null,
        created_by_admin_id: u.user.id,
      }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });

      // run progress to set initial achieved value
      await admin.rpc("update_partner_goal_progress", { p_partner_id: partner_id });

      return new Response(JSON.stringify({ success: true, goal: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const { id, title, description, target_value, prize_amount_cents, deadline_at, status, internal_notes } = body;
      const patch: any = {};
      if (title !== undefined) patch.title = title;
      if (description !== undefined) patch.description = description;
      if (target_value !== undefined) patch.target_value = Number(target_value);
      if (prize_amount_cents !== undefined) patch.prize_amount_cents = Math.max(0, Math.round(Number(prize_amount_cents)));
      if (deadline_at !== undefined) patch.deadline_at = deadline_at;
      if (status !== undefined) patch.status = status;
      if (internal_notes !== undefined) patch.internal_notes = internal_notes;
      const { error } = await admin.from("partner_goals").update(patch).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "recompute") {
      const { partner_id } = body;
      await admin.rpc("update_partner_goal_progress", { p_partner_id: partner_id });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
