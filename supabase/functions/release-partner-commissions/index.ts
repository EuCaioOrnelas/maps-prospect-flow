// Daily cron: releases partner commissions whose protection window has elapsed
// (status pending → available) and notifies each partner once per release batch.
//
// Replaces the simple SQL-only release_pending_commissions() call so we can
// also dispatch the partner_commission_ready email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

async function sendPartnerEmail(
  supabase: any,
  partnerId: string,
  type: string,
  extraData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: partner } = await supabase
      .from("partners")
      .select("email, full_name, referral_code, user_id")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner?.email) {
      console.warn(`[sendPartnerEmail] partner ${partnerId} has no email`);
      return;
    }

    const firstName = (partner.full_name || "").split(" ")[0] || "Parceiro";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type,
        to: partner.email,
        data: {
          first_name: firstName,
          referral_code: partner.referral_code,
          user_id: partner.user_id,
          ...extraData,
        },
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error(`[sendPartnerEmail] ${type} failed:`, resp.status, txt);
    }
  } catch (e) {
    console.error("[sendPartnerEmail] exception:", e);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pick all commissions that are ready to be released
    const { data: ready, error: readyErr } = await supabase
      .from("partner_commissions")
      .select("id, partner_id, commission_amount_cents")
      .eq("status", "pending")
      .lte("available_at", new Date().toISOString());

    if (readyErr) throw readyErr;
    if (!ready || ready.length === 0) {
      return new Response(JSON.stringify({ released: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Release them
    const ids = ready.map((c) => c.id);
    const { error: upErr } = await supabase
      .from("partner_commissions")
      .update({ status: "available", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (upErr) throw upErr;

    // Aggregate per partner for notification
    const perPartner = new Map<string, number>();
    for (const c of ready) {
      perPartner.set(c.partner_id, (perPartner.get(c.partner_id) || 0) + (c.commission_amount_cents || 0));
    }

    // Send one email per partner with this batch's released amount + new total available
    for (const [partnerId, releasedCents] of perPartner.entries()) {
      const { data: balance } = await supabase.rpc("compute_partner_balance", { p_partner_id: partnerId });
      const totalAvailable = (balance as { available_cents?: number } | null)?.available_cents || 0;

      sendPartnerEmail(supabase, partnerId, "partner_commission_ready", {
        commission_cents: releasedCents,
        total_available_cents: totalAvailable,
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ released: ready.length, partners_notified: perPartner.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[release-partner-commissions] error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
