// Diagnóstico temporário: valida preços de assinatura, endpoint de webhook e chaves de pagamento.
import Stripe from "npm:stripe@14.21.0";

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PRICES = [
  ["start.monthly", "price_1TYl5KK8CM0R6xMMeHUhKt7s"],
  ["start.annual", "price_1TLZkSK8CM0R6xMMwr1Ke1IX"],
  ["growth.monthly", "price_1UBNs5K8CM0R6xMMJAnZEQdm"],
  ["growth.annual", "price_1TLZn8K8CM0R6xMMaEz5JuVW"],
  ["bump.1", "price_1TYdiXK8CM0R6xMMqnhxGM1V"],
  ["bump.2", "price_1TYdkPK8CM0R6xMMXHTfihdw"],
  ["bump.3", "price_1TYdknK8CM0R6xMM9TXjGFf5"],
];

Deno.serve(async (req) => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const cron = req.headers.get("x-cron-secret") || "";
  const secrets = ["WIIZE_API_CRON_SECRET", "FOLLOWUP_CRON_SECRET", "SDR_CRON_SECRET"].map((k) => Deno.env.get(k)).filter(Boolean);
  const ok = token === SERVICE_ROLE || (!!cron && secrets.includes(cron));
  if (!ok) return new Response("no", { status: 401 });

  const key = Deno.env.get("STRIPE_SECRET_KEY") || "";
  const out: Record<string, unknown> = {
    stripe_key: key ? `${key.slice(0, 7)}… (${key.startsWith("sk_live") ? "live" : "test"})` : "MISSING",
    asaas_key: Deno.env.get("ASAAS_API_KEY") ? "ok" : "MISSING",
    stripe_webhook_secret: Deno.env.get("STRIPE_WEBHOOK_SECRET") ? "ok" : "MISSING",
  };

  if (key) {
    const stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
    const prices: Record<string, string> = {};
    for (const [label, id] of PRICES) {
      try {
        const p = await stripe.prices.retrieve(id, { expand: ["product"] });
        prices[label] = `${p.active ? "ativo" : "INATIVO"} · ${(p.unit_amount || 0) / 100} ${p.currency} · ${p.recurring?.interval || "one_time"} · ${(p.product as any)?.name || ""}`;
      } catch (e) {
        prices[label] = `ERRO: ${String((e as Error).message)}`;
      }
    }
    out.prices = prices;

    try {
      const eps = await stripe.webhookEndpoints.list({ limit: 20 });
      const wanted = ["payment_intent.succeeded", "payment_intent.payment_failed", "charge.refunded"];
      const fix = new URL(req.url).searchParams.get("fix") === "1";
      const report: unknown[] = [];
      for (const e of eps.data) {
        let events = e.enabled_events;
        if (fix && e.status === "enabled" && e.url.includes("/functions/v1/stripe-webhook")) {
          const merged = Array.from(new Set([...events, ...wanted]));
          const up = await stripe.webhookEndpoints.update(e.id, { enabled_events: merged as any });
          events = up.enabled_events;
        }
        report.push({ url: e.url, status: e.status, missing: wanted.filter((w) => !events.includes(w)) });
      }
      out.webhooks = report;
    } catch (e) {
      out.webhooks = `ERRO: ${String((e as Error).message)}`;
    }
  }

  try {
    const res = await fetch("https://api.asaas.com/v3/webhooks", {
      headers: { access_token: Deno.env.get("ASAAS_API_KEY") || "", Accept: "application/json" },
    });
    const body = await res.json().catch(() => ({}));
    out.asaas_webhooks = res.ok
      ? (body?.data || []).map((w: any) => ({ url: w.url, enabled: w.enabled, events: w.events?.length }))
      : `ERRO ${res.status}`;
  } catch (e) {
    out.asaas_webhooks = `ERRO: ${String((e as Error).message)}`;
  }

  return new Response(JSON.stringify(out, null, 2), { headers: { "Content-Type": "application/json" } });
});
