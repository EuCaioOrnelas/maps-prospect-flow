// Shared helpers for the Lifecycle Email infrastructure (Trial Email Flow).
// Used by: lifecycle-worker, lifecycle-admin, lifecycle-tracker, lifecycle-webhook.

export const LIFECYCLE_BRAND = {
  name: "Wiize",
  color: "#3daa57",
  url: "https://wiize.com.br",
  from: "Wiize <no-reply@wiize.com.br>",
};

export const lifecycleCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface LifecycleVars {
  "user.name": string;
  "user.email": string;
  "company.name": string;
  "trial.days_remaining": string;
  "trial.end_date": string;
  dashboard_url: string;
  checkout_url: string;
  [key: string]: string;
}

/** Replaces {{var}} tokens. Unknown/empty tokens are removed (never "undefined"). */
export function compileTemplate(input: string, vars: Record<string, string>): string {
  if (!input) return "";
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

/** "Olá, {{user.name}}" with empty name must not leave dangling punctuation. */
export function cleanupEmptyGreetings(html: string): string {
  return html
    .replace(/Olá,\s*\./g, "Olá!")
    .replace(/Olá,\s*</g, "Olá!<")
    .replace(/\s+,/g, ",")
    .replace(/\(\s*\)/g, "");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Aplica estilos inline nas tags que não têm `style` — necessário porque clientes
 * de e-mail ignoram CSS externo e o editor visual gera HTML simples.
 */
const INLINE_STYLES: Record<string, string> = {
  h1: "margin:0 0 16px;font-size:24px;line-height:1.3;color:#18181b;font-weight:700;",
  h2: "margin:24px 0 12px;font-size:20px;line-height:1.3;color:#18181b;font-weight:700;",
  h3: "margin:20px 0 10px;font-size:17px;line-height:1.4;color:#18181b;font-weight:700;",
  p: "margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f46;",
  li: "margin:0 0 8px;font-size:16px;line-height:1.6;color:#3f3f46;",
  ul: "margin:0 0 16px;padding-left:20px;",
  ol: "margin:0 0 16px;padding-left:20px;",
  a: "color:#3daa57;",
  img: "max-width:100%;height:auto;border-radius:8px;",
  blockquote: "margin:0 0 16px;padding:12px 16px;border-left:3px solid #3daa57;background:#f4f4f5;color:#3f3f46;font-size:16px;line-height:1.6;",
};

export function styleEmailHtml(html: string): string {
  let output = html;
  for (const [tag, style] of Object.entries(INLINE_STYLES)) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, "gi");
    output = output.replace(re, (match, attrs = "") => {
      if (/\sstyle\s*=/i.test(match)) return match;
      const cleanAttrs = attrs || "";
      return `<${tag}${cleanAttrs} style="${style}">`;
    });
  }
  return output;
}

export function lifecycleLayout(opts: {
  body: string;
  preheader?: string;
  trackingPixel?: string;
  unsubscribeUrl?: string;
  isTest?: boolean;
}): string {
  const preheaderHtml = opts.preheader
    ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(opts.preheader)}</div>`
    : "";
  const testBanner = opts.isTest
    ? `<tr><td style="padding:10px 32px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;text-align:center;">E-MAIL DE TESTE — não representa um envio real de campanha</td></tr>`
    : "";
  const unsubscribe = opts.unsubscribeUrl
    ? `<p style="margin:6px 0 0;font-size:12px;color:#a1a1aa;"><a href="${opts.unsubscribeUrl}" style="color:#a1a1aa;text-decoration:underline;">Não quero mais receber estes e-mails</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);max-width:560px;width:100%;">
${testBanner}
<tr><td style="background:${LIFECYCLE_BRAND.color};padding:22px 32px;text-align:center;">
  <span style="color:#ffffff;font-size:20px;font-weight:700;">${LIFECYCLE_BRAND.name}</span>
</td></tr>
<tr><td style="padding:32px;">
${opts.body}
</td></tr>
<tr><td style="padding:16px 32px;background:#fafafa;text-align:center;border-top:1px solid #e4e4e7;">
  <p style="margin:0;font-size:12px;color:#a1a1aa;">Você recebeu este e-mail porque criou uma conta na ${LIFECYCLE_BRAND.name}.</p>
  ${unsubscribe}
</td></tr>
</table>
</td></tr>
</table>
${opts.trackingPixel || ""}
</body>
</html>`;
}

/** HMAC-SHA256 signature (hex) used to protect tracking/unsubscribe links. */
export async function signToken(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyToken(secret: string, payload: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  const expected = await signToken(secret, payload);
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

/** Rewrites links for click tracking and appends the open pixel. */
export async function injectTracking(opts: {
  html: string;
  baseUrl: string;
  deliveryId: string;
  secret: string;
}): Promise<string> {
  const sig = await signToken(opts.secret, opts.deliveryId);
  const tracker = `${opts.baseUrl}/functions/v1/lifecycle-tracker`;

  const withLinks = opts.html.replace(
    /<a\s([^>]*?)href="(https?:\/\/[^"]+)"([^>]*)>([\s\S]*?)<\/a>/g,
    (match, pre: string, url: string, post: string, label: string) => {
      if (url.includes("lifecycle-tracker")) return match;
      const plain = label.replace(/<[^>]*>/g, "").trim().slice(0, 80);
      const trackUrl =
        `${tracker}?action=click&d=${opts.deliveryId}&s=${sig}` +
        `&l=${encodeURIComponent(plain)}&url=${encodeURIComponent(url)}`;
      return `<a ${pre}href="${trackUrl}"${post}>${label}</a>`;
    },
  );

  const pixel = `<img src="${tracker}?action=open&d=${opts.deliveryId}&s=${sig}" width="1" height="1" alt="" style="display:none;" />`;
  return withLinks + pixel;
}

export async function buildUnsubscribeUrl(baseUrl: string, deliveryId: string, secret: string): Promise<string> {
  const sig = await signToken(secret, deliveryId);
  return `${baseUrl}/functions/v1/lifecycle-tracker?action=unsubscribe&d=${deliveryId}&s=${sig}`;
}

export function buildVars(user: {
  name?: string | null;
  email?: string | null;
  company_name?: string | null;
  trialEnd?: Date | null;
  daysRemaining?: number;
}): Record<string, string> {
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "";
  return {
    "user.name": firstName,
    "user.email": user.email || "",
    "company.name": user.company_name || "",
    "trial.days_remaining": user.daysRemaining === undefined ? "" : String(Math.max(0, user.daysRemaining)),
    "trial.end_date": user.trialEnd
      ? user.trialEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "",
    dashboard_url: `${LIFECYCLE_BRAND.url}/dashboard`,
    checkout_url: `${LIFECYCLE_BRAND.url}/planos`,
  };
}

/** Sends through Resend (the provider already used across the project). */
export async function sendWithResend(apiKey: string, payload: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  headers?: Record<string, string>;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: payload.from || LIFECYCLE_BRAND.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        headers: payload.headers,
      }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text.slice(0, 500) };
    let id: string | undefined;
    try {
      id = JSON.parse(text)?.id;
    } catch (_) { /* provider returned non-JSON */ }
    return { ok: true, id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
