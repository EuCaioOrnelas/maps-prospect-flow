// FOLLOW-UP (continuação de conversa após o template oficial da Meta / primeiro contato).
// Motor de geração de mensagens implementado inteiro neste arquivo (sem dependências compartilhadas).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================================
// MOTOR DE GERAÇÃO DE MENSAGENS COMERCIAIS COM IA — WIIZE
// ============================================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------- Registro de custo de IA ----------------
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-6-astra": { in: 0, out: 0 },
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
    const price = AI_PRICES[model] ?? { in: 0, out: 0 };
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

// ---------------- Telefone ----------------
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

function hasContactNumber(lead: any): boolean {
  if (isValidBRPhone(lead?.phone)) return true;
  const list = lead?.phone_numbers;
  if (Array.isArray(list)) {
    return list.some((p: any) => isValidBRPhone(typeof p === "string" ? p : p?.number ?? p?.phone));
  }
  return false;
}

// ---------------- Modelo de negócio de quem prospecta ----------------
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
    "DISTRIBUI E REVENDE PRODUTOS EM VOLUME para outros negócios. O lead é um CLIENTE COMPRADOR que compra mercadoria para revender ou usar na operação.",
  industria: "FABRICA/PRODUZ os próprios produtos e vende direto para empresas. O lead é um COMPRADOR.",
  revenda: "REVENDE produtos com pronta entrega. O lead é um COMPRADOR.",
  servico: "PRESTA UM SERVIÇO operacional. O lead é uma empresa que pode CONTRATAR esse serviço.",
  software: "VENDE UM SISTEMA/SOFTWARE. O lead é uma empresa que pode USAR o sistema na operação.",
  agencia: "PRESTA SERVIÇOS DE MARKETING/PRESENÇA DIGITAL. O lead pode contratar esses serviços.",
  representante: "REPRESENTA MARCAS/FABRICANTES e intermedeia a venda dos produtos representados. O lead é um COMPRADOR.",
  outro: "VENDE exatamente o que está descrito em 'Produtos/Serviços'. Nada além disso.",
};

const BUSINESS_MODEL_STRATEGY: Record<BusinessModel, string> = {
  distribuidor:
    "DISTRIBUIDOR/ATACADISTA: o ângulo é abastecimento — mix, giro, prazo de entrega, regularidade de reposição, condição comercial e cobertura da região. Nunca falar de divulgação, marketing, site ou redes sociais.",
  industria:
    "INDÚSTRIA/FABRICANTE: o ângulo é fornecimento direto — volume, customização, padronização, prazo de produção, custo sem intermediário.",
  revenda: "REVENDA/VAREJO: o ângulo é disponibilidade — pronta entrega, variedade, condição de pagamento.",
  servico: "SERVIÇO: o ângulo é a rotina operacional que o serviço absorve — tempo, custo, terceirização, continuidade.",
  software: "SOFTWARE: o ângulo é o processo manual/desorganizado que o sistema resolve e o controle que ele dá.",
  agencia:
    "AGÊNCIA/MARKETING: aqui SIM o ângulo é aquisição, posicionamento, presença digital, geração de demanda e conversão.",
  representante:
    "REPRESENTANTE COMERCIAL: o ângulo é acesso às marcas representadas, condição de fábrica e atendimento local. Posicione-se como representante/parceiro comercial, nunca como fabricante.",
  outro: "Use apenas os produtos/serviços declarados no perfil. Ângulo = necessidade prática do lead ligada a esses itens.",
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
      const preco = item?.price ?? item?.preco;
      if (!nome) return "";
      const precoTxt = preco ? ` (R$ ${preco})` : "";
      return desc ? `- ${nome}${precoTxt}: ${desc}` : `- ${nome}${precoTxt}`;
    })
    .filter(Boolean);
  return items.length ? items.join("\n") : "";
}

function normalizeForMatch(value: unknown): string {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatOperationalEvidence(enrichment: Record<string, any>): string {
  const sources = [
    enrichment?.servicos_identificados,
    enrichment?.produtos_identificados,
    enrichment?.estrutura_identificada,
    enrichment?.caracteristicas_operacao,
    enrichment?.tecnologias_identificadas,
    enrichment?.sistemas_identificados,
    enrichment?.unidades,
    enrichment?.horarios,
    enrichment?.tipo_atendimento,
    enrichment?.operacao_digital,
    enrichment?.expansao,
    enrichment?.site_details,
    enrichment?.business_details,
  ];
  const values = sources.flatMap((value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return value ? [value] : [];
  }).map((value) => String(value).trim()).filter((value) => value && value !== "-");
  return [...new Set(values)].slice(0, 20).join("; ");
}

const PERSONALIZATION_STOP_WORDS = new Set([
  "empresa", "empresas", "servico", "servicos", "produto", "produtos", "cliente", "clientes", "atendimento",
  "negocio", "operacao", "trabalho", "trabalha", "oferece", "cidade", "regiao", "brasil", "site", "online",
]);

function actionableEvidenceTokens(enrichment: Record<string, any>): string[] {
  const source = [
    formatOperationalEvidence(enrichment),
    ...(Array.isArray(enrichment?.pontos_fortes) ? enrichment.pontos_fortes : []),
    enrichment?.custom_diagnosis,
  ].filter(Boolean).join(" ");
  return [...new Set(normalizeForMatch(source).split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 5 && !PERSONALIZATION_STOP_WORDS.has(token)))].slice(0, 40);
}

