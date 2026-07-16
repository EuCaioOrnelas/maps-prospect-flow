// Reutiliza a RPC public.check_rate_limit já existente no projeto.
// Chave composta: <client>:<user>:<endpoint>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimit(params: {
  clientId: string;
  userId: string;
  endpoint: string;
  maxRequests?: number;
  windowSeconds?: number;
}): Promise<RateLimitResult> {
  const identifier = `int:${params.clientId}:${params.userId}`;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: params.endpoint,
      p_max_requests: params.maxRequests ?? 60,
      p_window_seconds: params.windowSeconds ?? 60,
    });
    if (error) {
      // Fail-open (não derrubar o serviço se a RPC não responder) mas logar.
      console.warn("[integration] rate-limit RPC error:", error.message);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    // check_rate_limit retorna boolean OU jsonb {allowed, retry_after}
    if (typeof data === "boolean") {
      return { allowed: data, retryAfterSeconds: data ? 0 : 60 };
    }
    const allowed = Boolean((data as any)?.allowed);
    const retry = Number((data as any)?.retry_after ?? 60);
    return { allowed, retryAfterSeconds: allowed ? 0 : retry };
  } catch (e) {
    console.warn("[integration] rate-limit exception:", (e as Error).message);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
