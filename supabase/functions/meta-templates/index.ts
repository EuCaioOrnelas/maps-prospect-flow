import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const META_API_VERSION = Deno.env.get("META_API_VERSION") ?? "v21.0";
const GRAPH_VERSION = META_API_VERSION;
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VALID_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
// Same Meta App already used by the existing embedded signup flow.
const META_APP_ID = "988774494328539";
// Limits published by the WhatsApp Cloud API for template header samples.
const MEDIA_LIMITS: Record<string, number> = {
  "image/jpeg": 5 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "video/mp4": 16 * 1024 * 1024,
  "video/3gpp": 16 * 1024 * 1024,
  "application/pdf": 16 * 1024 * 1024,
};
const NAME_RE = /^[a-z0-9_]{1,512}$/;

type Component = Record<string, any>;

/** Sanitizes anything we echo back so no credential ever reaches the client. */
function safeMetaError(raw: any) {
  const e = raw?.error ?? raw ?? {};
  return {
    code: e.code ?? null,
    subcode: e.error_subcode ?? null,
    type: e.type ?? null,
    message: e.error_user_msg || e.message || null,
    title: e.error_user_title || null,
  };
}

/** Converts Meta API errors into actionable Portuguese messages. */
function humanizeMetaError(err: ReturnType<typeof safeMetaError>): string {
  const code = err.code;
  const sub = err.subcode;
  if (code === 190) return "A conexão com a Meta expirou. Reconecte o número em Meta > Números.";
  if (code === 200 || code === 10) return "A conta conectada não tem permissão para gerenciar templates nesta WABA.";
  if (code === 100 && sub === 2388023) return "Já existe um template com esse nome e idioma nesta conta.";
  if (code === 2388023) return "Já existe um template com esse nome e idioma nesta conta.";
  if (code === 132000 || code === 2388042) return "O conteúdo do template não segue as regras da Meta. Revise texto, variáveis e exemplos.";
  if (code === 4 || code === 613) return "Limite de requisições da Meta atingido. Tente novamente em alguns minutos.";
  if (err.message) return err.message;
  return "A Meta recusou a operação. Verifique os dados do template e tente novamente.";
}

