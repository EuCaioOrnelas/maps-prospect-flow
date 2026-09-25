// =============================================================
// MÓDULO SEGURO DE EXPORTAÇÃO — API PRINCIPAL (Wiize Pay prep)
// Self-contained: nenhum import de pasta compartilhada.
//
// Autenticação multicamada:
//   sessão (JWT) → permissão (owner/admin) → Senha de Integração
//   (PBKDF2 + salt + bloqueio progressivo) → confirmação por e-mail
//   (token de uso único, hash-only, 30 min).
//
// READY_FOR_WIIZE_PAY: nada aqui chama o Wiize Pay; apenas prepara
// autorização, escopos, conexões e auditoria.
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = "Wiize <suporte@wiize.com.br>";
const BUCKET = "integration-exports";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// -------------------------------------------------------------
// Entidades exportáveis (labels, tabelas e campos)
// -------------------------------------------------------------
const ENTITY_DEFS: Record<
  string,
  { label: string; table: string; extraFilter?: Record<string, unknown>; fields: Record<string, string> }
> = {
  leads: {
    label: "Empresas e contatos (CRM)",
    table: "leads",
    fields: {
      id: "ID", company_name: "Empresa", contact_name: "Contato", phone: "Telefone",
      email: "E-mail", category: "Categoria", city: "Cidade", region: "Região",
      address: "Endereço", website: "Website", origin: "Origem", source: "Fonte",
      prospected_at: "Prospecção", ai_score: "Pontuação IA",
      estimated_value: "Valor estimado", pipeline_stage_id: "Etapa do funil",
      tags: "Tags", whatsapp_status: "Status WhatsApp",
      google_maps_link: "Google Maps", has_responded: "Respondeu",
      responded_at: "Resposta em", created_at: "Criado em", updated_at: "Atualizado em",
      responsible_user_id: "Responsável",
    },
  },
  vendas: {
    label: "Negócios e vendas",
    table: "lead_deals",
    fields: {
      id: "ID", lead_id: "Lead (ID)", title: "Título", value: "Valor",
      sale_type: "Tipo", contract_type: "Contrato", contract_months: "Meses",
      payment_method: "Pagamento", status: "Status", start_date: "Início",
      expiration_date: "Fim", closed_at: "Fechamento", notes: "Notas",
      receipt_url: "Recibo", contract_url: "Contrato",
      responsible_user_id: "Responsável", created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  contratos: {
    label: "Contratos (vendas recorrentes)",
    table: "lead_deals",
    extraFilter: { sale_type: "recurring" },
    fields: {
      id: "ID", lead_id: "Lead (ID)", title: "Título", value: "Valor mensal",
      contract_months: "Meses", status: "Status", start_date: "Início",
      expiration_date: "Fim", responsible_user_id: "Responsável",
      created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  atividades: {
    label: "Atividades",
    table: "lead_activities",
    fields: {
      id: "ID", lead_id: "Lead (ID)", activity_type: "Tipo",
      description: "Descrição", created_at: "Data",
    },
  },
  notas: {
    label: "Histórico e notas",
    table: "lead_notes",
    fields: { id: "ID", lead_id: "Lead (ID)", content: "Conteúdo", user_id: "Autor", created_at: "Data" },
  },
  anexos: {
    label: "Anexos (referência)",
    table: "lead_files",
    fields: {
      id: "ID", lead_id: "Lead (ID)", file_name: "Arquivo", file_type: "Tipo",
      file_size: "Tamanho", created_at: "Data",
    },
  },
  formularios: {
    label: "Formulários",
    table: "forms",
    fields: {
      id: "ID", name: "Nome", slug: "Slug", title: "Título", description: "Descrição",
      status: "Status", crm_enabled: "Integrado ao CRM", created_at: "Criado em",
      updated_at: "Atualizado em",
    },
  },
  respostas_formulario: {
    label: "Respostas de formulários",
    table: "form_submissions",
    fields: {
      id: "ID", form_id: "Formulário (ID)", lead_id: "Lead (ID)", data: "Dados",
      utm_source: "UTM origem", utm_medium: "UTM mídia", utm_campaign: "UTM campanha",
      landing_url: "Página", device: "Dispositivo", detected_source: "Origem detectada",
      created_at: "Data",
    },
  },
  produtos: {
    label: "Produtos e serviços",
    table: "company_services",
    fields: {
      id: "ID", name: "Nome", average_ticket: "Ticket médio",
      description: "Descrição", created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  etapas_e_configuracoes: {
    label: "Etapas do funil e configurações",
    table: "pipeline_stages",
    fields: { id: "ID", name: "Nome", position: "Posição", color: "Cor", is_default: "Padrão" },
  },
};

// -------------------------------------------------------------
// Helpers de criptografia (mesmo esquema dos relatórios compartilhados)
// -------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const m = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(m.map((b) => parseInt(b, 16)));
}

async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2", salt: useSalt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS, hash: "SHA-256",
    },
    keyMaterial, 256,
  );
  return `${toHex(useSalt)}:${toHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const computed = await hashPassword(password, fromHex(saltHex));
  if (computed.length !== `${saltHex}:${hashHex}`.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ `${saltHex}:${hashHex}`.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// -------------------------------------------------------------
// Autenticação de sessão e permissões
// -------------------------------------------------------------
interface Session {
  userId: string;
  ownerId: string;
  role: string;
  email: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anon: any;
}

async function getSession(req: Request): Promise<Session | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const anon = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error } = await anon.auth.getUser();
  if (error || !userData?.user) return null;
  const user = userData.user;

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: profile } = await adminClient
    .from("profiles")
    .select("account_role, parent_owner_id, email, name")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.account_role || "owner";
  const ownerId = profile?.parent_owner_id || user.id;

  return {
    userId: user.id,
    ownerId,
    role,
    email: profile?.email || user.email || "",
    name: profile?.name || "",
    anon,
  };
}

function isPrivileged(session: Session): boolean {
  return ["owner", "admin"].includes(session.role);
}

async function checkRateLimit(identifier: string, endpoint: string, max = 10, windowSec = 60): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: max,
      p_window_seconds: windowSec,
    });
    if (error) return true; // falha aberta apenas para o rate limit (não é controle de segurança primário)
    return data !== false;
  } catch {
    return true;
  }
}

// -------------------------------------------------------------
// Auditoria (nunca registra senha/token/secret/conteúdo sensível)
// -------------------------------------------------------------
async function audit(params: {
  ownerId: string; userId?: string; requestId?: string; action: string;
  ip?: string; userAgent?: string; scope?: unknown; status?: string;
  errorMessage?: string; authMethod?: string; emailSent?: boolean;
}) {
  const ipRaw = (params.ip || "").split(",")[0].trim();
  const { error } = await admin.from("integration_export_audit_logs").insert({
    owner_user_id: params.ownerId,
    user_id: params.userId || null,
    request_id: params.requestId || null,
    action: params.action,
    method: "integration-export",
    ip: ipRaw || null,
    user_agent: (params.userAgent || "").slice(0, 500) || null,
    scope: params.scope ? params.scope : null,
    status: params.status || null,
    error_message: params.errorMessage ? params.errorMessage.slice(0, 500) : null,
    auth_method: params.authMethod || null,
    email_sent: params.emailSent ?? null,
  });
  if (error) console.error("[integration-export] audit insert failed:", error.message);
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "e-mail cadastrado";
  const [local, domain] = email.split("@");
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

// -------------------------------------------------------------
// Senha de Integração
// -------------------------------------------------------------
const PASSWORD_MIN_LENGTH = 10;

function passwordProblems(pw: string): string[] {
  const problems: string[] = [];
  if (pw.length < PASSWORD_MIN_LENGTH) problems.push(`mínimo de ${PASSWORD_MIN_LENGTH} caracteres`);
  if (!/[A-Z]/.test(pw)) problems.push("ao menos uma letra maiúscula");
  if (!/[a-z]/.test(pw)) problems.push("ao menos uma letra minúscula");
  if (!/[0-9]/.test(pw)) problems.push("ao menos um número");
  if (!/[^A-Za-z0-9]/.test(pw)) problems.push("ao menos um caractere especial");
  return problems;
}

async function getState(ownerId: string) {
  const [{ data: settings }, { data: conn }] = await Promise.all([
    admin
      .from("integration_settings")
      .select("id, password_set_at, failed_attempts, locked_until, updated_at")
      .eq("owner_user_id", ownerId)
      .maybeSingle(),
    admin
      .from("integration_connections")
      .select("provider, status, scopes, updated_at")
      .eq("owner_user_id", ownerId)
      .maybeSingle(),
  ]);

  const now = Date.now();
  const locked = !!settings?.locked_until && new Date(settings.locked_until).getTime() > now;

  return {
    password_set: !!settings?.password_set_at,
    password_set_at: settings?.password_set_at || null,
    failed_attempts: settings?.failed_attempts || 0,
    locked,
    locked_until: locked ? settings.locked_until : null,
    connection: conn || { provider: "wiize_pay", status: "pending", ready_for_wiize_pay: true },
  };
}

async function getSettingsRow(ownerId: string) {
  const { data } = await admin
    .from("integration_settings")
    .select("id, password_hash, password_set_at, failed_attempts, locked_until")
    .eq("owner_user_id", ownerId)
    .maybeSingle();
  return data;
}

// -------------------------------------------------------------
// Visão geral (contagens por entidade)
// -------------------------------------------------------------
async function buildOverview(ownerId: string) {
  const nowIso = new Date().toISOString();
  const entities: Record<string, { count: number; label: string }> = {};

  for (const [key, def] of Object.entries(ENTITY_DEFS)) {
    let query = admin.from(def.table).select("id", { count: "exact", head: true }).eq("owner_user_id", ownerId);
    if (def.extraFilter) {
      for (const [col, val] of Object.entries(def.extraFilter)) query = query.eq(col, val as string);
    }
    const { count } = await query;
    entities[key] = { count: count || 0, label: def.label };
  }

  return {
    format: "wiize-crm-export",
    schema_version: "1.0",
    destination: "READY_FOR_WIIZE_PAY",
    generated_at: nowIso,
    entities,
    note:
      "Nenhum dado é enviado ao Wiize Pay nesta etapa. A conexão de destino só será ativada quando o Wiize Pay estiver disponível (OAuth 2.0 / autorização delegada).",
  };
}

// -------------------------------------------------------------
// E-mail de confirmação
// -------------------------------------------------------------
async function sendConfirmationEmail(opts: {
  to: string; name: string; confirmUrl: string; requestId: string; expiresInMinutes: number;
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[integration-export] RESEND_API_KEY ausente — e-mail não enviado");
    return false;
  }
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a2e">
    <h2 style="color:#0f3460;margin-bottom:8px">Confirmação de exportação de dados</h2>
    <p>Olá${opts.name ? `, ${opts.name}` : ""},</p>
    <p>Recebemos uma solicitação para <strong>exportar os dados do seu CRM Wiize</strong> para preparação da integração com o Wiize Pay.</p>
    <p>Para autorizar esta operação, confirme no botão abaixo. O link expira em <strong>${opts.expiresInMinutes} minutos</strong> e pode ser usado <strong>apenas uma vez</strong>.</p>
    <p style="margin:24px 0">
      <a href="${opts.confirmUrl}" style="background:#0f3460;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Autorizar exportação</a>
    </p>
    <p style="font-size:13px;color:#555">Solicitação: <code>${opts.requestId}</code></p>
    <p style="font-size:13px;color:#555">Se você não solicitou esta exportação, ignore este e-mail e considere trocar sua Senha de Integração em Configurações → Integrações.</p>
    <p style="font-size:12px;color:#999">Wiize — este é um e-mail automático de segurança.</p>
  </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [opts.to],
        subject: "Confirme a exportação dos seus dados — Wiize",
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("[integration-export] e-mail error:", e);
    return false;
  }
}

// -------------------------------------------------------------
// Ações protegidas por Senha de Integração
// -------------------------------------------------------------
const LOCK_BASE_MINUTES = 15;

async function verifyIntegrationPassword(ownerId: string, password: string): Promise<
  { ok: true } | { ok: false; error: string; lockedUntil?: string }
> {
  const row = await getSettingsRow(ownerId);
  if (!row?.password_hash) return { ok: false, error: "Senha de Integração ainda não foi definida." };

  const now = Date.now();
  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    return { ok: false, error: "Conta temporariamente bloqueada por tentativas inválidas. Tente novamente mais tarde.", lockedUntil: row.locked_until };
  }

  const ok = await verifyPassword(password, row.password_hash);
  if (ok) {
    await admin
      .from("integration_settings")
      .update({ failed_attempts: 0, locked_until: null })
      .eq("owner_user_id", ownerId);
    return { ok: true };
  }

  const attempts = (row.failed_attempts || 0) + 1;
  const lockMin = attempts >= 5 ? LOCK_BASE_MINUTES * Math.min(attempts - 4, 4) : 0;
  await admin
    .from("integration_settings")
    .update({
      failed_attempts: attempts,
      locked_until: lockMin > 0 ? new Date(now + lockMin * 60000).toISOString() : null,
    })
    .eq("owner_user_id", ownerId);

  return {
    ok: false,
    error:
      attempts >= 5
        ? `Senha incorreta. Conta bloqueada por ${lockMin} minutos após ${attempts} tentativas inválidas.`
        : `Senha incorreta (${attempts} de 5 tentativas antes do bloqueio).`,
  };
}

async function requirePassword(session: Session, password: unknown) {
  if (typeof password !== "string" || !password) {
    return { error: json({ error: "Senha de Integração obrigatória." }, 400) };
  }
  const result = await verifyIntegrationPassword(session.ownerId, password);
  if (!result.ok) return { error: json({ error: result.error, locked_until: result.lockedUntil || null }, 401) };
  return {};
}

// -------------------------------------------------------------
// Fluxo de exportação: solicitar → confirmar por e-mail → processar
// -------------------------------------------------------------
const TOKEN_TTL_MINUTES = 30;

async function requestExport(session: Session, body: any, req: Request): Promise<Response> {
  const pwCheck = await requirePassword(session, body?.integration_password);
  if (pwCheck.error) return pwCheck.error;

  const state = await getState(session.ownerId);
  if (state.locked) return json({ error: "Conta temporariamente bloqueada." }, 423);

  const scope = body?.scope && typeof body.scope === "object" ? body.scope : {};
  const entities = Object.keys(ENTITY_DEFS).filter((k) => scope[k] !== false);
  if (entities.length === 0) return json({ error: "Selecione ao menos uma entidade para exportar." }, 400);

  const idempotencyKey = typeof body?.idempotency_key === "string" ? body.idempotency_key : null;
  const effectiveScope: Record<string, boolean> = {};
  for (const k of entities) effectiveScope[k] = true;

  // Idempotência: mesma chave + mesmo escopo → retorna a solicitação existente
  if (idempotencyKey) {
    const { data: existing } = await admin
      .from("integration_export_requests")
      .select("id, status, created_at, scope, confirmation_method")
      .eq("owner_user_id", session.ownerId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existing) {
      const sameScope = JSON.stringify(existing.scope || {}) === JSON.stringify(effectiveScope);
      if (sameScope && existing.status === "pending") {
        return json({ ok: true, request_id: existing.id, status: existing.status, reused: true, email_sent_to: maskEmail(session.email) });
      }
      return json({ error: "Esta chave de idempotência já foi usada com um escopo diferente. Gere uma nova chave." }, 409);
    }
  }

  const { data: request, error: reqError } = await admin
    .from("integration_export_requests")
    .insert({
      owner_user_id: session.ownerId,
      created_by: session.userId,
      idempotency_key: idempotencyKey,
      status: "pending",
      scope: effectiveScope,
      confirmation_method: "email_code",
    })
    .select("id")
    .single();
  if (reqError || !request) {
    console.error("[integration-export] request insert failed:", reqError?.message);
    return json({ error: "Não foi possível registrar a solicitação de exportação." }, 500);
  }

  // Token de confirmação: hash-only no banco, uso único, 30 min
  const rawToken = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60000).toISOString();
  const { error: tokenError } = await admin.from("integration_export_tokens").insert({
    owner_user_id: session.ownerId,
    request_id: request.id,
    token_hash: tokenHash,
    purpose: "confirm_export",
    expires_at: expiresAt,
    created_by: session.userId,
  });
  if (tokenError) {
    console.error("[integration-export] token insert failed:", tokenError.message);
    await admin.from("integration_export_requests").update({ status: "failed", error_message: "falha ao gerar token" }).eq("id", request.id);
    return json({ error: "Não foi possível gerar o token de confirmação." }, 500);
  }

  const origin = req.headers.get("origin") || "https://wiize.com.br";
  const confirmUrl = `${origin}/configuracoes/integracoes/wiize-pay?confirm=${rawToken}&request=${request.id}`;
  const emailSent = await sendConfirmationEmail({
    to: session.email, name: session.name, confirmUrl, requestId: request.id, expiresInMinutes: TOKEN_TTL_MINUTES,
  });

  await audit({
    ownerId: session.ownerId, userId: session.userId, requestId: request.id,
    action: "request_export", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
    scope: effectiveScope, status: "pending", authMethod: "password", emailSent,
  });

  if (!emailSent) {
    return json({ ok: true, request_id: request.id, status: "pending", email_sent: false, warning: "E-mail de confirmação não pôde ser enviado. Verifique a configuração de e-mail do sistema." });
  }

  return json({
    ok: true,
    request_id: request.id,
    status: "pending",
    email_sent: true,
    email_sent_to: maskEmail(session.email),
    token_expires_at: expiresAt,
  });
}

async function confirmExport(session: Session, body: any, req: Request): Promise<Response> {
  const rawToken = typeof body?.token === "string" ? body.token.trim() : "";
  const requestId = typeof body?.request_id === "string" ? body.request_id : "";
  if (!rawToken || !requestId) return json({ error: "Token e solicitação são obrigatórios." }, 400);

  const tokenHash = await sha256Hex(rawToken);
  const { data: tokenRow } = await admin
    .from("integration_export_tokens")
    .select("id, owner_user_id, request_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .eq("request_id", requestId)
    .maybeSingle();

  if (!tokenRow || tokenRow.owner_user_id !== session.ownerId) {
    await audit({ ownerId: session.ownerId, userId: session.userId, requestId, action: "confirm_export", status: "invalid_token", errorMessage: "token inválido", authMethod: "email_token", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "" });
    return json({ error: "Token de confirmação inválido." }, 401);
  }
  if (tokenRow.used_at) return json({ error: "Este token já foi utilizado. Solicite uma nova exportação." }, 410);
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) return json({ error: "Token expirado. Solicite uma nova exportação." }, 410);

  const { data: requestRow } = await admin
    .from("integration_export_requests")
    .select("id, status, scope")
    .eq("id", requestId)
    .eq("owner_user_id", session.ownerId)
    .maybeSingle();
  if (!requestRow) return json({ error: "Solicitação de exportação não encontrada." }, 404);
  if (requestRow.status !== "pending") return json({ error: `Solicitação não está mais pendente (status atual: ${requestRow.status}).` }, 409);

  // Uso único: marca o token imediatamente
  const { error: useError } = await admin
    .from("integration_export_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenRow.id)
    .is("used_at", null);
  if (useError) return json({ error: "Não foi possível validar o token. Tente novamente." }, 500);

  const { error: updError } = await admin
    .from("integration_export_requests")
    .update({ status: "authorized", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "pending");
  if (updError) return json({ error: "Não foi possível autorizar a exportação." }, 500);

  // Dispara o processador de forma assíncrona (best-effort; o cron também cobre)
  try {
    const { data: cronRow } = await admin
      .from("internal_cron_tokens")
      .select("token")
      .eq("name", "integration-export-processor")
      .maybeSingle();
    if (cronRow?.token) {
      fetch(`${SUPABASE_URL}/functions/v1/integration-export-processor`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": cronRow.token },
        body: JSON.stringify({ request_id: requestId }),
      }).catch(() => {});
    }
  } catch (e) {
    console.error("[integration-export] processor trigger failed:", e);
  }

  await audit({
    ownerId: session.ownerId, userId: session.userId, requestId,
    action: "confirm_export", status: "authorized", authMethod: "email_token",
    ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
  });

  return json({ ok: true, request_id: requestId, status: "authorized" });
}

// -------------------------------------------------------------
// Download, cancelamento e demais ações
// -------------------------------------------------------------
function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

async function downloadExport(session: Session, body: any, req: Request): Promise<Response> {
  const requestId = typeof body?.request_id === "string" ? body.request_id : "";
  if (!requestId) return json({ error: "request_id obrigatório." }, 400);

  const { data: requestRow } = await admin
    .from("integration_export_requests")
    .select("id, status, file_path, expires_at, checksum, file_size")
    .eq("id", requestId)
    .eq("owner_user_id", session.ownerId)
    .maybeSingle();

  if (!requestRow) return json({ error: "Exportação não encontrada." }, 404);
  if (requestRow.status !== "completed") return json({ error: `Exportação não está pronta (status: ${requestRow.status}).` }, 409);
  if (new Date(requestRow.expires_at).getTime() < Date.now()) return json({ error: "Esta exportação expirou. Solicite uma nova." }, 410);
  if (!requestRow.file_path) return json({ error: "Arquivo não disponível." }, 404);

  const { data: signed, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(requestRow.file_path, 3600, { download: true });
  if (error || !signed) return json({ error: "Não foi possível gerar o link de download." }, 500);

  await audit({
    ownerId: session.ownerId, userId: session.userId, requestId,
    action: "download", status: "ok", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
  });

  return json({
    ok: true,
    url: signed.signedUrl,
    expires_in_seconds: 3600,
    checksum: requestRow.checksum,
    file_size: requestRow.file_size,
    note: "Link assinado de uso legítimo apenas para a conta solicitante. Não compartilhe.",
  });
}

async function cancelExport(session: Session, body: any, req: Request): Promise<Response> {
  const requestId = typeof body?.request_id === "string" ? body.request_id : "";
  if (!requestId) return json({ error: "request_id obrigatório." }, 400);

  const { data: requestRow } = await admin
    .from("integration_export_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("owner_user_id", session.ownerId)
    .maybeSingle();
  if (!requestRow) return json({ error: "Exportação não encontrada." }, 404);
  if (!["pending", "authorized"].includes(requestRow.status)) {
    return json({ error: `Não é possível cancelar uma exportação com status ${requestRow.status}.` }, 409);
  }

  const { error } = await admin
    .from("integration_export_requests")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return json({ error: "Não foi possível cancelar." }, 500);

  await audit({
    ownerId: session.ownerId, userId: session.userId, requestId,
    action: "cancel", status: "cancelled", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
  });
  return json({ ok: true, request_id: requestId, status: "cancelled" });
}

// -------------------------------------------------------------
// Handler principal
// -------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const session = await getSession(req);
    if (!session) return json({ error: "Não autenticado." }, 401);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const action = typeof body?.action === "string" ? body.action : "";
    if (!action) return json({ error: "Ação obrigatória." }, 400);

    // Rate limit por usuário + ação
    const allowed = await checkRateLimit(session.userId, `integration-export:${action}`, 20, 60);
    if (!allowed) return json({ error: "Muitas tentativas. Aguarde um minuto." }, 429);

    switch (action) {
      // --- Abertos a qualquer membro owner/admin (leitura de estado) ---
      case "overview": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const overview = await buildOverview(session.ownerId);
        const state = await getState(session.ownerId);
        return json({ ok: true, overview, state });
      }

      case "get_state": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const state = await getState(session.ownerId);
        return json({ ok: true, state });
      }

      case "list": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const { data, error } = await admin
          .from("integration_export_requests")
          .select("id, status, scope, record_counts, file_size, checksum, confirmation_method, error_message, expires_at, completed_at, created_at")
          .eq("owner_user_id", session.ownerId)
          .order("created_at", { ascending: false })
          .limit(50);
        if (error) return json({ error: "Falha ao listar exportações." }, 500);
        return json({ ok: true, exports: data || [] });
      }

      case "history": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const requestId = typeof body?.request_id === "string" ? body.request_id : null;
        let query = admin
          .from("integration_export_audit_logs")
          .select("id, request_id, action, status, ip, user_agent, scope, record_count, error_message, auth_method, email_sent, created_at")
          .eq("owner_user_id", session.ownerId)
          .order("created_at", { ascending: false })
          .limit(100);
        if (requestId) query = query.eq("request_id", requestId);
        const { data, error } = await query;
        if (error) return json({ error: "Falha ao carregar auditoria." }, 500);
        return json({ ok: true, logs: data || [] });
      }

      // --- Definir/trocar Senha de Integração ---
      case "set_password":
      case "change_password": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem alterar a Senha de Integração." }, 403);
        const newPassword = typeof body?.new_password === "string" ? body.new_password : "";
        const problems = passwordProblems(newPassword);
        if (problems.length > 0) {
          return json({ error: `Senha não atende aos requisitos: ${problems.join(", ")}.` }, 400);
        }

        const current = await getSettingsRow(session.ownerId);

        // Ao trocar, exige a senha atual (autenticação multicamada)
        if (current?.password_hash && action === "change_password") {
          const pwCheck = await requirePassword(session, body?.current_password);
          if (pwCheck.error) return pwCheck.error;
        }

        const hash = await hashPassword(newPassword);
        const nowIso = new Date().toISOString();
        if (current) {
          await admin
            .from("integration_settings")
            .update({ password_hash: hash, password_set_at: nowIso, failed_attempts: 0, locked_until: null, updated_by: session.userId, updated_at: nowIso })
            .eq("owner_user_id", session.ownerId);
        } else {
          await admin
            .from("integration_settings")
            .insert({ owner_user_id: session.ownerId, password_hash: hash, password_set_at: nowIso, updated_by: session.userId });
        }

        // Troca de senha revoga tokens de confirmação pendentes
        await admin
          .from("integration_export_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("owner_user_id", session.ownerId)
          .is("used_at", null);

        await audit({
          ownerId: session.ownerId, userId: session.userId,
          action: action === "set_password" ? "set_password" : "change_password",
          status: "ok", authMethod: "session", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
        });
        return json({ ok: true, password_set: true });
      }

      // --- Fluxo protegido pela Senha de Integração ---
      case "request_export":
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem solicitar exportações." }, 403);
        return await requestExport(session, body, req);

      case "confirm_export":
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem confirmar exportações." }, 403);
        return await confirmExport(session, body, req);

      case "status": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const requestId = typeof body?.request_id === "string" ? body.request_id : "";
        if (!requestId) return json({ error: "request_id obrigatório." }, 400);
        const { data } = await admin
          .from("integration_export_requests")
          .select("id, status, record_counts, file_size, checksum, manifest, error_message, expires_at, completed_at, created_at")
          .eq("id", requestId)
          .eq("owner_user_id", session.ownerId)
          .maybeSingle();
        if (!data) return json({ error: "Exportação não encontrada." }, 404);
        return json({ ok: true, export: data });
      }

      case "download":
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem baixar exportações." }, 403);
        return await downloadExport(session, body, req);

      case "cancel":
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem cancelar exportações." }, 403);
        return await cancelExport(session, body, req);

      // --- Configuração de exportação (preset / entidades) ---
      case "save_config": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem alterar a configuração." }, 403);
        const preset = typeof body?.preset === "string" ? body.preset : "wiize_pay_minimo";
        const entityConfig = body?.entity_config && typeof body.entity_config === "object" ? body.entity_config : {};
        const { error } = await admin.from("integration_export_configs").upsert({
          owner_user_id: session.ownerId,
          preset,
          entity_config: entityConfig,
          updated_by: session.userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "owner_user_id" });
        if (error) return json({ error: "Não foi possível salvar a configuração." }, 500);
        await audit({
          ownerId: session.ownerId, userId: session.userId, action: "save_config",
          status: "ok", scope: entityConfig, ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
        });
        return json({ ok: true });
      }

      case "get_config": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const { data } = await admin
          .from("integration_export_configs")
          .select("preset, entity_config, updated_at")
          .eq("owner_user_id", session.ownerId)
          .maybeSingle();
        return json({ ok: true, config: data || { preset: "wiize_pay_minimo", entity_config: {} } });
      }

      // --- Conexão Wiize Pay: apenas preparação / revogação ---
      case "connection_status": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem acessar." }, 403);
        const { data } = await admin
          .from("integration_connections")
          .select("provider, status, scopes, last_sync_at, sync_status, revoked_at, created_at, updated_at")
          .eq("owner_user_id", session.ownerId)
          .maybeSingle();
        return json({
          ok: true,
          connection: data || null,
          ready_for_wiize_pay: true,
          note:
            "READY_FOR_WIIZE_PAY: a conexão real será estabelecida apenas quando o Wiize Pay estiver disponível, via OAuth 2.0 com escopos delegados. Nenhuma credencial ou acesso direto ao banco é compartilhado.",
        });
      }

      case "revoke_connection": {
        if (!isPrivileged(session)) return json({ error: "Apenas o proprietário ou administradores podem revogar a conexão." }, 403);
        const pwCheck = await requirePassword(session, body?.integration_password);
        if (pwCheck.error) return pwCheck.error;

        const nowIso = new Date().toISOString();
        await admin.from("integration_connections").upsert({
          owner_user_id: session.ownerId,
          provider: "wiize_pay",
          status: "revoked",
          revoked_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: "owner_user_id" });

        await audit({
          ownerId: session.ownerId, userId: session.userId, action: "revoke_connection",
          status: "revoked", authMethod: "password", ip: clientIp(req), userAgent: req.headers.get("user_agent") || "",
        });
        return json({ ok: true, status: "revoked" });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (e) {
    console.error("[integration-export] unhandled error:", e);
    return json({ error: "Erro interno ao processar a solicitação." }, 500);
  }
});






