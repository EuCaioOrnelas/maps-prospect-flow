/**
 * Regras e vocabulário oficiais da WhatsApp Business Platform (Graph API v25.0)
 * usados pelo gerenciador de templates da Wiize.
 *
 * Tudo aqui é espelhado no backend (supabase/functions/meta-templates/index.ts);
 * o frontend valida antes de enviar e o backend valida de novo.
 */

export type MetaTemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "IN_APPEAL"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "PENDING_DELETION"
  | "DELETED"
  | "LIMIT_EXCEEDED"
  | string;

export interface MetaTemplateRow {
  id: string;
  owner_user_id: string;
  connection_id: string | null;
  waba_id: string;
  meta_template_id: string | null;
  name: string;
  category: string | null;
  requested_category?: string | null;
  language: string;
  status: MetaTemplateStatus;
  rejected_reason: string | null;
  quality_score: string | null;
  components: TemplateComponent[];
  raw: Record<string, unknown>;
  submitted_at: string | null;
  deleted_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ButtonType = "QUICK_REPLY" | "URL" | "PHONE_NUMBER";

export interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  example?: string[];
}

export type TemplateComponent = Record<string, any>;

/** Categorias aceitas hoje pela Graph API. */
export const TEMPLATE_CATEGORIES = [
  { value: "MARKETING", label: "Marketing", hint: "Promoções, novidades e convites." },
  { value: "UTILITY", label: "Utilidade", hint: "Atualizações de pedido, conta ou serviço." },
  { value: "AUTHENTICATION", label: "Autenticação", hint: "Códigos de verificação." },
] as const;

/** Idiomas suportados pela Meta (código enviado à API x rótulo exibido). */
export const TEMPLATE_LANGUAGES = [
  { code: "pt_BR", label: "Português (Brasil)" },
  { code: "pt_PT", label: "Português (Portugal)" },
  { code: "en", label: "Inglês" },
  { code: "en_US", label: "Inglês (EUA)" },
  { code: "en_GB", label: "Inglês (Reino Unido)" },
  { code: "es", label: "Espanhol" },
  { code: "es_AR", label: "Espanhol (Argentina)" },
  { code: "es_ES", label: "Espanhol (Espanha)" },
  { code: "es_MX", label: "Espanhol (México)" },
  { code: "fr", label: "Francês" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Alemão" },
] as const;

export function languageLabel(code: string): string {
  return TEMPLATE_LANGUAGES.find((l) => l.code === code)?.label ?? code;
}

/** Rótulo curto, para caber em uma linha nos cards (ex.: "PT-BR"). */
export function languageShortLabel(code: string): string {
  if (!code) return "—";
  const [base, region] = code.split("_");
  return region ? `${base.toUpperCase()}-${region.toUpperCase()}` : base.toUpperCase();
}

export function categoryLabel(value?: string | null): string {
  if (!value) return "—";
  return TEMPLATE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * Qualidade informada pela Meta (quality_score.score). A Meta só calcula a nota
 * depois de volume suficiente de envios; até lá devolve UNKNOWN.
 */
export function qualityMeta(value?: string | null): {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  description: string;
} {
  switch (String(value || "").toUpperCase()) {
    case "GREEN":
    case "HIGH":
      return { label: "Alta", tone: "success", description: "Boa recepção dos contatos. Nenhum risco no momento." };
    case "YELLOW":
    case "MEDIUM":
      return { label: "Média", tone: "warning", description: "Há bloqueios ou denúncias. Revise a mensagem e a lista de envio." };
    case "RED":
    case "LOW":
      return { label: "Baixa", tone: "danger", description: "Risco de pausa pela Meta. Reduza envios e melhore a mensagem." };
    case "UNKNOWN":
    case "":
      return { label: "Sem dados ainda", tone: "neutral", description: "A Meta divulga a qualidade após volume suficiente de envios." };
    default:
      return { label: String(value), tone: "neutral", description: "Qualidade informada pela Meta." };
  }
}

export interface StatusMeta {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral";
  description: string;
}

/** Mapeia o status real da Meta para rótulos amigáveis. Nada é inferido. */
export function statusMeta(status: string): StatusMeta {
  switch (status) {
    case "DRAFT":
      return { label: "Rascunho", tone: "neutral", description: "Salvo apenas na Wiize. Ainda não foi enviado à Meta." };
    case "APPROVED":
      return { label: "Aprovado", tone: "success", description: "Template aprovado pela Meta e pronto para uso." };

    case "PENDING":
      return { label: "Em análise", tone: "warning", description: "Este template está sendo analisado pela Meta." };
    case "IN_APPEAL":
      return { label: "Em recurso", tone: "warning", description: "A decisão da Meta está sendo revista." };
    case "REJECTED":
      return { label: "Rejeitado", tone: "danger", description: "A Meta rejeitou este template." };
    case "PAUSED":
      return { label: "Pausado", tone: "danger", description: "A Meta pausou o envio deste template por qualidade." };
    case "DISABLED":
      return { label: "Desativado", tone: "danger", description: "A Meta desativou este template." };
    case "PENDING_DELETION":
      return { label: "Exclusão pendente", tone: "neutral", description: "A exclusão está sendo processada pela Meta." };
    case "DELETED":
      return { label: "Excluído", tone: "neutral", description: "Este template não existe mais na sua conta." };
    case "LIMIT_EXCEEDED":
      return { label: "Limite excedido", tone: "danger", description: "A conta atingiu o limite de templates da Meta." };
    default:
      return { label: "Status não reconhecido", tone: "neutral", description: `Valor retornado pela Meta: ${status}` };
  }
}

export const TEMPLATE_NAME_RE = /^[a-z0-9_]{1,512}$/;

export function normalizeTemplateName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 512);
}

