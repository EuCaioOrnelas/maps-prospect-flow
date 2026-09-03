// Painel admin da Wiize API: contas, saldos, consumo, receita, custos e ajustes manuais.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const TOKEN_PRICE_BRL = 0.01;
// Custo interno estimado por operação (BRL, USD 5,50)
const OP_COST_BRL: Record<string, number> = {
  "prospecting.search": 0.0069,
  "prospecting.analyze": 0.006,
  "prospecting.approach": 0.0051,
};
const ENDPOINT_OP: Record<string, string> = {
  "/v1/prospecting/search": "prospecting.search",
  "/v1/prospecting/analyze": "prospecting.analyze",
  "/v1/prospecting/approach": "prospecting.approach",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Não autorizado" }, 401);

    const { data: { user }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !user) return json({ error: "Sessão inválida ou expirada" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Acesso restrito" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String((body as any)?.action || "overview");
    const days = Math.min(Math.max(Number((body as any)?.days) || 30, 1), 180);
    const since = new Date(Date.now() - days * 86400000).toISOString();

    if (action === "overview") {
      const [wallets, profiles, topups, requests, keys] = await Promise.all([
        admin.from("wiize_api_wallets").select("user_id, balance_tokens, reserved_tokens, lifetime_credited_tokens, lifetime_spent_tokens, status"),
        admin.from("wiize_api_profiles").select("user_id, full_name, company_name, created_at"),
        admin.from("wiize_api_topups").select("id, user_id, amount_brl, tokens, status, method, created_at, paid_at").gte("created_at", since).order("created_at", { ascending: false }),
        admin.from("wiize_api_requests").select("user_id, endpoint, status_code, tokens_charged, duration_ms, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
        admin.from("wiize_api_keys").select("user_id, status"),
      ]);

      const reqs = requests.data || [];
      const tops = topups.data || [];

      const revenueBrl = tops.filter((t) => t.status === "paid").reduce((s, t) => s + Number(t.amount_brl || 0), 0);
      const consumedTokens = reqs.reduce((s, r) => s + Number(r.tokens_charged || 0), 0);
      const consumedBrl = consumedTokens * TOKEN_PRICE_BRL;

      let costBrl = 0;
      const byEndpoint: Record<string, { requests: number; tokens: number; cost: number; errors: number }> = {};
      const byDay: Record<string, { date: string; tokens: number; requests: number; cost: number }> = {};
      for (const r of reqs) {
        const op = ENDPOINT_OP[r.endpoint] || "";
        const c = r.status_code >= 200 && r.status_code < 300 ? (OP_COST_BRL[op] || 0) : 0;
        costBrl += c;
        const e = (byEndpoint[r.endpoint] ||= { requests: 0, tokens: 0, cost: 0, errors: 0 });
        e.requests += 1;
        e.tokens += Number(r.tokens_charged || 0);
        e.cost += c;
        if (r.status_code >= 400) e.errors += 1;
        const day = String(r.created_at).slice(0, 10);
        const d = (byDay[day] ||= { date: day, tokens: 0, requests: 0, cost: 0 });
        d.tokens += Number(r.tokens_charged || 0);
        d.requests += 1;
        d.cost += c;
      }

      const profileMap = new Map((profiles.data || []).map((p) => [p.user_id, p]));
      const activeKeys = (keys.data || []).filter((k) => k.status === "active").length;

      const usageByUser: Record<string, { tokens: number; requests: number; cost: number }> = {};
      for (const r of reqs) {
        const u = (usageByUser[r.user_id] ||= { tokens: 0, requests: 0, cost: 0 });
        u.tokens += Number(r.tokens_charged || 0);
        u.requests += 1;
        u.cost += r.status_code < 300 ? (OP_COST_BRL[ENDPOINT_OP[r.endpoint] || ""] || 0) : 0;
      }

      const accounts = (wallets.data || []).map((w) => {
        const p: any = profileMap.get(w.user_id);
        const u = usageByUser[w.user_id] || { tokens: 0, requests: 0, cost: 0 };
        return {
          user_id: w.user_id,
          name: p?.company_name || p?.full_name || "—",
          created_at: p?.created_at || null,
          status: w.status,
          balance_tokens: w.balance_tokens,
          reserved_tokens: w.reserved_tokens,
          lifetime_credited_tokens: w.lifetime_credited_tokens,
          lifetime_spent_tokens: w.lifetime_spent_tokens,
          period_tokens: u.tokens,
          period_requests: u.requests,
          period_cost_brl: Number(u.cost.toFixed(4)),
        };
      }).sort((a, b) => b.period_tokens - a.period_tokens);

      return json({
        period_days: days,
        totals: {
          accounts: accounts.length,
          active_keys: activeKeys,
          revenue_brl: Number(revenueBrl.toFixed(2)),
          consumed_tokens: consumedTokens,
          consumed_brl: Number(consumedBrl.toFixed(2)),
          cost_brl: Number(costBrl.toFixed(2)),
          margin_brl: Number((consumedBrl - costBrl).toFixed(2)),
          margin_pct: consumedBrl > 0 ? Number((((consumedBrl - costBrl) / consumedBrl) * 100).toFixed(1)) : 0,
          requests: reqs.length,
          errors: reqs.filter((r) => r.status_code >= 400).length,
          float_tokens: (wallets.data || []).reduce((s, w) => s + Number(w.balance_tokens || 0), 0),
          pending_topups: tops.filter((t) => t.status === "pending").length,
        },
        by_endpoint: Object.entries(byEndpoint).map(([endpoint, v]) => ({
          endpoint,
          ...v,
          cost: Number(v.cost.toFixed(4)),
          revenue: Number((v.tokens * TOKEN_PRICE_BRL).toFixed(2)),
        })),
        by_day: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
          ...d,
          cost: Number(d.cost.toFixed(4)),
          revenue: Number((d.tokens * TOKEN_PRICE_BRL).toFixed(2)),
        })),
        accounts,
        topups: tops.slice(0, 100).map((t) => ({
          ...t,
          name: (profileMap.get(t.user_id) as any)?.company_name || (profileMap.get(t.user_id) as any)?.full_name || "—",
        })),
        recent_requests: reqs.slice(0, 100),
      });
    }

    if (action === "adjust") {
      const userId = String((body as any)?.user_id || "");
      const tokens = Math.round(Number((body as any)?.tokens || 0));
      const reason = String((body as any)?.reason || "Ajuste manual do administrador").slice(0, 200);
      if (!userId || !tokens) return json({ error: "user_id e tokens são obrigatórios" }, 422);

      const { data, error } = await admin.rpc("wiize_api_credit_wallet", {
        _user_id: userId,
        _tokens: tokens,
        _amount_brl: Number((tokens * TOKEN_PRICE_BRL).toFixed(2)),
        _type: tokens > 0 ? "adjustment_credit" : "adjustment_debit",
        _description: reason,
        _reference_type: "admin_adjustment",
        _reference_id: user.id,
        _idempotency_key: `adj_${userId}_${Date.now()}`,
      });
      if (error) throw error;
      return json({ ok: true, result: data });
    }

    if (action === "set_status") {
      const userId = String((body as any)?.user_id || "");
      const status = String((body as any)?.status || "");
      if (!userId || !["active", "blocked"].includes(status)) return json({ error: "Parâmetros inválidos" }, 422);
      const { error } = await admin.from("wiize_api_wallets").update({ status }).eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "pricing") {
      const items = Array.isArray((body as any)?.items) ? (body as any).items : null;
      if (items) {
        for (const it of items) {
          await admin.from("wiize_api_pricing").update({ tokens: Math.max(0, Math.round(Number(it.tokens) || 0)) }).eq("operation", String(it.operation));
        }
      }
      const { data } = await admin.from("wiize_api_pricing").select("*").order("operation");
      return json({ pricing: data || [] });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[wiize-api-admin]", String(e));
    return json({ error: "Erro interno" }, 500);
  }
});
