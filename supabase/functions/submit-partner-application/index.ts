// Public endpoint for the Wiize Partners landing-page application form.
// Performs validation, dedup checks, anti-fraud, password hashing,
// score computation, then inserts a new row into partner_applications
// and emits the "partner_application_received" confirmation email.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface SubmissionPayload {
  // Step 1
  full_name: string;
  company_name?: string;
  cpf: string;
  cnpj?: string;
  email: string;
  phone: string;
  phone_secondary?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  // Step 2
  access_email: string;
  password: string;
  // Step 3
  profile?: string;
  years_in_market?: string;
  has_team?: boolean;
  current_clients_count?: number;
  // Step 4
  instagram_url?: string;
  youtube_url?: string;
  tiktok_url?: string;
  linkedin_url?: string;
  website_url?: string;
  community_url?: string;
  audience_size?: string;
  monthly_leads_estimate?: string;
  // Step 5
  promotion_channels?: string[];
  expected_monthly_referrals?: number;
  promoted_other_softwares?: boolean;
  other_softwares_details?: string;
  // Step 6
  reason_to_be_partner?: string;
  reason_to_be_approved?: string;
  how_would_sell?: string;
  differential?: string;
  results_90_days?: string;
  // Step 7
  documents?: Array<{ type: string; url: string; filename: string; size: number }>;
  // Step 8
  terms_accepted: boolean;
  info_accuracy_confirmed: boolean;
  contact_authorized: boolean;
  // tracking
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  source?: string;
  // honeypot — must be empty
  website?: string;
}

