// =============================================================
// MÓDULO SEGURO DE EXPORTAÇÃO — API PRINCIPAL (Wiize Pay prep)
// Self-contained: nenhum import de pasta compartilhada.
//
// Autenticação multicamada:
//   sessão (JWT) → permissão (owner/admin) → Senha de Integração
//   (PBKDF2 + salt + bloqueio progressivo) → confirmação por e-mail
//   (token de uso único, hash-only, 30 min).
//
// READY_FOR_WIIZE_PAY: nada aqui chama o Wiize Pay; apenas prepara
// autorização, escopos, conexões e auditoria.
// =============================================================

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = "Wiize <suporte@wiize.com.br>";
const BUCKET = "integration-exports";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// -------------------------------------------------------------
// Entidades exportáveis (labels, tabelas e campos)
// -------------------------------------------------------------
const ENTITY_DEFS: Record<
  string,
  { label: string; table: string; extraFilter?: Record<string, unknown>; fields: Record<string, string> }
> = {
  leads: {
    label: "Empresas e contatos (CRM)",
    table: "leads",
    fields: {
      id: "ID", company_name: "Empresa", contact_name: "Contato", phone: "Telefone",
      email: "E-mail", category: "Categoria", city: "Cidade", region: "Região",
      address: "Endereço", website: "Website", origin: "Origem", source: "Fonte",
      prospected_at: "Prospecção", ai_score: "Pontuação IA",
      estimated_value: "Valor estimado", pipeline_stage_id: "Etapa do funil",
      tags: "Tags", whatsapp_status: "Status WhatsApp",
      google_maps_link: "Google Maps", has_responded: "Respondeu",
      responded_at: "Resposta em", created_at: "Criado em", updated_at: "Atualizado em",
      responsible_user_id: "Responsável",
    },
  },
  vendas: {
    label: "Negócios e vendas",
    table: "lead_deals",
    fields: {
      id: "ID", lead_id: "Lead (ID)", title: "Título", value: "Valor",
      sale_type: "Tipo", contract_type: "Contrato", contract_months: "Meses",
      payment_method: "Pagamento", status: "Status", start_date: "Início",
      expiration_date: "Fim", closed_at: "Fechamento", notes: "Notas",
      receipt_url: "Recibo", contract_url: "Contrato",
      responsible_user_id: "Responsável", created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  contratos: {
    label: "Contratos (vendas recorrentes)",
    table: "lead_deals",
    extraFilter: { sale_type: "recurring" },
    fields: {
      id: "ID", lead_id: "Lead (ID)", title: "Título", value: "Valor mensal",
      contract_months: "Meses", status: "Status", start_date: "Início",
      expiration_date: "Fim", responsible_user_id: "Responsável",
      created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  atividades: {
    label: "Atividades",
    table: "lead_activities",
    fields: {
      id: "ID", lead_id: "Lead (ID)", activity_type: "Tipo",
      description: "Descrição", created_at: "Data",
    },
  },
  notas: {
    label: "Histórico e notas",
    table: "lead_notes",
    fields: { id: "ID", lead_id: "Lead (ID)", content: "Conteúdo", user_id: "Autor", created_at: "Data" },
  },
  anexos: {
    label: "Anexos (referência)",
    table: "lead_files",
    fields: {
      id: "ID", lead_id: "Lead (ID)", file_name: "Arquivo", file_type: "Tipo",
      file_size: "Tamanho", created_at: "Data",
    },
  },
  formularios: {
    label: "Formulários",
    table: "forms",
    fields: {
      id: "ID", name: "Nome", slug: "Slug", title: "Título", description: "Descrição",
      status: "Status", crm_enabled: "Integrado ao CRM", created_at: "Criado em",
      updated_at: "Atualizado em",
    },
  },
  respostas_formulario: {
    label: "Respostas de formulários",
    table: "form_submissions",
    fields: {
      id: "ID", form_id: "Formulário (ID)", lead_id: "Lead (ID)", data: "Dados",
      utm_source: "UTM origem", utm_medium: "UTM mídia", utm_campaign: "UTM campanha",
      landing_url: "Página", device: "Dispositivo", detected_source: "Origem detectada",
      created_at: "Data",
    },
  },
  produtos: {
    label: "Produtos e serviços",
    table: "company_services",
    fields: {
      id: "ID", name: "Nome", average_ticket: "Ticket médio",
      description: "Descrição", created_at: "Criado em", updated_at: "Atualizado em",
    },
  },
  etapas_e_configuracoes: {
    label: "Etapas do funil e configurações",
    table: "pipeline_stages",
    fields: { id: "ID", name: "Nome", position: "Posição", color: "Cor", is_default: "Padrão" },
  },
};

// -------------------------------------------------------------
// Helpers de criptografia (mesmo esquema dos relatórios compartilhados)
// -------------------------------------------------------------
const PBKDF2_ITERATIONS = 100000;

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const m = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(m.map((b) => parseInt(b, 16)));
}

async function hashPassword(password: string, salt?: Uint8Array): Promise<string> {
  const useSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2", salt: useSalt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS, hash: "SHA-256",
    },
    keyMaterial, 256,
  );
  return `${toHex(useSalt)}:${toHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const computed = await hashPassword(password, fromHex(saltHex));
  if (computed.length !== `${saltHex}:${hashHex}`.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ `${saltHex}:${hashHex}`.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// __PART2__