// ---------------- Entrada única do motor ----------------
type MessageType = "manual_first_contact" | "follow_up";

interface ApproachInput {
  messageType: MessageType;
  /** perfil comercial do usuário (company_profiles) */
  companyProfile: any;
  /** catálogo formatado de company_services */
  productCatalog: string;
  businessModel: BusinessModel;
  /** lead + pesquisa pública já coletada (enrichment_data) */
  lead: any;
  enrichment: Record<string, any>;
  /** histórico da conversa, quando existir */
  conversationHistory?: string;
  previousMessage?: string;
  leadResponse?: string;
  seed: string;
}

/** Classificação da resposta do lead — define o comportamento do follow-up. */
type LeadIntent = "sem_resposta" | "saudacao" | "interesse" | "objecao" | "duvida" | "resposta_curta" | "informacao";

const GREETING_TOKENS = new Set([
  "oi", "ola", "bom", "boa", "dia", "tarde", "noite", "tudo", "bem", "certo", "beleza", "blz",
  "e", "voce", "vc", "com", "como", "vai", "esta", "ta", "opa", "ai", "sim", "obrigado", "obrigada",
  "otimo", "otima", "tambem", "aqui", "gracas", "deus", "por", "pra", "para", "contigo", "ok",
  "novidade", "novidades", "sempre", "na", "no", "correria", "de", "boas", "firme", "show",
]);

/** Só saudação = nenhuma palavra fora do vocabulário de cumprimento. */
function isOnlyGreeting(t: string): boolean {
  const words = t.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 12) return false;
  return words.every((w) => GREETING_TOKENS.has(w));
}

/** Dúvida só libera produto/preço quando o lead tocou no assunto comercial. */
function leadAskedAboutOffer(raw: unknown): boolean {
  const t = normalizeForMatch(raw);
  return /(pre[cç]o|valor|quanto|plano|planos|mensalidade|contrato|velocidade|mega|giga|como funciona|instala|proposta|or[cç]amento)/.test(t);
}

function classifyLeadResponse(raw: unknown): LeadIntent {
  const t = normalizeForMatch(raw).trim();
  if (!t) return "sem_resposta";
  if (isOnlyGreeting(t)) return "saudacao";
  if (/(ja tenho|ja temos|ja uso|ja usamos|nao tenho interesse|nao preciso|nao quero|ja sou atendid|ja trabalho com|estamos atendidos|no momento nao|sem interesse|ta caro|muito caro)/.test(t)) return "objecao";
  if (/(tenho interesse|me interessa|como funciona|quero saber|quanto custa|qual o valor|manda o|pode mandar|me explica|quero sim|fechado)/.test(t)) return "interesse";
  if (/\?/.test(t)) return "duvida";
  if (t.length <= 12) return "resposta_curta";
  return "informacao";
}

function buildEvidenceBlock(input: ApproachInput): string {
  const { lead, enrichment } = input;
  const social = Array.isArray(lead?.social_media) ? lead.social_media : [];
  const hasSite = !!lead?.website && lead.website !== "-";
  const direta: string[] = [];
  const push = (label: string, value: unknown) => {
    const v = String(value ?? "").trim();
    if (v && v !== "-" && v !== "N/A" && v !== "0") direta.push(`- ${label}: ${v}`);
  };
  push("Nome da empresa", lead?.company_name);
  push("Segmento/categoria", lead?.category);
  push("Cidade", lead?.city ? `${lead.city}${lead?.state ? `/${lead.state}` : ""}` : "");
  push("Bairro", lead?.neighborhood);
  push("Endereço", lead?.address);
  push("Contato", lead?.contact_name);
  if (Number(lead?.rating) > 0) push("Avaliação pública", `${lead.rating}/5 com ${lead?.review_count || 0} avaliações`);
  push("Site", hasSite ? lead.website : "");
  push("Redes sociais", social.length ? social.join(", ") : "");
  push("Análise do site", enrichment?.analise_site);
  push("Análise das redes", enrichment?.analise_redes_sociais);
  push("Características operacionais identificadas", formatOperationalEvidence(enrichment));
  push("Concorrência regional", enrichment?.analise_concorrencia_regional);
  push("Demanda regional", enrichment?.analise_demanda_regional);
  push("Diagnóstico da Wiize", lead?.ai_diagnosis);
  if (Array.isArray(enrichment?.pontos_fortes) && enrichment.pontos_fortes.length) {
    push("Pontos fortes observados", enrichment.pontos_fortes.join("; "));
  }
  if (Array.isArray(enrichment?.pontos_fracos) && enrichment.pontos_fracos.length) {
    push("Pontos de atenção observados", enrichment.pontos_fracos.join("; "));
  }
  push("Observações do prospector", enrichment?.custom_diagnosis);

  const ausentes: string[] = [];
  if (!hasSite) ausentes.push("site não localizado");
  if (!social.length) ausentes.push("redes sociais não localizadas");
  if (!Number(lead?.rating)) ausentes.push("sem avaliação pública conhecida");
  if (!lead?.ai_diagnosis) ausentes.push("sem diagnóstico detalhado");

  return `═══ NÍVEL 1 — EVIDÊNCIA DIRETA (único material que pode ser afirmado) ═══
${direta.length ? direta.join("\n") : "- Quase nenhum dado disponível além do nome do lead."}

═══ INFORMAÇÕES QUE NÃO EXISTEM (proibido afirmar ou supor como fato) ═══
${ausentes.length ? ausentes.map((a) => `- ${a}`).join("\n") : "- Nenhuma lacuna relevante."}
Além disso, você NÃO sabe: número de funcionários, computadores, sistemas usados, fornecedores, equipamentos, faturamento, unidades, contratos atuais, problemas internos ou dores concretas. Nada disso pode aparecer como afirmação — apenas como pergunta.`;
}

