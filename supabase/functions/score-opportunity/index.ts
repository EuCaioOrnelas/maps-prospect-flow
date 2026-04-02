import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "google/gemini-2.5-flash";

type NicheContext = {
  id: string;
  name: string;
  analysisFocus: string;
  keyQuestions: string[];
  strengthsHint: string;
  weaknessesHint: string;
  competitorContext: string;
};

type SocialLink = {
  url: string;
  platform: string;
  source: string;
};

type PageSummary = {
  url: string;
  label: string;
  platform?: string;
  ok: boolean;
  status: number;
  title: string;
  description: string;
  textSnippet: string;
  contentLength: number;
  activitySignals: string[];
};

type OfferingLens = {
  id: "local_visibility" | "paid_media" | "website_seo" | "automation" | "generic";
  name: string;
  strengthsHint: string;
  weaknessesHint: string;
  actionHint: string;
};

type HeuristicScore = {
  estrutura_digital: number;
  reputacao: number;
  acessibilidade: number;
  engajamento_atividade: number;
  potencial_venda: number;
  score: number;
  hasWebsite: boolean;
  websiteReadable: boolean;
  websiteRich: boolean;
  socialCount: number;
  activeSocialCount: number;
  rating: number;
  reviewCount: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toSafeString = (value: unknown): string => typeof value === "string" ? value : "";

const compact = (value: string) => value.replace(/\s+/g, " ").trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&aacute;/gi, "á")
  .replace(/&eacute;/gi, "é")
  .replace(/&iacute;/gi, "í")
  .replace(/&oacute;/gi, "ó")
  .replace(/&uacute;/gi, "ú")
  .replace(/&ccedil;/gi, "ç");

const stripHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");

  return compact(decodeEntities(withoutScripts.replace(/<[^>]+>/g, " ")));
};

const extractTitle = (html: string) => {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return compact(decodeEntities(match?.[1] || ""));
};

const extractMeta = (html: string, metaName: string) => {
  const safeMeta = escapeRegExp(metaName);
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${safeMeta}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${safeMeta}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return compact(decodeEntities(match[1]));
  }

  return "";
};

const normalizeUrl = (rawUrl: unknown) => {
  const cleaned = compact(toSafeString(rawUrl));
  if (!cleaned || cleaned === "-" || cleaned.toLowerCase() === "não informado") return null;

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return null;
  }
};

const detectSocialPlatform = (url: string | null) => {
  if (!url) return null;

  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("x.com") || host.includes("twitter")) return "X";
    if (host.includes("whatsapp")) return "WhatsApp";
    return null;
  } catch {
    return null;
  }
};

const isSocialUrl = (url: string | null) => !!detectSocialPlatform(url);

const normalizeStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => compact(toSafeString(item))).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(/\n|;|\|/).map((item) => compact(item)).filter(Boolean);
  }

  return [];
};

const numberFromUnknown = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
};

const uniqueByUrl = (items: SocialLink[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
};

const pushSocialLink = (list: SocialLink[], raw: unknown, source: string, fallbackPlatform?: string) => {
  const normalized = normalizeUrl(raw);
  const detectedPlatform = detectSocialPlatform(normalized);

  if (!normalized || !detectedPlatform) return;

  list.push({
    url: normalized,
    platform: fallbackPlatform || detectedPlatform,
    source,
  });
};

const extractSocialLinks = (websiteUrl: unknown, socialMedia: unknown) => {
  const normalizedWebsite = normalizeUrl(websiteUrl);
  const links: SocialLink[] = [];

  if (normalizedWebsite && isSocialUrl(normalizedWebsite)) {
    pushSocialLink(links, normalizedWebsite, "website");
  }

  if (Array.isArray(socialMedia)) {
    for (const item of socialMedia) {
      if (typeof item === "string") {
        pushSocialLink(links, item, "social_media");
        continue;
      }

      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        pushSocialLink(
          links,
          record.url ?? record.link ?? record.href ?? record.profile_url,
          "social_media",
          compact(toSafeString(record.platform)) || undefined,
        );
      }
    }
  }

  if (socialMedia && typeof socialMedia === "object" && !Array.isArray(socialMedia)) {
    for (const value of Object.values(socialMedia as Record<string, unknown>)) {
      pushSocialLink(links, value, "social_media");
    }
  }

  return {
    websiteUrl: normalizedWebsite && !isSocialUrl(normalizedWebsite) ? normalizedWebsite : null,
    socialLinks: uniqueByUrl(links).slice(0, 3),
  };
};

