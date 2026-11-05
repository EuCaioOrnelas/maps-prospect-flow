import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getGoogleAccessToken, googleFailure, json, resolveCaller } from "../_shared/googleAuth.ts";

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

// UTF-8 safe base64 (btoa alone only handles Latin-1).
const b64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const b64url = (s: string) => b64(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// RFC 2047 for non-ASCII headers (accents, emojis in subject).
const encHeader = (v: string) => (/^[\x20-\x7E]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);
// Base64 body wrapped at 76 chars.
const wrap = (s: string) => b64(s).replace(/(.{76})/g, "$1\r\n");

function parseList(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,;\s]+/) : [];
  return Array.from(new Set(raw.map((e) => String(e).trim()).filter(Boolean)));
}

const stripHtml = (h: string) =>
  h.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\n{3,}/g, "\n\n").trim();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { google_account_id } = body;
    const subject = typeof body.subject === "string" ? body.subject.replace(/[\r\n]+/g, " ").trim().slice(0, 900) : "";
    const to = parseList(body.to);
    const cc = parseList(body.cc);
    const bcc = parseList(body.bcc);

    const invalid = [...to, ...cc, ...bcc].filter((e) => !EMAIL_RE.test(e));
    if (to.length === 0) return json({ error: "Informe um destinatário válido" }, 400);
    if (invalid.length) return json({ error: `E-mail inválido: ${invalid.join(", ")}` }, 400);
    if (!subject) return json({ error: "Informe o assunto do e-mail" }, 400);
    if (to.length + cc.length + bcc.length > 50) return json({ error: "Máximo de 50 destinatários" }, 400);

    const html = typeof body.body_html === "string" && body.body_html.trim() ? body.body_html : "";
    const text = typeof body.body_text === "string" ? body.body_text : html ? stripHtml(html) : "";

    const supabase = adminClient();
    const caller = await resolveCaller(req, supabase, body.user_id);
    if (caller instanceof Response) return caller;

    const tok = await getGoogleAccessToken(supabase, caller.userId, google_account_id, "gmail");
    if (tok instanceof Response) return tok;

    const headers = [
      ...(tok.account.google_email ? [`From: ${tok.account.google_email}`] : []),
      `To: ${to.join(", ")}`,
      ...(cc.length ? [`Cc: ${cc.join(", ")}`] : []),
      ...(bcc.length ? [`Bcc: ${bcc.join(", ")}`] : []),
      `Subject: ${encHeader(subject)}`,
      "MIME-Version: 1.0",
    ];

    let mime: string;
    if (html) {
      const boundary = `wiize_${crypto.randomUUID().replace(/-/g, "")}`;
      mime = [
        ...headers,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        wrap(text),
        `--${boundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        wrap(html),
        `--${boundary}--`,
      ].join("\r\n");
    } else {
      mime = [
        ...headers,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        wrap(text),
      ].join("\r\n");
    }

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: b64url(mime) }),
    });
    if (!gmailRes.ok) return await googleFailure(gmailRes, "Falha ao enviar o e-mail");
    const gmailData = await gmailRes.json();

    return json({ success: true, messageId: gmailData.id, from: tok.account.google_email });
  } catch (err) {
    console.error("Error in gmail-send-action:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