export function bodyPlaceholders(text: string): number[] {
  return [...text.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
}

export interface DraftTemplate {
  name: string;
  category: string;
  language: string;
  headerFormat: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  headerText: string;
  headerExample: string;
  headerHandle: string;
  body: string;
  bodyExamples: string[];
  footer: string;
  buttons: TemplateButton[];
}

export const emptyDraft = (): DraftTemplate => ({
  name: "",
  category: "UTILITY",
  language: "pt_BR",
  headerFormat: "NONE",
  headerText: "",
  headerExample: "",
  headerHandle: "",
  body: "",
  bodyExamples: [],
  footer: "",
  buttons: [],
});

/** Monta o payload exatamente no formato esperado pela Graph API. */
export function buildComponents(draft: DraftTemplate): TemplateComponent[] {
  const components: TemplateComponent[] = [];

  if (draft.headerFormat === "TEXT" && draft.headerText.trim()) {
    const header: TemplateComponent = { type: "HEADER", format: "TEXT", text: draft.headerText.trim() };
    if (/\{\{1\}\}/.test(draft.headerText) && draft.headerExample.trim()) {
      header.example = { header_text: [draft.headerExample.trim()] };
    }
    components.push(header);
  } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(draft.headerFormat)) {
    const header: TemplateComponent = { type: "HEADER", format: draft.headerFormat };
    if (draft.headerHandle.trim()) header.example = { header_handle: [draft.headerHandle.trim()] };
    components.push(header);
  }

  const bodyComponent: TemplateComponent = { type: "BODY", text: draft.body };
  const count = new Set(bodyPlaceholders(draft.body)).size;
  if (count > 0) {
    bodyComponent.example = { body_text: [draft.bodyExamples.slice(0, count)] };
  }
  components.push(bodyComponent);

  if (draft.footer.trim()) components.push({ type: "FOOTER", text: draft.footer.trim() });

  if (draft.buttons.length) {
    components.push({
      type: "BUTTONS",
      buttons: draft.buttons.map((b) => {
        if (b.type === "URL") {
          const btn: TemplateButton = { type: "URL", text: b.text, url: b.url || "" };
          if (/\{\{1\}\}/.test(b.url || "") && b.example?.[0]) btn.example = [b.example[0]];
          return btn;
        }
        if (b.type === "PHONE_NUMBER") {
          return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || "" };
        }
        return { type: "QUICK_REPLY", text: b.text };
      }),
    });
  }

  return components;
}

export interface ValidationResult {
  errors: Record<string, string>;
  list: string[];
}

