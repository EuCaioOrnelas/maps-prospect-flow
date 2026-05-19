// Atualiza os order bumps de uma subscription existente.
// - Stripe: ajusta items da subscription (cria/atualiza/remove) com proration.
//   Bloqueia se subscription estiver com intervalo `year` (Stripe não aceita
//   misturar month + year na mesma sub).
// - Asaas: chama PUT /pix/automatic/authorizations/{id} para alterar o value
//   somando o novo total. Não suporta bumps em authorizations YEARLY.
// Em ambos os casos atualiza `profiles.extra_*` e grava order_bump_events.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: unknown) => console.log(`[UPDATE-SUB-BUMPS] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

const BUMP_CATALOG: Record<string, {
  stripePriceId: string;
  asaasMonthly: number;
  column: "extra_numbers" | "extra_contacts_packs" | "extra_opportunities_packs";
  allowedPlans: string[];
}> = {
  numbers:       { stripePriceId: "price_1TYdiXK8CM0R6xMMqnhxGM1V", asaasMonthly: 96.00,  column: "extra_numbers",              allowedPlans: ["start", "growth"] },
  contacts:      { stripePriceId: "price_1TYdkPK8CM0R6xMMXHTfihdw", asaasMonthly: 48.00,  column: "extra_contacts_packs",       allowedPlans: ["start", "growth"] },
  opportunities: { stripePriceId: "price_1TYdknK8CM0R6xMM9TXjGFf5", asaasMonthly: 196.00, column: "extra_opportunities_packs",  allowedPlans: ["growth"] },
};

