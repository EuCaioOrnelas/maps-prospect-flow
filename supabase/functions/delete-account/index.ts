// Exclusão definitiva de conta iniciada pelo próprio usuário.
// Fluxo: request_code (envia código por e-mail) -> confirm (valida código,
// cancela cobranças Stripe/Asaas, apaga todos os dados e o login).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (step: string, details?: unknown) =>
  console.log(`[delete-account] ${step}`, details ? JSON.stringify(details) : "");

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function cancelStripe(email: string) {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key || !email) return { ok: false, reason: "sem chave/e-mail" };
  const headers = { Authorization: `Bearer ${key}` };
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
      { headers },
    );
    if (!res.ok) return { ok: false, reason: `busca ${res.status}: ${await res.text()}` };
    const { data: customers = [] } = await res.json();
    for (const c of customers) {
      const subsRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${c.id}&status=all&limit=100`,
        { headers },
      );
      if (subsRes.ok) {
        const { data: subs = [] } = await subsRes.json();
        for (const s of subs) {
          if (["canceled", "incomplete_expired"].includes(s.status)) continue;
          await fetch(`https://api.stripe.com/v1/subscriptions/${s.id}`, {
            method: "DELETE",
            headers,
          });
        }
      }
      await fetch(`https://api.stripe.com/v1/customers/${c.id}`, { method: "DELETE", headers });
    }
    return { ok: true, customers: customers.length };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

async function cancelAsaas(customerId?: string | null, subscriptionIds: (string | null)[] = []) {
  const key = Deno.env.get("ASAAS_API_KEY");
  if (!key) return { ok: false, reason: "sem chave" };
  const headers = { access_token: key, "Content-Type": "application/json" };
  const base = "https://api.asaas.com/v3";
  try {
    for (const sid of subscriptionIds.filter(Boolean)) {
      await fetch(`${base}/subscriptions/${sid}`, { method: "DELETE", headers });
    }
    if (customerId) {
      const subs = await fetch(`${base}/subscriptions?customer=${customerId}&limit=100`, {
        headers,
      });
      if (subs.ok) {
        const { data = [] } = await subs.json();
        for (const s of data) {
          await fetch(`${base}/subscriptions/${s.id}`, { method: "DELETE", headers });
        }
      }
      await fetch(`${base}/customers/${customerId}`, { method: "DELETE", headers });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

async function sendCodeEmail(email: string, name: string, code: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY ausente");
  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
    <h2 style="margin:0 0 12px">Confirmação de exclusão de conta</h2>
    <p style="margin:0 0 12px">Olá${name ? `, ${name}` : ""}. Recebemos um pedido para excluir sua conta Wiize.</p>
    <p style="margin:0 0 8px">Seu código de verificação é:</p>
    <p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:12px 0;color:#0f9d58">${code}</p>
    <p style="margin:0 0 12px;font-size:13px;color:#555">O código expira em 15 minutos. A exclusão é <b>permanente e irreversível</b>: apaga leads, contatos, números, conversas, relatórios e cancela assinaturas ativas.</p>
    <p style="margin:0;font-size:13px;color:#555">Se não foi você, ignore este e-mail e troque sua senha.</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Wiize <seguranca@wiize.com.br>",
      to: [email],
      subject: "Código para excluir sua conta Wiize",
      html,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userErr } = await authClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Sessão inválida" }, 401);

    const user = userData.user;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { action, code, confirmation } = await req.json().catch(() => ({}) as any);

    if (action === "request_code") {
      const { data: profile } = await admin
        .from("profiles")
        .select("email, name")
        .eq("id", user.id)
        .maybeSingle();
      const email = (profile as any)?.email || user.email;
      if (!email) return json({ error: "Conta sem e-mail cadastrado" }, 400);

      const plain = String(Math.floor(100000 + Math.random() * 900000));
      await admin.from("account_deletion_requests").delete().eq("user_id", user.id);
      await admin.from("account_deletion_requests").insert({
        user_id: user.id,
        code_hash: await sha256(plain),
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      });
      await sendCodeEmail(email, (profile as any)?.name || "", plain);
      log("code sent", { user: user.id });
      return json({ success: true, email });
    }

    if (action === "confirm") {
      if (String(confirmation || "").trim().toUpperCase() !== "EXCLUIR") {
        return json({ error: 'Digite EXCLUIR para confirmar.' }, 400);
      }
      const { data: reqRow } = await admin
        .from("account_deletion_requests")
        .select("id, code_hash, expires_at, consumed_at, attempts")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!reqRow) return json({ error: "Solicite um novo código." }, 400);
      if ((reqRow as any).consumed_at) return json({ error: "Código já utilizado." }, 400);
      if (new Date((reqRow as any).expires_at) < new Date())
        return json({ error: "Código expirado. Solicite outro." }, 400);
      if ((reqRow as any).attempts >= 5)
        return json({ error: "Muitas tentativas. Solicite um novo código." }, 429);

      const hash = await sha256(String(code || "").trim());
      if (hash !== (reqRow as any).code_hash) {
        await admin
          .from("account_deletion_requests")
          .update({ attempts: (reqRow as any).attempts + 1 })
          .eq("id", (reqRow as any).id);
        return json({ error: "Código inválido." }, 400);
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("email, name, plan, asaas_customer_id, asaas_subscription_id, trial_asaas_customer_id, trial_asaas_subscription_id")
        .eq("id", user.id)
        .maybeSingle();
      const p: any = profile || {};
      const email = p.email || user.email || "";

      const stripe = await cancelStripe(email);
      const asaas = await cancelAsaas(p.asaas_customer_id || p.trial_asaas_customer_id, [
        p.asaas_subscription_id,
        p.trial_asaas_subscription_id,
      ]);

      await admin.from("security_audit_log").insert({
        user_id: user.id,
        action: "self_delete_account",
        resource_type: "profiles",
        resource_id: user.id,
        metadata: { email, plan: p.plan, stripe, asaas },
      });

      const { data: purged, error: purgeErr } = await admin.rpc("purge_account_data", {
        _user_id: user.id,
      });
      if (purgeErr) {
        log("purge error", purgeErr.message);
        return json({ error: `Falha ao apagar os dados: ${purgeErr.message}` }, 500);
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
      if (delErr) {
        log("auth delete error", delErr.message);
        return json({ error: `Dados apagados, mas o login não pôde ser removido: ${delErr.message}` }, 500);
      }

      log("account deleted", { user: user.id, purged });
      return json({ success: true, stripe, asaas });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("unexpected", msg);
    return json({ error: msg }, 500);
  }
});
