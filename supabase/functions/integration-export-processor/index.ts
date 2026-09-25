// =============================================================
// MÓDULO SEGURO DE EXPORTAÇÃO — PROCESSADOR (Wiize Pay prep)
// Self-contained: nenhum import de pasta compartilhada.
// Gera o pacote de exportação em background, grava no bucket
// privado `integration-exports` e atualiza a solicitação.
//
// Auth: apenas service_role (Bearer) OU x-cron-secret válido
// (token `integration-export-processor` em public.internal_cron_tokens).
// READY_FOR_WIIZE_PAY: este processador é o "Export Service" do
// diagrama; o Wiize Pay nunca o chama diretamente.
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BUCKET = "integration-exports";
const MAX_ROWS_PER_ENTITY = 50_000;
const PAGE_SIZE = 1000;

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

// -------------------------------------------------------------
// Entidades exportáveis (mesmas chaves usadas em integration-export)
// -------------------------------------------------------------
type EntityDef = { table: string; order: string; fields: string[] };

const ENTITIES: Record<string, EntityDef> = {
  leads: {
    table: "leads",
    order: "created_at",
    fields: [
      "id", "company_name", "contact_name", "phone", "email", "category", "city",
      "region", "address", "website", "origin", "source", "prospected_at",
      "ai_score", "estimated_value", "pipeline_stage_id", "tags", "whatsapp_status",
      "google_maps_link", "has_responded", "responded_at", "created_at", "updated_at",
      "responsible_user_id",
    ],
  },
  vendas: {
    table: "lead_deals",
    order: "created_at",
    fields: [
      "id", "lead_id", "title", "value", "sale_type", "contract_type",
      "contract_months", "payment_method", "status", "start_date",
      "expiration_date", "closed_at", "notes", "receipt_url", "contract_url",
      "responsible_user_id", "created_at", "updated_at",
    ],
  },
  atividades: {
    table: "lead_activities",
    order: "created_at",
    fields: ["id", "lead_id", "activity_type", "description", "metadata", "created_at"],
  },
  notas: {
    table: "lead_notes",
    order: "created_at",
    fields: ["id", "lead_id", "content", "reply_to_id", "user_id", "created_at"],
  },
  anexos: {
    table: "lead_files",
    order: "created_at",
    fields: [
      "id", "lead_id", "file_name", "file_type", "file_size", "file_url",
      "drive_file_id", "drive_folder_id", "source", "created_at",
    ],
  },
  formularios: {
    table: "forms",
    order: "created_at",
    fields: [
      "id", "name", "slug", "title", "description", "status", "crm_enabled",
      "created_at", "updated_at",
    ],
  },
  respostas_formulario: {
    table: "form_submissions",
    order: "created_at",
    fields: [
      "id", "form_id", "lead_id", "data", "utm_source", "utm_medium",
      "utm_campaign", "landing_url", "device", "detected_source", "created_at",
    ],
  },
  produtos: {
    table: "company_services",
    order: "created_at",
    fields: ["id", "name", "average_ticket", "description", "created_at", "updated_at"],
  },
  etapas_e_configuracoes: {
    table: "pipeline_stages",
    order: "position",
    fields: ["id", "name", "position", "color", "is_default", "created_at"],
  },
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pickFields(row: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in row) out[f] = row[f];
  }
  return out;
}

function parseStorageRef(url?: string | null): { bucket: string; path: string } | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    return { bucket: "form-uploads", path: url };
  }
  const m = url.match(
    /\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?]+)\/(.+?)(?:\?|$)/,
  );
  if (!m) return null;
  let path = m[2];
  try {
    path = decodeURIComponent(path);
  } catch { /* keep raw */ }
  return { bucket: m[1], path };
}

async function audit(
  admin: ReturnType<typeof createClient>,
  entry: Record<string, unknown>,
) {
  try {
    await admin.from("integration_export_audit_logs").insert(entry);
  } catch (e) {
    console.error("[integration-export-processor] audit failed:", e);
  }
}

// -------------------------------------------------------------
// Coleta paginada de uma entidade (somente a conta solicitada)
// -------------------------------------------------------------
async function fetchEntityRows(
  admin: ReturnType<typeof createClient>,
  def: EntityDef,
  owner: string,
  includeFields: string[] | undefined,
): Promise<{ rows: Record<string, unknown>[]; truncated: boolean }> {
  const fields = includeFields && includeFields.length
    ? def.fields.filter((f) => includeFields.includes(f))
    : def.fields;
  if (!fields.length) fields.push(...def.fields);

  const rows: Record<string, unknown>[] = [];
  let truncated = false;
  for (let from = 0; from < MAX_ROWS_PER_ENTITY; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE - 1, MAX_ROWS_PER_ENTITY - 1);
    const { data, error } = await admin
      .from(def.table)
      .select(fields.join(","))
      .eq("owner_user_id", owner)
      .order(def.order, { ascending: true })
      .range(from, to);
    if (error) throw new Error(`${def.table}: ${error.message}`);
    const chunk = (data || []) as unknown as Record<string, unknown>[];
    rows.push(...chunk.map((r) => pickFields(r, fields)));
    if (chunk.length < PAGE_SIZE) break;
    if (to >= MAX_ROWS_PER_ENTITY - 1) {
      truncated = true;
      break;
    }
  }
  return { rows, truncated };
}