const PLAN_MONTHLY_PRICE: Record<string, number> = {
  start: 196.00,
  growth: 696.00,
  scale: 1496.00,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auth obrigatório
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const { bumps } = await req.json();
    if (!bumps || typeof bumps !== "object") throw new Error("bumps payload required");

    // Carrega profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, plan, payment_provider, extra_numbers, extra_contacts_packs, extra_opportunities_packs")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    const planKey = (profile.plan || "").toLowerCase();
    if (!["start", "growth"].includes(planKey)) {
      throw new Error("Add-ons disponíveis apenas para planos Atendimento e Growth.");
    }

    // Sanitiza desejado
    const desired: Record<string, number> = { numbers: 0, contacts: 0, opportunities: 0 };
    for (const id of Object.keys(desired)) {
      const qty = Math.max(0, Math.min(99, Math.floor(Number((bumps as any)[id]) || 0)));
      const def = BUMP_CATALOG[id];
      if (def && def.allowedPlans.includes(planKey)) desired[id] = qty;
    }

    const current = {
      numbers: profile.extra_numbers || 0,
      contacts: profile.extra_contacts_packs || 0,
      opportunities: profile.extra_opportunities_packs || 0,
    };

    log("Updating", { userId, current, desired, provider: profile.payment_provider });

    const provider = (profile.payment_provider || "").toLowerCase();

    // === STRIPE ===
    if (provider === "stripe" || !provider) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
      const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

      // Acha email para localizar customer
      const { data: emailRow } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      const email = emailRow?.email;
      if (!email) throw new Error("Email do usuário não encontrado");

      const customers = await stripe.customers.list({ email, limit: 5 });
      let activeSub: Stripe.Subscription | null = null;
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
        for (const s of subs.data) {
          if (s.status === "active" || s.status === "trialing" || s.status === "past_due") {
            activeSub = s;
            break;
          }
        }
        if (activeSub) break;
      }
      if (!activeSub) throw new Error("Nenhuma assinatura ativa encontrada no Stripe");

      // Bloqueia anual
      const isYearly = activeSub.items.data.some((it) => it.price.recurring?.interval === "year");
      if (isYearly) {
        throw new Error("Add-ons não estão disponíveis em assinaturas anuais. Mude para mensal para gerenciar add-ons.");
      }

      // Aplica diff nos items
      const itemsByPrice = new Map<string, Stripe.SubscriptionItem>();
      for (const it of activeSub.items.data) itemsByPrice.set(it.price.id, it);

      const updates: Stripe.SubscriptionUpdateParams.Item[] = [];
      for (const [id, qty] of Object.entries(desired)) {
        const priceId = BUMP_CATALOG[id].stripePriceId;
        const existing = itemsByPrice.get(priceId);
        if (qty > 0) {
          if (existing) {
            if (existing.quantity !== qty) updates.push({ id: existing.id, quantity: qty });
          } else {
            updates.push({ price: priceId, quantity: qty });
          }
        } else if (existing) {
          updates.push({ id: existing.id, deleted: true });
        }
      }

      if (updates.length > 0) {
        await stripe.subscriptions.update(activeSub.id, {
          items: updates,
          proration_behavior: "create_prorations",
          metadata: {
            ...activeSub.metadata,
            bumps_numbers: String(desired.numbers),
            bumps_contacts: String(desired.contacts),
            bumps_opportunities: String(desired.opportunities),
          },
        });
        log("Stripe sub updated", { subId: activeSub.id, updates: updates.length });
      }
    }
    // === ASAAS ===
    else if (provider === "asaas") {
      const asaasKey = Deno.env.get("ASAAS_API_KEY");
      if (!asaasKey) throw new Error("ASAAS_API_KEY not configured");

      // Busca authorization ativa do usuário (guardamos como asaas_subscription_id em algum lugar?
      // Conservadoramente: pega da última row em order_bump_events ou checkout_leads).
      // Aqui usamos a abordagem de buscar pelo email no Asaas.
      // Para PIX automático, a authorization é o equivalente de subscription.
      const { data: emailRow } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      const email = emailRow?.email;

      // Busca customer no Asaas
      const custRes = await fetch(`https://api.asaas.com/v3/customers?email=${encodeURIComponent(email || "")}`, {
        headers: { access_token: asaasKey, Accept: "application/json" },
      });
      const custJson = await custRes.json();
      const customer = custJson?.data?.[0];
      if (!customer) throw new Error("Customer Asaas não encontrado");

      // Lista authorizations do customer
      const authRes = await fetch(`https://api.asaas.com/v3/pix/automatic/authorizations?customer=${customer.id}`, {
        headers: { access_token: asaasKey, Accept: "application/json" },
      });
      const authJson = await authRes.json();
      const active = (authJson?.data || []).find((a: any) =>
        ["ACTIVE", "AUTHORIZED"].includes(String(a.status).toUpperCase()) && String(a.frequency).toUpperCase() === "MONTHLY"
      );
      if (!active) throw new Error("Nenhuma assinatura Asaas mensal ativa encontrada");

      // Calcula novo value
      let bumpsTotal = 0;
      for (const [id, qty] of Object.entries(desired)) bumpsTotal += BUMP_CATALOG[id].asaasMonthly * qty;
      const planPrice = PLAN_MONTHLY_PRICE[planKey] || 0;
      const newValue = planPrice + bumpsTotal;

      const updRes = await fetch(`https://api.asaas.com/v3/pix/automatic/authorizations/${active.id}`, {
        method: "PUT",
        headers: { access_token: asaasKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ value: newValue, originalValue: newValue }),
      });
      const updJson = await updRes.json();
      if (!updRes.ok || updJson?.errors) throw new Error(`Asaas update error: ${JSON.stringify(updJson?.errors || updJson)}`);
      log("Asaas authorization updated", { id: active.id, newValue });
    } else {
      throw new Error(`Provider não suportado para update de bumps: ${provider}`);
    }

    // Persiste no profile
    const updates: Record<string, number> = {};
    for (const [id, qty] of Object.entries(desired)) {
      updates[BUMP_CATALOG[id].column] = qty;
    }
    await supabase.from("profiles").update(updates).eq("id", userId);

    // Auditoria
    for (const [id, qty] of Object.entries(desired)) {
      const prev = (current as any)[id] as number;
      if (qty !== prev) {
        await supabase.from("order_bump_events").insert({
          user_id: userId,
          bump_id: id,
          delta: qty - prev,
          new_quantity: qty,
          source: "upgrade",
          metadata: { plan_key: planKey, provider },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, bumps: desired }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
