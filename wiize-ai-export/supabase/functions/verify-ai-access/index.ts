// Edge Function: verify-ai-access
// Roda no projeto Wiize AI (Supabase lqfqnqfeuneorxocybru)
// Valida login + plano (growth/scale ativo) usando os profiles do próprio banco.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ai-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLANS = ["growth", "scale"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1) Shared secret (opcional mas recomendado)
    const requiredSecret = Deno.env.get("WIIZE_AI_SHARED_SECRET");
    if (requiredSecret) {
      const provided = req.headers.get("x-ai-secret");
      if (provided !== requiredSecret) {
        return json({ error: "forbidden" }, 403);
      }
    }

    // 2) Body
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return json({ error: "missing_credentials" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 3) Valida senha (cliente anon faz o signIn)
    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: signIn, error: signInErr } =
      await authClient.auth.signInWithPassword({ email, password });

    if (signInErr || !signIn.user || !signIn.session) {
      return json(
        { error: "invalid_credentials", reason: "invalid_credentials" },
        401
      );
    }

    const user = signIn.user;

    // 4) Busca o profile com service role (bypass RLS)
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: profile, error: profileErr } = await adminClient
      .from("profiles")
      .select(
        "id, email, name, plan, is_blocked, subscription_current_period_end, trial_end_at"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return json({ error: "profile_not_found" }, 404);
    }

    // 5) Bloqueado?
    if (profile.is_blocked) {
      return json({ authorized: false, reason: "blocked" }, 403);
    }

    // 6) Plano permitido?
    if (!ALLOWED_PLANS.includes(profile.plan)) {
      return json(
        {
          authorized: false,
          reason: "no_access",
          current_plan: profile.plan,
          required_plans: ALLOWED_PLANS,
        },
        403
      );
    }

    // 7) Assinatura ativa?
    const endsAt = profile.subscription_current_period_end
      ? new Date(profile.subscription_current_period_end)
      : null;
    if (!endsAt || endsAt < new Date()) {
      return json(
        { authorized: false, reason: "expired", expires_at: endsAt },
        403
      );
    }

    // 8) OK!
    return json({
      authorized: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        plan: profile.plan,
        expires_at: profile.subscription_current_period_end,
      },
      // Token do Supabase (caso queira usar pra criar sessão nativa lá)
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    });
  } catch (err) {
    console.error("verify-ai-access error:", err);
    return json(
      { error: "internal_error", message: String(err?.message || err) },
      500
    );
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
