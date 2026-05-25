// Generates a partner certificate PDF on demand.
//
// Auth:
//   - Admins can generate for any partner_id.
//   - A partner can generate their own (matched via partner_users.user_id).
//
// Modes:
//   - { partner_id }                          → look up DB and stamp
//   - { preview: true, full_name, ... }       → admin-only ad-hoc preview
//
// Response:
//   - default: application/pdf binary
//   - ?format=base64 or { as_base64: true }   → { pdf_base64, filename }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

// ----------------------------------------------------------------
// Wiize Partners — inline certificate generator (PDF)
// ----------------------------------------------------------------
interface CertificateData {
  full_name: string;
  tax_id?: string | null;
  partner_since: string;
  verification_code: string;
}

const CERT_TEMPLATE_URL =
  "https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/partner-certificates/templates/certificate-template.pdf";

const CERT_TEXT_COLOR = rgb(0.08, 0.08, 0.08);
const CERT_FIELDS = {
  nome: { x: 248, y: 362 },
  cpf:  { x: 212, y: 315 },
  data: { x: 294, y: 268 },
  id:   { x: 252, y: 227 },
};
const CERT_FONT_SIZE = 12;

function maskTaxId(raw?: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return raw;
}

function fmtCertDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return iso; }
}

async function generateCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const resp = await fetch(CERT_TEMPLATE_URL);
  if (!resp.ok) throw new Error(`Failed to fetch certificate template: ${resp.status}`);
  const templateBytes = new Uint8Array(await resp.arrayBuffer());
  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const page = pdf.getPages()[0];
  const draw = (t: string, x: number, y: number) =>
    page.drawText(t, { x, y, size: CERT_FONT_SIZE, font, color: CERT_TEXT_COLOR });
  draw((data.full_name || "—").toUpperCase().slice(0, 50), CERT_FIELDS.nome.x, CERT_FIELDS.nome.y);
  draw(maskTaxId(data.tax_id), CERT_FIELDS.cpf.x, CERT_FIELDS.cpf.y);
  draw(fmtCertDate(data.partner_since), CERT_FIELDS.data.x, CERT_FIELDS.data.y);
  draw(data.verification_code || "—", CERT_FIELDS.id.x, CERT_FIELDS.id.y);
  return await pdf.save();
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as unknown as number[]);
  }
  return btoa(binary);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function slug(s: string) {
  return (s || "parceiro")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Unauthorized" });

    const caller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await caller.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!userData?.user) return json(401, { error: "Unauthorized" });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    const isAdmin = !!roleRow;

    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const partnerId: string | undefined = body.partner_id || url.searchParams.get("partner_id") || undefined;
    const asBase64 = body.as_base64 === true || url.searchParams.get("format") === "base64";

    let certData: {
      full_name: string;
      tax_id?: string | null;
      partner_since: string;
      verification_code: string;
    };

    if (body.preview === true) {
      if (!isAdmin) return json(403, { error: "Forbidden — admin only for preview" });
      certData = {
        full_name: body.full_name || "Nome do Parceiro",
        tax_id: body.tax_id ?? "000.000.000-00",
        partner_since: body.partner_since || new Date().toISOString(),
        verification_code: body.verification_code || "WZP-TEST0000",
      };
    } else {
      if (!partnerId) return json(400, { error: "partner_id obrigatório" });
      const { data: partner, error } = await admin
        .from("partners")
        .select("id, full_name, tax_id, created_at, verification_code, user_id")
        .eq("id", partnerId)
        .maybeSingle();
      if (error || !partner) return json(404, { error: "Parceiro não encontrado" });

      // Authorization: admin OR the partner themselves
      if (!isAdmin && partner.user_id !== userData.user.id) {
        return json(403, { error: "Forbidden" });
      }

      certData = {
        full_name: partner.full_name,
        tax_id: partner.tax_id,
        partner_since: partner.created_at,
        verification_code: partner.verification_code || "—",
      };
    }

    const pdfBytes = await generateCertificatePdf(certData);
    const filename = `certificado-wiize-${slug(certData.full_name)}.pdf`;

    if (asBase64) {
      return json(200, {
        pdf_base64: bytesToBase64(pdfBytes),
        filename,
      });
    }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[generate-partner-certificate] error:", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});
