import { createClient } from "npm:@supabase/supabase-js@2.49.1";

// ========== INLINED AI KEY CRYPTO (sem _shared) ==========
// Criptografia AES-256-GCM das chaves de IA dos clientes (BYOK).
// A chave mestra vive apenas no ambiente das edge functions (AI_CREDENTIALS_SECRET).
async function masterKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("AI_CREDENTIALS_SECRET");
  if (!raw) throw new Error("AI_CREDENTIALS_SECRET não configurada");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toB64(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s);
}

async function encryptApiKey(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await masterKey(),
      new TextEncoder().encode(plain),
    ),
  );
  const out = new Uint8Array(iv.length + cipher.length);
  out.set(iv);
  out.set(cipher, iv.length);
  return toB64(out);
}

function keyHint(plain: string): string {
  return `sk-••••${plain.slice(-4)}`;
}
// ========== FIM INLINED AI KEY CRYPTO ==========

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Valida a chave direto na OpenAI antes de salvar. */
async function validateOpenAIKey(apiKey: string, model: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "ping" }],
    }),
  });
  if (res.ok) return { ok: true as const };
  const text = await res.text();
  if (res.status === 401) return { ok: false as const, message: "Chave inválida ou revogada na OpenAI." };
  if (res.status === 429 || text.includes("insufficient_quota")) {
    return {
      ok: false as const,
      message:
        "A chave é válida, mas a conta da OpenAI está sem créditos ou sem método de pagamento. Adicione créditos em platform.openai.com/settings/organization/billing.",
    };
  }
  if (res.status === 404) {
    return { ok: false as const, message: `Sua conta OpenAI ainda não tem acesso ao modelo ${model}. Escolha outro modelo.` };
  }
  return { ok: false as const, message: `OpenAI recusou a chave (${res.status}).` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "").trim();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth?.user) return json({ error: "Unauthorized" }, 401);
    const userId = auth.user.id;

    // Credencial fica na conta (dono), para valer também para os colaboradores
    const { data: ownerId } = await supabase.rpc("get_account_owner", { _uid: userId });
    const accountId: string = (ownerId as string) || userId;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? "status";
    const provider = "openai";

    const { data: existing } = await supabase
      .from("user_ai_credentials")
      .select("id,provider,key_hint,model,is_active,last_validated_at,encrypted_key")
      .eq("user_id", accountId)
      .eq("provider", provider)
      .maybeSingle();

    if (action === "status") {
      return json({
        connected: !!existing?.encrypted_key,
        provider,
        key_hint: existing?.key_hint ?? null,
        model: existing?.model ?? "gpt-4o-mini",
        last_validated_at: existing?.last_validated_at ?? null,
        allowed_models: ALLOWED_MODELS,
      });
    }

    if (action === "delete") {
      if (existing?.id) {
        await supabase.from("user_ai_credentials").delete().eq("id", existing.id);
      }
      return json({ connected: false });
    }

    if (action === "save") {
      const apiKey: string = String(body.apiKey ?? "").trim();
      const model: string = ALLOWED_MODELS.includes(body.model) ? body.model : "gpt-4o-mini";

      if (!apiKey && existing?.encrypted_key) {
        // Apenas troca de modelo, mantendo a chave já salva
        await supabase.from("user_ai_credentials").update({ model, updated_at: new Date().toISOString() }).eq("id", existing.id);
        return json({ connected: true, model, key_hint: existing.key_hint });
      }

      if (!apiKey.startsWith("sk-") || apiKey.length < 20) {
        return json({ error: "Formato de chave inválido. A chave da OpenAI começa com sk-." }, 400);
      }

      const check = await validateOpenAIKey(apiKey, model);
      if (!check.ok) return json({ error: check.message }, 400);

      const payload = {
        user_id: accountId,
        owner_user_id: accountId,
        provider,
        api_key: null,
        encrypted_key: await encryptApiKey(apiKey),
        key_hint: keyHint(apiKey),
        model,
        is_active: true,
        last_validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase.from("user_ai_credentials").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_ai_credentials").insert(payload);
        if (error) throw error;
      }

      return json({ connected: true, model, key_hint: payload.key_hint, last_validated_at: payload.last_validated_at });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    console.error("[ai-credentials]", e);
    return json({ error: (e as Error).message ?? "Erro inesperado" }, 500);
  }
});
