// ============================================================
// Registro central de custos de IA.
// Toda chamada a um modelo (OpenAI direto ou Lovable AI Gateway)
// deve chamar logAiUsage() para que o custo real apareça no
// painel /admin/ia-custos.
// ============================================================

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
} | null | undefined;

// Preço por token (USD). Fonte: tabela pública OpenAI.
const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};

const normalizeModel = (model: string) => model.replace(/^openai\//, "").trim();

export const estimateCostUsd = (model: string, tokensIn: number, tokensOut: number) => {
  const price = PRICES[normalizeModel(model)] ?? PRICES["gpt-4o-mini"];
  return tokensIn * price.in + tokensOut * price.out;
};

export interface LogAiUsageParams {
  /** Identificador da operação, ex.: "approach-lead", "support-chat". */
  feature: string;
  model: string;
  /** Objeto `usage` devolvido pela API (quando existir). */
  usage?: Usage;
  tokens_in?: number;
  tokens_out?: number;
  /** Custo explícito (ex.: Whisper cobrado por minuto). */
  cost_usd?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Grava o consumo de IA em public.ai_usage_logs.
 * Nunca lança: falha de log jamais pode derrubar a operação principal.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const tokensIn = params.tokens_in ?? params.usage?.prompt_tokens ?? 0;
    const tokensOut = params.tokens_out ?? params.usage?.completion_tokens ?? 0;
    const cost = params.cost_usd ?? estimateCostUsd(params.model, tokensIn, tokensOut);

    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: params.feature,
        model: normalizeModel(params.model),
        user_id: params.user_id ?? null,
        tokens_in: Math.round(tokensIn),
        tokens_out: Math.round(tokensOut),
        cost_usd: Number(cost.toFixed(8)),
        metadata: params.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] failed to log usage", String(e));
  }
}
