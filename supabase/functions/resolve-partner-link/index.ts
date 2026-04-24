/**
 * Resolves a partner referral link slug into the canonical referral_code
 * + tracks the click. Used by the public landing-side router when the URL
 * is /go/:slug (admin-created campaign links).
 *
 * Returns: { referral_code, redirect_to: '/?ref=<code>&link=<id>' }
 */
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
    const admin = createClient(url, serviceKey);

    const { slug } = await req.json();
    if (!slug) return new Response(JSON.stringify({ error: "slug obrigatório" }), { status: 400, headers: corsHeaders });

    const { data: link } = await admin
      .from("partner_referral_links")
      .select("id, partner_id, label, utm_source, utm_medium, utm_campaign, partners!inner(referral_code, status)")
      .eq("slug", slug.toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!link || (link as any).partners?.status !== "active") {
      return new Response(JSON.stringify({ error: "Link não encontrado" }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      referral_code: (link as any).partners.referral_code,
      link_id: link.id,
      utm_source: link.utm_source,
      utm_medium: link.utm_medium,
      utm_campaign: link.utm_campaign,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