const fetchPageSummary = async (url: string, label: string, platform?: string): Promise<PageSummary> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableLeadAnalyzer/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    const html = await response.text();
    const title = extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const textSnippet = stripHtml(html).slice(0, 1400);
    const combined = `${title} ${description} ${textSnippet}`.toLowerCase();
    const activitySignals: string[] = [];

    if (title) activitySignals.push("title");
    if (description) activitySignals.push("meta description");
    if (textSnippet.length >= 250) activitySignals.push("content");
    if (/(contato|fale conosco|orçamento|serviç|soluç|portfolio|clientes|blog|artigo|post|feed|seguidores|depoimentos|avalia)/i.test(combined)) {
      activitySignals.push("commercial signals");
    }
    if (/(2026|2025|2024|atualizado|últimas|novidades|campanha|promoção|lançamento)/i.test(combined)) {
      activitySignals.push("freshness signals");
    }

    return {
      url: response.url || url,
      label,
      platform,
      ok: response.ok,
      status: response.status,
      title,
      description,
      textSnippet,
      contentLength: textSnippet.length,
      activitySignals,
    };
  } catch (error) {
    return {
      url,
      label,
      platform,
      ok: false,
      status: 0,
      title: "",
      description: "",
      textSnippet: "",
      contentLength: 0,
      activitySignals: [error instanceof Error ? error.message : "fetch_error"],
    };
  } finally {
    clearTimeout(timeout);
  }
};

const inferOfferingLens = (companyProfile: any): OfferingLens => {
  const text = compact(`${companyProfile?.company_niche || ""} ${companyProfile?.company_products || ""} ${companyProfile?.company_differential || ""}`).toLowerCase();

  if (/(google meu neg[oó]cio|perfil no google|maps|gmn|avalia[cç][aã]o|visibilidade local|posicionamento local)/.test(text)) {
    return {
      id: "local_visibility",
      name: "Visibilidade local e Google Meu Negócio",
      strengthsHint: "Fale sobre reputação no Google, autoridade local, presença no Maps, volume de avaliações e facilidade de conversão regional.",
      weaknessesHint: "Fale sobre baixa densidade de avaliações, pouca autoridade local, site fraco para buscas regionais e canais que não sustentam descoberta local.",
      actionHint: "Priorize melhoria de posicionamento local, otimização do perfil no Google, ganho de avaliações e presença digital para demanda regional.",
    };
  }

  if (/(tr[aá]fego pago|ads|an[uú]ncios|google ads|meta ads|campanhas|m[ií]dia paga)/.test(text)) {
    return {
      id: "paid_media",
      name: "Tráfego pago e campanhas de anúncios",
      strengthsHint: "Fale sobre prontidão para campanhas, prova social, qualidade do destino digital, clareza da oferta e capacidade de conversão.",
      weaknessesHint: "Fale sobre ausência de landing page/site, pouca prova social, baixa atividade social, oferta confusa e gargalos para tráfego pago converter.",
      actionHint: "Priorize estrutura para campanhas, prova social, páginas de destino e retomada de canais que ajudem remarketing e criativos.",
    };
  }

  if (/(site|landing page|seo|cria[cç][aã]o de site|otimiza[cç][aã]o de site|presen[cç]a digital)/.test(text)) {
    return {
      id: "website_seo",
      name: "Site, SEO e presença digital",
      strengthsHint: "Fale sobre estrutura do site, clareza institucional, autoridade digital e capacidade de capturar demanda orgânica.",
      weaknessesHint: "Fale sobre ausência de site, site superficial, arquitetura fraca, pouca indexação percebida e baixa profundidade de conteúdo.",
      actionHint: "Priorize site, páginas estratégicas, SEO local e melhoria da jornada de contato e conversão.",
    };
  }

  if (/(crm|whatsapp|autom[aá]ção|funil|cad[eê]ncia|prospec[cç][aã]o)/.test(text)) {
    return {
      id: "automation",
      name: "CRM, WhatsApp e automação comercial",
      strengthsHint: "Fale sobre acessibilidade, canais de contato, velocidade potencial de resposta e prontidão para processos comerciais.",
      weaknessesHint: "Fale sobre ausência de canais consistentes, baixa padronização digital, pouca recorrência de relacionamento e gargalos de resposta.",
      actionHint: "Priorize captura de contatos, cadência comercial, automação de resposta e estrutura para follow-up.",
    };
  }

  return {
    id: "generic",
    name: "Crescimento comercial B2B",
    strengthsHint: "Fale sobre maturidade digital, reputação, acessibilidade e sinais de tração comercial.",
    weaknessesHint: "Fale sobre lacunas digitais, baixa prova social, canais fracos e oportunidades claras de crescimento.",
    actionHint: "Priorize a maior dor digital/comercial detectada e conecte isso aos serviços reais da empresa prospectora.",
  };
};