function buildSellerBlock(input: ApproachInput): string {
  const p = input.companyProfile || {};
  const model = input.businessModel;
  const blockedMarketing = model !== "agencia";
  return `═══ QUEM ESTÁ ESCREVENDO ═══
- Vendedor/atendente: ${p.attendant_name || "responsável comercial"}
- Empresa: ${p.company_name || "empresa"}
- Como atua: ${BUSINESS_MODEL_LABELS[model]} — ${BUSINESS_MODEL_ROLES[model]}
- Nicho: ${p.company_niche || "conforme perfil"}
- O que vende de fato: ${p.company_products || "conforme perfil"}
${input.productCatalog ? `- Catálogo/preços declarados:\n${input.productCatalog}` : ""}
- Diferenciais: ${p.company_differential || "não informado"}
- ICP / público-alvo: ${p.company_target_audience || "não informado"}
- Objetivo comercial: ${p.company_objective || "abrir conversa qualificada"}

ÂNGULO OBRIGATÓRIO PARA ESTE MODELO DE NEGÓCIO:
${BUSINESS_MODEL_STRATEGY[model]}
${blockedMarketing ? `⛔ Você NÃO vende marketing, tráfego, redes sociais, site, SEO, engajamento ou conversão online. É proibido oferecer ou insinuar qualquer um desses temas.` : ""}
⛔ Nunca ofereça algo que não esteja em "O que vende de fato"/catálogo.`;
}

const CORE_RULES = `═══ COMO PENSAR ANTES DE ESCREVER (não mostre esse raciocínio) ═══
1. MOTIVO: responda internamente por que faz sentido falar com ESTA empresa, e não apenas com qualquer empresa do segmento.
2. GANCHO: escolha o dado acionável com maior relação com o que você vende.
3. ARGUMENTO: construa a sequência DADO DO LEAD → CARACTERÍSTICA RELEVANTE → NECESSIDADE POSSÍVEL → OFERTA DO USUÁRIO.
4. PERGUNTA: transforme a hipótese não comprovada em UMA pergunta simples, específica e fácil de responder.

PRIORIDADE DOS GANCHOS:
- MUITO ALTA: serviço específico, estrutura, sistema/tecnologia, unidades, horário relevante, atendimento, operação digital, agendamento, pagamentos, equipe, ambientes, expansão ou detalhe específico do site.
- MÉDIA: localização, segmento, público, reputação, redes e presença digital.
- BAIXA: elogio, avaliação, endereço ou texto institucional sem relação direta com a oferta.
Não use um dado apenas porque ele existe. Use somente se ele explicar o motivo comercial do contato.

═══ NÍVEIS DE EVIDÊNCIA (regra crítica) ═══
- NÍVEL 1, evidência direta: pode afirmar ("Vi no site que vocês trabalham com X").
- NÍVEL 2, inferência forte do modelo de negócio: use linguagem cuidadosa ("imagino que a operação dependa bastante de...").
- NÍVEL 3, hipótese: NUNCA como fato — transforme em pergunta ("hoje vocês já têm estrutura para...?").
Nunca afirme problema, sistema, equipamento, equipe, volume, contrato ou dor que não esteja no Nível 1.

═══ PERSONALIZAÇÃO REAL ═══
- Inserir nome, cidade, nota do Google ou segmento NÃO é personalização. A personalização precisa mudar o RACIOCÍNIO da mensagem.
- TESTE DE TROCA: substitua mentalmente o nome por outra empresa do mesmo nicho. Se o argumento continuar igual, reescreva com uma evidência específica deste lead.
- Frases aplicáveis a 80% do segmento são genéricas e devem ser removidas.
- Não force conexão superficial do tipo "vocês oferecem X, nós vendemos Y". Use X para formular uma pergunta relevante sobre Y.
- Com poucos dados, escreva CURTO e honesto, com uma pergunta inteligente. Nunca encha linguiça para parecer personalizado.

═══ LINGUAGEM HUMANA ═══
- Proibido: "Espero que esteja tudo bem", "Gostaria de apresentar", "solução inovadora", "nossa empresa é especializada", "sabemos que", "sabemos da importância", "neste cenário", "venho por meio desta", "estou entrando em contato para", "acredito que podemos agregar valor", "solução personalizada", "transformar/potencializar resultados", "mercado competitivo", "alavancar", "escalar", "otimizar processos".
- Proibido elogio vazio ("parabéns pelo excelente trabalho"). Um dado de reputação só entra se tiver função no argumento.
- Varie a abertura. Não comece sempre com "Vi que" nem sempre com "Sou X da empresa Y". Alternativas: "Estava olhando...", "Pesquisando empresas de X em [cidade]...", "Me chamou atenção...", "Encontrei vocês enquanto analisava...".
- Sem emojis, sem listas, sem markdown, sem caixa alta, sem hashtags, sem links, sem travessão longo. Frases curtas, PT-BR natural, blocos separados por linha em branco.
- Use de 2 a 4 blocos, com 1 ou 2 frases por bloco. Nunca entregue um parágrafo único longo.
- Toda frase começa com letra maiúscula.

═══ UMA PERGUNTA ═══
Termine com UMA pergunta principal, simples e fácil de responder. A mensagem inteira deve ter exatamente uma interrogação, na última frase. Nada depois dela.`;

