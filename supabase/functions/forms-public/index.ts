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
        .select("id, field_type, label, name, placeholder, required, position, options")
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

      await admin.from("tracked_link_clicks").insert({
        tracked_link_id: link.id,
        owner_user_id: link.owner_user_id,
        referrer: sanitize(body?.referrer, 500) || null,
        user_agent: ua.slice(0, 400),
        device: deviceFrom(ua),
        visitor_hash: await hash(`${ip}|${ua}`),
        utm_source: link.utm_source,
        utm_medium: link.utm_medium,
        utm_campaign: link.utm_campaign,
        utm_term: link.utm_term,
        utm_content: link.utm_content,
      });

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

      // rate limit simples por IP + formulário (5 envios / 10 min)
      const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const ipHash = await hash(ip);
      const { count: recent } = await admin
        .from("form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("form_id", form.id)
        .eq("ip_hash", ipHash)
        .gte("created_at", since);
      if ((recent || 0) >= 5) return json({ error: "Muitos envios seguidos. Tente novamente em alguns minutos." }, 429);

      const { data: fields } = await admin
        .from("form_fields").select("*").eq("form_id", form.id).eq("is_active", true).order("position");

      const raw = (body?.data && typeof body.data === "object") ? body.data : {};
      const values: Record<string, string> = {};
      for (const f of fields || []) {
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
        landing_url: sanitize(body?.landing_url, 500) || null,
        user_agent: ua.slice(0, 400),
        device: deviceFrom(ua),
        ip_hash: ipHash,
        tracked_link_id: null as string | null,
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

      // ───── CRM ─────
      let leadId: string | null = null;
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
          origin: "formulario",
          source: "form",
          form_id: form.id,
          form_submission_id: submission.id,
          updated_at: new Date().toISOString(),
        };
        if (responsible) leadPayload.responsible_user_id = responsible;

        if (existing) {
          await admin.from("leads").update(leadPayload).eq("id", existing.id);
          leadId = existing.id;
        } else {
          if (stageId) leadPayload.pipeline_stage_id = stageId;
          const { data: lead, error: leadErr } = await admin
            .from("leads").insert(leadPayload).select("id").single();
          if (leadErr) console.error("[forms-public] lead insert", leadErr);
          leadId = lead?.id || null;
        }
        if (leadId) await admin.from("form_submissions").update({ lead_id: leadId }).eq("id", submission.id);
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
            ["Origem", submissionPayload.utm_source || submissionPayload.referrer || "Direto"],
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

      return json({ ok: true, message: form.success_message, lead_id: leadId });
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (e) {
    console.error("[forms-public]", e);
    return json({ error: "Erro inesperado" }, 500);
  }
});