/** Server-side validation mirroring the client rules. */
function validateTemplate(input: {
  name?: string; category?: string; language?: string; components?: Component[];
}): string[] {
  const errors: string[] = [];
  const name = String(input.name || "");
  if (!NAME_RE.test(name)) {
    errors.push("O nome deve conter apenas letras minúsculas, números e underline.");
  }
  if (!VALID_CATEGORIES.includes(String(input.category))) {
    errors.push("Categoria inválida.");
  }
  if (!input.language) errors.push("Selecione um idioma.");

  const components = Array.isArray(input.components) ? input.components : [];
  const body = components.find((c) => c?.type === "BODY");
  if (!body || !String(body.text || "").trim()) {
    errors.push("O corpo da mensagem é obrigatório.");
  } else {
    const text = String(body.text);
    if (text.length > 1024) errors.push("O corpo deve ter no máximo 1024 caracteres.");
    const placeholders = [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    const expected = placeholders.length ? Math.max(...placeholders) : 0;
    const unique = [...new Set(placeholders)].sort((a, b) => a - b);
    if (unique.length !== expected || unique.some((v, i) => v !== i + 1)) {
      errors.push("As variáveis do corpo devem ser sequenciais começando em {{1}}.");
    }
    if (expected > 0) {
      const samples = body?.example?.body_text?.[0];
      if (!Array.isArray(samples) || samples.length !== expected || samples.some((s: string) => !String(s || "").trim())) {
        errors.push("Informe um exemplo para cada variável do corpo.");
      }
    }
  }

  const header = components.find((c) => c?.type === "HEADER");
  if (header) {
    const fmt = String(header.format || "");
    if (!["TEXT", "IMAGE", "VIDEO", "DOCUMENT"].includes(fmt)) {
      errors.push("Formato de cabeçalho inválido.");
    }
    if (fmt === "TEXT") {
      const t = String(header.text || "");
      if (!t.trim()) errors.push("Informe o texto do cabeçalho.");
      if (t.length > 60) errors.push("O cabeçalho deve ter no máximo 60 caracteres.");
      const ph = [...t.matchAll(/\{\{(\d+)\}\}/g)];
      if (ph.length > 1) errors.push("O cabeçalho de texto aceita no máximo uma variável.");
      if (ph.length === 1) {
        const sample = header?.example?.header_text?.[0];
        if (!String(sample || "").trim()) errors.push("Informe o exemplo da variável do cabeçalho.");
      }
    } else {
      const handle = header?.example?.header_handle?.[0];
      if (!String(handle || "").trim()) {
        errors.push("Envie um arquivo de exemplo para o cabeçalho de mídia.");
      }
    }
  }

  const footer = components.find((c) => c?.type === "FOOTER");
  if (footer && String(footer.text || "").length > 60) {
    errors.push("O rodapé deve ter no máximo 60 caracteres.");
  }

  const buttonsComp = components.find((c) => c?.type === "BUTTONS");
  if (buttonsComp) {
    const buttons: Component[] = Array.isArray(buttonsComp.buttons) ? buttonsComp.buttons : [];
    if (!buttons.length) errors.push("Adicione ao menos um botão ou remova a seção de botões.");
    if (buttons.length > 10) errors.push("São permitidos no máximo 10 botões.");
    const urlCount = buttons.filter((b) => b.type === "URL").length;
    const phoneCount = buttons.filter((b) => b.type === "PHONE_NUMBER").length;
    if (urlCount > 2) errors.push("São permitidos no máximo 2 botões de link.");
    if (phoneCount > 1) errors.push("É permitido no máximo 1 botão de telefone.");
    for (const b of buttons) {
      if (!String(b.text || "").trim()) errors.push("Todo botão precisa de um texto.");
      if (String(b.text || "").length > 25) errors.push("O texto do botão deve ter no máximo 25 caracteres.");
      if (b.type === "URL") {
        const url = String(b.url || "");
        if (!/^https?:\/\/.+/i.test(url)) errors.push("Informe uma URL válida para o botão de link.");
        if (/\{\{1\}\}/.test(url) && !String(b?.example?.[0] || "").trim()) {
          errors.push("Informe o exemplo da variável usada na URL do botão.");
        }
      }
      if (b.type === "PHONE_NUMBER" && !String(b.phone_number || "").trim()) {
        errors.push("Informe o telefone do botão de ligação.");
      }
      if (!["QUICK_REPLY", "URL", "PHONE_NUMBER"].includes(String(b.type))) {
        errors.push("Tipo de botão não suportado.");
      }
    }
  }

  return [...new Set(errors)];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let ownerId: string | null = null;
  let actorId: string | null = null;
  let action = "unknown";
  let wabaIdForLog: string | null = null;

  const audit = async (ok: boolean, statusCode: number, details: Record<string, unknown>, templateId?: string | null) => {
    if (!ownerId) return;
    try {
      await admin.from("meta_template_audit_log").insert({
        owner_user_id: ownerId,
        actor_user_id: actorId,
        template_id: templateId ?? null,
        waba_id: wabaIdForLog,
        action,
        success: ok,
        status_code: statusCode,
        details,
      });
    } catch (e) {
      console.error("[meta-templates] audit failed", e);
    }
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "unauthorized" }, 401);
    actorId = user.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("id,parent_owner_id")
      .eq("id", user.id)
      .maybeSingle();
    ownerId = (profile as any)?.parent_owner_id || (profile as any)?.id || user.id;

    const body = await req.json().catch(() => ({}));
    action = String(body?.action || "");

    // Rate limit per user (protects the Meta credit and our quota).
    try {
      const { data: rl } = await admin.rpc("check_rate_limit", {
        p_identifier: user.id,
        p_endpoint: "meta_templates",
        p_max_requests: 30,
        p_window_seconds: 60,
      });
      if (rl && (rl as any).allowed === false) {
        return json({ error: "rate_limited", message: "Muitas requisições. Aguarde alguns segundos." }, 429);
      }
    } catch (_) { /* fail-open */ }

    // Resolve the Meta connection of THIS tenant only.
    let connQuery = admin
      .from("user_waba_connections")
      .select("id, waba_id, access_token, business_name, display_phone_number, status")
      .eq("owner_user_id", ownerId)
      .eq("provider", "meta")
      .not("waba_id", "is", null)
      .not("access_token", "is", null);
    if (body?.connection_id) connQuery = connQuery.eq("id", body.connection_id);

    const { data: conns } = await connQuery.order("created_at", { ascending: true });
    const conn = (conns || [])[0] as any;

    if (!conn) {
      return json({
        error: "no_connection",
        message: "Nenhum número do WhatsApp (Meta) conectado nesta conta. Conecte um número em Meta > Números.",
      }, 400);
    }
    const wabaId = String(conn.waba_id);
    const token = String(conn.access_token);
    wabaIdForLog = wabaId;

    const graph = async (path: string, init?: RequestInit) => {
      const res = await fetch(`${GRAPH}/${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      });
      const payload = await res.json().catch(() => ({}));
      return { res, payload };
    };

    /* ------------------------------------------------------------------ SYNC */
    if (action === "sync") {
      const fields = "id,name,status,category,language,components,rejected_reason,quality_score";
      let url: string | null = `${wabaId}/message_templates?limit=100&fields=${fields}`;
      const remote: any[] = [];
      let guard = 0;

      while (url && guard < 20) {
        guard++;
        const { res, payload } = await graph(url);
        if (!res.ok) {
          const err = safeMetaError(payload);
          console.error("[meta-templates] sync failed", err);
          await audit(false, res.status, { error: err });
          return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 502);
        }
        remote.push(...(payload?.data || []));
        const next = payload?.paging?.next as string | undefined;
        url = next ? next.replace(`${GRAPH}/`, "") : null;
      }

      const now = new Date().toISOString();
      const rows = remote.map((t) => ({
        owner_user_id: ownerId,
        connection_id: conn.id,
        waba_id: wabaId,
        meta_template_id: String(t.id),
        name: t.name,
        category: t.category ?? null,
        language: t.language,
        status: t.status ?? "UNKNOWN",
        rejected_reason: t.rejected_reason ?? null,
        quality_score: t?.quality_score?.score ?? null,
        components: t.components ?? [],
        raw: t,
        deleted_at: null,
        last_synced_at: now,
        updated_at: now,
      }));

      if (rows.length) {
        const { error } = await admin
          .from("meta_whatsapp_templates")
          .upsert(rows, { onConflict: "waba_id,meta_template_id" });
        if (error) {
          console.error("[meta-templates] upsert failed", error);
          await audit(false, 500, { error: error.message });
          return json({ error: "db_error", message: "Não foi possível salvar os templates sincronizados." }, 500);
        }
      }

      // Anything not returned by Meta no longer exists there.
      const remoteIds = rows.map((r) => r.meta_template_id);
      const { data: locals } = await admin
        .from("meta_whatsapp_templates")
        .select("id, meta_template_id")
        .eq("owner_user_id", ownerId)
        .eq("waba_id", wabaId)
        .is("deleted_at", null);
      const stale = (locals || [])
        .filter((l: any) => l.meta_template_id && !remoteIds.includes(l.meta_template_id))
        .map((l: any) => l.id);
      if (stale.length) {
        await admin.from("meta_whatsapp_templates")
          .update({ deleted_at: now, status: "DELETED", updated_at: now })
          .in("id", stale);
      }

      await audit(true, 200, { synced: rows.length, removed: stale.length });
      return json({ success: true, synced: rows.length, removed: stale.length, waba_id: wabaId });
    }

    /* ---------------------------------------------------------- UPLOAD MEDIA */
    if (action === "upload_media") {
      const fileName = String(body?.file_name || "arquivo");
      const mime = String(body?.mime_type || "");
      const b64 = String(body?.file_base64 || "");
      if (!b64) return json({ error: "validation_error", message: "Nenhum arquivo recebido." }, 400);
      if (!MEDIA_LIMITS[mime]) {
        return json({
          error: "unsupported_media",
          message: "Formato não suportado pela Meta para cabeçalho de template.",
        }, 400);
      }

      let bytes: Uint8Array;
      try {
        const bin = atob(b64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } catch (_) {
        return json({ error: "validation_error", message: "Arquivo inválido." }, 400);
      }

      const limit = MEDIA_LIMITS[mime];
      if (bytes.length > limit) {
        return json({
          error: "file_too_large",
          message: `Arquivo muito grande. O limite para este formato é ${Math.round(limit / (1024 * 1024))} MB.`,
        }, 400);
      }

      // Meta Resumable Upload API — creates a session, uploads the bytes and
      // returns the handle used as the template header example.
      const sessionUrl = `${GRAPH}/${META_APP_ID}/uploads?file_name=${encodeURIComponent(fileName)}` +
        `&file_length=${bytes.length}&file_type=${encodeURIComponent(mime)}`;
      const sessionRes = await fetch(sessionUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const sessionPayload = await sessionRes.json().catch(() => ({}));
      if (!sessionRes.ok || !sessionPayload?.id) {
        const err = safeMetaError(sessionPayload);
        console.error("[meta-templates] upload session failed", err);
        await audit(false, sessionRes.status, { step: "session", error: err });
        return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 400);
      }

      const uploadRes = await fetch(`${GRAPH}/${sessionPayload.id}`, {
        method: "POST",
        headers: {
          Authorization: `OAuth ${token}`,
          file_offset: "0",
          "Content-Type": "application/octet-stream",
        },
        body: bytes,
      });
      const uploadPayload = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadPayload?.h) {
        const err = safeMetaError(uploadPayload);
        console.error("[meta-templates] upload failed", err);
        await audit(false, uploadRes.status, { step: "upload", error: err });
        return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 400);
      }

      await audit(true, 200, { step: "upload", file_name: fileName, mime, bytes: bytes.length });
      return json({ success: true, handle: uploadPayload.h });
    }

    /* ---------------------------------------------------------------- CREATE */
    if (action === "create") {
      const payloadIn = body?.template || {};
      const errors = validateTemplate(payloadIn);
      if (errors.length) return json({ error: "validation_error", errors }, 400);

      // Never create a duplicate: Meta rejects same name+language anyway.
      const { data: existing } = await admin
        .from("meta_whatsapp_templates")
        .select("id, meta_template_id, status")
        .eq("owner_user_id", ownerId)
        .eq("waba_id", wabaId)
        .eq("name", payloadIn.name)
        .eq("language", payloadIn.language)
        .is("deleted_at", null)
        .maybeSingle();
      if (existing) {
        return json({
          error: "already_exists",
          message: "Já existe um template com esse nome e idioma nesta conta. Use Sincronizar para atualizar os dados.",
          id: (existing as any).meta_template_id,
          status: (existing as any).status,
        }, 409);
      }


      const metaBody = {
        name: payloadIn.name,
        language: payloadIn.language,
        category: payloadIn.category,
        components: payloadIn.components,
        allow_category_change: true,
      };

      const { res, payload } = await graph(`${wabaId}/message_templates`, {
        method: "POST",
        body: JSON.stringify(metaBody),
      });

      if (!res.ok) {
        const err = safeMetaError(payload);
        console.error("[meta-templates] create failed", err);
        await audit(false, res.status, { error: err, name: payloadIn.name });
        return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 400);
      }

      const now = new Date().toISOString();
      const { data: saved, error } = await admin
        .from("meta_whatsapp_templates")
        .upsert({
          owner_user_id: ownerId,
          connection_id: conn.id,
          waba_id: wabaId,
          meta_template_id: String(payload.id),
          name: payloadIn.name,
          category: payload.category ?? payloadIn.category,
          language: payloadIn.language,
          status: payload.status ?? "PENDING",
          components: payloadIn.components,
          raw: payload,
          rejected_reason: null,
          deleted_at: null,
          submitted_at: now,
          last_synced_at: now,
          updated_at: now,
        }, { onConflict: "waba_id,meta_template_id" })
        .select("id")
        .maybeSingle();
      if (error) console.error("[meta-templates] create persist failed", error);

      await audit(true, 200, { name: payloadIn.name, status: payload.status ?? "PENDING" }, (saved as any)?.id);
      return json({ success: true, id: payload.id, status: payload.status ?? "PENDING" });
    }

    /* ---------------------------------------------------------------- UPDATE */
    if (action === "update") {
      const rowId = String(body?.id || "");
      const payloadIn = body?.template || {};
      const { data: row } = await admin
        .from("meta_whatsapp_templates")
        .select("id, meta_template_id, status, name, language, owner_user_id")
        .eq("id", rowId)
        .eq("owner_user_id", ownerId)
        .maybeSingle();
      if (!row) return json({ error: "not_found", message: "Template não encontrado nesta conta." }, 404);
      if (!(row as any).meta_template_id) {
        return json({ error: "not_editable", message: "Este template ainda não existe na Meta." }, 400);
      }
      if (!["APPROVED", "REJECTED", "PAUSED"].includes(String((row as any).status))) {
        return json({
          error: "not_editable",
          message: "A Meta só permite editar templates aprovados, rejeitados ou pausados. Aguarde o fim da análise.",
        }, 400);
      }

      // Name and language are immutable on the Meta side.
      const errors = validateTemplate({
        name: (row as any).name,
        language: (row as any).language,
        category: payloadIn.category,
        components: payloadIn.components,
      });
      if (errors.length) return json({ error: "validation_error", errors }, 400);

      const editBody: Record<string, unknown> = { components: payloadIn.components };
      if (payloadIn.category) editBody.category = payloadIn.category;

      const { res, payload } = await graph(String((row as any).meta_template_id), {
        method: "POST",
        body: JSON.stringify(editBody),
      });
      if (!res.ok) {
        const err = safeMetaError(payload);
        console.error("[meta-templates] update failed", err);
        await audit(false, res.status, { error: err }, rowId);
        return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 400);
      }

      const now = new Date().toISOString();
      await admin.from("meta_whatsapp_templates").update({
        components: payloadIn.components,
        category: payloadIn.category ?? undefined,
        status: "PENDING",
        rejected_reason: null,
        submitted_at: now,
        updated_at: now,
      }).eq("id", rowId).eq("owner_user_id", ownerId);

      await audit(true, 200, { edited: true }, rowId);
      return json({ success: true });
    }

    /* ---------------------------------------------------------------- DELETE */
    if (action === "delete") {
      const rowId = String(body?.id || "");
      const { data: row } = await admin
        .from("meta_whatsapp_templates")
        .select("id, name, meta_template_id")
        .eq("id", rowId)
        .eq("owner_user_id", ownerId)
        .maybeSingle();
      if (!row) return json({ error: "not_found", message: "Template não encontrado nesta conta." }, 404);

      const qs = new URLSearchParams({ name: String((row as any).name) });
      if ((row as any).meta_template_id) qs.set("hsm_id", String((row as any).meta_template_id));

      const { res, payload } = await graph(`${wabaId}/message_templates?${qs.toString()}`, { method: "DELETE" });
      if (!res.ok) {
        const err = safeMetaError(payload);
        console.error("[meta-templates] delete failed", err);
        await audit(false, res.status, { error: err }, rowId);
        return json({ error: "meta_error", message: humanizeMetaError(err), details: err }, 400);
      }

      const now = new Date().toISOString();
      await admin.from("meta_whatsapp_templates")
        .update({ deleted_at: now, status: "DELETED", updated_at: now })
        .eq("id", rowId).eq("owner_user_id", ownerId);

      await audit(true, 200, { deleted: true }, rowId);
      return json({ success: true });
    }

    return json({ error: "invalid_action", message: "Ação inválida." }, 400);
  } catch (e) {
    console.error("[meta-templates] unexpected error", e);
    await audit(false, 500, { error: e instanceof Error ? e.message : "unknown" });
    return json({ error: "unexpected", message: "Erro inesperado ao falar com a Meta." }, 500);
  }
});