const computeHeuristicScore = ({
  rating,
  reviewCount,
  hasPhone,
  hasAddress,
  websitePage,
  socialPages,
}: {
  rating: number;
  reviewCount: number;
  hasPhone: boolean;
  hasAddress: boolean;
  websitePage: PageSummary | undefined;
  socialPages: PageSummary[];
}): HeuristicScore => {
  const hasWebsite = !!websitePage;
  const websiteReadable = !!websitePage && websitePage.ok && (websitePage.contentLength >= 220 || !!websitePage.title || !!websitePage.description);
  const websiteRich = !!websitePage && websitePage.ok && (websitePage.contentLength >= 900 || websitePage.activitySignals.includes("commercial signals"));
  const socialCount = socialPages.length;
  const activeSocialCount = socialPages.filter((page) => page.ok && (page.contentLength >= 120 || !!page.title || !!page.description)).length;

  const estrutura_digital = clamp(
    (hasWebsite ? (websiteRich ? 12 : websiteReadable ? 8 : 4) : 0) +
    Math.min(socialCount * 2, 8) +
    Math.min(activeSocialCount * 2 + (activeSocialCount >= 2 ? 1 : 0), 5),
    0,
    25,
  );

  const reputacao = clamp(
    (rating >= 4.8 ? 12 : rating >= 4.5 ? 10 : rating >= 4.0 ? 7 : rating >= 3.5 ? 4 : rating > 0 ? 2 : 0) +
    (reviewCount >= 100 ? 8 : reviewCount >= 30 ? 6 : reviewCount >= 10 ? 4 : reviewCount >= 1 ? 2 : 0) +
    (rating >= 4.5 && reviewCount >= 20 ? 5 : reviewCount >= 10 ? 3 : 0),
    0,
    25,
  );

  const acessibilidade = clamp(
    (hasPhone ? 10 : 0) +
    (hasAddress ? 6 : 0) +
    ((hasWebsite || socialCount > 0) ? 4 : 0),
    0,
    20,
  );

  const engajamento_atividade = clamp(
    (activeSocialCount * 3) +
    (websiteRich ? 5 : websiteReadable ? 3 : 0) +
    (reviewCount >= 20 ? 4 : reviewCount >= 5 ? 2 : reviewCount > 0 ? 1 : 0),
    0,
    15,
  );

  const potencial_venda = clamp(
    (!hasWebsite ? 6 : !websiteReadable ? 3 : 0) +
    (socialCount === 0 ? 4 : activeSocialCount === 0 ? 2 : 0) +
    (rating > 0 && rating < 4 ? 3 : 0) +
    (reviewCount > 0 && reviewCount < 10 ? 2 : 0),
    0,
    15,
  );

  const score = clamp(estrutura_digital + reputacao + acessibilidade + engajamento_atividade + potencial_venda, 0, 100);

  return {
    estrutura_digital,
    reputacao,
    acessibilidade,
    engajamento_atividade,
    potencial_venda,
    score,
    hasWebsite,
    websiteReadable,
    websiteRich,
    socialCount,
    activeSocialCount,
    rating,
    reviewCount,
  };
};

