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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Telefone BR válido (fixo ou celular), com ou sem DDI 55. */
function isValidBRPhone(raw: unknown): boolean {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return false;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
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
    return list.some((p: any) => isValidBRPhone(typeof p === "string" ? p : p?.number ?? p?.phone));
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

function normalizeBusinessModel(raw: unknown): BusinessModel | null {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return null;
  if (v in BUSINESS_MODEL_LABELS) return v as BusinessModel;
  return null;
}

function inferBusinessModel(text: string): BusinessModel {
  const t = (text || "").toLowerCase();
  if (/(distribuidor|distribuidora|distribui[cç][aã]o|atacad|atacarejo|abastec)/.test(t)) return "distribuidor";
  if (/(ind[uú]stria|industrial|f[aá]brica|fabricante|fabrica[cç][aã]o|manufatur|confec[cç])/.test(t)) return "industria";
  if (/(representa[cç][aã]o comercial|representante comercial)/.test(t)) return "representante";
  if (/(software|sistema|saas|aplicativo|erp|crm|plataforma|tecnologia da informa)/.test(t)) return "software";
  if (/(marketing|ag[eê]ncia|tr[aá]fego pago|social media|seo|gest[aã]o de redes|crea[cç][aã]o de sites?)/.test(t)) return "agencia";
  if (/(revenda|loja|varejo|com[eé]rcio|e-?commerce|papelaria|mercado)/.test(t)) return "revenda";
  if (/(servi[cç]o|consultoria|assessoria|contabil|advoc|limpeza|facilities|manuten[cç][aã]o|instala[cç][aã]o|terceiriza|treinamento|mentoria)/.test(t)) return "servico";
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

function buildBusinessModelBlock(profile: any, model: BusinessModel, lead: any, catalog: string): string {
  const blockedMarketing = model !== "agencia";
  return `
═══ MODELO DE NEGÓCIO DE QUEM ESTÁ PROSPECTANDO (LEIA ANTES DE ESCREVER) ═══
- Como a empresa atua: ${BUSINESS_MODEL_LABELS[model]}
- Papel na cadeia: ${BUSINESS_MODEL_ROLES[model]}
- O que ela entrega de fato: ${profile?.company_products || "conforme perfil"}
${catalog ? `- Catálogo declarado:\n${catalog}` : ""}
- Relação com este lead (${lead?.company_name || "lead"}${lead?.category ? `, ${lead.category}` : ""}): o lead é ${model === "agencia" || model === "servico" || model === "software" ? "uma empresa que pode CONTRATAR o que ela vende" : "um CLIENTE COMPRADOR dos produtos dela"}.

ESTRATÉGIA OBRIGATÓRIA PARA ESTE MODELO:
${BUSINESS_MODEL_STRATEGY[model]}

${blockedMarketing ? `⛔ TRAVA ABSOLUTA: é PROIBIDO oferecer, sugerir ou insinuar marketing, divulgação, presença digital, redes sociais, tráfego pago, anúncios, site, SEO, engajamento, conversão online, "fortalecer a marca" ou "atrair mais clientes pela internet". Quem escreve NÃO vende nada disso. Se o insight que você pensou for sobre esses temas, DESCARTE e escolha outro ligado ao que a empresa realmente vende.` : ""}
⛔ PROIBIDO tratar o lead como se ele fosse cliente de um serviço que a empresa não presta. A mensagem deve soar como alguém que ${model === "distribuidor" ? "abastece o negócio dele com produtos" : model === "industria" ? "fabrica e fornece o produto dele" : model === "representante" ? "representa marcas e abastece o negócio dele" : "entrega exatamente o que está no perfil"}.
`;
}

const MARKETING_TERMS = /(marketing|tr[aá]fego|an[uú]ncios?|seo|engajamento|convers[aã]o|divulga[cç][aã]o|divulgar|criar um site|criação de site|posicionamento digital|branding)/i;

function messageViolatesModel(message: string, model: BusinessModel): boolean {
  if (model === "agencia") return false;
  return MARKETING_TERMS.test(message || "");
}

function messageRevealsOffer(message: string, profile: any, catalog: string): boolean {
  const commercialDetail = /\b(?:r\$|\d+\s*(?:mega|gb)\b|plano|planos|pre[cç]o|mensalidade|desconto|condi[cç][aã]o|proposta|or[cç]amento|contrata[cç][aã]o)\b/i;
  const explicitPitch = /\b(?:quero te oferecer|gostaria de oferecer|temos para voc[eê]|posso montar uma proposta|fechar agora|contratar agora)\b/i;
  const prematureBenefit = /\b(?:pode se beneficiar|internet de alta qualidade|melhorar(?:ia|ando)? a experi[eê]ncia|trazer (?:mais )?(?:resultado|efici[eê]ncia)|garantir uma conex[aã]o)\b/i;
  return commercialDetail.test(message || "") || explicitPitch.test(message || "") || prematureBenefit.test(message || "");
}

function normalizeForMatch(value: unknown): string {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Persona: o modelo escreve COMO o responsável da empresa, nunca como assistente de IA. */
function buildPersonaSystem(profile: any, model: BusinessModel, catalog: string, lead: any): string {
  const nome = String(profile?.attendant_name || "").trim() || "o responsável comercial";
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
- Sempre em 1ª pessoa ("eu", "a gente", "nós aqui da ${empresa}"). Nunca descreva sua empresa em 3ª pessoa como se fosse um anúncio.
- Você leu a análise/diagnóstico deste lead antes de escrever: cite algo concreto dele (nome da empresa, cidade, segmento, ponto observado). Mensagem genérica é falha.
- Tom humano de WhatsApp: curto, direto, sem jargão de marketing, sem emoji exagerado, sem promessa inventada.
- Nunca invente números, prêmios, anos de mercado, clientes ou resultados que não estejam no seu perfil.
- Ofereça SOMENTE o que está em "O que você vende de fato"/catálogo.`;
}

function buildOperationalContext(profile: any, lead: any): string {
  const seller = normalizeForMatch(`${profile?.company_niche || ""} ${profile?.company_products || ""} ${profile?.company_differential || ""} ${profile?.company_objective || ""}`);
  const niche = normalizeForMatch(`${lead?.category || ""} ${lead?.company_name || ""}`);
  if (/(internet|conectividade|telecom|banda larga|fibra)/.test(seller)) {
    if (/(academia|fitness|bodybuild|crossfit|pilates)/.test(niche)) {
      return `ACADEMIA + CONECTIVIDADE: considere a operação completa, não apenas agenda e pagamentos. Usos plausíveis incluem sistemas internos, recepção e equipe, catracas e controle de acesso, equipamentos/dispositivos conectados, música e telas, monitoramento por câmeras e Wi-Fi usado pelos alunos. Escolha somente 2 ou 3 aspectos relevantes para compor uma frase natural. Trate-os como necessidades típicas do segmento, nunca como instalações confirmadas neste lead.`;
    }
    if (/(restaurante|bar|caf[eé]|lanchonete|delivery)/.test(niche)) {
      return `ALIMENTAÇÃO + CONECTIVIDADE: considere pedidos e delivery, caixa e pagamentos, comunicação da equipe, música/TV, monitoramento e Wi-Fi para clientes nos horários de pico. Selecione 2 ou 3 aspectos, sem afirmar que o lead usa sistemas específicos.`;
    }
    if (/(cl[ií]nica|consult[oó]rio|hospital|odont)/.test(niche)) {
      return `SAÚDE + CONECTIVIDADE: considere recepção, prontuários e sistemas internos, agenda, comunicação da equipe, equipamentos conectados, teleatendimento e Wi-Fi para pacientes. Selecione 2 ou 3 aspectos, sem afirmar infraestrutura não comprovada.`;
    }
    if (/(loja|varejo|mercado|farm[aá]cia|com[eé]rcio)/.test(niche)) {
      return `VAREJO + CONECTIVIDADE: considere caixa e pagamentos, estoque, emissão fiscal, comunicação, monitoramento, dispositivos da equipe e Wi-Fi para clientes. Selecione 2 ou 3 aspectos, sem afirmar infraestrutura não comprovada.`;
    }
    return `CONECTIVIDADE + SEGMENTO: raciocine sobre a operação completa do lead: sistemas internos, equipe, atendimento, dispositivos, comunicação, monitoramento e experiência dos clientes. Escolha 2 ou 3 usos realmente coerentes com o nicho, sem transformar possibilidades típicas em fatos confirmados.`;
  }
  return `CRUZAMENTO OPERACIONAL: use todo o perfil da empresa prospectora para identificar o que ela realmente resolve e cruze isso com a rotina completa do segmento do lead. Considere pessoas, processos, sistemas, equipamentos, atendimento e clientes finais. Escolha somente 2 ou 3 aspectos relevantes, sem listas artificiais e sem afirmar fatos não comprovados.`;
}

/** Mensagem sem nenhuma referência concreta ao lead = genérica. */
function messageLacksPersonalization(message: string, lead: any): boolean {
  const m = (message || "").toLowerCase();
  if (!m.trim()) return true;
  const tokens: string[] = [];
  const push = (v: unknown) => {
    const s = String(v ?? "").trim().toLowerCase();
    if (s.length >= 4) tokens.push(s);
  };
  push(lead?.company_name);
  push(lead?.city);
  push(lead?.category);
  push(lead?.neighborhood);
  if (!tokens.length) return false;
  return !tokens.some((t) => m.includes(t));
}

function messageLacksSenderPresentation(message: string, profile: any): boolean {
  const normalizedMessage = normalizeForMatch(message);
  const attendantName = normalizeForMatch(profile?.attendant_name).trim();
  const companyName = normalizeForMatch(profile?.company_name).trim();
  return Boolean(
    (attendantName && !normalizedMessage.includes(attendantName))
    || (companyName && !normalizedMessage.includes(companyName))
  );
}

function messageLacksOpeningPresentation(message: string): boolean {
  const firstBlock = String(message || "").trim().split(/\n{2,}/)[0] || "";
  return !/^\s*(?:sou|me chamo)\b/i.test(firstBlock);
}

function messageAssumesConversation(message: string): boolean {
  return /\b(?:agrade[cç]o|obrigad[oa]\s+(?:pela|por)|fico feliz em saber|estamos alinhados|que bom que (?:respondeu|tem interesse)|como combinamos|conforme conversamos)\b/i.test(message || "");
}

function messageHasVagueCommercialCTA(message: string): boolean {
  return /\b(?:fiquei curioso para saber|gostaria de entender como isso poderia impactar|o que voc[eê] acha de avaliarmos|faz sentido(?:\s+para voc[eê])?|quer saber mais\??|gostaria de saber mais\??)\b/i.test(message || "");
}

function messageUsesDisconnectedCTA(message: string, profile: any): boolean {
  const normalizedMessage = normalizeForMatch(message);
  const sellerContext = normalizeForMatch(`${profile?.company_niche || ""} ${profile?.company_products || ""}`);
  if (!/(internet|conectividade|telecom|banda larga|fibra)/.test(sellerContext)) return false;
  const lastQuestion = normalizedMessage.split(/(?<=[.!])\s+|\n+/).filter(Boolean).findLast((part) => part.includes("?")) || "";
  return /(agendamento|pagamento|captacao|marketing|redes sociais|site|sistema de gestao)/.test(lastQuestion)
    && !/(internet|conexao|conectividade|rede|estabilidade|velocidade)/.test(lastQuestion);
}

function messageUsesCompoundCTA(message: string): boolean {
  const normalizedMessage = normalizeForMatch(message);
  const lastQuestion = normalizedMessage.split(/\n+/).filter(Boolean).findLast((part) => part.includes("?")) || "";
  return /\b(?:ou|e)\s+(?:ja\s+)?(?:pensou|considerou|gostaria|quer|pretende|esta)\b/.test(lastQuestion);
}

function messageHasMultipleQuestions(message: string): boolean {
  return ((message || "").match(/\?/g) || []).length !== 1;
}

function ensureSingleFinalQuestion(message: string): string {
  const text = String(message || "").trim();
  const lastQuestionMark = text.lastIndexOf("?");
  if (lastQuestionMark < 0) return text;
  return `${text.slice(0, lastQuestionMark).replace(/\?/g, ".")}${text.slice(lastQuestionMark)}`;
}

function messageLacksPraiseHook(message: string): boolean {
  return !/\b(?:chamou minha aten[cç][aã]o|me chamou a aten[cç][aã]o|se destaca|destaque|boa|forte|excelente|[oó]tima|bem avaliad[oa]|recomenda[cç][oõ]es|reputa[cç][aã]o|presen[cç]a|avalia[cç][aã]o|avalia[cç][oõ]es|nota)\b/i.test(message || "");
}

function messageStatesUnverifiedOperation(message: string): boolean {
  return /\b(?:catracas?|controle de acesso|equipamentos? conectados?|wi-?fi|c[aâ]meras?|monitoramento|m[uú]sica|telas?)\s+(?:que\s+)?(?:voc[eê]s\s+)?(?:oferecem|utilizam|usam|possuem|t[eê]m|mant[eê]m)\b/i.test(message || "");
}

function messageConfusesBusinessRoles(message: string, lead: any, profile: any): boolean {
  const normalized = normalizeForMatch(message);
  const leadCategory = normalizeForMatch(lead?.category).split(/\W+/).filter((word) => word.length >= 5);
  const sellerOffer = normalizeForMatch(profile?.company_products);
  return leadCategory.some((word) =>
    !sellerOffer.includes(word) && new RegExp(`(?:nos|nossa empresa|a gente)\\s+(?:vende|oferece|fornece|fabrica|distribui)[^.!?]{0,70}\\b${word}\\b`).test(normalized)
  );
}



serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Modo interno (Wiize API V1): service role + id da conta API no header
    const internalUserId = req.headers.get("x-wiize-api-user");
    const internalMode = !!internalUserId && token === SUPABASE_SERVICE_ROLE_KEY;

    let user: { id: string } | null = null;
    if (internalMode) {
      user = { id: internalUserId! };
    } else {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authUser) {
        return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      user = authUser;
    }

    const body = await req.json();
    const { lead_id } = body;

    // No modo interno o lead chega inline no corpo (a conta API não tem CRM na Wiize)
    let lead: any = null;
    if (internalMode && body?.lead && typeof body.lead === "object") {
      lead = body.lead;
    } else {
      if (!lead_id) {
        return new Response(JSON.stringify({ error: "lead_id é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch the lead
      const { data: leadRow, error: leadErr } = await supabase
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .eq("user_id", user.id)
        .single();

      if (leadErr || !leadRow) {
        return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      lead = leadRow;
    }


    // Prospecção Web entrega somente análise e diagnóstico, nunca abordagem.
    if (lead?.source === "web") {
      return new Response(
        JSON.stringify({
          error: "web_source_no_message",
          message: "Oportunidades da Prospecção Web não geram mensagem de abordagem.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Regra crítica: sem telefone/WhatsApp válido não há mensagem de abordagem.
    if (!hasContactNumber(lead)) {
      return new Response(
        JSON.stringify({
          error: "no_contact_number",
          message: "Número não encontrado para esta empresa.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!internalMode && String(lead?.ai_approach_message || "").trim()) {
      return new Response(JSON.stringify({
        mensagem: lead.ai_approach_message,
        ...(typeof lead.enrichment_data?.approach_analysis === "object" ? lead.enrichment_data.approach_analysis : {}),
        reused: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }



    // Fetch the company profile for personalization
    const { data: companyProfile } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const socialMedia = Array.isArray(lead.social_media) ? lead.social_media : [];
    const hasSite = !!lead.website && lead.website !== "-";

    // Extract diagnostic data if available
    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object" ? lead.enrichment_data as Record<string, any> : {};
    const hasDiagnostic = !!lead.ai_diagnosis || !!lead.ai_score;
    const pontosFortes = Array.isArray(enrichment.pontos_fortes) ? enrichment.pontos_fortes : [];
    const pontosFracos = Array.isArray(enrichment.pontos_fracos) ? enrichment.pontos_fracos : [];
    const analiseSite = enrichment.analise_site || "";
    const analiseRedes = enrichment.analise_redes_sociais || "";
    const analiseConcorrencia = enrichment.analise_concorrencia_regional || "";
    const analiseDemanda = enrichment.analise_demanda_regional || "";
    const nicheAnalysisType = enrichment.niche_analysis_type || "";

    // Modelo de negócio real de quem prospecta
    const { data: companyServices } = await supabase
      .from("company_services")
      .select("name, description")
      .eq("owner_user_id", companyProfile?.owner_user_id || user.id)
      .limit(20);

    const businessModel = resolveBusinessModel(companyProfile);
    const productCatalog = formatProductCatalog(companyServices);

    if (!companyProfile || (!String(companyProfile.company_products || "").trim() && !productCatalog)) {
      return new Response(JSON.stringify({
        error: "missing_company_profile",
        message: "Complete os produtos ou serviços da sua empresa antes de gerar a abordagem.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build company context
    const companyContext = companyProfile ? `
⚠️ INSTRUÇÃO PRIMÁRIA — PERFIL DA EMPRESA PROSPECTORA:
- Empresa: ${companyProfile.company_name}
- Atendente: ${companyProfile.attendant_name}
- Como atua (modelo de negócio): ${BUSINESS_MODEL_LABELS[businessModel]}
- Nicho de atuação: ${companyProfile.company_niche}
- Produtos/Serviços que VENDE: ${companyProfile.company_products}
${productCatalog ? `- Catálogo declarado:\n${productCatalog}` : ""}
- Diferencial competitivo: ${companyProfile.company_differential}
- Objetivo comercial: ${companyProfile.company_objective}
- Público-alvo: ${companyProfile.company_target_audience}

REGRA ABSOLUTA: A mensagem DEVE girar em torno de "${companyProfile.company_products}". NÃO fale de serviços que a empresa NÃO oferece. Se a empresa distribui bebidas, fale APENAS de abastecimento de bebidas. Se vende internet, fale APENAS de internet. Se vende marketing, fale de marketing. NUNCA desvie do que está descrito acima.
` : "";


    // Build diagnostic context if available
    const diagnosticContext = hasDiagnostic ? `
═══ DIAGNÓSTICO JÁ REALIZADO DESTE LEAD (use como base) ═══
- Score: ${lead.ai_score || "N/A"}/100
- Nível: ${lead.opportunity_level || "N/A"}
- Probabilidade de fechamento: ${lead.closing_probability || "N/A"}
- Diagnóstico: ${lead.ai_diagnosis || "N/A"}
- Ação recomendada: ${lead.ai_recommended_action || "N/A"}
${pontosFortes.length > 0 ? `- Pontos fortes identificados: ${pontosFortes.join("; ")}` : ""}
${pontosFracos.length > 0 ? `- Pontos fracos identificados: ${pontosFracos.join("; ")}` : "- Pontos fracos: não identificados (nicho muito específico — foque na região e tipo de negócio)"}
${analiseSite ? `- Site analisado: ${analiseSite}` : ""}
${analiseRedes ? `- Redes sociais analisadas: ${analiseRedes}` : ""}
${analiseConcorrencia ? `- Concorrência regional: ${analiseConcorrencia}` : ""}
${analiseDemanda ? `- Demanda regional: ${analiseDemanda}` : ""}
${nicheAnalysisType ? `- Tipo de análise aplicada: ${nicheAnalysisType}` : ""}
${enrichment.custom_diagnosis ? `\n═══ OBSERVAÇÕES DO PROSPECTOR (diagnóstico adicional do usuário) ═══\n${enrichment.custom_diagnosis}` : ""}

IMPORTANTE: Antes da apresentação, use um ELOGIO factual como gatilho de atenção. Escolha e varie conforme os dados realmente disponíveis: reputação na região, presença digital forte, ótimas recomendações, avaliação do Google, especialidade ou outro destaque comprovado. Não invente reconhecimento regional, força digital ou recomendações. Depois, conecte esse elogio ao contexto operacional e comercial pertinente.
` : "";

    // Generate a random seed to force unique messages even for similar diagnostics
    const uniqueSeed = crypto.randomUUID().slice(0, 8);

    // Estratégia de abordagem definida pelo MODELO DE NEGÓCIO real (não por palavra-chave solta)
    const businessModelBlock = buildBusinessModelBlock(companyProfile, businessModel, lead, productCatalog);
    const nicheStrategy = BUSINESS_MODEL_STRATEGY[businessModel];
    const personaSystem = buildPersonaSystem(companyProfile, businessModel, productCatalog, lead);
    const operationalContext = buildOperationalContext(companyProfile, lead);

    const prompt = `Você é um VENDEDOR CONSULTIVO B2B escrevendo a PRIMEIRA MENSAGEM HUMANA depois de um template oficial da Meta.

CONTEXTO CRÍTICO — LEIA COM ATENÇÃO:
O primeiro contato foi um TEMPLATE oficial da Meta. A resposta do lead pode ter sido SOMENTE "bom dia", "boa tarde", "boa noite", "oi" ou outra saudação. Portanto, NÃO existe evidência de interesse, concordância, alinhamento ou autorização para receber detalhes.
Sua tarefa é gerar a primeira abordagem humana, comercial e personalizada após essa resposta. Ela deve funcionar mesmo quando nenhuma conversa real aconteceu além da saudação.

OBJETIVO ÚNICO: iniciar a conversa comercial de verdade, despertar interesse no que a empresa remetente resolve e gerar uma resposta natural.
É OBRIGATÓRIO dizer a área em que a empresa atua, de forma ampla, para o contato fazer sentido. NÃO apresente catálogo, plano, velocidade, preço, condição, proposta ou peça reunião.

Por isso:
- ❌ NÃO reinicie a conversa como se o template nunca tivesse sido enviado
- ❌ NÃO agradeça a resposta, NÃO diga que ficou feliz e NÃO presuma alinhamento, interesse ou concordância
- ❌ NÃO use "como combinamos", "conforme conversamos", "estamos alinhados" ou qualquer referência a uma conversa inexistente
- ✅ APRESENTE claramente nome, empresa e área de atuação
- ✅ Mostre que analisou o negócio do lead e conecte uma característica real da operação ao que a empresa remetente resolve
- ✅ Termine com UMA pergunta objetiva sobre a situação atual do lead ou sobre um ponto específico, sem suspense vazio

${companyContext}
${businessModelBlock}
${diagnosticContext}

═══ LEITURA OPERACIONAL OBRIGATÓRIA ═══
${operationalContext}

Use o PERFIL COMPLETO da empresa prospectora para decidir o ângulo: produtos/serviços, nicho, diferencial, objetivo, público-alvo e catálogo. Quanto mais específico for o perfil, mais específica deve ser a conexão. Não reduza a operação do lead a um único uso óbvio e não escreva uma lista; selecione os 2 ou 3 aspectos mais relevantes e una-os em uma percepção natural.

═══ CLIENTE POTENCIAL — DADOS DO LEAD ═══
Tudo deste bloco descreve QUEM RECEBE a mensagem. Não atribua o nicho, os produtos ou a identidade do lead à empresa que envia.
- Empresa: ${lead.company_name || "Não informado"}
- Categoria/Nicho do lead: ${lead.category || "Não informado"}
- Cidade: ${lead.city || "Não informado"}
- Endereço: ${lead.address || "Não informado"}
- Avaliação Google: ${lead.rating || 0}/5 (${lead.review_count || 0} avaliações)
- Possui site: ${hasSite ? "Sim" : "Não"}
- Redes sociais: ${socialMedia.length > 0 ? socialMedia.join(", ") : "Nenhuma"}

═══ ESTRATÉGIA DE ABORDAGEM PELO MODELO DE NEGÓCIO ═══
${nicheStrategy}

═══ VARIAÇÃO NATURAL (SEED: ${uniqueSeed}) ═══
A mensagem deve parecer escrita à mão por um vendedor humano, de forma única para ESTE lead específico.
- Use o NOME DA EMPRESA, a CIDADE, o NICHO e os dados do diagnóstico como diferenciadores naturais
- Varie o elogio factual escolhido e o próximo passo proposto
- Mantenha humano, consultivo, nada robótico ou genérico

═══ ESTRUTURA OBRIGATÓRIA (abordagem humana após o template) ═══
Escreva entre 90 e 160 palavras, com blocos curtos separados por \\n\\n, nesta ordem e sem títulos no texto final:
1. APRESENTAÇÃO COMERCIAL: sem nova saudação, apresente obrigatoriamente "${companyProfile?.attendant_name || "[nome]"}", "${companyProfile?.company_name || "[empresa]"}" e a área ampla em que atua.
2. ELOGIO/GATILHO DE ATENÇÃO: elogie algo REAL e comprovado do lead. Varie entre reputação na região, presença digital forte, ótimas recomendações, avaliação do Google, especialidade ou outro destaque existente nos dados. Não invente fatos e não use sempre avaliação.
3. MOTIVO DO CONTATO: explique naturalmente por que chamou aquela empresa, sem dizer "entender como podemos ajudar", sem agradecer e sem interpretar o conteúdo da resposta anterior.
4. CONTEXTO OPERACIONAL: conecte o motivo ao que a empresa remetente vende e à rotina completa do segmento. Selecione 2 ou 3 necessidades coerentes, em uma frase natural, sem afirmar problema ou infraestrutura sem evidência.
5. CTA OBJETIVO: termine perguntando sobre a situação atual do lead ou sobre o ponto ESPECÍFICO levantado. A pergunta precisa dizer claramente qual é o assunto. NÃO peça call, reunião, agenda, proposta ou orçamento.
   A pergunta deve tratar obrigatoriamente da área que a empresa remetente vende. Se vende internet, pergunte sobre conexão, estabilidade, rede ou estrutura atual; NUNCA pergunte apenas sobre agenda, pagamentos, marketing ou outro sistema que ela não vende.
   Faça UMA pergunta simples, sem juntar duas alternativas com "ou". Exemplo de estrutura: "Hoje a conexão de vocês atende bem a operação nos horários de maior movimento?"
   A mensagem inteira deve ter EXATAMENTE UMA interrogação, somente nesta última frase. Nada pode vir depois dela.

FLUXO INEGOCIÁVEL:
Apresentação, sem nova saudação → Elogio factual → Motivo do contato → Contexto operacional específico → Pergunta objetiva.
A única diferença para a mensagem manual é que esta acontece depois do template; não presuma o conteúdo da resposta.

═══ REGRAS CRÍTICAS ═══
- ⛔ PROIBIDO cumprimentos temporais: "Bom dia", "Boa tarde", "Boa noite"
- ⛔ PROIBIDO reiniciar com "Oi", "Olá" ou qualquer nova saudação; o lead já respondeu ao template
- ⛔ PROIBIDO "Tudo bem?", "Como vai?", "Como está?" — o lead já respondeu, vá direto
- ⛔ PROIBIDO agradecer a resposta ou afirmar interesse/alinhamento sem conhecer o texto respondido
- ⛔ PROIBIDO omitir a apresentação: nome + empresa + autoridade contextual são obrigatórios
- ⛔ PROIBIDO apresentar catálogo, plano, velocidade, preço, condição, proposta ou orçamento; é permitido nomear a área de atuação da empresa
- ⛔ PROIBIDO antecipar benefícios ou vender a solução com frases como "pode se beneficiar", "internet de alta qualidade" ou "melhorar a experiência"
- ⛔ PROIBIDO pedir call, reunião, demonstração, agenda ou horário
- ⛔ PROIBIDO CTA vago: "fiquei curioso", "quer saber mais?", "faz sentido?", "como isso impactaria?", "o que acha de avaliarmos?"
- ⛔ PROIBIDO "como podemos ajudar" ou "ajudar a melhorar" na abertura; isso antecipa uma oferta. Apenas explique o motivo do contato
- ${companyProfile ? `Represente "${companyProfile.attendant_name}" da "${companyProfile.company_name}"` : "Mensagem genérica"}
- ${companyProfile ? `Use internamente "${companyProfile.company_products}" apenas para escolher um insight conectado, mas NÃO cite nem ofereça isso na mensagem` : ""}
- ${companyProfile ? `Use "${companyProfile.company_differential}" somente como contexto interno; NÃO transforme em argumento de venda` : ""}
- Blocos CURTOS separados por \\n\\n, com 90 a 160 palavras e máximo absoluto de 180 palavras
- O elogio abre a conversa e pode tratar de reputação, presença, recomendações ou avaliação; a conexão comercial seguinte deve ser pertinente ao nicho e ao que a empresa remetente vende
- ${pontosFracos.length === 0 && hasDiagnostic ? "O diagnóstico não identificou pontos fracos específicos — use um destaque factual do lead e conecte-o ao tipo de operação" : ""}
- ${companyProfile ? `Assine como "${companyProfile.attendant_name}" da "${companyProfile.company_name}"` : ""}

Retorne APENAS JSON válido:
{
  "mensagem": "mensagem pronta para enviar como FOLLOW-UP após resposta positiva ao template",
  "analise_nicho": "como o nicho do lead se conecta ao serviço vendido (1-2 frases)",
  "analise_cidade": "mercado e concorrência na região (1-2 frases)",
  "pontos_fracos": ["ponto fraco 1 no contexto do serviço vendido"],
  "estrategia": "estratégia usada (1 frase)",
  "produto_sugerido": "produto/serviço sugerido para este lead (1 frase)"
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
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiRes.json();
    logAiUsage({ feature: 'approach-lead', model: 'gpt-4o-mini', usage: aiData.usage });
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta vazia da IA");

    const parsed = JSON.parse(content);
    // Revisão final: se a mensagem ofereceu algo fora do modelo ou trocou os papéis, reescreve UMA vez.
    const rewriteReason = messageViolatesModel(parsed.mensagem || "", businessModel)
      ? "offering_mismatch"
      : messageConfusesBusinessRoles(parsed.mensagem || "", lead, companyProfile)
        ? "role_confusion"
        : messageRevealsOffer(parsed.mensagem || "", companyProfile, productCatalog)
          ? "revealed_offer"
        : messageLacksPersonalization(parsed.mensagem || "", lead)
          ? "missing_personalization"
        : messageLacksSenderPresentation(parsed.mensagem || "", companyProfile)
          ? "missing_sender_presentation"
          : messageLacksOpeningPresentation(parsed.mensagem || "")
            ? "missing_opening_presentation"
          : messageAssumesConversation(parsed.mensagem || "")
            ? "false_conversation_assumption"
            : messageHasVagueCommercialCTA(parsed.mensagem || "")
              ? "vague_commercial_cta"
              : messageUsesDisconnectedCTA(parsed.mensagem || "", companyProfile)
                ? "disconnected_cta"
                : messageUsesCompoundCTA(parsed.mensagem || "")
                  ? "compound_cta"
                  : messageHasMultipleQuestions(parsed.mensagem || "")
                    ? "multiple_questions"
                    : messageLacksPraiseHook(parsed.mensagem || "")
                      ? "missing_praise_hook"
                      : messageStatesUnverifiedOperation(parsed.mensagem || "")
                        ? "unverified_operation"
                        : null;
    if (rewriteReason) {
      try {
        const fixRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "system", content: personaSystem }, {
              role: "user",
               content: `A mensagem abaixo confundiu o que a empresa remetente vende com o negócio do cliente potencial, ou ofereceu algo fora do perfil.

QUEM ENVIA: ${BUSINESS_MODEL_LABELS[businessModel]} — ${BUSINESS_MODEL_ROLES[businessModel]}
O QUE VENDE DE FATO: ${companyProfile?.company_products || "conforme perfil"}
ESTRATÉGIA CORRETA: ${BUSINESS_MODEL_STRATEGY[businessModel]}
CLIENTE POTENCIAL: ${lead.company_name || "lead"}, do segmento ${lead.category || "não informado"}. Estes dados servem somente para personalizar; eles NÃO são o que o remetente vende.

 Reescreva como a PRIMEIRA ABORDAGEM HUMANA depois de um template Meta. A resposta anterior pode ter sido apenas "bom dia". NÃO use "Oi", "Olá", "tudo bem?" nem outra saudação; NÃO agradeça, NÃO diga que estão alinhados, NÃO presuma interesse e NÃO mencione conversa anterior. Use 90 a 160 palavras em blocos curtos e preserve esta ordem exata: (1) apresentação iniciada naturalmente por "Sou [nome], da [empresa]" e área ampla de atuação; (2) elogio factual; (3) motivo do contato; (4) contexto operacional específico; (5) pergunta objetiva. ${operationalContext} Use todo o perfil da empresa prospectora e selecione 2 ou 3 aspectos relevantes da operação, sem lista e sem afirmar fatos não comprovados. Todo uso não confirmado deve ser escrito como necessidade típica ou possibilidade do segmento, nunca como algo que "vocês usam", "vocês oferecem" ou "vocês possuem". Não invente elogios e não use sempre avaliação do Google. Escreva em 1ª pessoa, como ${companyProfile?.attendant_name || "o responsável"} da ${companyProfile?.company_name || "empresa"}. Cite algo concreto do lead (nome da empresa${lead.city ? `, cidade ${lead.city}` : ""}${lead.category ? `, segmento ${lead.category}` : ""}). É permitido dizer a área de atuação; NÃO apresente catálogo, plano, velocidade, preço, condição, benefício, proposta ou orçamento. Não diga que o lead "pode se beneficiar", não prometa melhoria e não venda "internet de alta qualidade". NÃO peça call, reunião, agenda ou horário. O CTA deve tratar do que o remetente realmente vende; se vende internet, faça UMA pergunta simples sobre conexão, estabilidade, rede ou estrutura atual e sua capacidade de atender a operação, nunca apenas sobre agenda, pagamentos, marketing ou sistemas e nunca junte duas perguntas com "ou". Nunca use "fiquei curioso", "quer saber mais?", "faz sentido?", "como isso impactaria?" ou "o que acha de avaliarmos?". Use EXATAMENTE UMA interrogação, na última frase, e não escreva nada depois dela. ${businessModel !== "agencia" ? "Não ofereça marketing, divulgação, redes sociais, site, tráfego, anúncios, engajamento ou conversão online. Uma presença pública forte pode ser citada apenas como elogio factual quando estiver comprovada nos dados." : ""}

MENSAGEM ORIGINAL:
${parsed.mensagem}

Retorne APENAS JSON: {"mensagem": "..."}`,
            }],
            temperature: 0.5,
            max_tokens: 800,
            response_format: { type: "json_object" },
          }),
        });
        if (fixRes.ok) {
          const fixData = await fixRes.json();
          logAiUsage({ feature: 'approach-lead-model-fix', model: 'gpt-4o-mini', usage: fixData.usage });
          const fixed = JSON.parse(fixData.choices?.[0]?.message?.content || "{}");
          if (fixed?.mensagem) parsed.mensagem = fixed.mensagem;
        }
      } catch (e) {
        console.error("model-fix falhou", String(e));
      }
    }

    parsed.mensagem = ensureSingleFinalQuestion(parsed.mensagem || "");

    if (lead_id && !internalMode) {
      // Store the message on the lead
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          ai_approach_message: parsed.mensagem || "",
          enrichment_data: {
            ...(typeof lead.enrichment_data === 'object' && lead.enrichment_data ? lead.enrichment_data : {}),
            approach_analysis: {
              analise_nicho: parsed.analise_nicho || "",
              analise_cidade: parsed.analise_cidade || "",
              pontos_fracos: parsed.pontos_fracos || [],
              estrategia: parsed.estrategia || "",
              produto_sugerido: parsed.produto_sugerido || "",
              business_model_used: businessModel,
              rewrite_reason: rewriteReason,
              generated_at: new Date().toISOString(),
            },
          },
        })
        .eq("id", lead_id)
        .eq("user_id", user.id);

      if (updateErr) console.error("Update error:", updateErr);
    }

    return new Response(
      JSON.stringify({
        mensagem: parsed.mensagem || "",
        analise_nicho: parsed.analise_nicho || "",
        analise_cidade: parsed.analise_cidade || "",
        pontos_fracos: parsed.pontos_fracos || [],
        estrategia: parsed.estrategia || "",
        produto_sugerido: parsed.produto_sugerido || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Approach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
