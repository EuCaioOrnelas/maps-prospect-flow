import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_MODEL = "gpt-4o-mini";

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

// Social media insights type (kept for type compatibility, no longer uses SerpAPI)
type SocialMediaInsight = {
  platform: string;
  lastPostInfo: string;
  activityLevel: string;
  details: string;
  rawSnippets: string[];
};

const inferNicheContext = (companyProfile: any): NicheContext => {
  if (!companyProfile) {
    return {
      id: "generic",
      name: "Crescimento comercial B2B",
      analysisFocus: `Analise de forma abrangente a maturidade digital, comercial e operacional do lead, identificando as maiores dores e oportunidades.`,
      keyQuestions: [
        "Qual o maior gap digital/comercial do lead?",
        "Onde o lead está perdendo oportunidades de negócio?",
        "Quais são os sinais de tração ou estagnação?",
      ],
      strengthsHint: "Fale sobre maturidade digital, reputação, acessibilidade e sinais de tração.",
      weaknessesHint: "Fale sobre lacunas digitais, baixa prova social, canais fracos.",
      competitorContext: "Compare com a densidade de concorrentes na região.",
    };
  }

  const text = compact(`${companyProfile?.company_niche || ""} ${companyProfile?.company_products || ""} ${companyProfile?.company_differential || ""} ${companyProfile?.company_objective || ""}`).toLowerCase();
  const products = compact(companyProfile?.company_products || "");
  const niche = compact(companyProfile?.company_niche || "");

  // ── Mapeamento de nichos (ordem: mais específico → mais genérico) ──

  // App / Software / SaaS
  if (/(aplicativo|app|software|sistema|plataforma|saas|erp|pdv|agendamento online)/.test(text)) {
    const segment = text.match(/(barbearia|sal[aã]o|est[eé]tica|cl[ií]nica|acad[eê]mia|restaurante|pet|loja|com[eé]rcio|escola|im[oó]vel|imobili[aá]ri|hotel|pousada|oficina|lav[aá]nderia|farm[aá]cia)/)?.[1] || "negócios";
    return {
      id: "app_software",
      name: `Aplicativo/Software para ${segment}`,
      analysisFocus: `Foco: verificar se o lead já usa algum sistema/app de gestão ou agendamento. Analisar se tem site com agendamento online, sistema de pagamento digital, reservas online, cardápio digital, gestão de estoque visível.`,
      keyQuestions: [
        "O lead possui sistema de agendamento/gestão online visível no site ou redes?",
        "Usa algum app concorrente (verificar menções no site)?",
        "O site tem integração com pagamento ou reserva online?",
        "O perfil do Google tem link de agendamento ativo?",
        "O lead ainda depende de WhatsApp manual para operar?",
      ],
      strengthsHint: "Fale sobre prontidão digital, volume de clientes, presença online que facilita adoção de sistema.",
      weaknessesHint: "Fale sobre dependência de processos manuais, falta de sistema digital, perda de clientes por não ter gestão automatizada.",
      competitorContext: `Verifique se concorrentes do mesmo segmento (${segment}) próximos já usam sistemas digitais.`,
    };
  }

  // Gestão de redes sociais / Social media
  if (/(gest[aã]o de rede|social media|gerenciamento de rede|conte[uú]do|m[ií]dia social|marketing de conte[uú]do|community manager|cria[cç][aã]o de conte[uú]do)/.test(text)) {
    return {
      id: "social_media_management",
      name: "Gestão de redes sociais",
      analysisFocus: `Foco PRINCIPAL: analisar a presença nas redes sociais do lead. Verificar se tem perfil ativo, bio otimizada, link na bio, identidade visual, qualidade dos conteúdos visíveis, resposta a comentários. Inferir nível de atividade com base nos sinais disponíveis (título do perfil, descrição, sinais de freshness no HTML).`,
      keyQuestions: [
        "O perfil nas redes sociais tem bio otimizada com CTA e link?",
        "A identidade visual é consistente e profissional?",
        "Há sinais de atividade recente (menções a datas, promoções, conteúdo atualizado)?",
        "Tem identidade visual consistente?",
        "Usa formatos modernos (reels, stories, carrosséis) com base nos sinais detectados?",
        "Responde a comentários e interage com seguidores?",
      ],
      strengthsHint: "Fale sobre base de seguidores, engajamento atual, presença que já gera visibilidade.",
      weaknessesHint: "Fale sobre posts irregulares ou parados, qualidade visual amadora, falta de estratégia, bio não otimizada.",
      competitorContext: "Verifique se concorrentes locais estão mais ativos nas redes.",
    };
  }

  // Tráfego pago / Anúncios
  if (/(tr[aá]fego pago|ads|an[uú]ncios|google ads|meta ads|campanhas|m[ií]dia paga|performance|gestor de tr[aá]fego)/.test(text)) {
    return {
      id: "paid_media",
      name: "Tráfego pago e campanhas de anúncios",
      analysisFocus: `Foco: avaliar se o lead tem estrutura para receber tráfego pago — landing page, site com CTA, prova social, oferta clara, formulário de contato ou WhatsApp visível.`,
      keyQuestions: [
        "O lead tem landing page ou site preparado para receber tráfego?",
        "Existe CTA claro (WhatsApp, formulário, agendamento)?",
        "A prova social é suficiente para converter?",
        "O site/perfil tem oferta clara e diferenciada?",
        "Já investe em anúncios (verificar sinais no site)?",
      ],
      strengthsHint: "Fale sobre prontidão para campanhas, prova social, clareza da oferta.",
      weaknessesHint: "Fale sobre ausência de landing page, pouca prova social, oferta confusa.",
      competitorContext: "Verifique se concorrentes locais já anunciam e capturam demanda.",
    };
  }

  // Google Meu Negócio / Visibilidade local
  if (/(google meu neg[oó]cio|perfil no google|maps|gmn|avalia[cç][aã]o|visibilidade local|posicionamento local|seo local)/.test(text)) {
    return {
      id: "local_visibility",
      name: "Visibilidade local e Google Meu Negócio",
      analysisFocus: `Foco: analisar perfil do Google — completude, fotos, respostas a avaliações, categorização, horários, posicionamento para buscas locais.`,
      keyQuestions: [
        "O perfil do Google está completo (fotos, horários, descrição)?",
        "O lead responde às avaliações?",
        "A categoria está correta e otimizada?",
        "Aparece nos primeiros resultados para buscas locais?",
      ],
      strengthsHint: "Fale sobre reputação, autoridade local, presença no Maps.",
      weaknessesHint: "Fale sobre poucas avaliações, perfil incompleto, falta de respostas.",
      competitorContext: "Verifique concorrentes na mesma categoria com mais avaliações.",
    };
  }

  // Site / SEO / Presença digital
  if (/(site|landing page|seo|cria[cç][aã]o de site|otimiza[cç][aã]o|web design|wordpress|desenvolvimento web|loja virtual|e-commerce|ecommerce)/.test(text)) {
    return {
      id: "website_seo",
      name: "Site, SEO e presença digital",
      analysisFocus: `Foco: analisar o site atual — velocidade, responsividade, SEO on-page, meta tags, conteúdo, blog. Se não tem site, essa é a maior dor.`,
      keyQuestions: [
        "O site é responsivo e carrega rápido?",
        "Tem meta tags otimizadas?",
        "Tem blog ou conteúdo para tráfego orgânico?",
        "A estrutura facilita conversão?",
      ],
      strengthsHint: "Fale sobre estrutura existente, conteúdo indexável, autoridade digital.",
      weaknessesHint: "Fale sobre site inexistente/desatualizado, SEO fraco, ausência de conteúdo estratégico.",
      competitorContext: "Verifique se concorrentes têm sites mais profissionais.",
    };
  }

  // CRM / Automação / WhatsApp Business / Chatbot
  if (/(crm|whatsapp|autom[aá][cç][aã]o|funil|cad[eê]ncia|prospec[cç][aã]o|chatbot|atendimento|relacionamento)/.test(text)) {
    return {
      id: "automation",
      name: "CRM, WhatsApp e automação comercial",
      analysisFocus: `Foco: verificar organização de atendimento — WhatsApp Business, catálogo, tempo de resposta, follow-up, processos comerciais.`,
      keyQuestions: [
        "Usa WhatsApp Business ou comum?",
        "Tem catálogo no WhatsApp?",
        "Tem múltiplos canais de contato organizados?",
        "Aparenta ter processo de follow-up?",
      ],
      strengthsHint: "Fale sobre canais acessíveis, prontidão operacional.",
      weaknessesHint: "Fale sobre ausência de processo comercial, resposta lenta.",
      competitorContext: "Verifique se concorrentes demonstram atendimento mais organizado.",
    };
  }

  // Consultoria / Mentoria / Coaching
  if (/(consultoria|mentoria|coaching|assessoria|treinamento|capacita[cç][aã]o)/.test(text)) {
    return {
      id: "consulting",
      name: "Consultoria e assessoria empresarial",
      analysisFocus: `Foco: avaliar maturidade do negócio, dores operacionais visíveis, gaps de gestão, oportunidades de melhoria.`,
      keyQuestions: [
        "O negócio demonstra crescimento desordenado?",
        "Tem presença digital mas sem estratégia clara?",
        "Avaliações revelam problemas operacionais?",
        "O lead parece estagnado?",
      ],
      strengthsHint: "Fale sobre base de clientes existente, reputação, potencial de crescimento.",
      weaknessesHint: "Fale sobre falta de estratégia, processos desorganizados.",
      competitorContext: "Verifique se concorrentes demonstram maior maturidade.",
    };
  }

  // Fotografia / Vídeo / Identidade visual / Branding
  if (/(fotografia|foto|v[ií]deo|filmagem|produ[cç][aã]o visual|design gr[aá]fico|identidade visual|branding|marca)/.test(text)) {
    return {
      id: "visual_content",
      name: "Fotografia, vídeo e identidade visual",
      analysisFocus: `Foco: analisar qualidade visual — fotos do Google, redes sociais, logo, consistência visual. Fotos amadoras = oportunidade FORTE.`,
      keyQuestions: [
        "As fotos do perfil do Google são profissionais ou amadoras?",
        "As redes têm identidade visual consistente?",
        "O site tem fotos de qualidade?",
        "Usa vídeos em algum canal?",
      ],
      strengthsHint: "Fale sobre negócio visualmente atrativo, base para conteúdo.",
      weaknessesHint: "Fale sobre fotos amadoras, falta de identidade visual.",
      competitorContext: "Verifique se concorrentes têm imagem mais profissional.",
    };
  }

  // Manutenção / Serviços técnicos / Instalação
  if (/(manuten[cç][aã]o|reparo|instala[cç][aã]o|t[eé]cnico|assistência|conserto|reformas|el[eé]trica|hidr[aá]ulica|ar condicionado|refrigera[cç][aã]o|pintura|limpeza|dedetiza[cç][aã]o|jardinagem|serralheria|vidra[cç]aria)/.test(text)) {
    return {
      id: "maintenance_services",
      name: "Manutenção e serviços técnicos",
      analysisFocus: `Foco: avaliar como o lead capta clientes — depende de indicação? Tem presença digital para ser encontrado? Responde rápido? Tem orçamento online? Portfólio de trabalhos realizados?`,
      keyQuestions: [
        "O lead é facilmente encontrável por quem busca o serviço na região?",
        "Tem portfólio de trabalhos realizados visível (site ou redes)?",
        "Oferece orçamento online ou apenas por telefone?",
        "Tem avaliações que comprovam qualidade do serviço?",
        "Depende exclusivamente de indicação boca-a-boca?",
      ],
      strengthsHint: "Fale sobre reputação por qualidade, demanda constante no segmento, avaliações positivas.",
      weaknessesHint: "Fale sobre dependência de indicação, sem presença digital, sem portfólio visível, difícil de encontrar online.",
      competitorContext: "Verifique se há prestadores concorrentes mais visíveis digitalmente na região.",
    };
  }

  // Contabilidade / Jurídico / Serviços profissionais regulamentados
  if (/(contabilidade|cont[aá]bil|advoc|jur[ií]dico|escrit[oó]rio|audit|pericial|not[aá]rio|despach)/.test(text)) {
    return {
      id: "professional_services",
      name: "Serviços profissionais (contábil/jurídico)",
      analysisFocus: `Foco: avaliar presença digital institucional — site profissional, autoridade no segmento, artigos/blog, captação de clientes online, presença no Google.`,
      keyQuestions: [
        "O escritório tem site profissional e atualizado?",
        "Produz conteúdo educativo (blog, artigos, vídeos)?",
        "É facilmente encontrável por quem busca o serviço na região?",
        "Tem avaliações e prova social?",
        "Como capta novos clientes — indicação ou digital?",
      ],
      strengthsHint: "Fale sobre credibilidade, experiência no mercado, carteira de clientes.",
      weaknessesHint: "Fale sobre dependência de indicação, site desatualizado, sem conteúdo educativo.",
      competitorContext: "Verifique se escritórios concorrentes investem mais em presença digital.",
    };
  }

  // Saúde / Clínicas / Medicina / Odontologia
  if (/(sa[uú]de|cl[ií]nica|m[eé]dico|odonto|dentista|fisioterapia|psic[oó]logo|nutri[cç]|hospital|laborat[oó]rio|est[eé]tica|dermat)/.test(text)) {
    return {
      id: "healthcare",
      name: "Saúde e clínicas",
      analysisFocus: `Foco: avaliar presença digital para captação de pacientes — agendamento online, site com especialidades, avaliações, conteúdo educativo, redes sociais com casos/resultados.`,
      keyQuestions: [
        "Tem agendamento online disponível?",
        "O site lista especialidades e profissionais?",
        "Tem conteúdo educativo nas redes (antes/depois, dicas)?",
        "As avaliações refletem satisfação dos pacientes?",
        "Depende de convênios ou também capta particular?",
      ],
      strengthsHint: "Fale sobre reputação médica, avaliações positivas, demanda constante.",
      weaknessesHint: "Fale sobre falta de agendamento online, conteúdo ausente, dependência de convênios.",
      competitorContext: "Verifique clínicas concorrentes com maior presença digital e agendamento facilitado.",
    };
  }

  // Alimentação / Restaurantes / Food service
  if (/(alimenta[cç][aã]o|restaurante|lanchonete|pizzaria|hamburgueria|food|delivery|gastronomia|padaria|confeitaria|buffet|bar |caf[eé]|sorveteria|a[cç]a[ií])/.test(text)) {
    return {
      id: "food_service",
      name: "Alimentação e food service",
      analysisFocus: `Foco: avaliar presença em apps de delivery, cardápio digital, fotos dos pratos, redes sociais com conteúdo gastronômico, avaliações sobre sabor e atendimento.`,
      keyQuestions: [
        "Está presente em apps de delivery (iFood, Rappi)?",
        "Tem cardápio digital acessível?",
        "As fotos dos pratos/produtos são profissionais?",
        "Usa redes sociais para divulgar promoções e novidades?",
        "As avaliações mencionam qualidade e atendimento?",
      ],
      strengthsHint: "Fale sobre localização, avaliações de sabor, presença em delivery.",
      weaknessesHint: "Fale sobre fotos amadoras dos pratos, sem cardápio digital, redes paradas.",
      competitorContext: "Verifique se concorrentes gastronômicos próximos têm maior presença digital.",
    };
  }

  // Educação / Cursos / Escolas
  if (/(educa[cç][aã]o|escola|curso|faculdade|ensino|treinamento corporativo|ead|aula|professor|tutor|idioma)/.test(text)) {
    return {
      id: "education",
      name: "Educação e cursos",
      analysisFocus: `Foco: avaliar como o lead atrai alunos — site com informações de cursos, depoimentos, inscrição online, presença nas redes com conteúdo educativo.`,
      keyQuestions: [
        "O site tem lista de cursos/turmas com inscrição online?",
        "Tem depoimentos de alunos?",
        "Produz conteúdo educativo nas redes (aulas, dicas)?",
        "As avaliações mencionam qualidade de ensino?",
      ],
      strengthsHint: "Fale sobre reputação educacional, demanda na região, conteúdo existente.",
      weaknessesHint: "Fale sobre site sem inscrição online, redes sem conteúdo educativo, falta de depoimentos.",
      competitorContext: "Verifique se instituições concorrentes têm melhor presença digital para captação de alunos.",
    };
  }

  // Imobiliário / Corretor / Construtora
  if (/(imobili[aá]ri|corretor|constru[cç]|engenharia|arquitetura|im[oó]vel|im[oó]veis|incorpora|loteamento)/.test(text)) {
    return {
      id: "real_estate",
      name: "Imobiliário e construção",
      analysisFocus: `Foco: avaliar portfólio de imóveis/projetos online, qualidade de fotos, presença em portais imobiliários, site com busca de imóveis, redes com lançamentos.`,
      keyQuestions: [
        "Tem portfólio de imóveis/projetos no site?",
        "Está presente em portais imobiliários (ZAP, OLX, VivaReal)?",
        "As fotos dos imóveis/projetos são profissionais?",
        "Usa redes sociais para divulgar lançamentos e vendas?",
        "Tem tour virtual ou vídeos dos imóveis?",
      ],
      strengthsHint: "Fale sobre portfólio existente, localização dos empreendimentos, reputação.",
      weaknessesHint: "Fale sobre fotos amadoras, ausência em portais, site sem busca, redes paradas.",
      competitorContext: "Verifique se construtoras/imobiliárias concorrentes têm presença digital mais forte.",
    };
  }

  // Franquias / Licenciamento / Parcerias
  if (/(franquia|licenciamento|parceria|representa[cç][aã]o|distribui[cç][aã]o|revenda|afiliado|rede de neg[oó]cio)/.test(text)) {
    return {
      id: "franchises_partnerships",
      name: "Franquias e parcerias comerciais",
      analysisFocus: `Foco: avaliar se o lead tem estrutura para expansão — presença de marca, padronização visual, múltiplas unidades, solidez do modelo de negócio, capacidade de replicação.`,
      keyQuestions: [
        "O lead demonstra marca padronizada e profissional?",
        "Tem múltiplas unidades ou opera apenas localmente?",
        "O modelo de negócio é facilmente replicável?",
        "Tem documentação ou material institucional visível?",
        "As avaliações são consistentes entre unidades (se houver)?",
      ],
      strengthsHint: "Fale sobre marca consolidada, modelo replicável, demanda comprovada.",
      weaknessesHint: "Fale sobre marca fraca, falta de padronização, operação limitada a uma unidade.",
      competitorContext: "Verifique se concorrentes do segmento já operam em modelo de franquia/parceria.",
    };
  }

  // Produtos físicos / Indústria / Fabricação / Atacado
  if (/(produto|ind[uú]stria|f[aá]brica|manufatura|atacado|distribui|revenda|com[eé]rcio|varejo|loja|atacadista|confec[cç][aã]o|m[oó]veis|embalagem|cosm[eé]tico|suplemento)/.test(text)) {
    return {
      id: "physical_products",
      name: "Produtos físicos e comércio",
      analysisFocus: `Foco: avaliar canais de venda — e-commerce, marketplace, catálogo digital, logística, presença em redes com produtos, fotos profissionais de produtos.`,
      keyQuestions: [
        "Vende online (e-commerce próprio ou marketplace)?",
        "Tem catálogo digital de produtos?",
        "As fotos dos produtos são profissionais?",
        "Usa redes sociais para divulgar produtos?",
        "Tem logística/entrega organizada?",
      ],
      strengthsHint: "Fale sobre catálogo existente, demanda do produto, presença em marketplaces.",
      weaknessesHint: "Fale sobre venda apenas presencial, sem e-commerce, fotos amadoras, sem catálogo digital.",
      competitorContext: "Verifique se concorrentes já vendem online e têm maior alcance digital.",
    };
  }

  // Logística / Transporte / Frete
  if (/(log[ií]stica|transporte|frete|entrega|motoboy|courier|ônibus|mudança|cargas)/.test(text)) {
    return {
      id: "logistics",
      name: "Logística e transporte",
      analysisFocus: `Foco: avaliar como o lead capta clientes — presença digital, orçamento online, rastreamento, frota visível, avaliações sobre pontualidade.`,
      keyQuestions: [
        "Tem site com cotação/orçamento online?",
        "Oferece rastreamento de entregas?",
        "As avaliações mencionam pontualidade e cuidado?",
        "Tem presença em plataformas de frete (Fretebras, etc)?",
      ],
      strengthsHint: "Fale sobre frota, cobertura regional, avaliações de pontualidade.",
      weaknessesHint: "Fale sobre cotação apenas por telefone, sem rastreamento, presença digital fraca.",
      competitorContext: "Verifique se transportadoras concorrentes têm maior presença digital.",
    };
  }

  // Seguros / Financeiro / Crédito
  if (/(seguro|financ|cr[eé]dito|investimento|cons[oó]rcio|previdência|corretora|plano de sa[uú]de|capitali[zs]a)/.test(text)) {
    return {
      id: "financial_services",
      name: "Serviços financeiros e seguros",
      analysisFocus: `Foco: avaliar autoridade e confiança digital — site institucional, conteúdo educativo sobre produtos financeiros, depoimentos, presença regulatória.`,
      keyQuestions: [
        "Tem site profissional com produtos/serviços listados?",
        "Produz conteúdo educativo sobre finanças/seguros?",
        "Tem prova social (depoimentos, cases)?",
        "É facilmente encontrável por quem busca o serviço?",
      ],
      strengthsHint: "Fale sobre carteira de clientes, credibilidade, especialização.",
      weaknessesHint: "Fale sobre falta de conteúdo educativo, site genérico, baixa prova social.",
      competitorContext: "Verifique se corretoras/consultorias concorrentes investem mais em conteúdo e presença digital.",
    };
  }

  // Eventos / Festas / Decoração / Buffet
  if (/(evento|festa|decora[cç][aã]o|buffet|casamento|anivers[aá]rio|cerimonial|som e luz|dj|banda|aluguel de)/.test(text)) {
    return {
      id: "events",
      name: "Eventos e festas",
      analysisFocus: `Foco: avaliar portfólio visual, presença nas redes com fotos de eventos realizados, depoimentos de clientes, facilidade de orçamento.`,
      keyQuestions: [
        "Tem portfólio de eventos realizados (fotos/vídeos)?",
        "As redes sociais mostram trabalhos recentes?",
        "Tem depoimentos de clientes satisfeitos?",
        "Oferece orçamento online ou apenas presencial?",
      ],
      strengthsHint: "Fale sobre portfólio visual, recomendações de clientes, demanda sazonal.",
      weaknessesHint: "Fale sobre portfólio desatualizado, redes paradas, sem depoimentos.",
      competitorContext: "Verifique se empresas de eventos concorrentes têm portfólio mais atualizado.",
    };
  }

  // ══ FALLBACK DINÂMICO — usa o texto do perfil da empresa para gerar contexto ══
  // Em vez de ser genérico, o fallback extrai o que a empresa vende e cria um contexto relevante
  return {
    id: "dynamic_b2b",
    name: `${niche || products || "Serviço B2B"}`,
    analysisFocus: `IMPORTANTE: A empresa prospectora atua com "${products || niche}". Adapte TODA a análise para avaliar se o lead é um bom cliente para ESTE serviço/produto específico. Identifique dores, gaps e oportunidades que "${products || niche}" resolve diretamente. Analise a presença digital, operação e maturidade do lead sob a ótica de quem vende "${products || niche}".`,
    keyQuestions: [
      `O lead demonstra necessidade real de "${products || niche}"?`,
      "Quais gaps operacionais ou digitais o lead apresenta que se conectam ao serviço vendido?",
      "O lead já usa alguma solução concorrente ou alternativa?",
      "Quais sinais indicam que o lead está pronto (ou não) para comprar?",
      "O lead tem capacidade financeira aparente para investir no serviço?",
    ],
    strengthsHint: `Fale sobre pontos do lead que facilitam a venda de "${products || niche}" — como maturidade, demanda, capacidade de investimento.`,
    weaknessesHint: `Fale sobre gaps do lead que "${products || niche}" resolve diretamente — dores operacionais, digitais ou comerciais.`,
    competitorContext: `Verifique se concorrentes do lead na região já utilizam soluções similares a "${products || niche}", o que pressiona o lead a adotar também.`,
  };
};