const buildFallbackPoints = (lens: OfferingLens, heuristic: HeuristicScore) => {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (lens.id === "local_visibility") {
    if (heuristic.rating >= 4.5) strengths.push(`Boa reputação no Google (${heuristic.rating.toFixed(1)}/5), o que favorece confiança e conversão local.`);
    if (heuristic.hasWebsite) strengths.push(heuristic.websiteReadable
      ? "Possui presença digital própria, útil para reforçar buscas locais e contato direto."
      : "Já possui um site, o que abre espaço para ganhar autoridade local com otimização.");
    if (!heuristic.hasWebsite) weaknesses.push("Não possui site próprio, o que reduz autoridade nas buscas locais e captura de demanda regional.");
    if (heuristic.reviewCount < 10) weaknesses.push("O volume de avaliações ainda é baixo para sustentar destaque consistente no mercado local.");
    if (heuristic.activeSocialCount === 0 && heuristic.socialCount > 0) weaknesses.push("Há canais sociais identificados, mas com pouca evidência de atividade recente para reforçar prova social.");
  } else if (lens.id === "paid_media") {
    if (heuristic.rating >= 4.5 || heuristic.reviewCount >= 20) strengths.push("A empresa já tem prova social suficiente para melhorar conversão de campanhas pagas.");
    if (heuristic.hasWebsite) strengths.push(heuristic.websiteReadable
      ? "Existe um destino digital utilizável para campanhas e captação de leads."
      : "Já há um site, mas ainda com espaço para evoluir a performance de conversão.");
    if (heuristic.activeSocialCount > 0) strengths.push("A presença social ativa pode alimentar criativos e remarketing com mais consistência.");
    if (!heuristic.hasWebsite) weaknesses.push("Sem site ou landing page própria, o tráfego pago tende a perder eficiência e rastreabilidade.");
    if (heuristic.activeSocialCount === 0) weaknesses.push("A baixa atividade social reduz material de prova, criativos e oportunidade de remarketing.");
    if (heuristic.rating > 0 && heuristic.rating < 4.2) weaknesses.push("A reputação atual pode reduzir a conversão de novos cliques em oportunidades reais.");
  } else if (lens.id === "website_seo") {
    if (heuristic.hasWebsite && heuristic.websiteReadable) strengths.push("Já existe estrutura digital básica para evoluir presença orgânica e conversão.");
    if (heuristic.reviewCount >= 10) strengths.push("A empresa já possui reputação pública que pode reforçar páginas e conteúdos institucionais.");
    if (!heuristic.hasWebsite) weaknesses.push("A ausência de site próprio limita descoberta orgânica, autoridade e geração de contatos recorrente.");
    if (heuristic.hasWebsite && !heuristic.websiteRich) weaknesses.push("O site existe, mas aparenta baixa profundidade para sustentar SEO e argumentação comercial.");
    if (heuristic.socialCount === 0) weaknesses.push("Pouca presença complementar fora do site reduz sinais de autoridade digital.");
  } else if (lens.id === "automation") {
    if (heuristic.acessibilidade >= 14) strengths.push("Os canais básicos de contato estão presentes, o que facilita estruturar cadências e follow-up.");
    if (heuristic.reviewCount >= 10) strengths.push("Há sinais de demanda e relacionamento que podem ser melhor aproveitados com processos comerciais.");
    if (!heuristic.hasWebsite && heuristic.socialCount === 0) weaknesses.push("A ausência de ativos digitais reduz captura de contatos e previsibilidade do funil.");
    if (heuristic.activeSocialCount === 0 && heuristic.socialCount > 0) weaknesses.push("Os canais existem, mas sem sinais fortes de atividade, o que enfraquece relacionamento recorrente.");
  } else {
    if (heuristic.rating >= 4.5) strengths.push("A reputação atual ajuda a reduzir barreiras de confiança na abordagem comercial.");
    if (heuristic.hasWebsite || heuristic.socialCount > 0) strengths.push("Existe presença digital mínima para sustentar uma conversa comercial mais estratégica.");
    if (!heuristic.hasWebsite) weaknesses.push("A ausência de site ainda limita autoridade digital e conversão de interessados.");
    if (heuristic.activeSocialCount === 0) weaknesses.push("A atividade digital aparente é baixa, o que reduz prova social e percepção de presença no mercado.");
  }

  return {
    pontos_fortes: strengths.slice(0, 2),
    pontos_fracos: weaknesses.slice(0, 2),
  };
};

