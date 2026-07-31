import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) =>
  console.log(`[RETRO-SWEEP] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);

const GRACE_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let dryRun = false;
    try {
      const body = await req.json();
      dryRun = body?.dry_run === true;
    } catch { /* sem body = execução real */ }

    const now = Date.now();
    const graceCutoff = new Date(now - GRACE_DAYS * 86400000);

    // 1) Todos os perfis pagos que não são cortesia/admin nem assinatura custom.
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(
        "id, email, plan, payment_provider, subscription_current_period_end, trial_end_at, admin_assigned_plan, is_custom_subscription",
      )
      .neq("plan", "free")
      .eq("admin_assigned_plan", false)
      .eq("is_custom_subscription", false);

    if (error) throw error;

    // 2) Conjunto de pagantes reais (qualquer prova de pagamento efetivado).
    const [{ data: paidPix }, { data: paidCustom }, { data: paidSales }] = await Promise.all([
      supabase.from("pix_invoices").select("user_id").eq("status", "paid"),
      supabase.from("custom_subscription_payments").select("user_id").not("paid_at", "is", null),
      supabase.from("partner_sales").select("customer_user_id").not("customer_user_id", "is", null),
    ]);
    const realPayers = new Set<string>();
    for (const r of paidPix || []) if (r.user_id) realPayers.add(r.user_id);
    for (const r of paidCustom || []) if (r.user_id) realPayers.add(r.user_id);
    for (const r of paidSales || []) if (r.customer_user_id) realPayers.add(r.customer_user_id);

    const toDowngrade: Array<{ id: string; email: string | null; plan: string; reason: string }> = [];

    for (const p of profiles || []) {
      const periodEnd = p.subscription_current_period_end
        ? new Date(p.subscription_current_period_end)
        : null;
      const trialEnd = p.trial_end_at ? new Date(p.trial_end_at) : null;

      if (periodEnd && periodEnd < graceCutoff) {
        toDowngrade.push({ id: p.id, email: p.email, plan: p.plan, reason: "vigencia_vencida_7d" });
        continue;
      }

      // Sem vigência registrada: só mantém o plano quem tem pagamento comprovado
      // ou trial ainda dentro do prazo (+ carência).
      if (!periodEnd) {
        const trialAlive = trialEnd ? trialEnd.getTime() + GRACE_DAYS * 86400000 > now : false;
        if (!realPayers.has(p.id) && !trialAlive) {
          toDowngrade.push({ id: p.id, email: p.email, plan: p.plan, reason: "sem_pagamento_na_vigencia" });
        }
      }
    }

    log("Scan concluído", {
      scanned: profiles?.length || 0,
      to_downgrade: toDowngrade.length,
      dry_run: dryRun,
    });

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          scanned: profiles?.length || 0,
          would_downgrade: toDowngrade.length,
          users: toDowngrade,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let downgraded = 0;
    for (const u of toDowngrade) {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          plan: "free",
          searches_limit: 10,
          searches_used: 0,
          bonus_searches: 0,
          subscription_price_cents: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", u.id);

      if (upErr) {
        log("Falha ao rebaixar", { userId: u.id, error: upErr.message });
        continue;
      }
      downgraded++;

      // Churn só é registrado para quem realmente pagou algum dia.
      if (!realPayers.has(u.id)) continue;
      try {
        await supabase.from("subscription_events").insert({
          user_id: u.id,
          email: u.email,
          event_type: "subscription_expired",
          event_source: "retroactive_sweep",
          previous_plan: u.plan,
          new_plan: "free",
        });
      } catch (e) {
        log("Falha ao registrar evento", { userId: u.id, error: String(e) });
      }
    }

    return new Response(
      JSON.stringify({
        scanned: profiles?.length || 0,
        downgraded,
        real_payers: realPayers.size,
        details: toDowngrade,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