const MANUAL_RULES = `═══ TIPO DA MENSAGEM: PRIMEIRO CONTATO MANUAL ═══
Objetivo: GERAR RESPOSTA. Não é fechar venda, não é reunião, não é catálogo.

Estrutura FLEXÍVEL (não é template rígido, a ordem pode variar conforme o contexto):
- CONTEXTO: mostre que houve análise real daquele negócio.
- CONEXÃO: relacione uma característica observada à área que você resolve.
- CREDENCIAL: apresentação curta, normalmente "[Nome] aqui, da [Empresa]". Não explique a empresa inteira.
- PERGUNTA: uma pergunta específica e fácil de responder.

Tamanho: normalmente entre 180 e 550 caracteres, em 2 a 4 blocos. Poucos dados exigem mensagem menor, não invenção.

⛔ Nesta mensagem é proibido: apresentar planos, preços, velocidades, condições, proposta, orçamento, catálogo, pitch institucional, lista de benefícios, pedir reunião, call, demonstração ou agenda.
✅ É permitido e necessário dizer, de forma ampla, a área em que você atua.`;

function buildFollowUpRules(input: ApproachInput, intent: LeadIntent): string {
  const intentRules: Record<LeadIntent, string> = {
    sem_resposta:
      "O lead NÃO deu resposta substantiva. Proibido: 'conseguiu ver?', 'viu minha mensagem?', 'passando para reforçar', 'gostaria de saber se'. Traga um NOVO motivo para responder: um ângulo diferente do primeiro contato, com uma pergunta objetiva sobre a situação atual dele.",
    saudacao:
      "O lead só respondeu uma saudação. Não agradeça, não presuma interesse, não invente conversa anterior e não repita saudação. Vá direto ao motivo do contato, conecte ao negócio dele e faça uma pergunta.",
    resposta_curta:
      "A resposta foi curta e pouco informativa. Reconheça brevemente, avance a conversa com um ângulo novo e faça uma pergunta de qualificação simples.",
    interesse:
      "O lead demonstrou INTERESSE. Pare de prospectar. Responda objetivamente e avance para UMA pergunta curta de qualificação. Produtos e preços reais podem aparecer quando forem úteis, mas sem despejar catálogo.",
    duvida: leadAskedAboutOffer(input.leadResponse)
      ? "O lead perguntou sobre produto, preço ou funcionamento. Responda diretamente e com objetividade primeiro, usando o catálogo, depois faça UMA pergunta que avance a conversa."
      : "O lead fez uma pergunta que NÃO é sobre produto ou preço (pode ser apenas cortesia). Proibido citar planos, preços, velocidades ou condições. Responda em uma frase curta, vá ao motivo do contato e faça UMA pergunta sobre a operação dele.",
    objecao:
      "O lead apresentou uma OBJEÇÃO. Não confronte e não diga que o seu é melhor. Reconheça em uma frase, retire a pressão e explore a situação atual com UMA pergunta fácil. Se ele já tem a solução, descubra se atende bem antes de falar em troca.",
    informacao:
      "O lead trouxe informação sobre a operação dele. Use essa informação como base principal, mostre que entendeu e avance para o próximo passo lógico com UMA pergunta.",
  };

  return `═══ TIPO DA MENSAGEM: FOLLOW-UP (continuação de conversa) ═══
Esta NÃO é a primeira abordagem. Ela acontece depois de um contato anterior (template oficial da Meta e/ou mensagem já enviada).

${input.previousMessage ? `MENSAGEM ANTERIOR ENVIADA POR VOCÊ:\n"""${input.previousMessage}"""\n⛔ Não repita o mesmo argumento nem a mesma pergunta. Avance a conversa.` : "Não há registro da mensagem anterior. Escreva como continuação natural, sem reiniciar a conversa."}

${input.leadResponse ? `RESPOSTA DO LEAD (prioridade máxima):\n"""${input.leadResponse}"""` : "O lead ainda não respondeu nada substantivo."}
${input.conversationHistory ? `\nHISTÓRICO DA CONVERSA:\n${input.conversationHistory}` : ""}

INTENÇÃO IDENTIFICADA: ${intent}
COMPORTAMENTO OBRIGATÓRIO: ${intentRules[intent]}

Regras do follow-up:
- Nunca ignore a resposta do lead para voltar ao pitch original.
- Pergunte internamente qual é o próximo passo lógico da conversa e escreva somente esse passo.
- Não reinicie com "Oi", "Olá", "Bom dia", "Boa tarde", "Boa noite" nem "tudo bem?".
- Não agradeça a resposta e não presuma alinhamento, interesse ou combinação que não existiu.
- Seja mais curto que o primeiro contato: normalmente de 120 a 450 caracteres, em 2 ou 3 blocos.
${input.previousMessage ? "- O lead já sabe quem você é; não repita a apresentação inteira." : "- O lead ainda não sabe quem você é: diga em uma frase curta seu nome, sua empresa e a área em que atua antes de entrar no assunto."}
- Só cite produto, plano ou preço quando a intenção for interesse ou dúvida direta sobre isso; caso contrário, o objetivo continua sendo entender a operação do lead.
- Não repita o argumento nem a pergunta anterior com outras palavras. Mude para qualificação, estrutura, uso, satisfação, necessidade ou próxima etapa.
- Termine com UMA pergunta que avance para o próximo passo e possa ser respondida em poucas palavras.`;
}