// -------------------------------------------------------------
// Processa uma solicitação
// -------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processRequest(admin: any, req: any) {
  const requestId: string = req.id;
  const owner: string = req.owner_user_id;
  const scope: string[] = (req.scope?.entities || []) as string[];

  await admin
    .from("integration_export_requests")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", req.status);

  try {
    const entities: Record<string, unknown> = {};
    const manifestEntities: Record<string, unknown> = {};
    const relationshipNotes: string[] = [];

    for (const key of scope) {
      const def = ENTITIES[key];
      if (!def) continue;
      const includeFields = (req.scope?.field_config?.[key]?.fields || undefined) as
        | string[]
        | undefined;
      const { rows, truncated } = await fetchEntityRows(admin, def, owner, includeFields);

      // Anexos: apenas REFERÊNCIA (nunca o conteúdo do arquivo).
      if (key === "anexos") {
        for (const r of rows) {
          const ref = parseStorageRef(r.file_url as string | null);
          (r as any).storage_reference = ref
            ? { bucket: ref.bucket, path: ref.path, type: "signed_url_required" }
            : { type: "external", url: r.file_url ?? null };
          delete (r as any).file_url;
        }
        relationshipNotes.push("anexos.storage_reference: acesso via URL assinada de curta duração, gerada sob demanda pelo Wiize.");
      }

      const payload = JSON.stringify(rows);
      const checksum = await sha256Hex(payload);
      entities[key] = {
        label: key,
        fields: Object.keys(rows[0] || {}),
        count: rows.length,
        truncated,
        rows,
      };
      manifestEntities[key] = { count: rows.length, sha256: checksum, truncated };
      relationshipNotes.push(`${key}: owner_user_id = conta origem; lead_id referencia leads.id quando presente.`);
    }

    const pkg = {
      format: "wiize-crm-export",
      schema_version: "1.0",
      generated_at: new Date().toISOString(),
      source: "wiize",
      destination: "READY_FOR_WIIZE_PAY",
      account: { account_id: owner },
      relationships: relationshipNotes,
      entities,
    };

    const fileBytes = new TextEncoder().encode(JSON.stringify(pkg));
    const checksum = await sha256Hex(fileBytes);
    const filePath = `${owner}/${requestId}/wiize-export-${requestId}.json`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(filePath, fileBytes, {
        contentType: "application/json",
        upsert: true,
      });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);

    const manifest = {
      schema_version: "1.0",
      generated_at: pkg.generated_at,
      entities: manifestEntities,
      package_checksum: checksum,
      package_size_bytes: fileBytes.byteLength,
      destination: "READY_FOR_WIIZE_PAY",
    };

    await admin
      .from("integration_export_requests")
      .update({
        status: "completed",
        record_counts: Object.fromEntries(
          Object.entries(manifestEntities).map(([k, v]) => [k, (v as any).count]),
        ),
        file_path: filePath,
        file_size: fileBytes.byteLength,
        checksum,
        manifest,
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    await audit(admin, {
      owner_user_id: owner,
      request_id: requestId,
      user_id: req.created_by,
      action: "export_completed",
      scope: { entities: scope },
      record_count: Object.values(manifestEntities).reduce(
        (a: number, v) => a + (v as any).count,
        0,
      ),
      status: "completed",
      auth_method: "background_job",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[integration-export-processor] failed:", msg);
    await admin
      .from("integration_export_requests")
      .update({
        status: "failed",
        error_message: msg.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    await audit(admin, {
      owner_user_id: owner,
      request_id: requestId,
      action: "export_failed",
      status: "failed",
      error_message: msg.slice(0, 500),
      auth_method: "background_job",
    });
  }
}

// -------------------------------------------------------------
// Expira solicitações pendentes antigas / pacotes vencidos
// -------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function expireStale(admin: any) {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await admin
    .from("integration_export_requests")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "pending")
    .lt("created_at", cutoff);

  await admin
    .from("integration_export_requests")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .in("status", ["completed"])
    .lt("expires_at", new Date().toISOString());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // ---------- Autenticação (somente interno) ----------
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret");
  let authorized = authHeader === `Bearer ${SERVICE_KEY}`;

  if (!authorized && cronSecret) {
    const { data: tok } = await admin
      .from("internal_cron_tokens")
      .select("token")
      .eq("name", "integration-export-processor")
      .maybeSingle();
    authorized = Boolean(tok?.token && tok.token === cronSecret);
  }
  if (!authorized) return json({ error: "Não autorizado" }, 401);

  try {
    await expireStale(admin);

    const { data: pending, error } = await admin
      .from("integration_export_requests")
      .select("*")
      .or(
        `status.eq.authorized,and(status.eq.processing,updated_at.lt.${new Date(
          Date.now() - 15 * 60 * 1000,
        ).toISOString()})`,
      )
      .order("created_at", { ascending: true })
      .limit(3);

    if (error) throw new Error(error.message);
    let processed = 0;
    for (const r of pending || []) {
      await processRequest(admin, r);
      processed++;
    }
    return json({ ok: true, processed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[integration-export-processor] fatal:", msg);
    return json({ error: msg }, 500);
  }
});