/** Validação completa antes de enviar para análise. */
export function validateDraft(draft: DraftTemplate, opts: { editing?: boolean } = {}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!opts.editing) {
    if (!draft.name.trim()) errors.name = "Informe o nome do template.";
    else if (!TEMPLATE_NAME_RE.test(draft.name)) {
      errors.name = "Use apenas letras minúsculas, números e underline (ex.: pedido_confirmado).";
    }
    if (!draft.language) errors.language = "Selecione um idioma.";
  }
  if (!draft.category) errors.category = "Selecione uma categoria.";

  if (!draft.body.trim()) errors.body = "O corpo da mensagem é obrigatório.";
  else if (draft.body.length > 1024) errors.body = "O corpo deve ter no máximo 1024 caracteres.";
  else {
    const ph = bodyPlaceholders(draft.body);
    const unique = [...new Set(ph)].sort((a, b) => a - b);
    const max = ph.length ? Math.max(...ph) : 0;
    if (unique.length !== max || unique.some((v, i) => v !== i + 1)) {
      errors.body = "As variáveis devem ser sequenciais começando em {{1}}.";
    } else if (max > 0) {
      const filled = draft.bodyExamples.slice(0, max).filter((s) => String(s || "").trim()).length;
      if (filled !== max) errors.bodyExamples = "Informe um exemplo para cada variável.";
    }
  }

  if (draft.headerFormat === "TEXT") {
    if (!draft.headerText.trim()) errors.headerText = "Informe o texto do cabeçalho.";
    else if (draft.headerText.length > 60) errors.headerText = "Máximo de 60 caracteres.";
    else {
      const ph = bodyPlaceholders(draft.headerText);
      if (ph.length > 1) errors.headerText = "O cabeçalho aceita no máximo uma variável ({{1}}).";
      else if (ph.length === 1 && !draft.headerExample.trim()) {
        errors.headerExample = "Informe o exemplo da variável do cabeçalho.";
      }
    }
  } else if (["IMAGE", "VIDEO", "DOCUMENT"].includes(draft.headerFormat) && !draft.headerHandle.trim()) {
    errors.headerHandle = "Informe o identificador do arquivo de exemplo (handle) gerado na Meta.";
  }

  if (draft.footer.length > 60) errors.footer = "O rodapé deve ter no máximo 60 caracteres.";

  if (draft.buttons.length > 10) errors.buttons = "Máximo de 10 botões.";
  if (draft.buttons.filter((b) => b.type === "URL").length > 2) errors.buttons = "Máximo de 2 botões de link.";
  if (draft.buttons.filter((b) => b.type === "PHONE_NUMBER").length > 1) errors.buttons = "Máximo de 1 botão de telefone.";
  draft.buttons.forEach((b, i) => {
    if (!b.text.trim()) errors[`button_${i}`] = "Informe o texto do botão.";
    else if (b.text.length > 25) errors[`button_${i}`] = "Máximo de 25 caracteres.";
    else if (b.type === "URL" && !/^https?:\/\/.+/i.test(b.url || "")) errors[`button_${i}`] = "Informe uma URL válida.";
    else if (b.type === "URL" && /\{\{1\}\}/.test(b.url || "") && !b.example?.[0]?.trim()) {
      errors[`button_${i}`] = "Informe o exemplo da variável da URL.";
    } else if (b.type === "PHONE_NUMBER" && !b.phone_number?.trim()) {
      errors[`button_${i}`] = "Informe o telefone.";
    }
  });

  return { errors, list: [...new Set(Object.values(errors))] };
}

/** Preenche a prévia com os exemplos informados. */
export function renderWithExamples(text: string, examples: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (match, idx) => {
    const value = examples[Number(idx) - 1];
    return value?.trim() ? value : match;
  });
}

/** Extrai o texto de um componente já salvo (vindo da Meta). */
export function componentOf(components: TemplateComponent[] | undefined, type: string) {
  return (components || []).find((c) => String(c?.type).toUpperCase() === type);
}

/** Converte um template retornado pela Meta em rascunho editável. */
export function rowToDraft(row: MetaTemplateRow): DraftTemplate {
  const header = componentOf(row.components, "HEADER");
  const body = componentOf(row.components, "BODY");
  const footer = componentOf(row.components, "FOOTER");
  const buttons = componentOf(row.components, "BUTTONS");
  const format = String(header?.format || "NONE").toUpperCase() as DraftTemplate["headerFormat"];

  return {
    name: row.name,
    category: row.category || "UTILITY",
    language: row.language,
    headerFormat: header ? (["TEXT", "IMAGE", "VIDEO", "DOCUMENT"].includes(format) ? format : "NONE") : "NONE",
    headerText: header?.text || "",
    headerExample: header?.example?.header_text?.[0] || "",
    headerHandle: header?.example?.header_handle?.[0] || "",
    body: body?.text || "",
    bodyExamples: body?.example?.body_text?.[0] || [],
    footer: footer?.text || "",
    buttons: (buttons?.buttons || []).map((b: any) => ({
      type: b.type,
      text: b.text || "",
      url: b.url,
      phone_number: b.phone_number,
      example: b.example,
    })),
  };
}