function buildPersonaSystem(input: ApproachInput): string {
  const p = input.companyProfile || {};
  const nome = String(p.attendant_name || "").trim() || "o responsável comercial";
  const empresa = String(p.company_name || "").trim() || "a empresa";
  return `Você NÃO é um assistente de IA. Você É ${nome}, da ${empresa}, escrevendo pessoalmente pelo WhatsApp para um possível cliente B2B.

Escreva sempre em 1ª pessoa, com naturalidade de vendedor humano que realmente pesquisou a empresa antes de mandar mensagem.
Prioridade: RELEVÂNCIA > CONTEXTO > PERSONALIZAÇÃO > NATURALIDADE > CLAREZA > PERSUASÃO.
Métrica mental: "por que esse lead teria motivo para responder esta mensagem?". Se não houver um bom motivo, mude o ângulo.
Nunca invente fatos sobre o lead nem sobre a sua empresa. Nunca devolva rótulos, análises ou explicações — apenas a mensagem final dentro do JSON pedido.`;
}

function buildApproachPrompt(input: ApproachInput): string {
  const intent = classifyLeadResponse(input.leadResponse);
  const typeRules = input.messageType === "follow_up" ? buildFollowUpRules(input, intent) : MANUAL_RULES;

  return `${buildSellerBlock(input)}

═══ COM QUEM VOCÊ ESTÁ FALANDO (o lead, nunca confunda com a sua empresa) ═══
${buildEvidenceBlock(input)}

${CORE_RULES}

${typeRules}

═══ CHECKLIST FINAL (verifique antes de responder; se algo falhar, reescreva internamente) ═══
- A mensagem poderia ser enviada para qualquer empresa do mesmo nicho? Se sim, refaça.
- Existe uma característica específica desse lead e conexão clara com o que você vende?
- O argumento usa um dado acionável ou está apenas citando nome, cidade, segmento ou avaliação?
- Alguma informação foi inventada?
- Parece escrita por uma pessoa e não por um robô?
- Está tentando vender demais para o estágio da conversa?
- Existe uma razão clara para o lead responder?
- Existe apenas UMA pergunta?
- A pergunta pode ser respondida em poucas palavras?
- A mensagem tem de 2 a 4 blocos curtos separados por linha em branco?
- O tamanho é proporcional ao contexto disponível?
${input.messageType === "follow_up" ? "- A mensagem realmente CONTINUA a conversa e considera a resposta do lead?" : "- A mensagem abre uma conversa em vez de despejar oferta?"}

VARIAÇÃO (seed ${input.seed}): esta mensagem precisa ser única para este lead.

Retorne APENAS JSON válido:
{
  "mensagem": "somente a mensagem pronta para envio, com \\n\\n entre blocos, sem rótulos e sem explicações",
  "gancho": "gancho usado (uso interno, 1 frase)",
  "estrategia": "estratégia escolhida: dor, oportunidade, observação, curiosidade, diagnóstico, contexto, melhoria, comparação, qualificação ou pergunta direta (uso interno)",
  "insight": "conexão entre a característica do lead e a oferta (uso interno, 1 frase)",
  "motivo": "por que esse ângulo tem chance de gerar resposta (uso interno, 1 frase)"
}`;
}

