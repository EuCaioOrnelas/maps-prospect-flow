// Domínio de abordagem de influenciadores: status, variáveis dinâmicas e renderização.
// Compartilhado pelas telas de Abordagens, Campanhas, Modelos e pela ficha do influenciador.

export const CONTACT_TYPES = [
  { value: "email", label: "E-mail", icon: "mail" },
  { value: "instagram", label: "Instagram", icon: "instagram" },
  { value: "tiktok", label: "TikTok", icon: "music" },
  { value: "twitter", label: "X / Twitter", icon: "twitter" },
  { value: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { value: "facebook", label: "Facebook", icon: "facebook" },
  { value: "threads", label: "Threads", icon: "at" },
  { value: "website", label: "Site", icon: "globe" },
  { value: "contact_page", label: "Página de contato", icon: "link" },
] as const;

export const contactTypeLabel = (v: string) =>
  CONTACT_TYPES.find((t) => t.value === v)?.label ?? v;

export const CONTACT_STATUSES = [
  { value: "encontrado", label: "Encontrado" },
  { value: "possivel", label: "Possível correspondência" },
  { value: "contatado", label: "Contatado" },
  { value: "respondeu", label: "Respondeu" },
  { value: "sem_resposta", label: "Sem resposta" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "parceria", label: "Parceria iniciada" },
  { value: "nao_contatar", label: "Não contatar" },
];

export const contactStatusLabel = (v: string) =>
  CONTACT_STATUSES.find((s) => s.value === v)?.label ?? v;

export const CONFIDENCE = {
  alta: { label: "Alta", dot: "bg-emerald-500", text: "text-emerald-600" },
  media: { label: "Média", dot: "bg-amber-500", text: "text-amber-600" },
  baixa: { label: "Baixa", dot: "bg-rose-500", text: "text-rose-600" },
} as const;

export const confidenceMeta = (v?: string | null) =>
  CONFIDENCE[(v as keyof typeof CONFIDENCE) ?? "media"] ?? CONFIDENCE.media;

export const SOURCE_LABELS: Record<string, string> = {
  youtube_about: "YouTube (Sobre)",
  youtube_videos: "Descrição de vídeos",
  site_oficial: "Site oficial",
  pagina_contato: "Página de contato",
  manual: "Cadastro manual",
};

export const sourceLabel = (v: string) => SOURCE_LABELS[v] ?? v;

/** Situação de cada envio individual (espelha influencer_campaign_recipients.status). */
export const SEND_STATUSES = [
  { value: "pendente", label: "Pendente", variant: "outline" as const },
  { value: "enviando", label: "Enviando", variant: "secondary" as const },
  { value: "enviado", label: "Enviado", variant: "default" as const },
  { value: "respondido", label: "Resposta recebida", variant: "default" as const },
  { value: "falhou", label: "Falhou", variant: "destructive" as const },
  { value: "cancelado", label: "Cancelado", variant: "outline" as const },
];

export const sendStatusMeta = (v: string) =>
  SEND_STATUSES.find((s) => s.value === v) ?? { value: v, label: v, variant: "outline" as const };

// ─────────────────────────── variáveis dinâmicas ───────────────────────────

export interface OutreachVariable {
  key: string;
  label: string;
  resolve: (p: any, contacts?: any[]) => string;
}

const contactValue = (contacts: any[] | undefined, type: string) =>
  contacts?.find((c) => c.type === type && c.status !== "nao_contatar")?.value ?? "";

const firstName = (name?: string | null) => {
  const clean = String(name || "").replace(/[^\p{L}\p{N}\s._-]/gu, "").trim();
  const first = clean.split(/[\s._-]+/)[0] || "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
};

export const OUTREACH_VARIABLES: OutreachVariable[] = [
  { key: "nome", label: "Nome do criador", resolve: (p) => p.channel_name || "" },
  { key: "nome_canal", label: "Nome do canal", resolve: (p) => p.channel_name || "" },
  { key: "primeiro_nome", label: "Primeiro nome", resolve: (p) => firstName(p.channel_name) },
  { key: "handle", label: "Handle do canal", resolve: (p) => p.channel_handle || "" },
  {
    key: "quantidade_inscritos",
    label: "Inscritos",
    resolve: (p) => (p.subscriber_count ? new Intl.NumberFormat("pt-BR").format(Number(p.subscriber_count)) : ""),
  },
  { key: "fit_score", label: "Fit Score", resolve: (p) => String(p.fit_score ?? "") },
  { key: "categoria", label: "Categoria de fit", resolve: (p) => p.fit_category || "" },
  { key: "tema_canal", label: "Tema do canal", resolve: (p) => (p.ai_summary || "").split(".")[0] || "" },
  { key: "ultimo_video", label: "Último vídeo (data)", resolve: (p) => (p.latest_video_at ? new Date(p.latest_video_at).toLocaleDateString("pt-BR") : "") },
  { key: "canal_url", label: "URL do canal", resolve: (p) => p.channel_url || "" },
  { key: "instagram", label: "Instagram", resolve: (p, c) => contactValue(c, "instagram") || p.instagram_url || "" },
  { key: "tiktok", label: "TikTok", resolve: (_p, c) => contactValue(c, "tiktok") },
  { key: "site", label: "Site", resolve: (p, c) => contactValue(c, "website") || p.website_url || "" },
  { key: "email", label: "E-mail", resolve: (p, c) => contactValue(c, "email") || p.contact_email || "" },
];

/** Substitui {{variavel}} pelos dados do influenciador. Variáveis desconhecidas viram string vazia. */
export function renderTemplate(text: string, prospect: any, contacts?: any[]): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = OUTREACH_VARIABLES.find((x) => x.key === key.toLowerCase());
    return v ? v.resolve(prospect, contacts) : "";
  });
}

/** Converte texto simples digitado no editor em HTML seguro para e-mail. */
export function textToEmailHtml(text: string): string {
  const escaped = (text || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  return escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function emailHtmlToText(html: string): string {
  return (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const DEFAULT_TEMPLATE_BODY = `Olá {{primeiro_nome}}, tudo bem?

Acompanhei o canal {{nome_canal}} e gostei muito da forma como você trata os temas de {{tema_canal}}.

Sou da Wiize, plataforma brasileira de prospecção, CRM e atendimento com IA para times comerciais B2B. Estamos selecionando criadores para o nosso programa de parcerias, com comissão recorrente por cliente indicado e material pronto de divulgação.

Faz sentido conversarmos 15 minutos nesta semana? Se preferir, respondo por aqui mesmo com todos os detalhes.

Abraço,
Equipe de Parcerias Wiize`;

export const DEFAULT_TEMPLATE_SUBJECT = "Parceria Wiize com o canal {{nome_canal}}";
