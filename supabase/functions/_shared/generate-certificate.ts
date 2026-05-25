// Generates a personalized partner certificate PDF by stamping
// text on top of the official Wiize Partners template.
//
// The template is stored in the public storage bucket
// `partner-certificates` at `templates/certificate-template.pdf`.
//
// Returns the generated PDF as a Uint8Array.

import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

export interface CertificateData {
  full_name: string;
  tax_id?: string | null;          // CPF/CNPJ
  partner_since: string;            // ISO date
  verification_code: string;        // WZP-XXXXXXXX
}

const TEMPLATE_URL =
  "https://wgokhkawjdxsmvfuhazb.supabase.co/storage/v1/object/public/partner-certificates/templates/certificate-template.pdf";

// Brand green from the template
const GREEN = rgb(0x1e / 255, 0x6b / 255, 0x3a / 255);

// Coordinates (PDF pts, origin bottom-left, A4 595 x 842)
// Calibrated from the visual template. Tune here if the design changes.
const FIELDS = {
  nome:  { x: 248, y: 358 },
  cpf:   { x: 212, y: 311 },
  data:  { x: 294, y: 264 },
  id:    { x: 252, y: 216 },
};

const FONT_SIZE = 12;

function maskTaxId(raw?: string | null): string {
  if (!raw) return "—";
  const d = raw.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  }
  return raw;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

export async function generateCertificatePdf(
  data: CertificateData
): Promise<Uint8Array> {
  const resp = await fetch(TEMPLATE_URL);
  if (!resp.ok) {
    throw new Error(`Failed to fetch certificate template: ${resp.status}`);
  }
  const templateBytes = new Uint8Array(await resp.arrayBuffer());

  const pdf = await PDFDocument.load(templateBytes);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.getPages()[0];

  const draw = (text: string, x: number, y: number) => {
    page.drawText(text, { x, y, size: FONT_SIZE, font, color: GREEN });
  };

  draw((data.full_name || "—").toUpperCase().slice(0, 50), FIELDS.nome.x, FIELDS.nome.y);
  draw(maskTaxId(data.tax_id), FIELDS.cpf.x, FIELDS.cpf.y);
  draw(fmtDate(data.partner_since), FIELDS.data.x, FIELDS.data.y);
  draw(data.verification_code || "—", FIELDS.id.x, FIELDS.id.y);

  return await pdf.save();
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunk) as unknown as number[]
    );
  }
  return btoa(binary);
}
