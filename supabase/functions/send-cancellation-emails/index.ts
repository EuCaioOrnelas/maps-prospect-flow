// Envia 2 emails ao cancelar assinatura:
// 1. Confirmação para o usuário
// 2. Notificação para o admin (wiize.app@gmail.com)
// Usa Resend via gateway Lovable.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "wiize.app@gmail.com";
const FROM = "Wiize <noreply@wiize.com.br>";
const GATEWAY = "https://connector-gateway.lovable.dev/resend";

const log = (s: string, d?: unknown) =>
  console.log(`[CANCEL-EMAIL] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

interface Payload {
  userEmail: string;
  userName?: string | null;
  plan?: string | null;
  activeUntil?: string | null;
  provider?: string | null;
  reason?: string | null;
  usageLevel?: string | null;
  comments?: string | null;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const userTemplate = (p: Payload) => `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f5f7fa;padding:24px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
  <tr><td style="background:#10b981;padding:28px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:600;">Cancelamento confirmado</h1>
  </td></tr>
  <tr><td style="padding:32px;color:#1f2937;line-height:1.6;">
    <p style="margin:0 0 16px;">Olá${p.userName ? ` ${p.userName}` : ""},</p>
    <p style="margin:0 0 16px;">Confirmamos o cancelamento da renovação automática da sua assinatura <strong>Wiize ${p.plan || ""}</strong>.</p>
    <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:6px;margin:20px 0;">
      <p style="margin:0;font-size:14px;color:#065f46;"><strong>Acesso ativo até:</strong> ${formatDate(p.activeUntil)}</p>
    </div>
    <p style="margin:0 0 16px;">Você pode continuar usando todos os recursos do seu plano até essa data. Após esse período, sua conta será movida para o plano gratuito automaticamente.</p>
    <p style="margin:24px 0 8px;color:#6b7280;font-size:14px;">Mudou de ideia? Você pode reativar sua assinatura a qualquer momento.</p>
    <p style="margin:0 0 8px;">— Equipe Wiize</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
    Este é um email automático. Em caso de dúvidas, responda diretamente.
  </td></tr>
</table></body></html>
`;

const adminTemplate = (p: Payload) => `
<!DOCTYPE html>
<html><body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f5f7fa;padding:24px;margin:0;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
  <tr><td style="background:#dc2626;padding:24px;">
    <h1 style="color:#fff;margin:0;font-size:20px;">⚠️ Cancelamento de assinatura</h1>
  </td></tr>
  <tr><td style="padding:28px;color:#1f2937;line-height:1.6;">
    <table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px;">
      <tr><td style="background:#f9fafb;font-weight:600;width:140px;">Usuário</td><td style="background:#f9fafb;">${p.userName || "—"}</td></tr>
      <tr><td style="font-weight:600;">Email</td><td><a href="mailto:${p.userEmail}" style="color:#2563eb;">${p.userEmail}</a></td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Plano</td><td style="background:#f9fafb;">${p.plan || "—"}</td></tr>
      <tr><td style="font-weight:600;">Provider</td><td>${(p.provider || "—").toUpperCase()}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:600;">Acesso até</td><td style="background:#f9fafb;">${formatDate(p.activeUntil)}</td></tr>
    </table>

    <h3 style="margin:24px 0 8px;color:#dc2626;font-size:15px;">📋 Feedback do churn</h3>
    <table width="100%" cellpadding="8" style="border-collapse:collapse;font-size:14px;border:1px solid #e5e7eb;border-radius:6px;">
      <tr><td style="font-weight:600;width:140px;background:#fef2f2;">Motivo</td><td style="background:#fef2f2;">${p.reason || "Não informado"}</td></tr>
      <tr><td style="font-weight:600;">Nível de uso</td><td>${p.usageLevel || "Não informado"}</td></tr>
      <tr><td style="font-weight:600;background:#fef2f2;vertical-align:top;">Comentários</td><td style="background:#fef2f2;">${p.comments ? p.comments.replace(/\n/g, "<br>") : "—"}</td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:14px;text-align:center;color:#9ca3af;font-size:12px;">
    Notificação automática Wiize Admin
  </td></tr>
</table></body></html>
`;

const sendEmail = async (to: string, subject: string, html: string) => {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !resendKey) throw new Error("Missing email credentials");

  const res = await fetch(`${GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  return data;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload.userEmail) throw new Error("userEmail required");
    log("Sending", { to: payload.userEmail });

    const results = await Promise.allSettled([
      sendEmail(
        payload.userEmail,
        "Cancelamento da sua assinatura Wiize confirmado",
        userTemplate(payload),
      ),
      sendEmail(
        ADMIN_EMAIL,
        `🔴 Cancelamento: ${payload.userEmail} (${payload.plan || "—"})`,
        adminTemplate(payload),
      ),
    ]);

    const userOk = results[0].status === "fulfilled";
    const adminOk = results[1].status === "fulfilled";
    if (!userOk) log("user fail", results[0]);
    if (!adminOk) log("admin fail", results[1]);

    return new Response(
      JSON.stringify({ success: true, userOk, adminOk }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
