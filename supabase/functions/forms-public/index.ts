import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const APP_URL = "https://app.wiize.com.br";

function sanitize(value: unknown, max = 2000): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/<[^>]*>/g, "").trim().slice(0, max);
}

function deviceFrom(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet/.test(s)) return "tablet";
  if (/mobile|android|iphone/.test(s)) return "mobile";
  return "desktop";
}

async function hash(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

const ALLOWED_UPLOAD_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_UPLOADS = 10;

function safeFileName(value: string): string {
  const clean = (value || "arquivo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return clean || "arquivo";
}

function decodeBase64(value: string): Uint8Array {
  const clean = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const MESSAGE_PREFIX = "enc:v1:";
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
async function encryptNote(value: string): Promise<string | null> {
  const secret = Deno.env.get("WIIZE_MESSAGE_ENCRYPTION_KEY");
  if (!secret || secret.length < 32) return null;
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return `${MESSAGE_PREFIX}${bufferToBase64(iv.buffer)}:${bufferToBase64(ciphertext)}`;
}

/** Origem real do lead: UTM > site de origem externo > acesso direto. */
const INTERNAL_HOSTS = ["wiize.com.br", "lovable.app", "localhost", "127.0.0.1"];
const KNOWN_HOSTS: Record<string, string> = {
  "google.": "Google", "bing.": "Bing", "instagram.": "Instagram", "facebook.": "Facebook",
  "whatsapp": "WhatsApp", "wa.me": "WhatsApp", "linkedin.": "LinkedIn", "lnkd.in": "LinkedIn",
  "youtube.": "YouTube", "youtu.be": "YouTube", "tiktok.": "TikTok", "t.me": "Telegram",
  "x.com": "X (Twitter)", "twitter.": "X (Twitter)", "t.co": "X (Twitter)",
  "duckduckgo.": "DuckDuckGo", "mail.google": "E-mail", "outlook.": "E-mail",
};
const NOT_IDENTIFIED = "Não identificado";

/** Normaliza o HTTP Referer em uma origem legível. Sem evidência → "Não identificado". */
function getReferralSource(referrer?: string | null): { source: string; referrer: string | null } {
  const raw = (referrer || "").trim();
  let host = "";
  try { host = new URL(raw).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* sem referência */ }
  if (!host || INTERNAL_HOSTS.some((self) => host === self || host.endsWith(`.${self}`) || host.includes(self))) {
    return { source: NOT_IDENTIFIED, referrer: raw || null };
  }
  const known = Object.entries(KNOWN_HOSTS).find(([key]) => host.includes(key))?.[1];
  return { source: known || host, referrer: raw };
}

function resolveOrigin(payload: { utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; referrer?: string | null }) {
  const source = (payload.utm_source || "").trim();
  const medium = (payload.utm_medium || "").trim().toLowerCase();
  const campaign = (payload.utm_campaign || "").trim();
  if (source) {
    const pretty = Object.entries(KNOWN_HOSTS).find(([key]) => source.toLowerCase().includes(key.replace(/\.$/, "")))?.[1]
      || source.replace(/^\w/, (c) => c.toUpperCase());
    const paid = ["cpc", "ppc", "paid", "paid-social", "ads", "display"].includes(medium);
    return `${paid ? `${pretty} Ads` : pretty}${campaign ? ` · ${campaign}` : ""}`;
  }
  let host = "";
  try { host = new URL(payload.referrer || "").hostname.replace(/^www\./, "").toLowerCase(); } catch { /* sem referência */ }
  if (!host || INTERNAL_HOSTS.some((self) => host === self || host.endsWith(`.${self}`) || host.includes(self))) return NOT_IDENTIFIED;
  return Object.entries(KNOWN_HOSTS).find(([key]) => host.includes(key))?.[1] || host;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const ua = req.headers.get("user-agent") || "";
    const ip = clientIp(req);

    // ───── carregar formulário público ─────
    if (action === "get_form") {
      const slug = sanitize(body?.slug, 80);
      const { data: form } = await admin
        .from("forms")
        .select("id, slug, title, description, button_text, success_message, status, config")
        .eq("slug", slug)
        .maybeSingle();
      if (!form) return json({ error: "not_found" }, 404);
      if (form.status !== "active") return json({ status: "inactive" }, 200);
      const { data: fields } = await admin
        .from("form_fields")
        .select("id, field_type, label, name, placeholder, required, position, options, page")
        .eq("form_id", form.id)
        .eq("is_active", true)
        .order("position");
      return json({ form, fields: fields || [] });
    }

    // ───── registrar visualização ─────
    if (action === "view") {
      const slug = sanitize(body?.slug, 80);
      const { data: form } = await admin
        .from("forms").select("id, owner_user_id, status").eq("slug", slug).maybeSingle();
      if (!form || form.status !== "active") return json({ ok: false });
      await admin.from("form_views").insert({
        form_id: form.id,
        owner_user_id: form.owner_user_id,
        utm_source: sanitize(body?.utm?.utm_source, 120) || null,
        utm_medium: sanitize(body?.utm?.utm_medium, 120) || null,
        utm_campaign: sanitize(body?.utm?.utm_campaign, 120) || null,
        referrer: sanitize(body?.referrer, 500) || null,
        detected_source: getReferralSource(sanitize(body?.referrer, 500)).source,
        device: deviceFrom(ua),
      });
      return json({ ok: true });
    }

    // ───── clique em link rastreado ─────
    if (action === "click") {
      const slug = sanitize(body?.slug, 80);
      const { data: link } = await admin
        .from("tracked_links").select("*").eq("slug", slug).maybeSingle();
      if (!link || link.status !== "active") return json({ error: "not_found" }, 404);

      const registerClick = (async () => {
        await admin.from("tracked_link_clicks").insert({
          tracked_link_id: link.id,
          owner_user_id: link.owner_user_id,
          referrer: sanitize(body?.referrer, 500) || null,
          detected_source: getReferralSource(sanitize(body?.referrer, 500)).source,
          user_agent: ua.slice(0, 400),
          device: deviceFrom(ua),
          visitor_hash: await hash(`${ip}|${ua}`),
          utm_source: link.utm_source,
          utm_medium: link.utm_medium,
          utm_campaign: link.utm_campaign,
          utm_term: link.utm_term,
          utm_content: link.utm_content,
        });
      })();

      // não bloqueia a resposta: o redirecionamento sai imediatamente
      try {
        // @ts-ignore EdgeRuntime existe em produção
        if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(registerClick);
        else await registerClick;
      } catch {
        // clique não registrado não impede o redirecionamento
      }

      const url = new URL(link.destination_url);
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
        const value = (link as any)[key];
        if (value) url.searchParams.set(key, value);
      }
      url.searchParams.set("wz_link", link.slug);
      return json({ redirect: url.toString() });

    }

    // ───── envio do formulário ─────
    if (action === "submit") {
      const slug = sanitize(body?.slug, 80);
      if (sanitize(body?.hp, 40)) return json({ ok: true }); // honeypot

      const { data: form } = await admin.from("forms").select("*").eq("slug", slug).maybeSingle();
      if (!form) return json({ error: "not_found" }, 404);
      if (form.status !== "active") return json({ error: "Este formulário não está disponível no momento." }, 403);

      // rate limit por IP + formulário: no máximo 2 envios a cada 24 horas
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const ipHash = await hash(ip);
      const { count: recent } = await admin
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id)
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((recent || 0) >= 2) {
        return json({ error: "Você já enviou este formulário 2 vezes hoje. Tente novamente em 24 horas." }, 429);
      }

      const { data: fields } = await admin
        .from("form_fields").select("*").eq("form_id", form.id).eq("is_active", true).order("position");

      const raw = (body?.data && typeof body.data === "object") ? body.data : {};
      const values: Record<string, string> = {};

      // ── anexos enviados pelo lead (imagens comprimidas e PDFs) ──
      const incomingFiles = Array.isArray(body?.files) ? body.files.slice(0, MAX_UPLOADS) : [];
      const uploads: { field: string; name: string; mime: string; bytes: Uint8Array }[] = [];
      for (const item of incomingFiles) {
        const mime = sanitize(item?.mime, 80);
        const name = safeFileName(sanitize(item?.filename, 120));
        if (!ALLOWED_UPLOAD_MIMES.includes(mime)) {
          return json({ error: `Formato não permitido em "${name}". Envie imagens (JPG, PNG, WEBP) ou PDF.` }, 400);
        }
        let bytes: Uint8Array;
        try { bytes = decodeBase64(String(item?.data || "")); } catch { return json({ error: `Não foi possível ler o arquivo "${name}".` }, 400); }
        if (!bytes.length) return json({ error: `O arquivo "${name}" está vazio.` }, 400);
        if (bytes.length > MAX_UPLOAD_BYTES) return json({ error: `O arquivo "${name}" excede 8 MB.` }, 400);
        uploads.push({ field: sanitize(item?.field, 60), name, mime, bytes });
      }

      for (const f of fields || []) {
        if (f.field_type === "file") {
          const attached = uploads.filter((upload) => upload.field === f.name);
          if (f.required && !attached.length) return json({ error: `Envie um arquivo em "${f.label}".` }, 400);
          if (attached.length) values[f.name] = attached.map((upload) => upload.name).join(", ");
          continue;
        }
        const value = sanitize(raw[f.name], f.field_type === "textarea" ? 4000 : 400);
        if (f.required && !value) return json({ error: `O campo "${f.label}" é obrigatório.` }, 400);
        if (value && f.field_type === "email" && !isEmail(value)) {
          return json({ error: `Informe um e-mail válido em "${f.label}".` }, 400);
        }
        if (value && (f.field_type === "phone" || f.field_type === "whatsapp")) {
          const digits = value.replace(/\D/g, "");
          if (digits.length < 8) return json({ error: `Informe um telefone válido em "${f.label}".` }, 400);
        }
        if (value) values[f.name] = value;
      }

      const pick = (...names: string[]) => {
        for (const n of names) if (values[n]) return values[n];
        return "";
      };
      const email = pick("email", "e_mail");
      const phoneRaw = pick("telefone", "whatsapp", "phone", "celular");
      const phone = phoneRaw ? phoneRaw.replace(/\D/g, "") : "";
      const name =
        pick("nome_completo", "nome", "name") +
        (values["sobrenome"] ? ` ${values["sobrenome"]}` : "");
      const company = pick("empresa", "company");
      const message = pick("mensagem", "message");
      const city = pick("cidade", "city", "municipio");

      const utm = body?.utm || {};
      const submissionPayload = {
        form_id: form.id,
        owner_user_id: form.owner_user_id,
        data: values,
        utm_source: sanitize(utm.utm_source, 120) || null,
        utm_medium: sanitize(utm.utm_medium, 120) || null,
        utm_campaign: sanitize(utm.utm_campaign, 120) || null,
        utm_term: sanitize(utm.utm_term, 120) || null,
        utm_content: sanitize(utm.utm_content, 120) || null,
        referrer: sanitize(body?.referrer, 500) || null,
        detected_source: getReferralSource(sanitize(body?.referrer, 500)).source,
        landing_url: sanitize(body?.landing_url, 500) || null,
        user_agent: ua.slice(0, 400),
        device: deviceFrom(ua),
        ip_hash: ipHash,
        tracked_link_id: null as string | null,
      };

      // ── consentimento obrigatório (LGPD) ──
      const consentInput = (body?.consent && typeof body.consent === "object") ? body.consent : {};
      if (consentInput?.accepted !== true || !sanitize(consentInput?.text, 600)) {
        return json({ error: "Confirme o aceite para que possamos entrar em contato." }, 400);
      }
      (submissionPayload as Record<string, unknown>).consent = {
        accepted: true,
        text: sanitize(consentInput.text, 600),
        version: sanitize(consentInput.version, 40) || "v1",
        accepted_at: new Date().toISOString(),
        ip,
        user_agent: ua.slice(0, 400),
        form_id: form.id,
        form_slug: form.slug,
      };

      const wzLink = sanitize(body?.wz_link, 80);
      if (wzLink) {
        const { data: link } = await admin
          .from("tracked_links").select("id").eq("slug", wzLink).eq("owner_user_id", form.owner_user_id).maybeSingle();
        if (link) submissionPayload.tracked_link_id = link.id;
      }

      const { data: submission, error: subErr } = await admin
        .from("form_submissions").insert(submissionPayload).select("*").single();
      if (subErr) throw subErr;

      // Resposta imediata ao lead; anexos, CRM e avisos seguem em segundo plano.
      const processAfterResponse = async () => {
      // ───── arquivos enviados ─────
      const storedFiles: { field: string; name: string; mime: string; size: number; path: string }[] = [];
      const uploadResults = await Promise.all(uploads.map(async (upload, index) => {
        const path = `${form.owner_user_id}/${form.id}/${submission.id}/${index + 1}-${upload.name}`;
        const { error: uploadError } = await admin.storage
          .from("form-uploads")
          .upload(path, upload.bytes, { contentType: upload.mime, upsert: true });
        if (uploadError) { console.error("[forms-public] upload", uploadError); return null; }
        return { field: upload.field, name: upload.name, mime: upload.mime, size: upload.bytes.length, path };
      }));
      for (const stored of uploadResults) if (stored) storedFiles.push(stored);
      if (storedFiles.length) {
        await admin.from("form_submissions").update({ files: storedFiles }).eq("id", submission.id);
      }

      // ───── CRM ─────
      let leadId: string | null = null;
      let createdLead = false;
      let responsible: string | null = null;
      if (form.crm_enabled) {
        let existing: any = null;
        if (email) {
          const { data } = await admin
            .from("leads").select("id").eq("owner_user_id", form.owner_user_id).ilike("email", email).maybeSingle();
          existing = data;
        }
        if (!existing && phone) {
          const { data } = await admin
            .from("leads").select("id").eq("owner_user_id", form.owner_user_id).ilike("phone", `%${phone.slice(-8)}%`).maybeSingle();
          existing = data;
        }

        let stageId = form.crm_stage_id as string | null;
        if (!stageId) {
          const { data: stage } = await admin
            .from("pipeline_stages")
            .select("id")
            .eq("owner_user_id", form.owner_user_id)
            .order("position")
            .limit(1)
            .maybeSingle();
          stageId = stage?.id || null;
        }

        const configuredResponsibles = Array.isArray(form.crm_responsibles)
          ? form.crm_responsibles.filter((value: unknown) => typeof value === "string").slice(0, 20)
          : [];
        responsible = configuredResponsibles[0] || null;
        if (form.config?.distributionMode === "round_robin" && configuredResponsibles.length > 1) {
          const { data: assignedRows } = await admin
            .from("leads")
            .select("responsible_user_id")
            .eq("owner_user_id", form.owner_user_id)
            .eq("form_id", form.id)
            .in("responsible_user_id", configuredResponsibles);
          const totals = new Map(configuredResponsibles.map((memberId: string) => [memberId, 0]));
          for (const row of assignedRows || []) {
            if (row.responsible_user_id && totals.has(row.responsible_user_id)) {
              totals.set(row.responsible_user_id, (totals.get(row.responsible_user_id) || 0) + 1);
            }
          }
          responsible = configuredResponsibles.reduce((selected: string, memberId: string) =>
            (totals.get(memberId) || 0) < (totals.get(selected) || 0) ? memberId : selected,
          configuredResponsibles[0]);
        }

        const leadPayload: Record<string, unknown> = {
          owner_user_id: form.owner_user_id,
          user_id: form.owner_user_id,
          company_name: company || name || "Lead do formulário",
          contact_name: name || null,
          email: email || null,
          phone: phone || null,
          origin: "CRM",
          source: "form",
          form_id: form.id,
          form_submission_id: submission.id,
          updated_at: new Date().toISOString(),
        };
        if (city) leadPayload.city = city;
        // Origem de tráfego (Referer/UTM) — complementar, nunca sobrescreve dado já existente.
        const detected = getReferralSource(submissionPayload.referrer);
        const trafficSource = resolveOrigin(submissionPayload);
        if (trafficSource && trafficSource !== NOT_IDENTIFIED) leadPayload.traffic_source = trafficSource;
        else leadPayload.traffic_source = NOT_IDENTIFIED;
        if (detected.referrer) leadPayload.traffic_referrer = detected.referrer;
        if (responsible) leadPayload.responsible_user_id = responsible;

        if (existing) {
          const { data: currentLead } = await admin
            .from("leads").select("traffic_source, traffic_referrer").eq("id", existing.id).maybeSingle();
          const updatePayload = { ...leadPayload };
          if (currentLead?.traffic_source && currentLead.traffic_source !== NOT_IDENTIFIED) {
            delete (updatePayload as Record<string, unknown>).traffic_source;
            delete (updatePayload as Record<string, unknown>).traffic_referrer;
          }
          await admin.from("leads").update(updatePayload).eq("id", existing.id);
          leadId = existing.id;
        } else {
          if (stageId) leadPayload.pipeline_stage_id = stageId;
          const { data: lead, error: leadErr } = await admin
            .from("leads").insert(leadPayload).select("id").single();
          if (leadErr) console.error("[forms-public] lead insert", leadErr);
          leadId = lead?.id || null;
          createdLead = !!leadId;
        }
        if (leadId) await admin.from("form_submissions").update({ lead_id: leadId }).eq("id", submission.id);

        // Registra a entrada na etapa do CRM — é esse evento que dispara os
        // Fluxos com gatilho "Lead entrou em uma etapa".
        if (leadId && stageId && createdLead) {
          const { data: stageRow } = await admin
            .from("pipeline_stages").select("name").eq("id", stageId).maybeSingle();
          if (stageRow?.name) {
            await admin.from("lead_activities").insert({
              lead_id: leadId,
              owner_user_id: form.owner_user_id,
              user_id: form.owner_user_id,
              activity_type: "stage_changed",
              description: `Movido para ${stageRow.name}`,
            }).then(() => {}, (e: unknown) => console.error("[forms-public] stage activity", e));
          }
        }

        // Registra as respostas como nota interna e anexa os arquivos ao contato
        if (leadId) {
          try {
            const answerLines = (fields || [])
              .filter((f: any) => values[f.name])
              .map((f: any) => `• *${f.label}*\n  ${values[f.name]}`);
            const originLine = resolveOrigin(submissionPayload);
            const noteText = [
              "👋 *Wian · Assistente comercial*",
              "",
              `📝 Novo preenchimento do formulário *${form.name}*`,
              `🕒 ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
              `🌐 Origem: ${originLine}`,
              "",
              "*Respostas do lead*",
              ...answerLines,
              ...(storedFiles.length
                ? ["", "📎 *Arquivos enviados*", ...storedFiles.map((file) => `• ${file.name}`)]
                : []),
              "",
              "✅ Consentimento de contato aceito no envio do formulário.",
            ].join("\n").slice(0, 3900);
            const encrypted = await encryptNote(noteText);
            if (encrypted) {
              await admin.from("lead_notes").insert({
                lead_id: leadId,
                user_id: form.owner_user_id,
                owner_user_id: form.owner_user_id,
                content: encrypted,
              });
            }
            if (storedFiles.length) {
              await admin.from("lead_files").insert(storedFiles.map((file) => ({
                lead_id: leadId,
                user_id: form.owner_user_id,
                owner_user_id: form.owner_user_id,
                file_name: file.name,
                file_type: file.mime,
                file_url: file.path,
                file_size: file.size,
                source: "form",
              })));
            }
          } catch (crmErr) {
            console.error("[forms-public] crm attachments", crmErr);
          }
        }
      }

      // ───── notificação por e-mail ─────
      const configuredNotifyIds = Array.isArray(form.notify_user_ids)
        ? form.notify_user_ids.filter((value: unknown) => typeof value === "string").slice(0, 10)
        : [];
      const notificationRecipientIds = Array.from(new Set([
        ...(form.config?.notifyAssigned && responsible ? [responsible] : []),
        ...configuredNotifyIds,
      ]));
      if (form.notify_enabled && notificationRecipientIds.length) {
        try {
          const rows = [
            ["Nome", name],
            ["Empresa", company],
            ["E-mail", email],
            ["Telefone", phoneRaw],
            ["Mensagem", message],
            ["Origem", resolveOrigin(submissionPayload)],
            ["Campanha", submissionPayload.utm_campaign || "—"],
            ["Data/hora", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
          ].filter(([, v]) => v);

          for (const recipientId of notificationRecipientIds) {
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                user_id: recipientId,
                email_type: "FORM_NEW_LEAD",
                idempotency_key: `form-lead-${submission.id}-${recipientId}`,
                payload: {
                  form_name: form.name,
                  rows,
                  crm_url: `${APP_URL}/crm${leadId ? `?lead=${leadId}` : ""}`,
                },
              }),
            });
          }
        } catch (mailErr) {
          console.error("[forms-public] notify", mailErr);
        }
      }

      };

      try {
        const runner = (globalThis as any).EdgeRuntime?.waitUntil;
        if (typeof runner === "function") runner(processAfterResponse());
        else await processAfterResponse();
      } catch (bgErr) {
        console.error("[forms-public] background", bgErr);
      }

      return json({ ok: true, message: form.success_message });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("[forms-public]", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
