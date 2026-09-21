import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const PLAN_LIMITS: Record<string, { forms: number; links: number }> = {
  start: { forms: 1, links: 1 },
  growth: { forms: 5, links: 5 },
  scale: { forms: 50, links: 50 },
  free: { forms: 1, links: 1 },
};

function limitsFor(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan || "free").toLowerCase()] ?? PLAN_LIMITS.free;
}

function slugify(value: string): string {
  return (value || "form")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "form";
}

async function uniqueSlug(table: "forms" | "tracked_links", base: string): Promise<string> {
  let slug = slugify(base);
  for (let i = 0; i < 40; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const { data } = await admin.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${crypto.randomUUID().slice(0, 6)}`;
}

function str(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length ? trimmed : null;
}

function normalizeUrl(value: string): string {
  const clean = (value || "").trim();
  if (!clean) return "";
  const candidate = /^https?:\/\//i.test(clean) ? clean : `https://${clean.replace(/^\/+/, "")}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) return "";
    return url.toString().slice(0, 900);
  } catch {
    return "";
  }
}

function safeFormConfig(value: unknown): Record<string, unknown> {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const color = (key: string, fallback: string) => {
    const candidate = str(input[key], 20);
    return candidate && /^#[0-9a-f]{6}$/i.test(candidate) ? candidate : fallback;
  };
  const metaPixelId = str(input.metaPixelId, 20) || "";
  const googleTagManagerId = (str(input.googleTagManagerId, 20) || "").toUpperCase();
  const googleAdsId = (str(input.googleAdsId, 24) || "").toUpperCase();
  return {
    primaryColor: color("primaryColor", "#3daa57"),
    buttonColor: color("buttonColor", "#3daa57"),
    backgroundColor: color("backgroundColor", "#f6f7f9"),
    textColor: color("textColor", "#18181b"),
    radius: Math.min(24, Math.max(0, Number(input.radius) || 10)),
    align: input.align === "center" ? "center" : "left",
    logoUrl: normalizeUrl(str(input.logoUrl, 900) || ""),
    coverUrl: normalizeUrl(str(input.coverUrl, 900) || ""),
    distributionMode: input.distributionMode === "round_robin" ? "round_robin" : "fixed",
    notifyAssigned: input.notifyAssigned !== false,
    redirectEnabled: input.redirectEnabled === true,
    redirectUrl: normalizeUrl(str(input.redirectUrl, 900) || ""),
    metaPixelId: /^\d{6,20}$/.test(metaPixelId) ? metaPixelId : "",
    googleTagManagerId: /^GTM-[A-Z0-9]+$/.test(googleTagManagerId) ? googleTagManagerId : "",
    googleAdsId: /^AW-\d+$/.test(googleAdsId) ? googleAdsId : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Não autenticado" }, 401);
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    // Resolve tenant (account owner) — nunca confiar em id vindo do frontend
    const { data: profile } = await admin
      .from("profiles")
      .select("id, plan, parent_owner_id")
      .eq("id", user.id)
      .maybeSingle();

    let ownerId = (profile as any)?.parent_owner_id || user.id;
    if (!(profile as any)?.parent_owner_id) {
      const { data: member } = await admin
        .from("account_members")
        .select("owner_user_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (member?.owner_user_id) ownerId = member.owner_user_id;
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", ownerId)
      .maybeSingle();
    const limits = limitsFor((ownerProfile as any)?.plan);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // ─────────── LIMITES ───────────
    const counts = async () => {
      const [{ count: forms }, { count: links }] = await Promise.all([
        admin.from("forms").select("id", { count: "exact", head: true }).eq("owner_user_id", ownerId),
        admin.from("tracked_links").select("id", { count: "exact", head: true }).eq("owner_user_id", ownerId),
      ]);
      return { forms: forms || 0, links: links || 0 };
    };

    if (action === "limits") {
      const c = await counts();
      return json({ limits, counts: c });
    }

    // Totais completos, sem o limite padrão de 1.000 linhas da API de dados.
    if (action === "analytics_summary") {
      const pageSize = 1000;
      const readAll = async (table: "form_views" | "form_submissions" | "tracked_link_clicks", columns: string) => {
        const rows: any[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await admin
            .from(table)
            .select(columns)
            .eq("owner_user_id", ownerId)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < pageSize) break;
        }
        return rows;
      };

      const [views, submissions, clicks] = await Promise.all([
        readAll("form_views", "form_id"),
        readAll("form_submissions", "form_id, tracked_link_id, created_at"),
        readAll("tracked_link_clicks", "tracked_link_id, visitor_hash, created_at"),
      ]);
      const forms: Record<string, { views: number; submissions: number; lastSubmission: string | null }> = {};
      const links: Record<string, { clicks: number; unique: number; leads: number; last: string | null }> = {};
      const visitors: Record<string, Set<string>> = {};

      for (const row of views) {
        forms[row.form_id] ||= { views: 0, submissions: 0, lastSubmission: null };
        forms[row.form_id].views += 1;
      }
      for (const row of submissions) {
        forms[row.form_id] ||= { views: 0, submissions: 0, lastSubmission: null };
        forms[row.form_id].submissions += 1;
        if (!forms[row.form_id].lastSubmission || row.created_at > forms[row.form_id].lastSubmission) {
          forms[row.form_id].lastSubmission = row.created_at;
        }
        if (row.tracked_link_id) {
          links[row.tracked_link_id] ||= { clicks: 0, unique: 0, leads: 0, last: null };
          links[row.tracked_link_id].leads += 1;
        }
      }
      for (const row of clicks) {
        links[row.tracked_link_id] ||= { clicks: 0, unique: 0, leads: 0, last: null };
        visitors[row.tracked_link_id] ||= new Set<string>();
        links[row.tracked_link_id].clicks += 1;
        if (row.visitor_hash) visitors[row.tracked_link_id].add(row.visitor_hash);
        if (!links[row.tracked_link_id].last || row.created_at > links[row.tracked_link_id].last) {
          links[row.tracked_link_id].last = row.created_at;
        }
      }
      for (const [linkId, hashes] of Object.entries(visitors)) links[linkId].unique = hashes.size;
      return json({ forms, links });
    }

    // ─────────── FORMULÁRIOS ───────────
    if (action === "create_form" || action === "duplicate_form") {
      const c = await counts();
      if (c.forms >= limits.forms) {
        return json({ error: "limit_reached", message: "Você atingiu o limite de formulários do seu plano." }, 403);
      }
    }

    if (action === "create_form" || action === "update_form") {
      const input = body?.form || {};
      const name = str(input.name, 120) || "Formulário sem nome";
      const stageId = str(input.crm_stage_id, 64);
      const responsibles: string[] = Array.isArray(input.crm_responsibles) ? input.crm_responsibles.slice(0, 20) : [];
      const notifyIds: string[] = Array.isArray(input.notify_user_ids) ? input.notify_user_ids.slice(0, 20) : [];

      // Ownership da coluna do CRM
      if (stageId) {
        const { data: stage } = await admin
          .from("pipeline_stages")
          .select("id")
          .eq("id", stageId)
          .eq("owner_user_id", ownerId)
          .maybeSingle();
        if (!stage) return json({ error: "Coluna do CRM inválida para esta conta." }, 400);
      }

      const payload: Record<string, unknown> = {
        owner_user_id: ownerId,
        name,
        title: str(input.title, 160) || name,
        description: str(input.description, 600),
        button_text: str(input.button_text, 60) || "Enviar",
        success_message:
          str(input.success_message, 400) ||
          "Obrigado! Recebemos seus dados e entraremos em contato em breve.",
        status: ["active", "inactive", "draft"].includes(input.status) ? input.status : "draft",
        config: safeFormConfig(input.config),
        crm_enabled: input.crm_enabled !== false,
        crm_stage_id: stageId,
        crm_responsibles: responsibles,
        notify_enabled: !!input.notify_enabled,
        notify_user_ids: notifyIds,
      };

      let formId = str(input.id, 64);
      if (action === "create_form") {
        payload.created_by = user.id;
        payload.slug = await uniqueSlug("forms", str(input.slug, 80) || name);
        const { data, error } = await admin.from("forms").insert(payload).select("*").single();
        if (error) throw error;
        formId = data.id;
      } else {
        if (!formId) return json({ error: "Formulário não informado." }, 400);
        const { data: existing } = await admin
          .from("forms").select("id, slug").eq("id", formId).eq("owner_user_id", ownerId).maybeSingle();
        if (!existing) return json({ error: "Formulário não encontrado." }, 404);
        const requestedSlug = slugify(str(input.slug, 80) || existing.slug);
        if (requestedSlug !== existing.slug) {
          const { data: slugOwner } = await admin.from("forms").select("id").eq("slug", requestedSlug).maybeSingle();
          payload.slug = slugOwner && slugOwner.id !== formId
            ? await uniqueSlug("forms", requestedSlug)
            : requestedSlug;
        }
        payload.updated_at = new Date().toISOString();
        const { error } = await admin.from("forms").update(payload).eq("id", formId);
        if (error) throw error;
      }

      // Campos
      if (Array.isArray(body?.fields)) {
        await admin.from("form_fields").delete().eq("form_id", formId);
        const rows = body.fields.slice(0, 40).map((f: any, i: number) => ({
          form_id: formId,
          owner_user_id: ownerId,
          field_type: str(f.field_type, 24) || "text",
          label: str(f.label, 120) || "Campo",
          name: slugify(str(f.name, 60) || str(f.label, 60) || `campo_${i + 1}`).replace(/-/g, "_"),
          placeholder: str(f.placeholder, 120),
          required: !!f.required,
          position: i,
          is_active: f.is_active !== false,
          page: Math.min(10, Math.max(1, Number(f.page) || 1)),
          options: Array.isArray(f.options) ? f.options.slice(0, 30) : [],
        }));
        if (rows.length) {
          const { error } = await admin.from("form_fields").insert(rows);
          if (error) throw error;
        }
      }

      const { data: form } = await admin.from("forms").select("*").eq("id", formId).single();
      return json({ form });
    }

    if (action === "duplicate_form") {
      const id = str(body?.id, 64);
      const { data: src } = await admin
        .from("forms").select("*").eq("id", id).eq("owner_user_id", ownerId).maybeSingle();
      if (!src) return json({ error: "Formulário não encontrado." }, 404);
      const { id: _id, created_at: _c, updated_at: _u, slug: _s, ...rest } = src as any;
      const { data: copy, error } = await admin
        .from("forms")
        .insert({
          ...rest,
          name: `${src.name} (cópia)`,
          slug: await uniqueSlug("forms", `${src.name}-copia`),
          created_by: user.id,
          status: "inactive",
        })
        .select("*")
        .single();
      if (error) throw error;
      const { data: fields } = await admin.from("form_fields").select("*").eq("form_id", id);
      if (fields?.length) {
        await admin.from("form_fields").insert(
          fields.map((f: any) => {
            const { id: _fid, created_at: _fc, ...fr } = f;
            return { ...fr, form_id: copy.id };
          }),
        );
      }
      return json({ form: copy });
    }

    if (action === "toggle_form") {
      const id = str(body?.id, 64);
      const { data: form } = await admin
        .from("forms").select("status").eq("id", id).eq("owner_user_id", ownerId).maybeSingle();
      if (!form) return json({ error: "Formulário não encontrado." }, 404);
      const next = form.status === "active" ? "inactive" : "active";
      await admin.from("forms").update({ status: next, updated_at: new Date().toISOString() }).eq("id", id);
      return json({ status: next });
    }

    if (action === "delete_form") {
      const id = str(body?.id, 64);
      const { error } = await admin.from("forms").delete().eq("id", id).eq("owner_user_id", ownerId);
      if (error) throw error;
      return json({ ok: true });
    }

    // ─────────── RESPOSTAS ───────────
    if (action === "submissions") {
      const formId = str(body?.form_id, 64);
      if (!formId) return json({ error: "Formulário não informado." }, 400);
      const { data: form } = await admin
        .from("forms").select("id, name, title").eq("id", formId).eq("owner_user_id", ownerId).maybeSingle();
      if (!form) return json({ error: "Formulário não encontrado." }, 404);

      const { data: fields } = await admin
        .from("form_fields").select("label, name, field_type, position, page").eq("form_id", formId).order("position");
      const rows: any[] = [];
      for (let page = 0; page < 20; page++) {
        const { data: batch } = await admin
          .from("form_submissions")
          .select("id, data, files, lead_id, created_at, device, referrer, utm_source, utm_medium, utm_campaign")
          .eq("form_id", formId)
          .eq("owner_user_id", ownerId)
          .order("created_at", { ascending: false })
          .range(page * 1000, page * 1000 + 999);
        if (!batch?.length) break;
        rows.push(...batch);
        if (batch.length < 1000) break;
      }

      const leadIds = [...new Set((rows || []).map((row: any) => row.lead_id).filter(Boolean))];
      let leads: Record<string, { id: string; company_name: string | null; contact_name: string | null }> = {};
      if (leadIds.length) {
        const { data: leadRows } = await admin
          .from("leads").select("id, company_name, contact_name").in("id", leadIds);
        leads = Object.fromEntries((leadRows || []).map((lead: any) => [lead.id, lead]));
      }
      return json({ form, fields: fields || [], submissions: rows || [], leads });
    }

    if (action === "submission_file_url") {
      const submissionId = str(body?.submission_id, 64);
      const path = str(body?.path, 500);
      if (!submissionId || !path) return json({ error: "Arquivo não informado." }, 400);
      const { data: submission } = await admin
        .from("form_submissions").select("id, files").eq("id", submissionId).eq("owner_user_id", ownerId).maybeSingle();
      if (!submission) return json({ error: "Envio não encontrado." }, 404);
      const allowed = Array.isArray((submission as any).files)
        && (submission as any).files.some((file: any) => file?.path === path);
      if (!allowed) return json({ error: "Arquivo não encontrado." }, 404);
      const { data: signed, error } = await admin.storage.from("form-uploads").createSignedUrl(path, 60 * 30);
      if (error || !signed?.signedUrl) return json({ error: "Não foi possível abrir o arquivo." }, 500);
      return json({ url: signed.signedUrl });
    }

    // ─────────── LINKS RASTREADOS ───────────
    if (action === "check_link_slug") {
      const desired = slugify(str(body?.slug, 80) || "");
      const id = str(body?.id, 64);
      if (!desired) return json({ available: false, slug: "" });
      const { data: existing } = await admin.from("tracked_links").select("id").eq("slug", desired).maybeSingle();
      return json({ available: !existing || existing.id === id, slug: desired });
    }

    if (action === "create_link") {
      const c = await counts();
      if (c.links >= limits.links) {
        return json({ error: "limit_reached", message: "Você atingiu o limite de links rastreados do seu plano." }, 403);
      }
    }

    if (action === "create_link" || action === "update_link") {
      const input = body?.link || {};
      const name = str(input.name, 120) || "Link sem nome";
      const rawDestination = (str(input.destination_url, 900) || "").trim();
      const destination = rawDestination && !/^[a-z][a-z0-9+.-]*:\/\//i.test(rawDestination)
        ? `https://${rawDestination.replace(/^\/+/, "")}`
        : rawDestination;
      let validDestination = false;
      try {
        const parsed = new URL(destination);
        validDestination = /^https?:$/i.test(parsed.protocol) && parsed.hostname.includes(".");
      } catch { validDestination = false; }
      if (!validDestination) {
        return json({ error: "Informe uma URL de destino válida (ex.: www.seusite.com.br)." }, 400);
      }
      const payload: Record<string, unknown> = {
        owner_user_id: ownerId,
        name,
        destination_url: destination,
        utm_source: str(input.utm_source, 120),
        utm_medium: str(input.utm_medium, 120),
        utm_campaign: str(input.utm_campaign, 120),
        utm_term: str(input.utm_term, 120),
        utm_content: str(input.utm_content, 120),
        status: input.status === "inactive" ? "inactive" : "active",
      };
      const desiredSlug = str(input.slug, 80) ? slugify(str(input.slug, 80)!) : "";
      const linkId = str(input.id, 64);
      if (desiredSlug) {
        const { data: slugOwner } = await admin.from("tracked_links").select("id").eq("slug", desiredSlug).maybeSingle();
        if (slugOwner && slugOwner.id !== linkId) {
          return json({ error: `O endereço "/r/${desiredSlug}" já está em uso. Escolha outro.` }, 409);
        }
        payload.slug = desiredSlug;
      }

      if (action === "create_link") {
        payload.created_by = user.id;
        if (!payload.slug) payload.slug = await uniqueSlug("tracked_links", name);
        const { data, error } = await admin.from("tracked_links").insert(payload).select("*").single();
        if (error) throw error;
        return json({ link: data });
      }
      const id = linkId;
      const { data: existing } = await admin
        .from("tracked_links").select("id").eq("id", id).eq("owner_user_id", ownerId).maybeSingle();
      if (!existing) return json({ error: "Link não encontrado." }, 404);
      payload.updated_at = new Date().toISOString();
      const { data, error } = await admin.from("tracked_links").update(payload).eq("id", id).select("*").single();
      if (error) throw error;
      return json({ link: data });
    }

    if (action === "delete_link") {
      const id = str(body?.id, 64);
      const { error } = await admin.from("tracked_links").delete().eq("id", id).eq("owner_user_id", ownerId);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("[forms-admin]", e);
    return json({ error: (e as Error)?.message || "Erro inesperado" }, 500);
  }
});