// ---------------- Validação de qualidade ----------------
const CLICHES = /(espero que esteja tudo bem|gostaria de apresentar|solu[cç][aã]o inovadora|nossa empresa [eé] especializada|sabemos (?:que|da import[aâ]ncia)|neste cen[aá]rio|venho por meio desta|estou entrando em contato para|agregar valor|solu[cç][aã]o personalizada|transformar (?:seus )?resultados|potencializar (?:seus )?resultados|mercado competitivo|alavancar|maximizar resultados|j[aá] pensou em como|poderia impactar|[eé] fundamental para o sucesso|crucial para o sucesso)/i;
const GENERIC_ARGUMENTS = /(a internet [eé] importante para|conex[aã]o est[aá]vel [eé] fundamental|tecnologia [eé] essencial|boa conex[aã]o melhora|internet [eé] (?:essencial|fundamental) para (?:a|sua) opera[cç][aã]o|conex[aã]o r[aá]pida faz toda a diferen[cç]a|manter os clientes satisfeitos|experi[eê]ncia dos seus clientes)/i;
const OUTPUT_LABELS = /^\s*(?:mensagem|mensagem sugerida|personaliza[cç][aã]o|gancho|objetivo|an[aá]lise do lead)\s*:/i;
const LIST_LINE = /^\s*(?:[-*•]|\d+[.)])\s+/m;
const MARKETING_TERMS = /(marketing|tr[aá]fego|an[uú]ncios?|seo|engajamento|convers[aã]o|divulga[cç][aã]o|divulgar|criar um site|cria[cç][aã]o de site|posicionamento digital|presen[cç]a digital|branding)/i;
const OFFER_TERMS = /\b(?:r\$|\d+\s*(?:mega|gb)\b|plano|planos|pre[cç]o|mensalidade|desconto|or[cç]amento|proposta)\b/i;
const MEETING_TERMS = /\b(?:reuni[aã]o|call|liga[cç][aã]o r[aá]pida|demonstra[cç][aã]o|agendar|agenda(?:mos)?\s+(?:um|uma)|5 minutinhos)\b/i;
const GREETING_START = /^\s*(?:oi|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|tudo certo|e a[ií])\b/i;
const EMPTY_PRAISE = /(parab[eé]ns pelo|excelente trabalho|[oó]timo trabalho|voc[eê]s s[aã]o incr[ií]veis)/i;
const INVENTED_FACTS = /\b(?:(?:vi|percebi|notei) que voc[eê]s (?:t[eê]m|tem|possuem|usam|utilizam|enfrentam)\s+(?:um|uma|v[aá]rios|v[aá]rias|muitos|muitas|diversos|grande|alto|bastante)|voc[eê]s (?:utilizam|usam|possuem)\s+(?:v[aá]rios|diversos|m[uú]ltiplos)\s+(?:sistemas|computadores|equipamentos)|sei que voc[eê]s (?:sofrem|enfrentam|t[eê]m problemas))/i;

function validateApproachMessage(message: string, input: ApproachInput): string | null {
  const text = String(message || "").trim();
  if (!text) return "empty_message";

  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount !== 1) return "question_count";
  if (!/\?\s*$/.test(text)) return "question_not_final";
  if (CLICHES.test(text)) return "cliche_language";
  if (GENERIC_ARGUMENTS.test(text)) return "generic_argument";
  if (OUTPUT_LABELS.test(text) || LIST_LINE.test(text)) return "invalid_output_format";
  if (EMPTY_PRAISE.test(text)) return "empty_praise";
  if (INVENTED_FACTS.test(text)) return "invented_facts";
  if (MEETING_TERMS.test(text)) return "meeting_request";
  if (input.businessModel !== "agencia" && MARKETING_TERMS.test(text)) return "offering_mismatch";

  const intent = classifyLeadResponse(input.leadResponse);
  const offerAllowed = input.messageType === "follow_up" &&
    (intent === "interesse" || intent === "duvida") &&
    leadAskedAboutOffer(input.leadResponse);
  if (!offerAllowed && OFFER_TERMS.test(text)) return "premature_offer";

  if (input.messageType === "follow_up" && GREETING_START.test(text)) return "restarted_conversation";
  if (input.messageType === "follow_up" && /\b(?:agrade[cç]o|obrigad[oa]\s+(?:pela|por)|estamos alinhados|como combinamos|conforme conversamos)\b/i.test(text)) {
    return "false_conversation_assumption";
  }
  if (input.messageType === "follow_up" && !input.previousMessage) {
    const sellerTokens = [input.companyProfile?.attendant_name, input.companyProfile?.company_name]
      .map((value) => normalizeForMatch(value).trim()).filter((value) => value.length >= 3);
    if (sellerTokens.length && !sellerTokens.some((token) => normalizeForMatch(text).includes(token))) {
      return "missing_followup_presentation";
    }
  }

  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length < 2 || blocks.length > 4 || blocks.some((block) => block.length > 340)) return "poor_visual_structure";
  const finalQuestion = text.slice(text.lastIndexOf("\n") + 1).trim();
  if (finalQuestion.length > 180 || /como (?:voc[eê]s?|a empresa) (?:avalia|tem avaliado|enxerga)/i.test(finalQuestion)) return "hard_question";

  // Nome/cidade/segmento isolados não validam personalização; devem existir junto de um argumento operacional.
  const normalized = normalizeForMatch(text);
  const tokens = [input.lead?.company_name, input.lead?.city, input.lead?.category, input.lead?.neighborhood]
    .map((v) => normalizeForMatch(v).trim())
    .filter((v) => v.length >= 4);
  if (tokens.length && !tokens.some((t) => normalized.includes(t))) return "missing_personalization";
  const actionableTokens = actionableEvidenceTokens(input.enrichment);
  if (actionableTokens.length >= 2 && !actionableTokens.some((token) => normalized.includes(token))) {
    return "missing_argument_personalization";
  }

  const maxChars = input.messageType === "follow_up" ? 550 : 650;
  if (text.length > maxChars) return "too_long";

  return null;
}

