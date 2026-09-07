// Rotina automática da Wiize API:
// 1) concilia recargas PIX pendentes com o Asaas (credita mesmo com a aba fechada)
// 2) concilia recargas de cartão pendentes com o Stripe
// 3) cancela recargas vencidas
// 4) dispara os e-mails de saldo baixo, erros de requisição e relatório mensal
import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const CRON_SECRETS = [
  Deno.env.get("WIIZE_API_CRON_SECRET"),
  Deno.env.get("FOLLOWUP_CRON_SECRET"),
  Deno.env.get("SDR_CRON_SECRET"),
].filter(Boolean) as string[];
const ASAAS_API = "https://api.asaas.com/v3";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const BRAND = {
  name: "Wiize API",
  color: "#3daa57",
  url: "https://wiize.com.br/api",
  from: "Wiize API <no-reply@wiize.com.br>",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function layout(body: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${BRAND.color};padding:20px 32px;color:#fff;font-size:18px;font-weight:700;">${BRAND.name}</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
<p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebe este aviso porque as notificações estão ativas no painel Wiize API.</p>
<p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;"><a href="${BRAND.url}/settings" style="color:${BRAND.color};">Gerenciar notificações</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function cta(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:${BRAND.color};color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${label}</a>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY não configurada");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: BRAND.from, to: [to], subject, html }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out?.message || "Falha no envio");
  return out?.id ?? null;
}

/** Grava o log com chave única — se já existir, o aviso não é reenviado. */
async function claim(userId: string, kind: string, dedupeKey: string, payload: unknown) {
  const { error } = await admin
    .from("wiize_api_notification_log")
    .insert({ user_id: userId, kind, dedupe_key: dedupeKey, payload: payload as Record<string, unknown> });
  return !error;
}

async function prefEnabled(userId: string, column: string) {
  const { data } = await admin
    .from("wiize_api_notification_prefs")
    .select(column)
    .eq("user_id", userId)
    .maybeSingle();
  const value = (data as Record<string, boolean> | null)?.[column];
  return value !== false;
}

async function userEmail(userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  return data?.user?.email || null;
}

async function asaas(path: string) {
  const key = Deno.env.get("ASAAS_API_KEY");
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_API}${path}`, {
    headers: { access_token: key, Accept: "application/json" },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.errors?.[0]?.description || "Falha no provedor de pagamento");
  return body;
}

/** 1) Concilia recargas pendentes diretamente no Asaas. */
async function reconcileTopups() {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: rows } = await admin
    .from("wiize_api_topups")
    .select("*")
    .eq("status", "pending")
    .not("asaas_payment_id", "is", null)
    .gte("created_at", since)
    .limit(200);

  let credited = 0;
  for (const row of rows || []) {
    try {
      const payment = await asaas(`/payments/${(row as any).asaas_payment_id}`);
      const status = String(payment?.status || "");
      if (["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"].includes(status)) {
        const { error } = await admin.rpc("wiize_api_credit_wallet", {
          _user_id: (row as any).user_id,
          _tokens: (row as any).tokens,
          _amount_brl: Number((row as any).amount_brl),
          _type: "CREDIT_PURCHASE",
          _description: `Recarga PIX de ${brl(Number((row as any).amount_brl))}`,
          _reference_type: "wiize_api_topup",
          _reference_id: (row as any).id,
          _idempotency_key: `topup_${(row as any).id}`,
        });
        if (!error) {
          await admin
            .from("wiize_api_topups")
            .update({
              status: "paid",
              paid_at: payment?.paymentDate ? new Date(payment.paymentDate).toISOString() : new Date().toISOString(),
              credited_at: new Date().toISOString(),
            })
            .eq("id", (row as any).id);
          credited++;
        }
      } else if (["REFUNDED", "OVERDUE", "CANCELED", "DELETED"].includes(status)) {
        await admin.from("wiize_api_topups").update({ status: "canceled" }).eq("id", (row as any).id);
      }
    } catch (e) {
      console.error("[wiize-api-cron] reconcile", (row as any).id, String(e));
    }
  }
  return credited;
}

/** 2) Concilia recargas de cartão pendentes diretamente no Stripe. */
async function reconcileStripeCardTopups() {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return 0;

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  const { data: rows } = await admin
    .from("wiize_api_topups")
    .select("*")
    .eq("status", "pending")
    .eq("provider", "stripe")
    .eq("method", "card")
    .not("stripe_payment_intent_id", "is", null)
    .gte("created_at", since)
    .limit(200);

  let credited = 0;
  for (const row of rows || []) {
    try {
      const pi = await stripe.paymentIntents.retrieve((row as any).stripe_payment_intent_id);
      if (pi.status === "succeeded") {
        const { error } = await admin.rpc("wiize_api_credit_wallet", {
          _user_id: (row as any).user_id,
          _tokens: (row as any).tokens,
          _amount_brl: Number((row as any).amount_brl),
          _type: "CREDIT_PURCHASE",
          _description: `Recarga cartão de ${Number((row as any).amount_brl).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          _reference_type: "wiize_api_topup",
          _reference_id: (row as any).id,
          _idempotency_key: `topup_${(row as any).id}`,
        });
        if (!error) {
          await admin
            .from("wiize_api_topups")
            .update({ status: "paid", paid_at: new Date().toISOString(), credited_at: new Date().toISOString() })
            .eq("id", (row as any).id);
          credited++;
        }
      } else if (["canceled", "payment_failed"].includes(pi.status)) {
        await admin
          .from("wiize_api_topups")
          .update({ status: "canceled", metadata: { failure_message: pi.last_payment_error?.message || "Pagamento recusado" } })
          .eq("id", (row as any).id);
      }
    } catch (e) {
      console.error("[wiize-api-cron] stripe reconcile", (row as any).id, String(e));
    }
  }
  return credited;
}