const buildFallbackDiagnosis = ({
  nomeEmpresa,
  cidade,
  categoria,
  heuristic,
  lens,
}: {
  nomeEmpresa: string;
  cidade: string;
  categoria: string;
  heuristic: HeuristicScore;
  lens: OfferingLens;
}) => {
  const local = cidade ? `em ${cidade}` : "na região";
  const niche = categoria ? `do segmento ${categoria}` : "do segmento atendido";

  if (heuristic.hasWebsite || heuristic.socialCount > 0) {
    return `${nomeEmpresa} já apresenta alguns sinais de presença digital ${local}, especialmente para um negócio ${niche}. Ainda assim, a maturidade online é desigual: há base para crescer, mas persistem lacunas que impedem melhor aproveitamento dos canais atuais. Sob a ótica de ${lens.name.toLowerCase()}, existe espaço claro para elevar percepção, conversão e previsibilidade comercial.`;
  }

  return `${nomeEmpresa} ainda opera com presença digital enxuta ${local}, o que reduz confiança e descoberta para um negócio ${niche}. A reputação e a acessibilidade ajudam parcialmente, porém a ausência de ativos digitais mais fortes limita crescimento consistente. Na perspectiva de ${lens.name.toLowerCase()}, isso cria uma oportunidade comercial direta.`;
};

const buildFallbackAction = ({
  companyProfile,
  heuristic,
  lens,
}: {
  companyProfile: any;
  heuristic: HeuristicScore;
  lens: OfferingLens;
}) => {
  const products = compact(toSafeString(companyProfile?.company_products)) || "os serviços da sua empresa";
  const differential = compact(toSafeString(companyProfile?.company_differential));

  if (lens.id === "paid_media") {
    return heuristic.hasWebsite
      ? `Aborde mostrando como ${products} podem transformar a presença atual em campanhas com conversão mais previsível. Comece destacando a necessidade de alinhar prova social, oferta e página de destino antes de escalar mídia. Proponha uma estrutura de campanha conectada aos diferenciais reais da empresa e use ${differential || "o seu diferencial"} como argumento de segurança para execução.`
      : `Aborde pela dor de investir em anúncios sem ter uma base própria de conversão. Mostre como ${products} podem estruturar uma presença mínima capaz de receber tráfego com mais eficiência e evitar desperdício de verba. Use ${differential || "o seu diferencial"} para reforçar que a proposta não é só anunciar, mas preparar o lead para vender mais.`;
  }

  if (lens.id === "local_visibility") {
    return `Aborde pela dor de visibilidade local e autoridade digital, conectando isso diretamente a ${products}. Mostre como o lead pode ganhar mais destaque regional com otimização do perfil, reputação e jornada de contato. Use ${differential || "o seu diferencial"} para provar que a execução vai além do básico e gera presença mais forte no mercado local.`;
  }

  if (lens.id === "website_seo") {
    return `Abra a conversa pela necessidade de consolidar uma estrutura digital mais forte e orientada à conversão com ${products}. Mostre onde o site atual não sustenta descoberta, autoridade ou captação e proponha uma evolução prática por etapas. Reforce ${differential || "o seu diferencial"} como fator para transformar presença digital em demanda real.`;
  }

  if (lens.id === "automation") {
    return `Aborde pela oportunidade de organizar melhor captação, resposta e follow-up usando ${products}. Mostre que os canais atuais não estão sendo convertidos em processo comercial previsível e proponha uma estrutura simples para responder mais rápido e acompanhar melhor os contatos. Traga ${differential || "o seu diferencial"} como prova de implementação consistente.`;
  }

  return `Aborde destacando a principal dor digital/comercial percebida e conecte isso diretamente a ${products}. Mostre um ganho prático de curto prazo e explique como a execução pode evoluir em novas oportunidades de monetização. Use ${differential || "o seu diferencial"} para diferenciar sua proposta.`;
};

