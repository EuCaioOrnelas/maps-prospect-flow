// Gera a MENSAGEM DE PRIMEIRO CONTATO manual (não é template Meta, não é follow-up).
// Copy consultiva B2B — o objetivo é APENAS gerar uma resposta natural do empresário.
// NÃO é vender, NÃO é marcar reunião, NÃO é apresentar serviço.
//
// Estrutura obrigatória (9 blocos, sem títulos no texto final):
//   0. Saudação humanizada        — curta, natural, variada, adaptada ao ICP; NUNCA "bom dia/tarde/noite"
//   1. Gancho personalizado       — 1ª frase após a saudação, baseada em dado real do lead
//   2. Contexto da abordagem      — justifica NATURALMENTE por que essa empresa foi analisada
//   3. Identificação curta        — quem é / de onde
//   4. Motivo do contato          — natural, espontâneo
//   5. Insight consultivo         — percepção inteligente, linguagem cautelosa
//   6. Curiosidade                — NÃO revelar a solução
//   7. Baixa pressão              — reduzir sensação de venda
//   8. CTA leve                   — só incentiva UMA resposta (nunca reunião/ligação/agenda)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ---- Registro de custo de IA (inline; sem módulo compartilhado) ----
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};
async function logAiUsage(p: {
  feature: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
  tokens_in?: number;
  tokens_out?: number;
  cost_usd?: number;
  user_id?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const model = p.model.replace(/^openai\//, "").trim();
    const tin = p.tokens_in ?? p.usage?.prompt_tokens ?? 0;
    const tout = p.tokens_out ?? p.usage?.completion_tokens ?? 0;
    const price = AI_PRICES[model] ?? AI_PRICES["gpt-4o-mini"];
    const cost = p.cost_usd ?? tin * price.in + tout * price.out;
    await fetch(`${url}/rest/v1/ai_usage_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feature: p.feature,
        model,
        user_id: p.user_id ?? null,
        tokens_in: Math.round(tin),
        tokens_out: Math.round(tout),
        cost_usd: Number(cost.toFixed(8)),
        metadata: p.metadata ?? {},
      }),
    });
  } catch (e) {
    console.error("[aiUsage] log falhou", String(e));
  }
}
// ---- fim registro de custo de IA ----

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Telefone BR válido (fixo ou celular), com ou sem DDI 55. */
function isValidBRPhone(raw: unknown): boolean {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return false;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13))
    d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  const rest = d.slice(2);
  if (/^(\d)\1+$/.test(rest)) return false;
  if (d.length === 11 && rest[0] !== "9") return false;
  return true;
}

/** Regra única: só existe abordagem quando há número de contato real. */
function hasContactNumber(lead: any): boolean {
  if (isValidBRPhone(lead?.phone)) return true;
  const list = lead?.phone_numbers;
  if (Array.isArray(list)) {
    return list.some((p: any) =>
      isValidBRPhone(typeof p === "string" ? p : (p?.number ?? p?.phone)),
    );
  }
  return false;
}

// ===== Modelo de negócio de quem prospecta (impede mensagem de "agência" para quem é distribuidor) =====
type BusinessModel =
  | "distribuidor"
  | "industria"
  | "revenda"
  | "servico"
  | "software"
  | "agencia"
  | "representante"
  | "outro";

const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  distribuidor: "Distribuidor / Atacadista",
  industria: "Indústria / Fabricante",
  revenda: "Revenda / Varejo",
  servico: "Prestador de serviço",
  software: "Software / Tecnologia",
  agencia: "Agência / Marketing",
  representante: "Representante comercial",
  outro: "Outro",
};

const BUSINESS_MODEL_ROLES: Record<BusinessModel, string> = {
  distribuidor:
    "DISTRIBUI E REVENDE PRODUTOS EM VOLUME para outros negócios. O lead é um CLIENTE COMPRADOR (ponto de venda, comércio, bar, restaurante, mercado, loja) que compra mercadoria para revender ou consumir na operação dele.",
  industria:
    "FABRICA/PRODUZ os próprios produtos e vende direto para empresas. O lead é um COMPRADOR/CLIENTE do produto fabricado.",
  revenda:
    "REVENDE produtos com pronta entrega. O lead é um COMPRADOR do produto.",
  servico:
    "PRESTA UM SERVIÇO operacional. O lead é uma empresa que pode CONTRATAR esse serviço.",
  software:
    "VENDE UM SISTEMA/SOFTWARE. O lead é uma empresa que pode USAR o sistema na operação.",
  agencia:
    "PRESTA SERVIÇOS DE MARKETING/PRESENÇA DIGITAL. O lead é uma empresa que pode contratar esses serviços.",
  representante:
    "REPRESENTA MARCAS/FABRICANTES e intermedeia a venda dos produtos representados. O lead é um COMPRADOR.",
  outro:
    "VENDE exatamente o que está descrito em 'Produtos/Serviços'. Nada além disso.",
};

const BUSINESS_MODEL_STRATEGY: Record<BusinessModel, string> = {
  distribuidor:
    "DISTRIBUIDOR/ATACADISTA: fale de MIX de produtos, condição comercial, prazo e regularidade de entrega, reposição, cobertura da região e atendimento direto sem atravessador. Gancho = a operação de COMPRA e ABASTECIMENTO do lead (o que ele vende ao cliente final, giro, sazonalidade, volume). NUNCA fale de divulgação, marketing, redes sociais, site ou captação de clientes.",
  industria:
    "INDÚSTRIA/FABRICANTE: fale de fornecimento direto da fábrica, volume, customização, padronização, prazo de produção e custo sem intermediário. Gancho = necessidade de insumo/produto na operação do lead.",
  revenda:
    "REVENDA/VAREJO: fale de disponibilidade, pronta entrega, variedade e condição de pagamento. Gancho = necessidade prática e imediata do lead.",
  servico:
    "SERVIÇO: fale da dor operacional que o serviço resolve e do ganho de tempo/custo ao terceirizar. Gancho = porte e rotina do negócio do lead.",
  software:
    "SOFTWARE: fale do processo manual que o sistema elimina e do controle que ele dá. Gancho = rotina desorganizada ou controle em papel/planilha.",
  agencia:
    "AGÊNCIA/MARKETING: aqui SIM use presença digital, site, redes sociais, avaliações, tráfego, captação e conversão como gancho e insight.",
  representante:
    "REPRESENTANTE COMERCIAL: fale das marcas representadas, acesso a condição de fábrica e atendimento local. Gancho = abastecimento e portfólio do lead.",
  outro:
    "Use apenas os produtos/serviços declarados no perfil. Gancho = região, tipo de negócio e necessidade prática, sem inventar serviço nenhum.",
};

function buildCommercialAngle(profile: any, model: BusinessModel): string {
  const offer = normalizeForMatch(
    `${profile?.company_niche || ""} ${profile?.company_products || ""}`,
  );
  if (/(internet|fibra optica|banda larga|conectividade|telecom)/.test(offer)) {
    return "CONECTIVIDADE B2B: a percepção deve tratar da importância da conexão para a continuidade da operação, comunicação, atendimento e ferramentas digitais do tipo de negócio do lead. Não afirme que há lentidão, quedas, alta demanda, streaming, horários de pico ou sistemas específicos sem evidência. Não cite plano, velocidade ou preço; apenas desperte curiosidade sobre conectividade.";
  }
  return BUSINESS_MODEL_STRATEGY[model];
}

function isConnectivitySeller(profile: any): boolean {
  const offer = normalizeForMatch(
    `${profile?.company_niche || ""} ${profile?.company_products || ""}`,
  );
  return /(internet|fibra optica|banda larga|conectividade|telecom)/.test(
    offer,
  );
}

function messageInventsConnectivityContext(
  message: string,
  profile: any,
): boolean {
  if (!isConnectivitySeller(profile)) return false;
  return /(avalia[cç][aã]o|reputa[cç][aã]o|agendamento|pagamento|streaming|hor[aá]rio de pico|alta demanda|grandes operadoras|concorr[eê]ncia|interrup[cç][aã]o|queda(?:s)? de internet|lentid[aã]o|sistema(?:s)? espec[ií]fico)/i.test(
    message || "",
  );
}

function buildSafeConnectivityManual(profile: any, lead: any): string {
  const sender = String(
    profile?.attendant_name || "o responsável comercial",
  ).trim();
  const company = String(profile?.company_name || "nossa empresa").trim();
  const leadName = String(lead?.company_name || "a empresa").trim();
  const category = String(lead?.category || "negócio").trim();
  const location = lead?.city ? ` em ${lead.city}` : " na região";
  return `Oi, tudo certo?\n\nEstava dando uma olhada em empresas do segmento de ${category}${location}, e a ${leadName} chamou minha atenção.\n\nSou ${sender}, da ${company}. Costumo acompanhar como negócios do setor estão organizando a conectividade e a continuidade das operações.\n\nAchei que fazia sentido te chamar rapidinho para compartilhar uma percepção.\n\nPelo tipo de operação da ${leadName}, a conectividade pode ser um ponto importante para manter as atividades do dia a dia funcionando com continuidade. Talvez exista algum aspecto dessa área que valha observar com mais atenção.\n\nFiquei curioso para saber se você já pensou sobre isso.\n\nPosso estar enganado, talvez não seja o momento, mas estou apenas compartilhando uma percepção.\n\nVocê gostaria que eu explicasse melhor esse ponto por aqui?`;
}

function normalizeBusinessModel(raw: unknown): BusinessModel | null {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (v in BUSINESS_MODEL_LABELS) return v as BusinessModel;
  return null;
}

function inferBusinessModel(text: string): BusinessModel {
  const t = (text || "").toLowerCase();
  if (
    /(distribuidor|distribuidora|distribui[cç][aã]o|atacad|atacarejo|abastec)/.test(
      t,
    )
  )
    return "distribuidor";
  if (
    /(ind[uú]stria|industrial|f[aá]brica|fabricante|fabrica[cç][aã]o|manufatur|confec[cç])/.test(
      t,
    )
  )
    return "industria";
  if (/(representa[cç][aã]o comercial|representante comercial)/.test(t))
    return "representante";
  if (
    /(software|sistema|saas|aplicativo|erp|crm|plataforma|tecnologia da informa)/.test(
      t,
    )
  )
    return "software";
  if (
    /(marketing|ag[eê]ncia|tr[aá]fego pago|social media|seo|gest[aã]o de redes|crea[cç][aã]o de sites?)/.test(
      t,
    )
  )
    return "agencia";
  if (/(revenda|loja|varejo|com[eé]rcio|e-?commerce|papelaria|mercado)/.test(t))
    return "revenda";
  if (
    /(servi[cç]o|consultoria|assessoria|contabil|advoc|limpeza|facilities|manuten[cç][aã]o|instala[cç][aã]o|terceiriza|treinamento|mentoria)/.test(
      t,
    )
  )
    return "servico";
  return "outro";
}

function resolveBusinessModel(profile: any): BusinessModel {
  const saved = normalizeBusinessModel(profile?.company_business_model);
  if (saved) return saved;
  const text = `${profile?.company_niche || ""} ${profile?.company_products || ""} ${profile?.company_name || ""}`;
  return inferBusinessModel(text);
}

function formatProductCatalog(services: any): string {
  const list = Array.isArray(services) ? services : [];
  const items = list
    .map((item: any) => {
      const nome = String(item?.name || item?.nome || "").trim();
      const desc = String(item?.description || item?.descricao || "").trim();
      if (!nome) return "";
      return desc ? `- ${nome}: ${desc}` : `- ${nome}`;
    })
    .filter(Boolean);
  return items.length ? items.join("\n") : "";
}

function buildBusinessModelBlock(
  profile: any,
  model: BusinessModel,
  lead: any,
  catalog: string,
): string {
  const blockedMarketing = model !== "agencia";
  const commercialAngle = buildCommercialAngle(profile, model);
  return `
═══ MODELO DE NEGÓCIO DE QUEM ESTÁ PROSPECTANDO (LEIA ANTES DE ESCREVER) ═══
- Como a empresa atua: ${BUSINESS_MODEL_LABELS[model]}
- Papel na cadeia: ${BUSINESS_MODEL_ROLES[model]}
- O que ela entrega de fato: ${profile?.company_products || "conforme perfil"}
${catalog ? `- Catálogo declarado:\n${catalog}` : ""}
- Relação com este lead (${lead?.company_name || "lead"}${lead?.category ? `, ${lead.category}` : ""}): o lead é ${model === "agencia" || model === "servico" || model === "software" ? "uma empresa que pode CONTRATAR o que ela vende" : "um CLIENTE COMPRADOR dos produtos dela"}.

ESTRATÉGIA OBRIGATÓRIA PARA ESTE MODELO:
${commercialAngle}

${blockedMarketing ? `⛔ TRAVA ABSOLUTA: é PROIBIDO oferecer, sugerir ou insinuar marketing, divulgação, presença digital, redes sociais, tráfego pago, anúncios, site, SEO, engajamento, conversão online, "fortalecer a marca" ou "atrair mais clientes pela internet". Quem escreve NÃO vende nada disso. Se o insight que você pensou for sobre esses temas, DESCARTE e escolha outro ligado ao que a empresa realmente vende.` : ""}
⛔ PROIBIDO tratar o lead como se ele fosse cliente de um serviço que a empresa não presta. A mensagem deve soar como alguém que ${model === "distribuidor" ? "abastece o negócio dele com produtos" : model === "industria" ? "fabrica e fornece o produto dele" : model === "representante" ? "representa marcas e abastece o negócio dele" : "entrega exatamente o que está no perfil"}.
`;
}

const MARKETING_TERMS =
  /(marketing|presen[cç]a digital|redes sociais|rede social|tr[aá]fego|an[uú]ncios?|instagram|seo|engajamento|convers[aã]o|divulga[cç][aã]o|divulgar|criar um site|criação de site|posicionamento digital|branding)/i;

function messageViolatesModel(message: string, model: BusinessModel): boolean {
  if (model === "agencia") return false;
  return MARKETING_TERMS.test(message || "");
}

function messageRevealsOffer(
  message: string,
  profile: any,
  catalog: string,
): boolean {
  void profile;
  void catalog;
  return /\b(?:r\$\s*\d|plano(?:s)?\s+(?:de|com|por)|pre[cç]o(?:s)?|mensalidade|contrate|adquira|compre|oferecemos|temos\s+(?:o|a|um|uma)\s+plano|por\s+apenas\s+r\$)\b/i.test(
    message || "",
  );
}

function normalizeForMatch(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Persona: o modelo escreve COMO o responsável da empresa, nunca como assistente de IA. */
function buildPersonaSystem(
  profile: any,
  model: BusinessModel,
  catalog: string,
  lead: any,
): string {
  const nome =
    String(profile?.attendant_name || "").trim() || "o responsável comercial";
  const empresa = String(profile?.company_name || "").trim() || "a empresa";
  return `Você NÃO é um assistente de IA. Você É ${nome}, responsável comercial da ${empresa}, escrevendo pessoalmente pelo WhatsApp.

QUEM VOCÊ É
- Nome: ${nome}
- Empresa: ${empresa} (${BUSINESS_MODEL_LABELS[model]})
- Nicho: ${profile?.company_niche || "conforme perfil"}
- O que você vende de fato: ${profile?.company_products || "conforme perfil"}
${catalog ? `- Seu catálogo:\n${catalog}` : ""}
- Seu diferencial: ${profile?.company_differential || "conforme perfil"}
- Seu objetivo comercial: ${profile?.company_objective || "abrir conversa qualificada"}
- Seu público-alvo: ${profile?.company_target_audience || "conforme perfil"}

COM QUEM VOCÊ ESTÁ FALANDO
- Empresa do lead: ${lead?.company_name || "lead"}${lead?.category ? ` (${lead.category})` : ""}${lead?.city ? ` — ${lead.city}${lead?.state ? `/${lead.state}` : ""}` : ""}
- O lead é ${model === "agencia" || model === "servico" || model === "software" ? "uma empresa que pode CONTRATAR o que VOCÊ vende" : "um CLIENTE COMPRADOR dos produtos que VOCÊ vende"}.

COMO VOCÊ ESCREVE
- Sempre em 1ª pessoa ("eu", "a gente", "nós aqui da ${empresa}"). Nunca descreva sua empresa em 3ª pessoa como se fosse anúncio.
- Você leu a análise/diagnóstico deste lead antes de escrever: cite algo concreto dele (nome da empresa, cidade, segmento, ponto observado). Mensagem genérica é falha.
- Tom humano de WhatsApp: curto, direto, sem jargão de marketing, sem promessa inventada.
- Nunca invente números, prêmios, anos de mercado, clientes ou resultados que não estejam no seu perfil.
- NÃO ofereça, apresente, explique, liste ou cite produtos, serviços, planos, preços, condições ou benefícios da empresa. O perfil e o catálogo servem somente para orientar o tema do gancho e impedir assuntos desconectados.`;
}

/** Mensagem sem nenhuma referência concreta ao lead = genérica. */
function messageLacksPersonalization(message: string, lead: any): boolean {
  const m = (message || "").toLowerCase();
  if (!m.trim()) return true;
  const tokens: string[] = [];
  const push = (v: unknown) => {
    const s = String(v ?? "")
      .trim()
      .toLowerCase();
    if (s.length >= 4) tokens.push(s);
  };
  push(lead?.company_name);
  push(lead?.city);
  push(lead?.category);
  push(lead?.neighborhood);
  if (!tokens.length) return false;
  return !tokens.some((t) => m.includes(t));
}

function messageConfusesBusinessRoles(
  message: string,
  lead: any,
  profile: any,
): boolean {
  const normalized = normalizeForMatch(message);
  const leadCategory = normalizeForMatch(lead?.category)
    .split(/\W+/)
    .filter((word) => word.length >= 5);
  const sellerOffer = normalizeForMatch(profile?.company_products);
  return leadCategory.some(
    (word) =>
      !sellerOffer.includes(word) &&
      new RegExp(
        `(?:nos|nossa empresa|a gente)\\s+(?:vende|oferece|fornece|fabrica|distribui)[^.!?]{0,70}\\b${word}\\b`,
      ).test(normalized),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Modo interno (Wiize API V1): service role + id da conta API no header
    const internalUserId = req.headers.get("x-wiize-api-user");
    const internalMode =
      !!internalUserId && token === SUPABASE_SERVICE_ROLE_KEY;

    let user: { id: string } | null = null;
    if (internalMode) {
      user = { id: internalUserId! };
    } else {
      const {
        data: { user: authUser },
        error: authErr,
      } = await supabase.auth.getUser(token);
      if (authErr || !authUser) {
        return new Response(
          JSON.stringify({ error: "Usuário não autenticado" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      user = authUser;
    }

    const body = await req.json();
    const { lead_id } = body ?? {};

    // No modo interno o lead chega inline no corpo (a conta API não tem CRM na Wiize)
    let lead: any = null;
    if (internalMode && body?.lead && typeof body.lead === "object") {
      lead = body.lead;
    } else {
      if (!lead_id) {
        return new Response(
          JSON.stringify({ error: "lead_id é obrigatório" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const { data: leadRow, error: leadErr } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user.id)
        .single();
      if (leadErr || !leadRow) {
        return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lead = leadRow;
    }

    // Prospecção Web entrega somente análise e diagnóstico, nunca abordagem.
    if (lead?.source === "web") {
      return new Response(
        JSON.stringify({
          error: "web_source_no_message",
          message:
            "Oportunidades da Prospecção Web não geram mensagem de abordagem.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Regra crítica: sem telefone/WhatsApp válido não há mensagem de abordagem.
    if (!hasContactNumber(lead)) {
      return new Response(
        JSON.stringify({
          error: "no_contact_number",
          message: "Número não encontrado para esta empresa.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const enrichment =
      lead.enrichment_data && typeof lead.enrichment_data === "object"
        ? (lead.enrichment_data as Record<string, any>)
        : {};
    const pontosFortes = Array.isArray(enrichment.pontos_fortes)
      ? enrichment.pontos_fortes
      : [];
    const pontosFracos = Array.isArray(enrichment.pontos_fracos)
      ? enrichment.pontos_fracos
      : [];
    const analiseSite = enrichment.analise_site || "";
    const analiseRedes = enrichment.analise_redes_sociais || "";
    const analiseConcorrencia = enrichment.analise_concorrencia_regional || "";
    const analiseDemanda = enrichment.analise_demanda_regional || "";
    const socialMedia = Array.isArray(lead.social_media)
      ? lead.social_media
      : [];
    const hasSite = !!lead.website && lead.website !== "-";

    const { data: companyServices } = await supabase
      .from("company_services")
      .select("name, description")
      .eq("owner_user_id", companyProfile?.owner_user_id || user.id)
      .limit(20);

    const businessModel = resolveBusinessModel(companyProfile);
    const productCatalog = formatProductCatalog(companyServices);

    if (
      !companyProfile ||
      (!String(companyProfile.company_products || "").trim() && !productCatalog)
    ) {
      return new Response(
        JSON.stringify({
          error: "missing_company_profile",
          message:
            "Complete os produtos ou serviços da sua empresa antes de gerar a abordagem.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const businessModelBlock = buildBusinessModelBlock(
      companyProfile,
      businessModel,
      lead,
      productCatalog,
    );
    const commercialAngle = buildCommercialAngle(companyProfile, businessModel);

    const companyContext = companyProfile
      ? `
⚠️ PERFIL DA EMPRESA QUE ESTÁ PROSPECTANDO:
- Empresa: ${companyProfile.company_name}
- Atendente/Vendedor: ${companyProfile.attendant_name}
- Como atua (modelo de negócio): ${BUSINESS_MODEL_LABELS[businessModel]}
- Nicho: ${companyProfile.company_niche}
- Produtos/Serviços VENDIDOS: ${companyProfile.company_products}
${productCatalog ? `- Catálogo declarado:\n${productCatalog}` : ""}
- Diferencial: ${companyProfile.company_differential}
- Objetivo: ${companyProfile.company_objective}
- Público-alvo: ${companyProfile.company_target_audience}

REGRA ABSOLUTA: A mensagem NUNCA deve mencionar algo que "${companyProfile.company_name}" NÃO vende. Não ofereça a solução — só plante a semente.
${businessModelBlock}
`
      : "";

    const diagnosticContext =
      lead.ai_score || lead.ai_diagnosis
        ? `
═══ DIAGNÓSTICO DESTE LEAD (matéria-prima do gancho e do insight) ═══
- Score: ${lead.ai_score || "N/A"} | Nível: ${lead.opportunity_level || "N/A"}
- Diagnóstico: ${lead.ai_diagnosis || "N/A"}
${pontosFortes.length ? `- Pontos fortes: ${pontosFortes.join("; ")}` : ""}
${pontosFracos.length ? `- Pontos fracos: ${pontosFracos.join("; ")}` : ""}
${analiseSite ? `- Site: ${analiseSite}` : ""}
${analiseRedes ? `- Redes sociais: ${analiseRedes}` : ""}
${analiseConcorrencia ? `- Concorrência regional: ${analiseConcorrencia}` : ""}
${analiseDemanda ? `- Demanda regional: ${analiseDemanda}` : ""}
`
        : "";

    const uniqueSeed = crypto.randomUUID().slice(0, 8);
    const personaSystem = buildPersonaSystem(
      companyProfile,
      businessModel,
      productCatalog,
      lead,
    );

    const prompt = `Você é um CONSULTOR B2B sênior escrevendo a PRIMEIRA mensagem no WhatsApp para o dono/gestor de uma empresa que você acabou de analisar.

▸ OBJETIVO ÚNICO: gerar UMA RESPOSTA natural do empresário.
▸ NÃO é vender. NÃO é marcar reunião. NÃO é apresentar serviço.
▸ A mensagem NUNCA pode citar ou oferecer produtos, serviços, planos, preços, condições ou benefícios. Essas informações servem somente para orientar o assunto internamente.
▸ A mensagem tem que parecer 100% humana, como se você tivesse acabado de olhar a operação dele.
▸ Sensação-alvo do leitor: "essa pessoa realmente olhou meu negócio", nunca "mais uma tentando me vender algo".

${companyContext}
${diagnosticContext}

═══ CLIENTE POTENCIAL — DADOS DO LEAD ═══
Tudo deste bloco descreve QUEM RECEBE a mensagem. Use como matéria-prima do gancho, mas nunca trate o nicho ou os produtos do lead como se fossem da empresa que envia.
- Empresa: ${lead.company_name || "N/A"}
- Contato: ${lead.contact_name || "responsável"}
- Nicho / ICP: ${lead.category || "N/A"}
- Cidade: ${lead.city || "N/A"}
- Endereço: ${lead.address || "N/A"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Site: ${hasSite ? lead.website : "não localizado"}
- Redes sociais: ${socialMedia.length ? socialMedia.join(", ") : "não localizadas"}

═══════════════════════════════════════════
ESTRUTURA OBRIGATÓRIA (nesta ordem, SEM títulos, SEM numeração no texto final)
═══════════════════════════════════════════

Use exatamente o ritmo abaixo, adaptando cada frase ao perfil comercial e ao lead. Não copie nomes nem conteúdo do exemplo:
1. Saudação curta em um parágrafo próprio: "Oi, tudo certo?"
2. Observação de pesquisa em um parágrafo: diga que estava olhando empresas do segmento na cidade e que a empresa chamou atenção. Só acrescente um fato específico quando ele for real e útil ao tema.
3. Apresentação e autoridade contextual em um parágrafo: "Sou [atendente], da [empresa]. Costumo acompanhar como negócios do setor estão organizando [área coerente com a oferta]." Para internet use conectividade/continuidade operacional; representante ou distribuidor use abastecimento/reposição; software use processos/controle; agência use presença digital/captação; demais serviços use a área operacional atendida.
4. Motivo do contato em um parágrafo curto: compartilhar uma percepção.
5. Percepção consultiva em um parágrafo, com linguagem cautelosa. Relacione o tipo de operação do lead ao tema que a empresa remetente domina, sem afirmar problema não comprovado e sem apresentar a solução.
6. Curiosidade em um parágrafo: pergunte se o responsável já pensou sobre esse ponto.
7. Baixa pressão em um parágrafo: admita que pode estar enganado e que está apenas compartilhando uma percepção.
8. CTA em um parágrafo: pergunta simples oferecendo explicar melhor o ponto pelo WhatsApp.

Esta sequência de 8 blocos prevalece sobre qualquer exemplo de fraseado abaixo. Os detalhes seguintes servem apenas para orientar o conteúdo de cada bloco, sem alterar a ordem, juntar etapas ou transformar autoridade em oferta.

ÂNGULO COMERCIAL OBRIGATÓRIO PARA ESTE PERFIL:
${commercialAngle}

REGRAS DOS BLOCOS:
- A observação de pesquisa deve vir antes da apresentação, como no exemplo fornecido pelo usuário.
- O fato que chamou atenção não precisa ser avaliação: escolha segmento, cidade, especialidade, operação, site, redes, diagnóstico ou outro dado real que tenha conexão com o tema comercial.
- Para internet/conectividade, não use reputação como justificativa da necessidade; parta do tipo de operação e fale apenas da importância potencial da conectividade.
- Para representantes e distribuidores, trate de abastecimento, reposição ou mix sem citar marcas, produtos, condições ou preços.
- Para agência, use presença digital, canais, captação ou reputação somente quando sustentados pelos dados.
- Para software, conecte a percepção a processos e controle sem afirmar que o lead usa planilha ou possui desorganização.
- Para outros serviços B2B, relacione a percepção à área operacional atendida e mantenha a hipótese cautelosa.
- Nunca deduza fatos internos a partir do segmento. Não invente demanda, horários de pico, sistemas, falhas, volume, concorrência ou comportamento do cliente.
- A apresentação deve justificar por que o remetente observa aquele tema, mas sem explicar, promover ou oferecer sua solução.
- O insight pode mencionar a ÁREA do problema (conectividade, abastecimento, processos, atendimento, presença digital), mas não pode revelar o produto, plano, preço, condição ou benefício vendido.
- A curiosidade deve perguntar se o responsável já pensou no ponto levantado.
- A baixa pressão deve assumir que a percepção pode estar errada.
- O CTA deve terminar com "?" e apenas perguntar se a pessoa gostaria de entender melhor a percepção pelo WhatsApp; nunca reunião, ligação, agenda, proposta ou demonstração.

REGRA DE FLUXO (INEGOCIÁVEL):
Saudação → pesquisa e chamada de atenção → identificação e contexto profissional → motivo → percepção cautelosa → curiosidade → baixa pressão → CTA.
A leitura deve fluir como uma conversa real no WhatsApp entre dois profissionais, nunca como relatório ou carta comercial.

PERSONALIZAÇÃO PELO PERFIL E PELO LEAD:
- Cruze o que a empresa remetente realmente vende com o segmento e os dados concretos do lead.
- O perfil comercial orienta o assunto internamente, mas seus produtos, planos, preços, condições e benefícios não aparecem na mensagem.
- O nome, a empresa, a cidade e o segmento pertencem ao lead; não os atribua ao remetente.
- Use o diferencial do remetente apenas como pano de fundo da autoridade, sem propaganda ou alegações não comprovadas.
- O texto final deve parecer escrito por alguém que conhece a área da empresa remetente e realmente observou aquele lead.

═══════════════════════════════════════════
LINGUAGEM E ESTILO
═══════════════════════════════════════════
- Escreva como CONSULTOR, jamais como vendedor.
- Tom conversacional, natural, sem excesso de formalidade.
- PROIBIDO clichês de IA/marketing: "mercado competitivo", "potencial de crescimento", "solução inovadora", "empresa líder", "transformar resultados", "impulsionar vendas", "maximizar resultados", "otimizar processos" (como frase pronta), "revolucionar", "alavancar", "escalar".
- SEM emojis. SEM listas. SEM hashtags. SEM links. SEM caixa alta. SEM negrito/markdown.
- SEM travessão duplo "--". SEM travessão longo "—" no meio de frase (use vírgula ou quebra de linha).
- Frases curtas, PT-BR natural.
- ORTOGRAFIA: TODA frase começa com letra MAIÚSCULA. Todo parágrafo/bloco (após \\n\\n) começa com maiúscula. Nunca inicie um bloco com minúscula (ex.: NUNCA "estava pesquisando" — sempre "Estava pesquisando").
- Use QUEBRAS DE LINHA em branco (\\n\\n) entre os blocos para dar respiro no WhatsApp.
- Extensão-alvo: 90 a 160 palavras. Nunca ultrapasse 180.


═══════════════════════════════════════════
POLÍTICAS META (cumprir sempre)
═══════════════════════════════════════════
- Identifique claramente quem envia (nome + empresa).
- Explique o motivo do contato.
- Nada de informação falsa, indução ao erro, manipulação, urgência artificial ou aparência de spam.
- Transparência total.

═══════════════════════════════════════════
AUTO-AVALIAÇÃO ANTES DE RESPONDER
═══════════════════════════════════════════
Avalie mentalmente antes de me devolver o JSON:
  ✓ Começa com uma saudação curta, natural e variada (nunca "bom dia/tarde/noite", nunca gíria)?
  ✓ A saudação está adaptada ao ICP e não fica isolada (é seguida pelo gancho)?
  ✓ Parece uma conversa real iniciada por uma pessoa no WhatsApp — não uma carta comercial?
  ✓ Demonstra pesquisa real sobre a empresa?
  ✓ Gera curiosidade sem revelar a solução?
  ✓ Não cita nem oferece produto, serviço, plano, preço, condição ou benefício da empresa?
  ✓ Tem transparência (quem, por quê)?
  ✓ Existe um CONTEXTO DA ABORDAGEM entre o gancho e o insight? (obrigatório)
  ✓ Se eu fosse o dono e recebesse essa mensagem de um desconhecido, entenderia naturalmente por que ele entrou em contato ANTES de ele falar do meu negócio?
  ✓ A IDENTIFICAÇÃO contém os 3 elementos (nome + empresa + contexto de autoridade natural)?
  ✓ A autoridade usa apenas fatos verdadeiros (especialização, nicho, serviço, rotina) — sem inventar números, anos, prêmios, liderança ou clientes?
  ✓ Ao terminar a apresentação, dá pra responder: quem é? de qual empresa? por que entende disso? por que veio falar comigo?
  ✓ Está personalizada ao ICP "${lead.category || "N/A"}"?
  ✓ Está personalizada ao PERFIL DA EMPRESA que prospecta: produtos/serviços = "${companyProfile?.company_products || "N/A"}", nicho = "${companyProfile?.company_niche || "N/A"}"? A mensagem parece escrita por quem vende isso?

  ✓ O GANCHO e o INSIGHT têm ligação direta com "${companyProfile?.company_products || "o serviço vendido"}"? (se não, reescreva)
  ✓ A mensagem respeita o MODELO DE NEGÓCIO "${BUSINESS_MODEL_LABELS[businessModel]}"? ${businessModel === "agencia" ? "" : "Não pode ter NENHUMA menção a marketing, divulgação, redes sociais, site, tráfego, anúncios, engajamento ou conversão online. Se tiver, REESCREVA."}
  ✓ O leitor entenderia que quem escreveu ${businessModel === "distribuidor" ? "abastece o negócio dele com produtos" : businessModel === "industria" ? "fabrica e fornece o produto" : businessModel === "representante" ? "representa marcas e abastece o negócio dele" : "entrega exatamente o que está no perfil"}? (se não, reescreva)
  ✓ O CTA é obrigatoriamente uma PERGUNTA FECHADA que termina com "?"?
  ✓ O CTA pergunta se o empresário quer que você explique melhor o tema do insight (nunca é pergunta vaga tipo "faz sentido?")?
  ✓ O CTA amarra explicitamente com o tema do insight (canal próprio, agenda, retenção, etc.)?
  ✓ Toda frase e todo bloco começam com letra MAIÚSCULA?
  ✓ Parece consultoria, não venda?
  ✓ Evita clichês de IA/marketing?
  ✓ Segue Meta (sem spam, sem manipulação)?
  ✓ Se eu fosse o dono, eu responderia?
Se QUALQUER resposta for "não", REESCREVA internamente e só então devolva a versão final.

VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) — a mensagem deve ser única para ESTE lead.

Retorne APENAS JSON válido, sem markdown, sem comentários, exatamente neste formato:
{
  "mensagem": "mensagem final pronta para colar no WhatsApp, com quebras \\n\\n entre os blocos, seguindo TODAS as regras acima",
  "gancho": "a primeira frase da mensagem",
  "motivo": "por que este lead foi escolhido (1 frase interna, para auditoria)",
  "insight": "o insight consultivo usado (1 frase interna)",
  "estrategia": "ICP identificado e ângulo escolhido (1 frase interna)"
}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: personaSystem },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({
            error:
              "Limite de requisições excedido. Tente novamente em instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    logAiUsage({
      feature: "approach-lead-manual",
      model: "gpt-4o-mini",
      usage: aiData.usage,
    });
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(content);

    // Sanitiza a saída: remove travessões, normaliza espaçamentos e capitaliza início de bloco/frase.
    const capFirst = (s: string) =>
      s.replace(/^(\s*)([a-zà-ÿ])/, (_m, sp, ch) => sp + ch.toUpperCase());
    const sanitize = (s: string) => {
      let out = (s || "")
        .replace(/\s*--\s*/g, ", ") // "palavra -- palavra" -> "palavra, palavra"
        .replace(/([^\n])\s+—\s+([^\n])/g, "$1, $2") // travessão longo no meio de frase -> vírgula
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      // Capitaliza a primeira letra de cada parágrafo (separados por \n\n) e de cada frase após . ! ?
      out = out
        .split(/\n{2,}/)
        .map((block) => {
          const capBlock = capFirst(block);
          // dentro do bloco, capitaliza após ponto final/exclamação/interrogação seguidos de espaço
          return capBlock.replace(
            /([.!?]\s+)([a-zà-ÿ])/g,
            (_m, p, ch) => p + ch.toUpperCase(),
          );
        })
        .join("\n\n");

      return out;
    };

    // Garante que o CTA final seja uma pergunta fechada terminada em "?"
    const ensureClosedQuestionCTA = (s: string) => {
      const blocks = s.split(/\n{2,}/).filter(Boolean);
      if (blocks.length === 0) return s;
      let last = blocks[blocks.length - 1].trim();
      // Se já termina com ?, apenas normaliza espaços
      if (/\?\s*$/.test(last)) {
        blocks[blocks.length - 1] = last.replace(/\s+\?$/, "?");
        return blocks.join("\n\n");
      }
      // Remove pontuação final declarativa e transforma em pergunta fechada
      last = last.replace(/[.!,;:]\s*$/, "").trim();
      if (!/\?\s*$/.test(last)) last = last + "?";
      blocks[blocks.length - 1] = last;
      return blocks.join("\n\n");
    };

    // Revisão final: mensagem que oferece algo fora do modelo ou troca os papéis é reescrita UMA vez.
    const rewriteReason = messageViolatesModel(
      parsed.mensagem || "",
      businessModel,
    )
      ? "offering_mismatch"
      : messageInventsConnectivityContext(parsed.mensagem || "", companyProfile)
        ? "unsupported_connectivity_context"
        : messageConfusesBusinessRoles(
              parsed.mensagem || "",
              lead,
              companyProfile,
            )
          ? "role_confusion"
          : messageRevealsOffer(
                parsed.mensagem || "",
                companyProfile,
                productCatalog,
              )
            ? "revealed_offer"
            : messageLacksPersonalization(parsed.mensagem || "", lead)
              ? "missing_personalization"
              : null;
    if (rewriteReason) {
      try {
        const fixRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: personaSystem },
                {
                  role: "user",
                  content: `A mensagem abaixo confundiu o que a empresa remetente vende com o negócio do cliente potencial, ou ofereceu algo fora do perfil.

QUEM ENVIA: ${BUSINESS_MODEL_LABELS[businessModel]} — ${BUSINESS_MODEL_ROLES[businessModel]}
O QUE VENDE DE FATO: ${companyProfile?.company_products || "conforme perfil"}
ESTRATÉGIA CORRETA: ${buildCommercialAngle(companyProfile, businessModel)}
CLIENTE POTENCIAL: ${lead.company_name || "lead"}, do segmento ${lead.category || "não informado"}. Estes dados servem somente para personalizar; eles NÃO são o que o remetente vende.

Reescreva nos 8 blocos definidos: saudação; pesquisa com nome/segmento/cidade; apresentação e contexto profissional; motivo; percepção cautelosa; curiosidade; baixa pressão; CTA perguntando se gostaria de entender melhor. Escreva em 1ª pessoa, como ${companyProfile?.attendant_name || "o responsável"} da ${companyProfile?.company_name || "empresa"}. Cite ${lead.company_name || "o nome da empresa"}${lead.city ? `, em ${lead.city}` : ""}${lead.category ? `, do segmento ${lead.category}` : ""}. NÃO revele, cite, ofereça ou explique produto, serviço, plano, preço, condição ou benefício. ${isConnectivitySeller(companyProfile) ? "Como o remetente vende internet, NÃO mencione avaliação, reputação, agendamentos, pagamentos, streaming, horários de pico, alta demanda, concorrência, grandes operadoras, interrupções ou qualquer sistema. Limite a percepção à importância potencial da conectividade para a continuidade da operação, sem dizer que o lead já possui um problema." : ""} ${businessModel !== "agencia" ? "Remova qualquer menção a marketing, divulgação, redes sociais, site, tráfego, anúncios, engajamento ou conversão online." : ""}

MENSAGEM ORIGINAL:
${parsed.mensagem}

Retorne APENAS JSON: {"mensagem": "..."}`,
                },
              ],
              temperature: 0.6,
              max_tokens: 900,
              response_format: { type: "json_object" },
            }),
          },
        );
        if (fixRes.ok) {
          const fixData = await fixRes.json();
          logAiUsage({
            feature: "approach-lead-manual-model-fix",
            model: "gpt-4o-mini",
            usage: fixData.usage,
          });
          const fixed = JSON.parse(
            fixData.choices?.[0]?.message?.content || "{}",
          );
          if (fixed?.mensagem) parsed.mensagem = fixed.mensagem;
        }
      } catch (e) {
        console.error("model-fix falhou", String(e));
      }
    }

    if (
      isConnectivitySeller(companyProfile) &&
      messageInventsConnectivityContext(parsed.mensagem || "", companyProfile)
    ) {
      parsed.mensagem = buildSafeConnectivityManual(companyProfile, lead);
    }

    const finalMessage = ensureClosedQuestionCTA(
      sanitize(parsed.mensagem || ""),
    );

    const newEnrichment = {
      ...(typeof lead.enrichment_data === "object" && lead.enrichment_data
        ? lead.enrichment_data
        : {}),
      manual_approach: {
        message: finalMessage,
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
        business_model_used: businessModel,
        rewrite_reason: rewriteReason,
        generated_at: new Date().toISOString(),
      },
    };

    if (!internalMode) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({ enrichment_data: newEnrichment })
        .eq("id", lead_id)
        .eq("user_id", user.id);

      if (updateErr) console.error("Update error:", updateErr);
    }

    return new Response(
      JSON.stringify({
        mensagem: finalMessage,
        gancho: parsed.gancho || "",
        motivo: parsed.motivo || "",
        insight: parsed.insight || "",
        estrategia: parsed.estrategia || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Approach-manual error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro interno",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
