// Autenticação em duas camadas:
//   1) client_id + client_secret  -> prova que a chamada vem de um produto autorizado (ex: Wian)
//   2) JWT do usuário Wiize       -> identifica user_id e company_id (multi-tenant)
//
// Nunca confiar em user_id/company_id vindos do body — sempre derivar do JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EXPECTED_CLIENT_ID = Deno.env.get("INTEGRATION_WIAN_CLIENT_ID") ?? "";
const EXPECTED_CLIENT_SECRET = Deno.env.get("INTEGRATION_WIAN_CLIENT_SECRET") ?? "";

// Constant-time string comparison to prevent timing attacks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export function verifyClient(req: Request): { ok: true; clientId: string } | { ok: false; code: "AUTH_MISSING_CLIENT" | "AUTH_INVALID_CLIENT" } {
  const cid = req.headers.get("x-integration-client-id") ?? "";
  const cse = req.headers.get("x-integration-client-secret") ?? "";
  if (!cid || !cse) return { ok: false, code: "AUTH_MISSING_CLIENT" };
  if (!EXPECTED_CLIENT_ID || !EXPECTED_CLIENT_SECRET) {
    // Servidor mal configurado — trata como inválido, nunca revelar detalhe.
    return { ok: false, code: "AUTH_INVALID_CLIENT" };
  }
  const idOk = safeEqual(cid, EXPECTED_CLIENT_ID);
  const secretOk = safeEqual(cse, EXPECTED_CLIENT_SECRET);
  if (!idOk || !secretOk) return { ok: false, code: "AUTH_INVALID_CLIENT" };
  return { ok: true, clientId: cid };
}

export interface AuthenticatedUser {
  userId: string;
  companyId: string; // isolamento multi-tenant — sempre derivado do profile
  email: string | null;
}

export async function verifyUser(req: Request): Promise<
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; code: "AUTH_MISSING_USER_TOKEN" | "AUTH_INVALID_USER_TOKEN" | "PERM_NO_COMPANY" }
> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return { ok: false, code: "AUTH_MISSING_USER_TOKEN" };
  const token = authHeader.slice(7);

  const sb = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) return { ok: false, code: "AUTH_INVALID_USER_TOKEN" };

  const userId = data.claims.sub as string;
  const email = (data.claims.email as string | undefined) ?? null;

  // Recupera company_id via profile. Para Wiize, tratamos o próprio user_id como
  // company_id do tenant (single-user account), a menos que account_members indique
  // que o usuário pertence a uma conta pai.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: member } = await admin
    .from("account_members")
    .select("account_owner_id, status")
    .eq("member_user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const companyId = (member?.account_owner_id as string | undefined) ?? userId;
  if (!companyId) return { ok: false, code: "PERM_NO_COMPANY" };
  return { ok: true, user: { userId, companyId, email } };
}