const normalizeAiResult = ({
  raw,
  heuristic,
  fallbackPoints,
  fallbackDiagnosis,
  fallbackAction,
  siteSummary,
  socialSummary,
}: {
  raw: any;
  heuristic: HeuristicScore;
  fallbackPoints: { pontos_fortes: string[]; pontos_fracos: string[] };
  fallbackDiagnosis: string;
  fallbackAction: string;
  siteSummary: string;
  socialSummary: string;
}) => {
  const estrutura_digital = clamp(numberFromUnknown(raw?.estrutura_digital) ?? heuristic.estrutura_digital, 0, 25);
  const reputacao = clamp(numberFromUnknown(raw?.reputacao) ?? heuristic.reputacao, 0, 25);
  const acessibilidade = clamp(numberFromUnknown(raw?.acessibilidade) ?? heuristic.acessibilidade, 0, 20);
  const engajamento_atividade = clamp(
    Math.max(numberFromUnknown(raw?.engajamento_atividade) ?? heuristic.engajamento_atividade, heuristic.engajamento_atividade),
    0,
    15,
  );
  const potencial_venda = clamp(numberFromUnknown(raw?.potencial_venda) ?? heuristic.potencial_venda, 0, 15);
  const score = clamp(estrutura_digital + reputacao + acessibilidade + engajamento_atividade + potencial_venda, 0, 100);

  const pontos_fortes = normalizeStringArray(raw?.pontos_fortes);
  const pontos_fracos = normalizeStringArray(raw?.pontos_fracos);

  return {
    score,
    estrutura_digital,
    reputacao,
    acessibilidade,
    engajamento_atividade,
    potencial_venda,
    nivel_oportunidade: toSafeString(raw?.nivel_oportunidade) || (score >= 61 ? "Alta" : score >= 31 ? "Média" : "Baixa"),
    probabilidade_fechamento: toSafeString(raw?.probabilidade_fechamento) || (score >= 81 ? "Muito Alta" : score >= 61 ? "Alta" : score >= 31 ? "Moderada" : "Baixa"),
    diagnostico: compact(toSafeString(raw?.diagnostico)) || fallbackDiagnosis,
    acao_recomendada: compact(toSafeString(raw?.acao_recomendada)) || fallbackAction,
    pontos_fortes: (pontos_fortes.length > 0 ? pontos_fortes : fallbackPoints.pontos_fortes).slice(0, 3),
    pontos_fracos: (pontos_fracos.length > 0 ? pontos_fracos : fallbackPoints.pontos_fracos).slice(0, 3),
    analise_site: compact(toSafeString(raw?.analise_site)) || siteSummary,
    analise_redes_sociais: compact(toSafeString(raw?.analise_redes_sociais)) || socialSummary,
    analise_reputacao_detalhada: compact(toSafeString(raw?.analise_reputacao_detalhada)) || `Avaliação ${heuristic.rating > 0 ? `${heuristic.rating.toFixed(1)}/5` : "não disponível"} com ${heuristic.reviewCount} avaliação(ões).`,
    justificativa_score: compact(toSafeString(raw?.justificativa_score)) || `Score consolidado pelo equilíbrio entre estrutura digital (${estrutura_digital}), reputação (${reputacao}), acessibilidade (${acessibilidade}), engajamento (${engajamento_atividade}) e potencial (${potencial_venda}).`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const lead_id = toSafeString(body?.lead_id);
    const nome_empresa = compact(toSafeString(body?.nome_empresa)) || "Empresa não informada";
    const endereco = compact(toSafeString(body?.endereco));
    const categoria = compact(toSafeString(body?.categoria));
    const cidade = compact(toSafeString(body?.cidade));
    const google_maps_link = compact(toSafeString(body?.google_maps_link));
    const avaliacao_media = numberFromUnknown(body?.avaliacao_media) ?? 0;
    const quantidade_avaliacoes = clamp(numberFromUnknown(body?.quantidade_avaliacoes) ?? 0, 0, 999999);
    const site_url = toSafeString(body?.site_url);
    const possui_site = Boolean(body?.possui_site) || !!normalizeUrl(site_url);
    const possui_telefone = Boolean(body?.possui_telefone);
    const redes_sociais = body?.redes_sociais;

    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: currentLead } = lead_id
      ? await supabase
          .from("leads")
          .select("enrichment_data")
          .eq("id", lead_id)
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

    const currentEnrichment = currentLead?.enrichment_data && typeof currentLead.enrichment_data === "object" && !Array.isArray(currentLead.enrichment_data)
      ? currentLead.enrichment_data as Record<string, unknown>
      : {};

    const lens = inferOfferingLens(companyProfile);
    const { websiteUrl, socialLinks } = extractSocialLinks(site_url, redes_sociais);

    const pageTargets = [
      ...(websiteUrl ? [{ url: websiteUrl, label: "site" }] : []),
      ...socialLinks.slice(0, 2).map((link) => ({ url: link.url, label: "rede_social", platform: link.platform })),
    ];

    const pageSummaries = await Promise.all(pageTargets.map((target) => fetchPageSummary(target.url, target.label, target.platform)));
    const websitePage = pageSummaries.find((page) => page.label === "site");
    const socialPages = pageSummaries.filter((page) => page.label === "rede_social");

    const heuristic = computeHeuristicScore({
      rating: avaliacao_media,
      reviewCount: quantidade_avaliacoes,
      hasPhone: possui_telefone,
      hasAddress: !!endereco && endereco.toLowerCase() !== "não informado",
      websitePage,
      socialPages,
    });

    const siteSummary = websitePage
      ? websitePage.ok
        ? `${websitePage.title || "Site acessível"}. ${websitePage.description || "Sem descrição meta visível."} ${websitePage.contentLength >= 250 ? "Há conteúdo suficiente para análise." : "Conteúdo superficial ou pouco acessível."}`
        : `Site identificado, mas não foi possível ler o conteúdo com consistência (status ${websitePage.status || "erro"}).`
      : "Sem site próprio detectado.";

    const socialSummary = socialPages.length > 0
      ? socialPages.map((page) => `${page.platform || "Rede social"}: ${page.ok ? `${page.title || "perfil detectado"}${page.contentLength >= 120 ? " com sinais de atividade" : " com poucos sinais de atividade"}` : "não foi possível ler o perfil"}`).join(" | ")
      : "Nenhuma rede social válida identificada para análise.";

    const fallbackPoints = buildFallbackPoints(lens, heuristic);
    const fallbackDiagnosis = buildFallbackDiagnosis({ nomeEmpresa: nome_empresa, cidade, categoria, heuristic, lens });
    const fallbackAction = buildFallbackAction({ companyProfile, heuristic, lens });

    let aiResult: any = null;

    if (LOVABLE_API_KEY) {
      const companyContext = companyProfile ? `
DADOS DA EMPRESA PROSPECTORA:
- Empresa: ${companyProfile.company_name}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços: ${companyProfile.company_products}
- Público-alvo: ${companyProfile.company_target_audience}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Lente principal de análise: ${lens.name}
` : "";

      const evidenceContext = pageSummaries.length > 0
        ? pageSummaries.map((page) => `- ${page.label === "site" ? "SITE" : `REDE (${page.platform || "Social"})`}: status=${page.status || 0}; título="${page.title || "sem título"}"; descrição="${page.description || "sem descrição"}"; sinais=${page.activitySignals.join(", ") || "nenhum"}; trecho="${page.textSnippet.slice(0, 450)}"`).join("\n")
        : "- Nenhum ativo digital adicional pôde ser lido.";

      const prompt = `Você é um analista sênior de qualificação B2B. Analise o lead abaixo e adapte a leitura ao segmento da empresa prospectora.

${companyContext}

LEAD ANALISADO:
- Empresa: ${nome_empresa}
- Categoria/Nicho: ${categoria || "Não informado"}
- Cidade: ${cidade || "Não informado"}
- Endereço: ${endereco || "Não informado"}
- Google Maps: ${google_maps_link || "Não disponível"}
- Avaliação média: ${avaliacao_media > 0 ? `${avaliacao_media}/5` : "Sem avaliação"}
- Quantidade de avaliações: ${quantidade_avaliacoes}
- Possui site próprio: ${possui_site ? `Sim (${site_url || "URL não capturada"})` : "Não"}
- Possui telefone: ${possui_telefone ? "Sim" : "Não"}
- Redes sociais brutas: ${JSON.stringify(redes_sociais || [])}

EVIDÊNCIAS EXTRAÍDAS DO SITE/REDES:
${evidenceContext}

HEURÍSTICA BASE (use como piso de consistência, não ignore):
- Estrutura Digital: ${heuristic.estrutura_digital}/25
- Reputação: ${heuristic.reputacao}/25
- Acessibilidade: ${heuristic.acessibilidade}/20
- Engajamento e Atividade: ${heuristic.engajamento_atividade}/15
- Potencial de Venda: ${heuristic.potencial_venda}/15
- Score base: ${heuristic.score}/100

REGRAS CRÍTICAS:
1. Pontos fortes e pontos fracos DEVEM ser relativos ao que a empresa prospectora realmente vende.
2. NÃO use pontos genéricos. Explique por que aquele sinal é positivo/negativo para os serviços reais da empresa prospectora.
3. Se a prospectora vende anúncios/tráfego pago, fale de prontidão para campanhas, prova social, página de destino, remarketing e conversão.
4. Se vende Google Meu Negócio/visibilidade local, fale de Maps, avaliações, autoridade regional e descoberta local.
5. Se vende site/SEO, fale de estrutura digital, autoridade, profundidade de conteúdo e conversão.
6. Se vende CRM/automação/WhatsApp, fale de acessibilidade, consistência de canais e prontidão operacional.
7. Use SOMENTE dados presentes ou inferências razoáveis a partir dos resumos extraídos. Não invente seguidores, tráfego, faturamento ou datas exatas.
8. O campo engajamento_atividade NÃO deve ser zero se houver sinais reais de atividade no site ou nas redes acima.
9. Cada dimensão deve respeitar seus limites máximos: 25, 25, 20, 15 e 15.
10. O score final deve ser a soma exata das dimensões.

Retorne APENAS um JSON válido com estas chaves:
{
  "score": <0-100>,
  "estrutura_digital": <0-25>,
  "reputacao": <0-25>,
  "acessibilidade": <0-20>,
  "engajamento_atividade": <0-15>,
  "potencial_venda": <0-15>,
  "nivel_oportunidade": "Alta|Média|Baixa",
  "probabilidade_fechamento": "Muito Alta|Alta|Moderada|Baixa",
  "diagnostico": "3-4 frases objetivas e estratégicas",
  "acao_recomendada": "3-5 frases conectando dor principal aos serviços da empresa prospectora",
  "pontos_fortes": ["...", "..."],
  "pontos_fracos": ["...", "..."],
  "analise_site": "...",
  "analise_redes_sociais": "...",
  "analise_reputacao_detalhada": "...",
  "justificativa_score": "1 frase objetiva"
}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.25,
            max_tokens: 1600,
            response_format: { type: "json_object" },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) aiResult = JSON.parse(content);
        } else {
          console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
        }
      } catch (error) {
        console.error("AI parsing error:", error);
      }
    }

    const result = normalizeAiResult({
      raw: aiResult,
      heuristic,
      fallbackPoints,
      fallbackDiagnosis,
      fallbackAction,
      siteSummary,
      socialSummary,
    });

    if (lead_id) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          ai_score: result.score,
          opportunity_level: result.nivel_oportunidade,
          closing_probability: result.probabilidade_fechamento,
          ai_diagnosis: result.diagnostico,
          ai_recommended_action: result.acao_recomendada,
          enrichment_data: {
            ...currentEnrichment,
            scored_at: new Date().toISOString(),
            score_breakdown: {
              estrutura_digital: result.estrutura_digital,
              reputacao: result.reputacao,
              acessibilidade: result.acessibilidade,
              engajamento_atividade: result.engajamento_atividade,
              potencial_venda: result.potencial_venda,
            },
            pontos_fortes: result.pontos_fortes,
            pontos_fracos: result.pontos_fracos,
            analise_site: result.analise_site,
            analise_redes_sociais: result.analise_redes_sociais,
            analise_reputacao_detalhada: result.analise_reputacao_detalhada,
            justificativa_score: result.justificativa_score,
            scoring_inputs: {
              avaliacao_media,
              quantidade_avaliacoes,
              possui_site,
              site_url,
              possui_telefone,
              redes_sociais_count: socialLinks.length,
              redes_sociais: socialLinks,
              website_page: websitePage,
              social_pages: socialPages,
            },
          },
        })
        .eq("id", lead_id)
        .eq("user_id", user.id);

      if (updateErr) console.error("Update error:", updateErr);
    }

    return new Response(JSON.stringify({
      nome_empresa,
      score: result.score,
      nivel_oportunidade: result.nivel_oportunidade,
      probabilidade_fechamento: result.probabilidade_fechamento,
      diagnostico: result.diagnostico,
      acao_recomendada: result.acao_recomendada,
      score_breakdown: {
        estrutura_digital: result.estrutura_digital,
        reputacao: result.reputacao,
        acessibilidade: result.acessibilidade,
        engajamento_atividade: result.engajamento_atividade,
        potencial_venda: result.potencial_venda,
      },
      pontos_fortes: result.pontos_fortes,
      pontos_fracos: result.pontos_fracos,
      analise_site: result.analise_site,
      analise_redes_sociais: result.analise_redes_sociais,
      analise_reputacao_detalhada: result.analise_reputacao_detalhada,
      justificativa_score: result.justificativa_score,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Score error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});