const REWRITE_HINTS: Record<string, string> = {
  empty_message: "A mensagem veio vazia. Escreva a mensagem completa.",
  question_count: "A mensagem precisa ter EXATAMENTE uma interrogação, na última frase.",
  question_not_final: "A mensagem precisa terminar com a pergunta. Nada depois dela.",
  cliche_language: "Remova os clichês de prospecção e escreva como um vendedor humano real.",
  generic_argument: "O argumento serviria para quase qualquer empresa do nicho. Use um dado acionável específico deste lead; se não houver, seja curto e faça uma pergunta honesta.",
  invalid_output_format: "Retorne somente a mensagem, sem título, rótulo, lista, aspas ou explicação.",
  empty_praise: "Remova o elogio vazio. Só use um dado do lead se ele tiver função no argumento.",
  invented_facts: "Você afirmou algo sobre o lead que não foi comprovado. Transforme a hipótese em pergunta.",
  meeting_request: "Remova qualquer pedido de reunião, call, demonstração ou agenda.",
  offering_mismatch: "Você ofereceu marketing/presença digital sem vender isso. Use o ângulo do que a empresa realmente vende.",
  premature_offer: "Remova planos, preços, condições e proposta. Neste estágio o objetivo é gerar resposta.",
  restarted_conversation: "Este é um follow-up: não reinicie com saudação.",
  false_conversation_assumption: "Não agradeça nem presuma alinhamento, interesse ou conversa que não aconteceu.",
  missing_followup_presentation: "Como não há apresentação anterior registrada, apresente brevemente o vendedor e a empresa sem reiniciar com saudação.",
  missing_personalization: "A mensagem está genérica. Cite algo concreto e específico deste lead.",
  missing_argument_personalization: "A mensagem só cita dados básicos. Use no argumento uma característica operacional ou observação específica disponível sobre este lead.",
  poor_visual_structure: "Divida a mensagem em 2 a 4 blocos curtos, separados por uma linha em branco, com no máximo 1 ou 2 frases por bloco.",
  hard_question: "Simplifique a pergunta final para que o lead consiga responder em poucas palavras.",
  too_long: "A mensagem está longa demais. Corte para o essencial.",
};

function buildRewritePrompt(message: string, reason: string, input: ApproachInput): string {
  return `A mensagem abaixo falhou na revisão de qualidade.

PROBLEMA: ${REWRITE_HINTS[reason] || reason}

Reescreva mantendo TODAS as regras já dadas: ${input.messageType === "follow_up" ? "é um follow-up, continuação de conversa, sem saudação inicial" : "é um primeiro contato manual, objetivo é gerar resposta"}; nada inventado; linguagem humana; exatamente UMA pergunta, na última frase; ${input.businessModel !== "agencia" ? "sem marketing/presença digital; " : ""}sem pedir reunião.

MENSAGEM ORIGINAL:
${message}

Retorne APENAS JSON: {"mensagem": "..."}`;
}

// ---------------- Saída ----------------
function sanitizeMessage(raw: string): string {
  let out = String(raw || "")
    .replace(/\s*--\s*/g, ", ")
    .replace(/([^\n])\s+—\s+([^\n])/g, "$1, $2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  out = out
    .split(/\n{2,}/)
    .map((block) => {
      const cap = block.replace(/^(\s*)([a-zà-ÿ])/, (_m, sp, ch) => sp + ch.toUpperCase());
      return cap.replace(/([.!?]\s+)([a-zà-ÿ])/g, (_m, p, ch) => p + ch.toUpperCase());
    })
    .join("\n\n");
  return out;
}

/** Garante uma única interrogação, na frase final. */
function ensureSingleFinalQuestion(message: string): string {
  const text = String(message || "").trim();
  const last = text.lastIndexOf("?");
  if (last < 0) return text;
  return `${text.slice(0, last).replace(/\?/g, ".")}${text.slice(last)}`;
}

async function callOpenAI(opts: {
  apiKey: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<{ ok: true; data: any } | { ok: false; status: number }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      reasoning_effort: "low",
      max_completion_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: await res.json() };
}

/** Pipeline completo: gera, valida e reescreve uma única vez quando necessário. */
async function generateApproachMessage(
  apiKey: string,
  input: ApproachInput,
  feature: string,
): Promise<{ parsed: any; rewriteReason: string | null; intent: LeadIntent } | { error: "rate_limit" | "no_credits" | "gateway" | "quality"; status: number }> {
  const system = buildPersonaSystem(input);
  const first = await callOpenAI({
    apiKey,
    system,
    user: buildApproachPrompt(input),
    maxTokens: 1200,
  });
  if (!first.ok) {
    if (first.status === 429) return { error: "rate_limit", status: 429 };
    if (first.status === 402) return { error: "no_credits", status: 402 };
    return { error: "gateway", status: first.status };
  }
  logAiUsage({ feature, model: "openai/gpt-6-astra", usage: first.data.usage });
  const content = first.data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content || "{}");

  // Revisão de qualidade: até 2 reescritas, revalidando a cada passagem.
  let rewriteReason = validateApproachMessage(parsed.mensagem || "", input);
  const reasonsUsed: string[] = [];
  for (let attempt = 0; attempt < 2 && rewriteReason; attempt++) {
    reasonsUsed.push(rewriteReason);
    try {
      const fix = await callOpenAI({
        apiKey,
        system,
        user: buildRewritePrompt(parsed.mensagem || "", rewriteReason, input),
        maxTokens: 900,
      });
      if (!fix.ok) break;
      logAiUsage({ feature: `${feature}-fix`, model: "openai/gpt-6-astra", usage: fix.data.usage });
      const fixed = JSON.parse(fix.data.choices?.[0]?.message?.content || "{}");
      if (!fixed?.mensagem) break;
      parsed.mensagem = fixed.mensagem;
      rewriteReason = validateApproachMessage(parsed.mensagem, input);
    } catch (e) {
      console.error("approach rewrite falhou", String(e));
      break;
    }
  }
  rewriteReason = reasonsUsed.length ? reasonsUsed.join(",") : null;

  parsed.mensagem = ensureSingleFinalQuestion(sanitizeMessage(parsed.mensagem || ""));
  const finalValidation = validateApproachMessage(parsed.mensagem, input);
  if (finalValidation) {
    console.error("approach quality validation failed", finalValidation);
    return { error: "quality", status: 422 };
  }
  return { parsed, rewriteReason, intent: classifyLeadResponse(input.leadResponse) };
}