function cleanDigits(s: string | undefined | null): string {
  return (s || "").replace(/\D/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isStrongPassword(pwd: string): boolean {
  if (!pwd || pwd.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  return hasLetter && hasDigit;
}

function isValidCpf(cpf: string): boolean {
  const c = cleanDigits(cpf);
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

function computeScore(p: SubmissionPayload): number {
  let s = 0;
  // Empresa
  if (p.company_name?.trim()) s += 8;
  if (p.cnpj && cleanDigits(p.cnpj).length === 14) s += 12;
  // Audiência
  const socials = [p.instagram_url, p.youtube_url, p.tiktok_url, p.linkedin_url, p.website_url, p.community_url].filter(Boolean).length;
  s += Math.min(socials * 5, 25);
  if (p.audience_size && /[0-9]/.test(p.audience_size)) s += 10;
  if (p.monthly_leads_estimate && /[0-9]/.test(p.monthly_leads_estimate)) s += 7;
  // Experiência
  if (p.promoted_other_softwares) s += 12;
  if (p.years_in_market === "5+") s += 10;
  else if (p.years_in_market === "3-5") s += 7;
  else if (p.years_in_market === "1-2") s += 4;
  // Carteira
  if ((p.current_clients_count || 0) >= 50) s += 12;
  else if ((p.current_clients_count || 0) >= 10) s += 7;
  else if ((p.current_clients_count || 0) > 0) s += 3;
  if ((p.expected_monthly_referrals || 0) >= 10) s += 8;
  // Respostas (qualidade pelo tamanho)
  const answers = [p.reason_to_be_partner, p.reason_to_be_approved, p.how_would_sell, p.differential, p.results_90_days];
  for (const a of answers) {
    if (a && a.trim().length > 80) s += 4;
    else if (a && a.trim().length > 30) s += 2;
  }
  // Documentos
  if ((p.documents?.length || 0) >= 1) s += 5;
  if ((p.documents?.length || 0) >= 3) s += 5;
  // Canais
  if ((p.promotion_channels?.length || 0) >= 3) s += 5;
  return Math.min(s, 100);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    const payload = (await req.json()) as SubmissionPayload;

    // Honeypot — silently accept (return success but DO NOT insert)
    if (payload.website && payload.website.trim() !== "") {
      return json(200, { success: true });
    }

    // Required-field validation
    const errors: Record<string, string> = {};
    if (!payload.full_name?.trim() || payload.full_name.trim().length < 3) errors.full_name = "Nome completo é obrigatório";
    if (!payload.email || !isValidEmail(payload.email)) errors.email = "E-mail inválido";
    if (!payload.phone || cleanDigits(payload.phone).length < 10) errors.phone = "WhatsApp inválido";
    if (!payload.cpf || !isValidCpf(payload.cpf)) errors.cpf = "CPF inválido";
    if (!payload.access_email || !isValidEmail(payload.access_email)) errors.access_email = "E-mail de acesso inválido";
    if (!payload.password || !isStrongPassword(payload.password)) errors.password = "Senha fraca (mínimo 8 caracteres com letras e números)";
    if (!payload.terms_accepted) errors.terms_accepted = "Você precisa aceitar os termos";
    if (!payload.info_accuracy_confirmed) errors.info_accuracy_confirmed = "Confirme a veracidade das informações";

    if (Object.keys(errors).length > 0) {
      return json(400, { error: "Dados inválidos", fields: errors });
    }

    const emailNorm = payload.email.trim().toLowerCase();

    // Rate limit per IP (max 3 submissions / 1h)
    if (ip !== "unknown") {
      const { data: rl } = await supabase.rpc("check_rate_limit", {
        p_identifier: ip,
        p_endpoint: "submit-partner-application",
        p_max_requests: 3,
        p_window_seconds: 3600,
      });
      if (rl && (rl as any).allowed === false) {
        return json(429, {
          error: "Muitas candidaturas enviadas deste IP. Tente novamente mais tarde.",
        });
      }
    }

    // Pre-check duplicates (email + cpf)
    const { data: pre, error: preErr } = await supabase.rpc("partner_application_pre_check", {
      p_email: emailNorm,
      p_cpf: payload.cpf,
    });
    if (preErr) {
      console.error("[submit-partner-application] pre_check error:", preErr);
      return json(500, { error: "Erro ao validar candidatura" });
    }
    if (pre && (pre as any).blocked) {
      return json(409, { error: (pre as any).message || "Candidatura duplicada", reason: (pre as any).reason });
    }

    // Hash password
    const password_hash = await bcrypt.hash(payload.password);

    // Compute score
    const internal_score = computeScore(payload);

    // Insert
    const { data: inserted, error: insErr } = await supabase
      .from("partner_applications")
      .insert({
        full_name: payload.full_name.trim(),
        company_name: payload.company_name?.trim() || null,
        cpf: cleanDigits(payload.cpf),
        cnpj: payload.cnpj ? cleanDigits(payload.cnpj) : null,
        email: emailNorm,
        phone: payload.phone.trim(),
        phone_secondary: payload.phone_secondary?.trim() || null,
        country: payload.country || "BR",
        state: payload.state?.trim() || null,
        city: payload.city?.trim() || null,
        address: payload.address?.trim() || null,
        postal_code: payload.postal_code ? cleanDigits(payload.postal_code) : null,
        access_email: payload.access_email.trim().toLowerCase(),
        password_hash,
        profile: payload.profile || null,
        years_in_market: payload.years_in_market || null,
        has_team: payload.has_team ?? null,
        current_clients_count: payload.current_clients_count ?? null,
        instagram_url: payload.instagram_url?.trim() || null,
        youtube_url: payload.youtube_url?.trim() || null,
        tiktok_url: payload.tiktok_url?.trim() || null,
        linkedin_url: payload.linkedin_url?.trim() || null,
        website_url: payload.website_url?.trim() || null,
        community_url: payload.community_url?.trim() || null,
        audience_size: payload.audience_size?.trim() || null,
        monthly_leads_estimate: payload.monthly_leads_estimate?.trim() || null,
        promotion_channels: payload.promotion_channels || null,
        expected_monthly_referrals: payload.expected_monthly_referrals ?? null,
        promoted_other_softwares: payload.promoted_other_softwares ?? null,
        other_softwares_details: payload.other_softwares_details?.trim() || null,
        reason_to_be_partner: payload.reason_to_be_partner?.trim() || null,
        reason_to_be_approved: payload.reason_to_be_approved?.trim() || null,
        how_would_sell: payload.how_would_sell?.trim() || null,
        differential: payload.differential?.trim() || null,
        results_90_days: payload.results_90_days?.trim() || null,
        motivation: payload.reason_to_be_partner?.trim() || null, // legacy column
        documents: payload.documents || [],
        internal_score,
        terms_accepted: !!payload.terms_accepted,
        info_accuracy_confirmed: !!payload.info_accuracy_confirmed,
        contact_authorized: !!payload.contact_authorized,
        status: "pending",
        utm_source: payload.utm_source || null,
        utm_medium: payload.utm_medium || null,
        utm_campaign: payload.utm_campaign || null,
        source: payload.source || "landing_partners_apply",
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id")
      .single();

    if (insErr) {
      console.error("[submit-partner-application] insert error:", insErr);
      return json(500, { error: "Erro ao registrar candidatura" });
    }

    // Send confirmation email (best-effort, non-blocking)
    fetch(`${supabaseUrl}/functions/v1/send-partner-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({
        type: "partner_application_received",
        to: emailNorm,
        data: { first_name: payload.full_name.split(" ")[0] || "Parceiro" },
      }),
    }).catch((e) => console.warn("[submit-partner-application] email err:", e));

    return json(200, { success: true, application_id: inserted.id, score: internal_score });
  } catch (e) {
    console.error("[submit-partner-application] fatal:", e);
    return json(500, { error: "Erro inesperado" });
  }
});