// Keep backward compatibility
const inferOfferingLens = (companyProfile: any): OfferingLens => {
  const niche = inferNicheContext(companyProfile);
  return {
    id: niche.id === "paid_media" ? "paid_media" : niche.id === "local_visibility" ? "local_visibility" : niche.id === "website_seo" ? "website_seo" : niche.id === "automation" ? "automation" : "generic",
    name: niche.name,
    strengthsHint: niche.strengthsHint,
    weaknessesHint: niche.weaknessesHint,
    actionHint: niche.analysisFocus,
  } as OfferingLens;
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
    analise_concorrencia_regional: compact(toSafeString(raw?.analise_concorrencia_regional)) || "",
    analise_demanda_regional: compact(toSafeString(raw?.analise_demanda_regional)) || "",
    justificativa_score: compact(toSafeString(raw?.justificativa_score)) || `Score consolidado pelo equilíbrio entre estrutura digital (${estrutura_digital}), reputação (${reputacao}), acessibilidade (${acessibilidade}), engajamento (${engajamento_atividade}) e potencial (${potencial_venda}).`,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
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
    const nicheCtx = inferNicheContext(companyProfile);
    const { websiteUrl, socialLinks } = extractSocialLinks(site_url, redes_sociais);

    const pageTargets = [
      ...(websiteUrl ? [{ url: websiteUrl, label: "site" }] : []),
      ...socialLinks.slice(0, 3).map((link) => ({ url: link.url, label: "rede_social", platform: link.platform })),
    ];

    // Run page fetches only (no SerpAPI cost - direct HTTP crawling is free)
    const pageSummaries = await Promise.all(
      pageTargets.map((target) => fetchPageSummary(target.url, target.label, target.platform))
    );
    // Social insights derived from page crawling data only (zero SerpAPI usage)
    const socialInsights: SocialMediaInsight[] = [];

    const websitePage = pageSummaries.find((page) => page.label === "site");
    const socialPages = pageSummaries.filter((page) => page.label === "rede_social");

    // Enrich social pages with SerpAPI insights for heuristic scoring
    // If SerpAPI found active signals, boost activity detection
    const hasActiveSignalsFromSerp = socialInsights.some(
      (si) => si.activityLevel === "Muito ativo" || si.activityLevel === "Ativo"
    );

    const siteSummary = websitePage
      ? websitePage.ok
        ? `${websitePage.title || "Site acessível"}. ${websitePage.description || "Sem descrição meta visível."} ${websitePage.contentLength >= 250 ? "Há conteúdo suficiente para análise." : "Conteúdo superficial ou pouco acessível."}`
        : `Site identificado, mas não foi possível ler o conteúdo com consistência (status ${websitePage.status || "erro"}).`
      : "Sem site próprio detectado.";

    // Build rich social summary combining page fetch + SerpAPI results
    const serpSocialDetails = socialInsights.length > 0
      ? socialInsights.map((si) => `${si.platform}: Atividade=${si.activityLevel}; ${si.lastPostInfo}; ${si.details}`).join(" | ")
      : "";

    const pageSocialDetails = socialPages.length > 0
      ? socialPages.map((page) => `${page.platform || "Rede social"}: ${page.ok ? `${page.title || "perfil detectado"}${page.contentLength >= 120 ? " com sinais de atividade" : " com poucos sinais de atividade"}` : "não foi possível ler o perfil"}`).join(" | ")
      : "";

    const socialSummary = pageSocialDetails
        ? pageSocialDetails
        : "Nenhuma rede social válida identificada para análise.";

    const fallbackPoints = buildFallbackPoints(lens, heuristic);
    const fallbackDiagnosis = buildFallbackDiagnosis({ nomeEmpresa: nome_empresa, cidade, categoria, heuristic, lens });
    const fallbackAction = buildFallbackAction({ companyProfile, heuristic, lens });

    let aiResult: any = null;

    if (OPENAI_API_KEY) {
      const companyContext = companyProfile ? `
DADOS DA EMPRESA PROSPECTORA:
- Empresa: ${companyProfile.company_name}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços: ${companyProfile.company_products}
- Público-alvo: ${companyProfile.company_target_audience}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Tipo de análise adaptada: ${nicheCtx.name}
` : "";

      const evidenceContext = pageSummaries.length > 0
        ? pageSummaries.map((page) => `- ${page.label === "site" ? "SITE" : `REDE (${page.platform || "Social"})`}: status=${page.status || 0}; título="${page.title || "sem título"}"; descrição="${page.description || "sem descrição"}"; sinais=${page.activitySignals.join(", ") || "nenhum"}; trecho="${page.textSnippet.slice(0, 600)}"`).join("\n")
        : "- Nenhum ativo digital adicional pôde ser lido.";

      const nicheQuestions = nicheCtx.keyQuestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n");

      const prompt = `Você é um analista sênior de qualificação B2B altamente especializado. Sua análise deve ser TOTALMENTE ADAPTADA ao nicho e serviço da empresa prospectora.

${companyContext}

═══ FOCO ADAPTATIVO DA ANÁLISE ═══
${nicheCtx.analysisFocus}

PERGUNTAS-CHAVE QUE VOCÊ DEVE RESPONDER NA ANÁLISE:
${nicheQuestions}

═══ LEAD ANALISADO ═══
- Empresa: ${nome_empresa}
- Categoria/Nicho do lead: ${categoria || "Não informado"}
- Cidade/Região: ${cidade || "Não informado"}
- Endereço completo: ${endereco || "Não informado"}
- Google Maps: ${google_maps_link || "Não disponível"}
- Avaliação média: ${avaliacao_media > 0 ? `${avaliacao_media}/5` : "Sem avaliação"}
- Quantidade de avaliações: ${quantidade_avaliacoes}
- Possui site próprio: ${possui_site ? `Sim (${site_url || "URL não capturada"})` : "Não"}
- Possui telefone: ${possui_telefone ? "Sim" : "Não"}
- Redes sociais brutas: ${JSON.stringify(redes_sociais || [])}

═══ EVIDÊNCIAS EXTRAÍDAS (SITE E REDES - CRAWLING DIRETO) ═══
${evidenceContext}

═══ ANÁLISE DE ATIVIDADE NAS REDES SOCIAIS (VIA CRAWLING DIRETO) ═══
${socialPages.length > 0
  ? socialPages.map((page) => `🔍 ${page.platform || "Rede Social"}:
   - Status: ${page.ok ? "Acessível" : "Inacessível"}
   - Título: ${page.title || "Não detectado"}
   - Descrição: ${page.description || "Não detectada"}
   - Sinais de atividade: ${page.activitySignals.join(", ") || "Nenhum"}
   - Conteúdo: ${page.contentLength >= 120 ? "Perfil com conteúdo" : "Pouco conteúdo visível"}`).join("\n\n")
  : "⚠️ Nenhuma rede social pôde ser analisada. Infira atividade com base nos dados do Google Maps (avaliações recentes = sinal de atividade)."}

═══ HEURÍSTICA BASE (piso de consistência) ═══
- Estrutura Digital: ${heuristic.estrutura_digital}/25
- Reputação: ${heuristic.reputacao}/25
- Acessibilidade: ${heuristic.acessibilidade}/20
- Engajamento e Atividade: ${heuristic.engajamento_atividade}/15
- Potencial de Venda: ${heuristic.potencial_venda}/15
- Score base: ${heuristic.score}/100

═══ ANÁLISES OBRIGATÓRIAS ═══

1. ANÁLISE DE REDES SOCIAIS (DETALHADA):
   - Analise os dados de crawling direto das redes sociais acima.
   - Se o perfil foi acessível e tem conteúdo, é sinal de atividade.
   - Se há sinais de "freshness" (datas recentes, menções a anos), reporte.
   - Avalie bio (otimizada? CTA? link?), identidade visual, qualidade dos conteúdos visíveis.
   - Se há avaliações recentes no Google Maps, isso indica que a empresa está ativa.
   - NUNCA diga "engajamento zero" se houver perfis ativos detectados.
   - NÃO tente informar data da última publicação — essa informação não está disponível via crawling.

2. ANÁLISE DE CONCORRÊNCIA REGIONAL:
   - Com base na categoria "${categoria || "do lead"}" e cidade "${cidade || "não informada"}", ANALISE a provável densidade de concorrentes na região.
   - ${nicheCtx.competitorContext}
   - Considere: é uma região com alta densidade de negócios similares? O lead está em área comercial movimentada ou residencial?
   - Se o endereço indica zona comercial/centro, há mais concorrência mas também mais demanda.
   - Estime se num raio de 5km existiriam muitos ou poucos concorrentes do mesmo segmento.
   - Traga isso como insight no diagnóstico.

3. ANÁLISE DE DEMANDA REGIONAL:
   - Com base na cidade "${cidade || ""}" e categoria "${categoria || ""}", avalie o potencial de demanda da região.
   - Considere: é uma cidade grande, média ou pequena? Alta ou baixa densidade demográfica?
   - Cidades maiores = mais demanda mas mais concorrência. Cidades menores = menos concorrência mas mercado limitado.
   - Se for capital ou região metropolitana, há alta demanda. Se for interior, avalie o porte.
   - Inclua essa análise no diagnóstico.

4. ANÁLISE DO SITE (PROFUNDA E ADAPTADA AO NICHO):
   - Se a prospectora vende apps/software: o site tem agendamento online? Sistema de reservas? Integração com pagamento?
   - Se a prospectora vende gestão de redes: o site reflete a marca? Tem link para redes sociais?
   - Se a prospectora vende tráfego: o site serve como landing page? Tem CTA claro? Formulário?
   - Analise o conteúdo extraído do site com base no que a prospectora realmente precisa identificar.

═══ REGRAS CRÍTICAS ═══
1. Pontos fortes e fracos DEVEM ser 100% contextualizados ao que a empresa prospectora vende ("${companyProfile?.company_products || "serviço B2B"}"). NUNCA use pontos genéricos como "boa reputação" ou "tem site" sem explicar como isso se conecta ao serviço vendido. Exemplos:
   - Se vende app de barbearia → "Não possui sistema de agendamento online, depende de WhatsApp manual"
   - Se vende gestão de redes → "Bio não otimizada, sem link de conversão, identidade visual inconsistente"
   - Se vende manutenção → "Sem portfólio de trabalhos realizados visível online"
   - Se vende consultoria → "Sinais de crescimento desordenado sem processos definidos"
   - Se vende produtos físicos → "Vende apenas presencialmente, sem e-commerce"
   - Se vende seguros → "Sem conteúdo educativo sobre proteção financeira"
   - QUALQUER outro nicho → Conecte CADA ponto à dor que o serviço/produto vendido resolve
2. NÃO use frases como "boa reputação no Google" como ponto forte A MENOS QUE explique como isso beneficia a venda do serviço específico.
3. O campo engajamento_atividade NÃO deve ser zero se houver qualquer sinal de atividade (perfil de rede social existente, site com conteúdo, avaliações recentes). Mínimo 3 se houver algum sinal.
4. Cada dimensão: 25, 25, 20, 15 e 15. Score = soma exata.
5. Use SOMENTE dados presentes ou inferências razoáveis. Não invente números exatos de seguidores, tráfego ou datas de publicação.
6. O diagnóstico DEVE incluir insights sobre concorrência regional e demanda da região.
7. A análise de redes sociais DEVE focar em presença, bio, identidade visual e sinais de atividade detectáveis — NÃO mencione "última publicação" pois essa informação não está disponível.
8. A ação recomendada DEVE citar especificamente qual produto/serviço da empresa prospectora usar e como conectar à dor principal do lead.

Retorne APENAS um JSON válido:
{
  "score": <0-100>,
  "estrutura_digital": <0-25>,
  "reputacao": <0-25>,
  "acessibilidade": <0-20>,
  "engajamento_atividade": <0-15>,
  "potencial_venda": <0-15>,
  "nivel_oportunidade": "Alta|Média|Baixa",
  "probabilidade_fechamento": "Muito Alta|Alta|Moderada|Baixa",
  "diagnostico": "4-6 frases incluindo análise regional, concorrência e demanda",
  "acao_recomendada": "3-5 frases conectando dor principal aos serviços da empresa prospectora",
  "pontos_fortes": ["ponto adaptado ao nicho 1", "ponto adaptado ao nicho 2", "ponto 3"],
  "pontos_fracos": ["fraqueza adaptada ao nicho 1", "fraqueza adaptada ao nicho 2", "fraqueza 3"],
  "analise_site": "análise profunda adaptada ao nicho da prospectora",
  "analise_redes_sociais": "análise de presença, bio, identidade visual e sinais de atividade detectáveis via crawling",
  "analise_reputacao_detalhada": "...",
  "analise_concorrencia_regional": "análise de concorrentes no raio de 5km e posicionamento",
  "analise_demanda_regional": "análise de demanda baseada na densidade demográfica e porte da cidade",
  "justificativa_score": "1-2 frases objetivas"
}`;

      try {
        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 2500,
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
            niche_analysis_type: nicheCtx.name,
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
            analise_concorrencia_regional: result.analise_concorrencia_regional,
            analise_demanda_regional: result.analise_demanda_regional,
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
              social_media_insights: socialInsights,
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
      analise_concorrencia_regional: result.analise_concorrencia_regional,
      analise_demanda_regional: result.analise_demanda_regional,
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