/** 2b) Recarga automática: cobra o cartão salvo quando o saldo cai abaixo do limite. */
async function autoReload(tokenPrice: number) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return 0;
  const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

  const { data: wallets } = await admin
    .from("wiize_api_wallets")
    .select(
      "user_id, balance_tokens, auto_topup_enabled, auto_topup_threshold_tokens, auto_topup_amount_brl, auto_topup_monthly_limit_brl, auto_topup_payment_method_id, status",
    )
    .eq("auto_topup_enabled", true)
    .limit(500);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  let charged = 0;
  for (const w of (wallets || []) as any[]) {
    try {
      if (w.status && w.status !== "active") continue;
      if (!w.auto_topup_payment_method_id) continue;
      const threshold = Number(w.auto_topup_threshold_tokens || 0);
      const amount = Number(w.auto_topup_amount_brl || 0);
      if (threshold <= 0 || amount <= 0) continue;
      if (Number(w.balance_tokens || 0) > threshold) continue;

      // Já existe uma recarga automática em aberto? Não duplica.
      const { data: openRow } = await admin
        .from("wiize_api_topups")
        .select("id")
        .eq("user_id", w.user_id)
        .eq("status", "pending")
        .gte("created_at", new Date(Date.now() - 6 * 3600_000).toISOString())
        .limit(1)
        .maybeSingle();
      if (openRow) continue;

      // Limite mensal de gasto automático.
      const limit = Number(w.auto_topup_monthly_limit_brl || 0);
      if (limit > 0) {
        const { data: monthRows } = await admin
          .from("wiize_api_topups")
          .select("amount_brl, metadata")
          .eq("user_id", w.user_id)
          .eq("status", "paid")
          .gte("created_at", monthStart.toISOString())
          .limit(500);
        const spentAuto = (monthRows || [])
          .filter((r: any) => r?.metadata?.auto_reload)
          .reduce((s: number, r: any) => s + Number(r.amount_brl || 0), 0);
        if (spentAuto + amount > limit) continue;
      }

      const { data: pm } = await admin
        .from("wiize_api_payment_methods")
        .select("stripe_payment_method_id, stripe_customer_id")
        .eq("id", w.auto_topup_payment_method_id)
        .eq("status", "active")
        .maybeSingle();
      if (!pm?.stripe_payment_method_id || !pm?.stripe_customer_id) continue;

      const tokens = Math.round(amount / tokenPrice);
      const { data: topup, error: topupErr } = await admin
        .from("wiize_api_topups")
        .insert({
          user_id: w.user_id,
          amount_brl: amount,
          tokens,
          provider: "stripe",
          method: "card",
          status: "pending",
          stripe_customer_id: pm.stripe_customer_id,
          expires_at: new Date(Date.now() + 3600_000).toISOString(),
          metadata: { auto_reload: true },
        })
        .select("id")
        .single();
      if (topupErr || !topup) continue;

      const pi = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "brl",
        customer: pm.stripe_customer_id,
        payment_method: pm.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Recarga automática Wiize API — ${tokens.toLocaleString("pt-BR")} tokens`,
        metadata: { wiize_api_topup_id: topup.id, wiize_api_user_id: w.user_id, auto_reload: "true" },
      }).catch((e) => {
        console.error("[wiize-api-cron] auto_reload pi", w.user_id, String(e));
        return null;
      });

      if (!pi) {
        await admin
          .from("wiize_api_topups")
          .update({ status: "canceled", metadata: { auto_reload: true, failure_message: "Cobrança recusada" } })
          .eq("id", topup.id);
        const email = await userEmail(w.user_id);
        if (email && (await claim(w.user_id, "auto_reload_failed", `${topup.id}`, {}))) {
          await sendEmail(
            email,
            "Falha na recarga automática — Wiize API",
            `<p>Não conseguimos cobrar seu cartão salvo para a recarga automática de ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.</p><p>Atualize o cartão em Billing → Formas de pagamento para manter sua API ativa.</p>`,
          );
        }
        continue;
      }

      await admin.from("wiize_api_topups").update({ stripe_payment_intent_id: pi.id }).eq("id", topup.id);

      if (pi.status === "succeeded") {
        const { error } = await admin.rpc("wiize_api_credit_wallet", {
          _user_id: w.user_id,
          _tokens: tokens,
          _amount_brl: amount,
          _type: "CREDIT_PURCHASE",
          _description: `Recarga automática de ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          _reference_type: "wiize_api_topup",
          _reference_id: topup.id,
          _idempotency_key: `topup_${topup.id}`,
        });
        if (!error) {
          await admin
            .from("wiize_api_topups")
            .update({ status: "paid", paid_at: new Date().toISOString(), credited_at: new Date().toISOString() })
            .eq("id", topup.id);
          charged++;
        }
      }
    } catch (e) {
      console.error("[wiize-api-cron] auto_reload", (w as any)?.user_id, String(e));
    }
  }
  return charged;
}