// ============================================================================
// ENDPOINT
// ============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autorizado" }, 401);
    const token = authHeader.replace("Bearer ", "");

    // Modo interno (Wiize API V1): service role + id da conta API no header
    const internalUserId = req.headers.get("x-wiize-api-user");
    const internalMode = !!internalUserId && token === SUPABASE_SERVICE_ROLE_KEY;

    let user: { id: string } | null = null;
    if (internalMode) {
      user = { id: internalUserId! };
    } else {
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authUser) return json({ error: "Usuário não autenticado" }, 401);
      user = authUser;
    }

    const body = await req.json();
    const { lead_id } = body ?? {};

    let lead: any = null;
    if (internalMode && body?.lead && typeof body.lead === "object") {
      lead = body.lead;
    } else {
      if (!lead_id) return json({ error: "lead_id é obrigatório" }, 400);
      const { data: leadRow, error: leadErr } = await supabase
        .from("leads").select("*").eq("id", lead_id).eq("user_id", user.id).single();
      if (leadErr || !leadRow) return json({ error: "Lead não encontrado" }, 404);
      lead = leadRow;
    }

    // Prospecção Web entrega somente análise e diagnóstico, nunca abordagem.
    if (lead?.source === "web") {
      return json({
        error: "web_source_no_message",
        message: "Oportunidades da Prospecção Web não geram mensagem de abordagem.",
      }, 422);
    }

    if (!hasContactNumber(lead)) {
      return json({ error: "no_contact_number", message: "Número não encontrado para esta empresa." }, 422);
    }

    // Geração única: se já existe follow-up salvo, devolve o mesmo.
    if (!internalMode && String(lead?.ai_approach_message || "").trim()) {
      return json({
        mensagem: lead.ai_approach_message,
        ...(typeof lead.enrichment_data?.approach_analysis === "object" ? lead.enrichment_data.approach_analysis : {}),
        reused: true,
      });
    }

    const { data: companyProfile } = await supabase
      .from("company_profiles").select("*").eq("user_id", user.id).single();

    const { data: companyServices } = await supabase
      .from("company_services")
      .select("name, description")
      .eq("owner_user_id", companyProfile?.owner_user_id || user.id)
      .limit(20);

    const businessModel = resolveBusinessModel(companyProfile);
    const productCatalog = formatProductCatalog(companyServices);

    if (!companyProfile || (!String(companyProfile.company_products || "").trim() && !productCatalog)) {
      return json({
        error: "missing_company_profile",
        message: "Complete os produtos ou serviços da sua empresa antes de gerar a abordagem.",
      }, 422);
    }

    const enrichment = lead.enrichment_data && typeof lead.enrichment_data === "object"
      ? lead.enrichment_data as Record<string, any>
      : {};

    const input: ApproachInput = {
      messageType: "follow_up",
      companyProfile,
      productCatalog,
      businessModel,
      lead,
      enrichment,
      previousMessage: String(body?.previous_message || enrichment?.manual_approach?.message || "").trim() || undefined,
      leadResponse: String(body?.lead_response || "").trim() || undefined,
      conversationHistory: String(body?.conversation_history || "").trim() || undefined,
      seed: crypto.randomUUID().slice(0, 8),
    };

    const result = await generateApproachMessage(LOVABLE_API_KEY, input, "approach-lead");
    if ("error" in result) {
      if (result.error === "rate_limit") return json({ error: "Limite de requisições excedido. Tente novamente em instantes." }, 429);
      if (result.error === "no_credits") return json({ error: "Créditos de IA esgotados." }, 402);
      if (result.error === "quality") return json({ error: "A mensagem não atingiu o padrão de qualidade. Tente novamente mais tarde." }, 422);
      throw new Error(`AI gateway error: ${result.status}`);
    }

    const { parsed, rewriteReason, intent } = result;

    if (lead_id && !internalMode) {
      const { error: updateErr } = await supabase
        .from("leads")
        .update({
          ai_approach_message: parsed.mensagem || "",
          enrichment_data: {
            ...enrichment,
            approach_analysis: {
              gancho: parsed.gancho || "",
              insight: parsed.insight || "",
              estrategia: parsed.estrategia || "",
              motivo: parsed.motivo || "",
              lead_intent: intent,
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

    return json({
      mensagem: parsed.mensagem || "",
      gancho: parsed.gancho || "",
      insight: parsed.insight || "",
      estrategia: parsed.estrategia || "",
      motivo: parsed.motivo || "",
      lead_intent: intent,
    });
  } catch (err) {
    console.error("Approach error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
