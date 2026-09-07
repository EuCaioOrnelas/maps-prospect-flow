// Wiize API — pagamentos com cartão via Stripe (3DS + cartão salvo para 1 clique)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const DEFAULT_TOKEN_PRICE_BRL = 0.01;
const DEFAULT_MIN_TOPUP = 30;
const DEFAULT_MAX_TOPUP = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(step: string, details?: unknown) {
  console.log(`[WIIZE-API-CARD] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
}

async function loadLimits() {
  const { data } = await admin.from("wiize_api_limits").select("key, value");
  const map: Record<string, number> = {};
  for (const row of data || []) map[(row as any).key] = Number((row as any).value);
  return {
    tokenPrice: map.token_price_brl || DEFAULT_TOKEN_PRICE_BRL,
    min: map.min_topup_brl || DEFAULT_MIN_TOPUP,
    max: map.max_topup_brl || DEFAULT_MAX_TOPUP,
  };
}

async function ensureStripeCustomer(userId: string, email: string) {
  const { data: profile } = await admin
    .from("wiize_api_profiles")
    .select("full_name, company_name, doc_number, phone, postal_code, street, street_number, complement, neighborhood, city, state, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });

  if (profile?.stripe_customer_id) {
    try {
      const c = await stripe.customers.retrieve(profile.stripe_customer_id);
      if (c && !(c as any).deleted) return { stripe, customerId: profile.stripe_customer_id, profile };
    } catch {
      // fallthrough to create
    }
  }

  const cpfCnpj = String(profile?.doc_number || "").replace(/\D/g, "");
  const customer = await stripe.customers.create({
    email,
    name: profile?.company_name || profile?.full_name || email,
    ...(cpfCnpj ? { tax_id_data: [{ type: cpfCnpj.length === 11 ? "br_cpf" : "br_cnpj", value: cpfCnpj }] } : {}),
    phone: String(profile?.phone || "").replace(/\D/g, "") || undefined,
    address: {
      postal_code: String(profile?.postal_code || "").replace(/\D/g, "") || undefined,
      line1: profile?.street ? `${profile.street}, ${profile.street_number || "S/N"}` : undefined,
      city: profile?.city || undefined,
      state: profile?.state || undefined,
      country: "BR",
    },
    metadata: { wiize_api_user_id: userId },
  });

  await admin.from("wiize_api_profiles").update({ stripe_customer_id: customer.id }).eq("user_id", userId);
  return { stripe, customerId: customer.id, profile };
}

async function createTopupRecord(userId: string, amount: number, tokens: number, customerId: string, provider: string, method: string) {
  const { data, error } = await admin
    .from("wiize_api_topups")
    .insert({ user_id: userId, amount_brl: amount, tokens, provider, method, stripe_customer_id: customerId })
    .select("id, amount_brl, tokens, status, stripe_customer_id")
    .single();
  if (error) throw error;
  return data;
}

async function upsertPaymentMethod(userId: string, customerId: string, pm: Stripe.PaymentMethod) {
  const existing = await admin
    .from("wiize_api_payment_methods")
    .select("id, is_default")
    .eq("user_id", userId)
    .eq("stripe_payment_method_id", pm.id)
    .maybeSingle();

  const card = pm.card;
  const payload: any = {
    user_id: userId,
    stripe_payment_method_id: pm.id,
    stripe_customer_id: customerId,
    brand: card?.brand || "unknown",
    last4: card?.last4 || "",
    exp_month: card?.exp_month || null,
    exp_year: card?.exp_year || null,
    status: "active",
  };

  if (!existing?.data) {
    const count = await admin
      .from("wiize_api_payment_methods")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active");
    payload.is_default = (count.count || 0) === 0;
    const { data, error } = await admin.from("wiize_api_payment_methods").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await admin
    .from("wiize_api_payment_methods")
    .update(payload)
    .eq("id", existing.data.id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function antifraudLimits(userId: string) {
  const pendingCount = await admin
    .from("wiize_api_topups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");
  if ((pendingCount.count || 0) >= 5) {
    throw new Error("Você já possui recargas pendentes. Conclua ou cancele antes de criar outra.");
  }
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const hourCount = await admin
    .from("wiize_api_topups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);
  if ((hourCount.count || 0) >= 20) {
    throw new Error("Muitas recargas criadas na última hora. Tente novamente mais tarde.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: apiProfile } = await admin.from("wiize_api_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!apiProfile) return json({ error: "Conta Wiize API não encontrada" }, 403);

    await admin.rpc("wiize_api_ensure_wallet", { _user_id: user.id });

    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action || "setup");

    // --- setup: cria PaymentIntent para pagamento com cartão (primeira vez ou avulso) ---
    if (action === "setup") {
      const cfg = await loadLimits();
      const amount = Math.round(Number((body as any)?.amount_brl || 0) * 100) / 100;
      if (!Number.isFinite(amount) || amount < cfg.min || amount > cfg.max) {
        return json({ error: `Informe um valor entre R$ ${cfg.min} e R$ ${cfg.max}.` }, 422);
      }

      await antifraudLimits(user.id);

      const tokens = Math.round(amount / cfg.tokenPrice);
      const { stripe, customerId } = await ensureStripeCustomer(user.id, user.email || "");

      const topup = await createTopupRecord(user.id, amount, tokens, customerId, "stripe", "card");

      const saveCard = Boolean((body as any)?.save_card);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "brl",
        customer: customerId,
        description: `Recarga Wiize API — ${tokens.toLocaleString("pt-BR")} tokens`,
        metadata: { wiize_api_topup_id: topup.id, wiize_api_user_id: user.id },
        ...(saveCard ? { setup_future_usage: "off_session" } : {}),
        automatic_tax: { enabled: false },
      });

      await admin
        .from("wiize_api_topups")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", topup.id);

      return json({
        topup: { ...topup, stripe_payment_intent_id: paymentIntent.id },
        client_secret: paymentIntent.client_secret,
        save_card: saveCard,
      });
    }

    // --- charge_saved: cobra o cartão padrão off-session (1 clique / auto-recarga) ---
    if (action === "charge_saved") {
      const cfg = await loadLimits();
      const amount = Math.round(Number((body as any)?.amount_brl || 0) * 100) / 100;
      if (!Number.isFinite(amount) || amount < cfg.min || amount > cfg.max) {
        return json({ error: `Informe um valor entre R$ ${cfg.min} e R$ ${cfg.max}.` }, 422);
      }

      await antifraudLimits(user.id);

      const { data: wallet } = await admin
        .from("wiize_api_wallets")
        .select("auto_topup_payment_method_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!wallet?.auto_topup_payment_method_id) {
        return json({ error: "Nenhum cartão padrão configurado. Adicione um cartão primeiro." }, 400);
      }

      const { data: pm } = await admin
        .from("wiize_api_payment_methods")
        .select("*")
        .eq("id", wallet.auto_topup_payment_method_id)
        .eq("status", "active")
        .maybeSingle();
      if (!pm) return json({ error: "Cartão padrão não encontrado ou removido." }, 400);

      const tokens = Math.round(amount / cfg.tokenPrice);
      const { stripe, customerId } = await ensureStripeCustomer(user.id, user.email || "");

      const topup = await createTopupRecord(user.id, amount, tokens, customerId, "stripe", "card");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "brl",
        customer: customerId,
        payment_method: (pm as any).stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Recarga Wiize API — ${tokens.toLocaleString("pt-BR")} tokens`,
        metadata: { wiize_api_topup_id: topup.id, wiize_api_user_id: user.id },
        automatic_tax: { enabled: false },
      });

      await admin
        .from("wiize_api_topups")
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq("id", topup.id);

      if (paymentIntent.status === "succeeded") {
        return json({ status: "paid", topup: { ...topup, stripe_payment_intent_id: paymentIntent.id } });
      }
      if (paymentIntent.status === "requires_action") {
        return json({
          status: "requires_action",
          client_secret: paymentIntent.client_secret,
          topup: { ...topup, stripe_payment_intent_id: paymentIntent.id },
        });
      }
      return json({ status: "pending", topup: { ...topup, stripe_payment_intent_id: paymentIntent.id } });
    }

    // --- list: cartões salvos ---
    if (action === "list") {
      const { data } = await admin
        .from("wiize_api_payment_methods")
        .select("id, brand, last4, exp_month, exp_year, is_default, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      return json({ methods: data || [] });
    }

    // --- set_default ---
    if (action === "set_default") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);

      await admin.rpc("wiize_api_ensure_wallet", { _user_id: user.id });

      const { data: row } = await admin
        .from("wiize_api_payment_methods")
        .select("id")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!row) return json({ error: "Cartão não encontrado" }, 404);

      await admin.from("wiize_api_payment_methods").update({ is_default: false }).eq("user_id", user.id);
      await admin.from("wiize_api_payment_methods").update({ is_default: true }).eq("id", id);
      await admin.from("wiize_api_wallets").update({ auto_topup_payment_method_id: id }).eq("user_id", user.id);

      return json({ ok: true });
    }

    // --- remove ---
    if (action === "remove") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);

      const { data: row } = await admin
        .from("wiize_api_payment_methods")
        .select("id, stripe_payment_method_id, is_default")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row) return json({ error: "Cartão não encontrado" }, 404);

      const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-11-20.acacia" });
      try {
        await stripe.paymentMethods.detach((row as any).stripe_payment_method_id);
      } catch (e) {
        log("detach failed", { error: String(e) });
      }

      await admin.from("wiize_api_payment_methods").update({ status: "removed", is_default: false }).eq("id", id);
      await admin.from("wiize_api_wallets").update({ auto_topup_payment_method_id: null }).eq("auto_topup_payment_method_id", id);

      // Se era o padrão, promove o mais recente ativo
      if ((row as any).is_default) {
        const { data: next } = await admin
          .from("wiize_api_payment_methods")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (next) {
          await admin.from("wiize_api_payment_methods").update({ is_default: true }).eq("id", (next as any).id);
          await admin.from("wiize_api_wallets").update({ auto_topup_payment_method_id: (next as any).id }).eq("user_id", user.id);
        }
      }

      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[wiize-api-card]", String(e));
    return json({ error: String((e as Error)?.message || e) || "Erro interno" }, 500);
  }
});