/** 3a) Saldo baixo — no máximo um aviso por dia por conta. */
async function lowBalanceAlerts(tokenPrice: number) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: wallets } = await admin
    .from("wiize_api_wallets")
    .select("user_id, balance_tokens, low_balance_threshold_tokens")
    .gt("low_balance_threshold_tokens", 0)
    .limit(1000);

  let sent = 0;
  for (const w of wallets || []) {
    const balance = Number((w as any).balance_tokens || 0);
    const threshold = Number((w as any).low_balance_threshold_tokens || 0);
    if (balance > threshold) continue;
    const userId = (w as any).user_id as string;
    if (!(await prefEnabled(userId, "low_balance"))) continue;
    if (!(await claim(userId, "low_balance", today, { balance, threshold }))) continue;
    const email = await userEmail(userId);
    if (!email) continue;
    try {
      await sendEmail(
        email,
        "Saldo baixo na sua conta Wiize API",
        layout(
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Seu saldo está acabando</h1>
           <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Saldo atual: <strong>${balance.toLocaleString("pt-BR")} tokens</strong> (${brl(balance * tokenPrice)}), abaixo do limite de <strong>${threshold.toLocaleString("pt-BR")} tokens</strong>.</p>
           ${cta(`${BRAND.url}/billing`, "Adicionar saldo")}`,
        ),
      );
      sent++;
    } catch (e) {
      console.error("[wiize-api-cron] low_balance", userId, String(e));
    }
  }
  return sent;
}

/** 3b) Erros de requisição — resumo diário quando há 10+ falhas em 24h. */
async function errorAlerts() {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: rows } = await admin
    .from("wiize_api_requests")
    .select("user_id, status_code, error_code")
    .gte("created_at", since)
    .gte("status_code", 400)
    .limit(5000);

  const byUser = new Map<string, { total: number; codes: Record<string, number> }>();
  for (const r of rows || []) {
    const uid = (r as any).user_id as string;
    if (!uid) continue;
    const entry = byUser.get(uid) || { total: 0, codes: {} };
    entry.total++;
    const code = String((r as any).error_code || (r as any).status_code);
    entry.codes[code] = (entry.codes[code] || 0) + 1;
    byUser.set(uid, entry);
  }

  let sent = 0;
  for (const [userId, entry] of byUser) {
    if (entry.total < 10) continue;
    if (!(await prefEnabled(userId, "request_errors"))) continue;
    if (!(await claim(userId, "request_errors", today, entry))) continue;
    const email = await userEmail(userId);
    if (!email) continue;
    const list = Object.entries(entry.codes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, n]) => `<li style="margin:0 0 4px;color:#3f3f46;font-size:14px;"><strong>${code}</strong> — ${n} ocorrência(s)</li>`)
      .join("");
    try {
      await sendEmail(
        email,
        "Falhas recorrentes nas suas chamadas Wiize API",
        layout(
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Detectamos falhas nas suas chamadas</h1>
           <p style="margin:0 0 12px;color:#3f3f46;font-size:15px;">Foram <strong>${entry.total}</strong> requisições com erro nas últimas 24 horas.</p>
           <ul style="margin:0 0 16px;padding-left:18px;">${list}</ul>
           ${cta(`${BRAND.url}/usage`, "Ver detalhes de uso")}`,
        ),
      );
      sent++;
    } catch (e) {
      console.error("[wiize-api-cron] request_errors", userId, String(e));
    }
  }
  return sent;
}

