import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLUG_RE = /^[a-z0-9-]{3,40}$/;

function normSlug(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

    // Verificador de slug duplicado em tempo real
    if (action === "check_slug") {
      const finalSlug = normSlug(body.slug || "");
      if (!SLUG_RE.test(finalSlug)) {
        return new Response(JSON.stringify({ available: false, normalized: finalSlug, reason: "invalid_format" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: existing } = await admin.from("partner_referral_links").select("id").eq("slug", finalSlug).maybeSingle();
      return new Response(JSON.stringify({ available: !existing, normalized: finalSlug }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      const { partner_id, slug, label, description, utm_source, utm_medium, utm_campaign, expires_at, internal_name } = body;
      if (!partner_id || !label?.trim()) return new Response(JSON.stringify({ error: "partner_id e label são obrigatórios" }), { status: 400, headers: corsHeaders });

      const finalSlug = normSlug(slug || label);
      if (!SLUG_RE.test(finalSlug)) return new Response(JSON.stringify({ error: "Slug inválido. Use 3 a 40 caracteres (a-z, 0-9, hífen)." }), { status: 400, headers: corsHeaders });

      const { data: existing } = await admin.from("partner_referral_links").select("id").eq("slug", finalSlug).maybeSingle();
      if (existing) return new Response(JSON.stringify({ error: `Slug "${finalSlug}" já existe.` }), { status: 400, headers: corsHeaders });

      const { data, error } = await admin.from("partner_referral_links").insert({
        partner_id, slug: finalSlug, label: label.trim(),
        description: description || null, utm_source: utm_source || null,
        utm_medium: utm_medium || null, utm_campaign: utm_campaign || null,
        expires_at: expires_at || null,
        internal_name: internal_name?.trim() || null,
        created_by_admin_id: u.user.id,
      }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true, link: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const { id, label, description, is_active, utm_source, utm_medium, utm_campaign, expires_at, internal_name } = body;
      const patch: any = {};
      if (label !== undefined) patch.label = label;
      if (description !== undefined) patch.description = description;
      if (is_active !== undefined) patch.is_active = is_active;
      if (utm_source !== undefined) patch.utm_source = utm_source;
      if (utm_medium !== undefined) patch.utm_medium = utm_medium;
      if (utm_campaign !== undefined) patch.utm_campaign = utm_campaign;
      if (expires_at !== undefined) patch.expires_at = expires_at;
      if (internal_name !== undefined) patch.internal_name = internal_name?.trim() || null;
      const { error } = await admin.from("partner_referral_links").update(patch).eq("id", id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { error } = await admin.from("partner_referral_links").delete().eq("id", body.id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
