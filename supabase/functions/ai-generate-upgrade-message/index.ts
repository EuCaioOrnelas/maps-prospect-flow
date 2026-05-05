import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  channel: "email" | "whatsapp";
  user: {
    id?: string;
    name?: string | null;
    email?: string;
    searches_used?: number;
    searches_limit?: number;
  };
  // For email broadcast: generic single message, no per-user personalization
  generic?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const { data: userData } = await supa.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const { data: roleRow } = await supa
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = (await req.json()) as Body;
    const { channel, user, generic } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_key" }, 500);

    const usagePct = user?.searches_used && user?.searches_limit
      ? Math.round((user.searches_used / user.searches_limit) * 100)
      : null;

    const firstName = (user?.name || "").split(" ")[0] || "";

    let systemPrompt = "";
    let userPrompt = "";

    if (channel === "email") {
      systemPrompt = `Você é especialista em copywriting B2B SaaS para a Wiize (plataforma de prospecção e CRM). Gere um email de upgrade do plano Free para um plano pago (Start ou Growth).

REGRAS OBRIGATÓRIAS:
- Tom: consultivo, premium, direto. Nada de emoji excessivo.
- Foque no fato de que o usuário JÁ está usando bastante (uso alto = valor percebido).
- Mostre o ganho concreto do upgrade: mais oportunidades/mês, automações, IA, WhatsApp em massa, CRM com scoring.
- CTA claro para upgrade.
- HTML simples (apenas <p>, <strong>, <a>). SEM <html>/<body>/<style>.
- Inclua um botão CTA no final apontando para https://wiize.com.br/planos
- Português do Brasil.

RETORNE APENAS JSON com este formato exato:
{"subject": "...", "content": "..."}`;

      userPrompt = generic
        ? `Email genérico (sem personalização) para múltiplos usuários Free com uso alto. Use "Olá," sem nome.`
        : `Usuário: ${firstName || "(sem nome)"}
Email: ${user.email}
Uso atual: ${user.searches_used}/${user.searches_limit} oportunidades (${usagePct}%)
Personalize com o primeiro nome.`;
    } else {
      // whatsapp
      systemPrompt = `Você gera mensagens FRIAS de WhatsApp B2B para a Wiize. Tom humano, curto (máx 4 linhas), direto, em PT-BR. Sem emoji excessivo. Sem marketês. Soa como um SDR consultivo.

CONTEXTO: O destinatário é um usuário Free que está usando muito a plataforma. Mensagem é uma sondagem oferecendo upgrade. Termine com pergunta aberta convidando resposta.

RETORNE APENAS JSON: {"content": "mensagem aqui"}`;

      userPrompt = `Nome: ${firstName || "(usar saudação genérica)"}
Uso: ${user.searches_used}/${user.searches_limit} oportunidades este mês (${usagePct}%).`;
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "rate_limit" }, 429);
      if (aiRes.status === 402) return json({ error: "no_credits" }, 402);
      console.error("AI error", aiRes.status, txt);
      return json({ error: "ai_failed" }, 500);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { content: raw };
    }

    return json(parsed);
  } catch (e) {
    console.error("ai-generate-upgrade-message error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