/** 3c) Relatório mensal — enviado no dia 1, referente ao mês fechado. */
async function monthlyReports(tokenPrice: number, force = false) {
  const now = new Date();
  if (!force && now.getUTCDate() !== 1) return 0;

  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const monthKey = start.toISOString().slice(0, 7);

  const { data: rows } = await admin
    .from("wiize_api_requests")
    .select("user_id, tokens_charged, status_code")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .limit(50000);

  const byUser = new Map<string, { requests: number; tokens: number; errors: number }>();
  for (const r of rows || []) {
    const uid = (r as any).user_id as string;
    if (!uid) continue;
    const e = byUser.get(uid) || { requests: 0, tokens: 0, errors: 0 };
    e.requests++;
    e.tokens += Number((r as any).tokens_charged || 0);
    if (Number((r as any).status_code) >= 400) e.errors++;
    byUser.set(uid, e);
  }

  let sent = 0;
  for (const [userId, e] of byUser) {
    if (!(await prefEnabled(userId, "monthly_report"))) continue;
    if (!(await claim(userId, "monthly_report", monthKey, e))) continue;
    const email = await userEmail(userId);
    if (!email) continue;
    try {
      await sendEmail(
        email,
        `Seu relatório mensal Wiize API — ${monthKey}`,
        layout(
          `<h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">Resumo de ${monthKey}</h1>
           <p style="margin:0 0 6px;color:#3f3f46;font-size:15px;">Requisições: <strong>${e.requests.toLocaleString("pt-BR")}</strong></p>
           <p style="margin:0 0 6px;color:#3f3f46;font-size:15px;">Tokens consumidos: <strong>${e.tokens.toLocaleString("pt-BR")}</strong></p>
           <p style="margin:0 0 6px;color:#3f3f46;font-size:15px;">Custo total: <strong>${brl(e.tokens * tokenPrice)}</strong></p>
           <p style="margin:0 0 16px;color:#3f3f46;font-size:15px;">Falhas: <strong>${e.errors.toLocaleString("pt-BR")}</strong></p>
           ${cta(`${BRAND.url}/usage`, "Abrir painel de uso")}`,
        ),
      );
      sent++;
    } catch (err) {
      console.error("[wiize-api-cron] monthly_report", userId, String(err));
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const cronHeader = req.headers.get("x-cron-secret") || "";
  const authorized = token === SERVICE_ROLE || (!!cronHeader && CRON_SECRETS.includes(cronHeader));
  if (!authorized) return json({ error: "Não autorizado" }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const force = Boolean((body as any)?.force_monthly);

    const { data: limits } = await admin.from("wiize_api_limits").select("key, value");
    const map: Record<string, number> = {};
    for (const row of limits || []) map[(row as any).key] = Number((row as any).value);
    const tokenPrice = map.token_price_brl || 0.01;

    const credited = await reconcileTopups();
    const creditedCards = await reconcileStripeCardTopups();
    const { data: expired } = await admin.rpc("wiize_api_expire_topups");
    const lowBalance = await lowBalanceAlerts(tokenPrice);
    const errors = await errorAlerts();
    const monthly = await monthlyReports(tokenPrice, force);

    return json({ ok: true, credited, creditedCards, expired: expired ?? 0, emails: { lowBalance, errors, monthly } });
  } catch (e) {
    console.error("[wiize-api-cron]", String(e));
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
