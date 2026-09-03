// Recarga de saldo da Wiize API — PIX via Asaas. Autenticado por JWT da conta API.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ASAAS_API = "https://api.asaas.com/v3";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const TOKEN_PRICE_BRL = 0.01;
const MIN_TOPUP = 20;
const MAX_TOPUP = 5000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function log(step: string, details?: unknown) {
  console.log(`[WIIZE-API-TOPUP] ${step}${details ? ` ${JSON.stringify(details)}` : ""}`);
}

async function asaas(path: string, init: RequestInit = {}) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${ASAAS_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      access_token: apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    log("asaas error", { path, status: res.status, body });
    throw new Error(body?.errors?.[0]?.description || "Falha na comunicação com o provedor de pagamento");
  }
  return body;
}

async function ensureCustomer(userId: string, email: string) {
  const { data: profile } = await admin
    .from("wiize_api_profiles")
    .select("full_name, company_name, doc_number, phone, postal_code, street, street_number, complement, neighborhood, city, state")
    .eq("user_id", userId)
    .maybeSingle();

  const cpfCnpj = String(profile?.doc_number || "").replace(/\D/g, "");
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    throw new Error("Cadastre um CPF ou CNPJ válido nas configurações antes de recarregar.");
  }

  const found = await asaas(`/customers?cpfCnpj=${cpfCnpj}&limit=1`);
  if (found?.data?.length > 0) return found.data[0].id as string;

  const created = await asaas("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: profile?.company_name || profile?.full_name || email,
      email,
      cpfCnpj,
      mobilePhone: String(profile?.phone || "").replace(/\D/g, "") || undefined,
      postalCode: String(profile?.postal_code || "").replace(/\D/g, "") || undefined,
      address: profile?.street || undefined,
      addressNumber: profile?.street_number || undefined,
      complement: profile?.complement || undefined,
      province: profile?.neighborhood || undefined,
      externalReference: `wiize_api_${userId}`,
    }),
  });
  return created.id as string;
}

async function creditTopup(row: any, paidAt: string) {
  const { data, error } = await admin.rpc("wiize_api_credit_wallet", {
    _user_id: row.user_id,
    _tokens: row.tokens,
    _amount_brl: Number(row.amount_brl),
    _type: "topup",
    _description: `Recarga PIX de R$ ${Number(row.amount_brl).toFixed(2)}`,
    _reference_type: "wiize_api_topup",
    _reference_id: row.id,
    _idempotency_key: `topup_${row.id}`,
  });
  if (error) throw error;

  await admin
    .from("wiize_api_topups")
    .update({ status: "paid", paid_at: paidAt, credited_at: new Date().toISOString() })
    .eq("id", row.id);

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: apiProfile } = await admin
      .from("wiize_api_profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!apiProfile) return json({ error: "Conta Wiize API não encontrada" }, 403);

    await admin.rpc("wiize_api_ensure_wallet", { _user_id: user.id });

    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action || "create");

    if (action === "create") {
      const amount = Math.round(Number((body as any)?.amount_brl || 0) * 100) / 100;
      if (!Number.isFinite(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
        return json({ error: `Informe um valor entre R$ ${MIN_TOPUP} e R$ ${MAX_TOPUP}.` }, 422);
      }

      const tokens = Math.round(amount / TOKEN_PRICE_BRL);
      const customerId = await ensureCustomer(user.id, user.email || "");

      const { data: topup, error: insErr } = await admin
        .from("wiize_api_topups")
        .insert({
          user_id: user.id,
          amount_brl: amount,
          tokens,
          asaas_customer_id: customerId,
        })
        .select("*")
        .single();
      if (insErr) throw insErr;

      const dueDate = new Date().toISOString().slice(0, 10);
      const payment = await asaas("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: amount,
          dueDate,
          description: `Recarga Wiize API — ${tokens.toLocaleString("pt-BR")} tokens`,
          externalReference: `wiize_api_topup_${topup.id}`,
        }),
      });

      const qr = await asaas(`/payments/${payment.id}/pixQrCode`);

      const { data: updated } = await admin
        .from("wiize_api_topups")
        .update({
          asaas_payment_id: payment.id,
          pix_payload: qr?.payload || null,
          pix_qr_image: qr?.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null,
          expires_at: qr?.expirationDate ? new Date(qr.expirationDate).toISOString() : topup.expires_at,
        })
        .eq("id", topup.id)
        .select("id, amount_brl, tokens, status, pix_payload, pix_qr_image, expires_at")
        .single();

      return json({ topup: updated });
    }

    if (action === "status") {
      const id = String((body as any)?.id || "");
      if (!id) return json({ error: "id é obrigatório" }, 422);

      const { data: row } = await admin
        .from("wiize_api_topups")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row) return json({ error: "Recarga não encontrada" }, 404);

      if (row.status === "paid") return json({ status: "paid", topup: row });

      if (row.asaas_payment_id) {
        const payment = await asaas(`/payments/${row.asaas_payment_id}`);
        const status = String(payment?.status || "");
        if (status === "CONFIRMED" || status === "RECEIVED" || status === "RECEIVED_IN_CASH") {
          await creditTopup(row, payment?.paymentDate ? new Date(payment.paymentDate).toISOString() : new Date().toISOString());
          return json({ status: "paid" });
        }
        if (["REFUNDED", "OVERDUE", "CANCELED", "DELETED"].includes(status)) {
          await admin.from("wiize_api_topups").update({ status: "canceled" }).eq("id", row.id);
          return json({ status: "canceled" });
        }
      }

      return json({ status: "pending" });
    }

    if (action === "cancel") {
      const id = String((body as any)?.id || "");
      await admin
        .from("wiize_api_topups")
        .update({ status: "canceled" })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("status", "pending");
      return json({ ok: true });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[wiize-api-topup]", String(e));
    return json({ error: String((e as Error)?.message || e) || "Erro interno" }, 500);
  }
});
