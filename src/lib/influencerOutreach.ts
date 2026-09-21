// Domínio de abordagem de influenciadores: status, variáveis dinâmicas e renderização.
// Compartilhado pelas telas de Abordagens, Campanhas, Modelos e pela ficha do influenciador.

// Só trabalhamos com dois canais de contato: e-mail e Instagram.
export const CONTACT_TYPES = [
  { value: "email", label: "E-mail", icon: "mail" },
  { value: "instagram", label: "Instagram", icon: "instagram" },
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

/** `sources` é gravado como [{source, discovered_at}]; aceita também strings legadas. */
export const sourceLabel = (v: any) => {
  const key = typeof v === "string" ? v : String(v?.source ?? "");
  return SOURCE_LABELS[key] ?? (key || "Origem não informada");
};

/** Status do influenciador na esteira de abordagem (coluna influencer_prospects.status). */
export const PROSPECT_OUTREACH_STATUSES = [
  { value: "novo", label: "Novo" },
  { value: "qualificado", label: "Qualificado" },
  { value: "contatos_identificados", label: "Contatos identificados" },
  { value: "pronto_abordagem", label: "Pronto para abordagem" },
  { value: "sem_contato", label: "Sem contato" },
  { value: "email_enviado", label: "E-mail enviado" },
  { value: "respondeu", label: "Respondeu" },
  { value: "negociacao", label: "Negociação" },
  { value: "parceria_ativa", label: "Parceria ativa" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "descartado", label: "Descartado" },
];

/** Colunas do quadro Kanban de abordagens, na ordem do funil. */
export const INFLUENCER_KANBAN_COLUMNS = [
  { value: "qualificado", label: "Qualificado" },
  { value: "contatos_identificados", label: "Contatos identificados" },
  { value: "pronto_abordagem", label: "Pronto para abordagem" },
  { value: "sem_contato", label: "Sem contato" },
  { value: "email_enviado", label: "E-mail enviado" },
  { value: "respondeu", label: "Respondeu" },
  { value: "negociacao", label: "Negociação" },
  { value: "parceria_ativa", label: "Parceria ativa" },
];

export const prospectOutreachLabel = (v?: string | null) =>
  PROSPECT_OUTREACH_STATUSES.find((s) => s.value === v)?.label ?? (v || "Novo");

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

const WIIZE_CONTENT_TERMS = [
  "b2b", "venda", "vendas", "comercial", "prospecção", "prospeccao", "sdr",
  "crm", "cliente", "clientes", "negócio", "negocio", "negócios", "negocios",
  "empreendedor", "empresa", "empresas", "marketing", "gestão", "gestao",
  "automação", "automacao", "inteligência artificial", "inteligencia artificial", "ia",
];

const normalizedSearchText = (value: unknown) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

const contentReference = (prospect: any) => {
  const channelName = String(prospect?.channel_name || "").trim();
  const videos = Array.isArray(prospect?.influencer_videos) ? prospect.influencer_videos : [];
  const ranked = videos
    .map((video: any) => {
      const title = String(video?.title || "").trim();
      const normalizedTitle = normalizedSearchText(title);
      const score = WIIZE_CONTENT_TERMS.reduce(
        (total, term) => total + (normalizedTitle.includes(normalizedSearchText(term)) ? 1 : 0),
        0,
      );
      return { title, score, publishedAt: String(video?.published_at || "") };
    })
    .filter((video: { title: string; score: number }) => video.title && video.score > 0)
    .sort((a: { score: number; publishedAt: string }, b: { score: number; publishedAt: string }) =>
      b.score - a.score || b.publishedAt.localeCompare(a.publishedAt),
    );

  if (ranked[0]?.title) return `do seu vídeo “${ranked[0].title}”`;
  if (channelName) {
    return prospect?.platform === "instagram"
      ? `do seu perfil ${channelName} no Instagram`
      : `do canal ${channelName}`;
  }
  return prospect?.platform === "instagram" ? "do seu perfil no Instagram" : "do seu canal";
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
  { key: "referencia_conteudo", label: "Conteúdo ou canal", resolve: (p) => contentReference(p) },
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
  const escaped = (text || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] ?? c));
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

export const DEFAULT_TEMPLATE_BODY = `Olá, {{primeiro_nome}}! Tudo bem?

Meu nome é Caio e sou fundador da Wiize, um software com tudo o que empresas precisam para vender B2B em um só lugar. Hoje, mais de 600 empresas utilizam a plataforma.

Conheci seu conteúdo através {{referencia_conteudo}} e achei que existe uma conexão muito interessante com o que estamos construindo.

A Wiize reúne prospecção com IA, SDR inteligente que vende no automático e agenda reuniões, IA de análise de engajamento e gestão comercial completa em um só lugar.

Estamos em uma etapa de crescimento nas redes sociais e selecionando alguns criadores e especialistas para construir parcerias comerciais de longo prazo.

O modelo é simples: você apresenta a Wiize para sua audiência através de um link personalizado e cupom próprio. Para cada cliente que comprar pelo seu link ou cupom, você recebe 50% de comissão sobre a assinatura do primeiro mês + 10% de comissão recorrente, podendo chegar a 15%.

Acredito que seu conteúdo tenha bastante sinergia com a Wiize.

Se fizer sentido, posso te enviar mais detalhes da parceria.

Abraço,
Caio | Fundador da Wiize
(44) 9 9148-7211
https://www.wiize.com.br/`;

export const DEFAULT_TEMPLATE_SUBJECT = "Parceria com {{nome_canal}} - Wiize";

