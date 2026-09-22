// ============================================================================
// MOTOR ÚNICO DE GERAÇÃO DE MENSAGENS COMERCIAIS COM IA — WIIZE
// Usado por: approach-lead (follow_up) e approach-lead-manual (manual_first_contact).
// Não duplicar prompts fora deste arquivo.
// ============================================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---------------- Registro de custo de IA ----------------
const AI_PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15 / 1_000_000, out: 0.6 / 1_000_000 },
  "gpt-4o": { in: 2.5 / 1_000_000, out: 10 / 1_000_000 },
  "gpt-4.1-mini": { in: 0.4 / 1_000_000, out: 1.6 / 1_000_000 },
  "text-embedding-3-small": { in: 0.02 / 1_000_000, out: 0 },
  "text-embedding-3-large": { in: 0.13 / 1_000_000, out: 0 },
};

export async function logAiUsage(p: {
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

// ---------------- Telefone ----------------
export function isValidBRPhone(raw: unknown): boolean {
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

export function hasContactNumber(lead: any): boolean {
  if (isValidBRPhone(lead?.phone)) return true;
  const list = lead?.phone_numbers;
  if (Array.isArray(list)) {
    return list.some((p: any) => isValidBRPhone(typeof p === "string" ? p : p?.number ?? p?.phone));
  }
  return false;
}

// ---------------- Modelo de negócio de quem prospecta ----------------
export type BusinessModel =
  | "distribuidor"
  | "industria"
  | "revenda"
  | "servico"
  | "software"
  | "agencia"
  | "representante"
  | "outro";

export const BUSINESS_MODEL_LABELS: Record<BusinessModel, string> = {
  distribuidor: "Distribuidor / Atacadista",
  industria: "Indústria / Fabricante",
  revenda: "Revenda / Varejo",
  servico: "Prestador de serviço",
  software: "Software / Tecnologia",
  agencia: "Agência / Marketing",
  representante: "Representante comercial",
  outro: "Outro",
};

export const BUSINESS_MODEL_ROLES: Record<BusinessModel, string> = {
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

export const BUSINESS_MODEL_STRATEGY: Record<BusinessModel, string> = {
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

export function inferBusinessModel(text: string): BusinessModel {
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

export function resolveBusinessModel(profile: any): BusinessModel {
  const saved = normalizeBusinessModel(profile?.company_business_model);
  if (saved) return saved;
  const text = `${profile?.company_niche || ""} ${profile?.company_products || ""} ${profile?.company_name || ""}`;
  return inferBusinessModel(text);
}

export function formatProductCatalog(services: any): string {
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

export function normalizeForMatch(value: unknown): string {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// ---------------- Entrada única do motor ----------------
export type MessageType = "manual_first_contact" | "follow_up";

export interface ApproachInput {
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
export type LeadIntent = "sem_resposta" | "saudacao" | "interesse" | "objecao" | "duvida" | "resposta_curta" | "informacao";

const GREETING_TOKENS = new Set([
  "oi", "ola", "bom", "boa", "dia", "tarde", "noite", "tudo", "bem", "certo", "beleza", "blz",
  "e", "voce", "vc", "com", "como", "vai", "esta", "ta", "opa", "ai", "sim", "obrigado", "obrigada",
  "otimo", "otima", "tambem", "aqui", "graças", "gracas", "deus",
]);

/** Só saudação = nenhuma palavra fora do vocabulário de cumprimento. */
function isOnlyGreeting(t: string): boolean {
  const words = t.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 8) return false;
  return words.every((w) => GREETING_TOKENS.has(w));
}

export function classifyLeadResponse(raw: unknown): LeadIntent {
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
1. CONTEXTO: o que esse negócio faz de fato, segundo as evidências.
2. GANCHO: o que existe de ESPECÍFICO nesse lead (serviço, estrutura, posicionamento, região, presença, porte, operação). Escolha o gancho com maior relação com o que você vende — não o mais bonito.
3. NECESSIDADE POTENCIAL: qual necessidade plausível da operação dele conversa com a sua oferta.
4. CONEXÃO: por que o que você vende é relevante PARA ESSE negócio.
5. PERGUNTA: qual pergunta simples tem mais chance de gerar resposta.

═══ NÍVEIS DE EVIDÊNCIA (regra crítica) ═══
- NÍVEL 1, evidência direta: pode afirmar ("Vi no site que vocês trabalham com X").
- NÍVEL 2, inferência forte do modelo de negócio: use linguagem cuidadosa ("imagino que a operação dependa bastante de...").
- NÍVEL 3, hipótese: NUNCA como fato — transforme em pergunta ("hoje vocês já têm estrutura para...?").
Nunca afirme problema, sistema, equipamento, equipe, volume, contrato ou dor que não esteja no Nível 1.

═══ PERSONALIZAÇÃO REAL ═══
- Inserir nome, cidade, nota do Google ou segmento NÃO é personalização. A personalização precisa mudar o RACIOCÍNIO da mensagem.
- TESTE: se essa mensagem pudesse ser enviada para qualquer empresa do mesmo nicho, ela está errada — reescreva.
- Com poucos dados, escreva CURTO e honesto, com uma pergunta inteligente. Nunca encha linguiça para parecer personalizado.

═══ LINGUAGEM HUMANA ═══
- Proibido: "Espero que esteja tudo bem", "Gostaria de apresentar", "solução inovadora", "nossa empresa é especializada", "sabemos que", "sabemos da importância", "neste cenário", "venho por meio desta", "estou entrando em contato para", "acredito que podemos agregar valor", "solução personalizada", "transformar/potencializar resultados", "mercado competitivo", "alavancar", "escalar", "otimizar processos".
- Proibido elogio vazio ("parabéns pelo excelente trabalho"). Um dado de reputação só entra se tiver função no argumento.
- Varie a abertura. Não comece sempre com "Vi que" nem sempre com "Sou X da empresa Y". Alternativas: "Estava olhando...", "Pesquisando empresas de X em [cidade]...", "Me chamou atenção...", "Encontrei vocês enquanto analisava...".
- Sem emojis, sem listas, sem markdown, sem caixa alta, sem hashtags, sem links, sem travessão longo. Frases curtas, PT-BR natural, blocos separados por linha em branco.
- Toda frase começa com letra maiúscula.

═══ UMA PERGUNTA ═══
Termine com UMA pergunta principal, simples e fácil de responder. A mensagem inteira deve ter exatamente uma interrogação, na última frase. Nada depois dela.`;

const MANUAL_RULES = `═══ TIPO DA MENSAGEM: PRIMEIRO CONTATO MANUAL ═══
Objetivo: GERAR RESPOSTA. Não é fechar venda, não é reunião, não é catálogo.

Estrutura FLEXÍVEL (não é template rígido, a ordem pode variar conforme o contexto):
- CONTEXTO: mostre que houve análise real daquele negócio.
- CONEXÃO: relacione uma característica observada à área que você resolve.
- CREDENCIAL: diga quem é você, de qual empresa e por que está falando com ele — de forma curta e incidental.
- PERGUNTA: uma pergunta específica e fácil de responder.

Tamanho: normalmente entre 300 e 600 caracteres. Pode ser menor quando houver pouco contexto e um pouco maior quando houver uma oportunidade muito específica. Nunca escreva texto só para alongar.

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
      "O lead demonstrou INTERESSE. Pare de prospectar e comece a conduzir: responda objetivamente o que ele quer saber, podendo citar produtos e preços do catálogo quando isso responder à dúvida, e termine com UMA pergunta de qualificação (uso, porte, quantidade de pessoas, local, prazo).",
    duvida:
      "O lead fez uma pergunta. Responda diretamente e com objetividade primeiro, usando o catálogo quando for a resposta correta, depois faça UMA pergunta que avance a conversa.",
    objecao:
      "O lead apresentou uma OBJEÇÃO. Não confronte, não diga que o seu é melhor. Valide a posição dele, tire a pressão ('a ideia nem seria trocar por trocar') e faça uma pergunta investigativa sobre a situação atual.",
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
- Não reinicie com "Oi", "Olá", "Bom dia", "Boa tarde", "Boa noite" nem "tudo bem?".
- Não agradeça a resposta e não presuma alinhamento, interesse ou combinação que não existiu.
- Seja mais curto que o primeiro contato: normalmente de 200 a 500 caracteres.
- Só cite produto, plano ou preço quando a intenção for interesse ou dúvida direta sobre isso.
- Termine com UMA pergunta que avance para o próximo passo.`;
}

export function buildPersonaSystem(input: ApproachInput): string {
  const p = input.companyProfile || {};
  const nome = String(p.attendant_name || "").trim() || "o responsável comercial";
  const empresa = String(p.company_name || "").trim() || "a empresa";
  return `Você NÃO é um assistente de IA. Você É ${nome}, da ${empresa}, escrevendo pessoalmente pelo WhatsApp para um possível cliente B2B.

Escreva sempre em 1ª pessoa, com naturalidade de vendedor humano que realmente pesquisou a empresa antes de mandar mensagem.
Prioridade: RELEVÂNCIA > CONTEXTO > PERSONALIZAÇÃO > NATURALIDADE > CLAREZA > PERSUASÃO.
Métrica mental: "por que esse lead teria motivo para responder esta mensagem?". Se não houver um bom motivo, mude o ângulo.
Nunca invente fatos sobre o lead nem sobre a sua empresa. Nunca devolva rótulos, análises ou explicações — apenas a mensagem final dentro do JSON pedido.`;
}

export function buildApproachPrompt(input: ApproachInput): string {
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
- Alguma informação foi inventada?
- Parece escrita por uma pessoa e não por um robô?
- Está tentando vender demais para o estágio da conversa?
- Existe uma razão clara para o lead responder?
- Existe apenas UMA pergunta?
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
const CLICHES = /(espero que esteja tudo bem|gostaria de apresentar|solu[cç][aã]o inovadora|nossa empresa [eé] especializada|sabemos (?:que|da import[aâ]ncia)|neste cen[aá]rio|venho por meio desta|estou entrando em contato para|agregar valor|solu[cç][aã]o personalizada|transformar (?:seus )?resultados|potencializar (?:seus )?resultados|mercado competitivo|alavancar|maximizar resultados)/i;
const MARKETING_TERMS = /(marketing|tr[aá]fego|an[uú]ncios?|seo|engajamento|convers[aã]o|divulga[cç][aã]o|divulgar|criar um site|cria[cç][aã]o de site|posicionamento digital|branding)/i;
const OFFER_TERMS = /\b(?:r\$|\d+\s*(?:mega|gb)\b|plano|planos|pre[cç]o|mensalidade|desconto|or[cç]amento|proposta)\b/i;
const MEETING_TERMS = /\b(?:reuni[aã]o|call|liga[cç][aã]o r[aá]pida|demonstra[cç][aã]o|agendar|agenda(?:mos)?\s+(?:um|uma)|5 minutinhos)\b/i;
const GREETING_START = /^\s*(?:oi|ol[aá]|bom dia|boa tarde|boa noite|tudo bem|tudo certo|e a[ií])\b/i;
const EMPTY_PRAISE = /(parab[eé]ns pelo|excelente trabalho|[oó]timo trabalho|voc[eê]s s[aã]o incr[ií]veis)/i;
const INVENTED_FACTS = /\b(?:vi que voc[eê]s (?:t[eê]m|possuem|usam|utilizam)\s+(?:v[aá]rios|muitos|diversos)|voc[eê]s (?:utilizam|usam|possuem)\s+(?:v[aá]rios|diversos|m[uú]ltiplos)\s+(?:sistemas|computadores|equipamentos)|sei que voc[eê]s (?:sofrem|enfrentam|t[eê]m problemas))/i;

export function validateApproachMessage(message: string, input: ApproachInput): string | null {
  const text = String(message || "").trim();
  if (!text) return "empty_message";

  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount !== 1) return "question_count";
  if (!/\?\s*$/.test(text)) return "question_not_final";
  if (CLICHES.test(text)) return "cliche_language";
  if (EMPTY_PRAISE.test(text)) return "empty_praise";
  if (INVENTED_FACTS.test(text)) return "invented_facts";
  if (MEETING_TERMS.test(text)) return "meeting_request";
  if (input.businessModel !== "agencia" && MARKETING_TERMS.test(text)) return "offering_mismatch";

  const intent = classifyLeadResponse(input.leadResponse);
  const offerAllowed = input.messageType === "follow_up" && (intent === "interesse" || intent === "duvida");
  if (!offerAllowed && OFFER_TERMS.test(text)) return "premature_offer";

  if (input.messageType === "follow_up" && GREETING_START.test(text)) return "restarted_conversation";
  if (input.messageType === "follow_up" && /\b(?:agrade[cç]o|obrigad[oa]\s+(?:pela|por)|estamos alinhados|como combinamos|conforme conversamos)\b/i.test(text)) {
    return "false_conversation_assumption";
  }

  // Personalização mínima: precisa citar algo concreto do lead.
  const normalized = normalizeForMatch(text);
  const tokens = [input.lead?.company_name, input.lead?.city, input.lead?.category, input.lead?.neighborhood]
    .map((v) => normalizeForMatch(v).trim())
    .filter((v) => v.length >= 4);
  if (tokens.length && !tokens.some((t) => normalized.includes(t))) return "missing_personalization";

  const maxChars = input.messageType === "follow_up" ? 900 : 1100;
  if (text.length > maxChars) return "too_long";

  return null;
}

export const REWRITE_HINTS: Record<string, string> = {
  empty_message: "A mensagem veio vazia. Escreva a mensagem completa.",
  question_count: "A mensagem precisa ter EXATAMENTE uma interrogação, na última frase.",
  question_not_final: "A mensagem precisa terminar com a pergunta. Nada depois dela.",
  cliche_language: "Remova os clichês de prospecção e escreva como um vendedor humano real.",
  empty_praise: "Remova o elogio vazio. Só use um dado do lead se ele tiver função no argumento.",
  invented_facts: "Você afirmou algo sobre o lead que não foi comprovado. Transforme a hipótese em pergunta.",
  meeting_request: "Remova qualquer pedido de reunião, call, demonstração ou agenda.",
  offering_mismatch: "Você ofereceu marketing/presença digital sem vender isso. Use o ângulo do que a empresa realmente vende.",
  premature_offer: "Remova planos, preços, condições e proposta. Neste estágio o objetivo é gerar resposta.",
  restarted_conversation: "Este é um follow-up: não reinicie com saudação.",
  false_conversation_assumption: "Não agradeça nem presuma alinhamento, interesse ou conversa que não aconteceu.",
  missing_personalization: "A mensagem está genérica. Cite algo concreto e específico deste lead.",
  too_long: "A mensagem está longa demais. Corte para o essencial.",
};

export function buildRewritePrompt(message: string, reason: string, input: ApproachInput): string {
  return `A mensagem abaixo falhou na revisão de qualidade.

PROBLEMA: ${REWRITE_HINTS[reason] || reason}

Reescreva mantendo TODAS as regras já dadas: ${input.messageType === "follow_up" ? "é um follow-up, continuação de conversa, sem saudação inicial" : "é um primeiro contato manual, objetivo é gerar resposta"}; nada inventado; linguagem humana; exatamente UMA pergunta, na última frase; ${input.businessModel !== "agencia" ? "sem marketing/presença digital; " : ""}sem pedir reunião.

MENSAGEM ORIGINAL:
${message}

Retorne APENAS JSON: {"mensagem": "..."}`;
}

// ---------------- Saída ----------------
export function sanitizeMessage(raw: string): string {
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
export function ensureSingleFinalQuestion(message: string): string {
  const text = String(message || "").trim();
  const last = text.lastIndexOf("?");
  if (last < 0) return text;
  return `${text.slice(0, last).replace(/\?/g, ".")}${text.slice(last)}`;
}

export async function callOpenAI(opts: {
  apiKey: string;
  system: string;
  user: string;
  temperature: number;
  maxTokens: number;
}): Promise<{ ok: true; data: any } | { ok: false; status: number }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, data: await res.json() };
}

/** Pipeline completo: gera, valida e reescreve uma única vez quando necessário. */
export async function generateApproachMessage(
  apiKey: string,
  input: ApproachInput,
  feature: string,
): Promise<{ parsed: any; rewriteReason: string | null; intent: LeadIntent } | { error: "rate_limit" | "no_credits" | "gateway"; status: number }> {
  const system = buildPersonaSystem(input);
  const first = await callOpenAI({
    apiKey,
    system,
    user: buildApproachPrompt(input),
    temperature: 0.85,
    maxTokens: 1200,
  });
  if (!first.ok) {
    if (first.status === 429) return { error: "rate_limit", status: 429 };
    if (first.status === 402) return { error: "no_credits", status: 402 };
    return { error: "gateway", status: first.status };
  }
  logAiUsage({ feature, model: "gpt-4o-mini", usage: first.data.usage });
  const content = first.data.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content || "{}");

  let rewriteReason = validateApproachMessage(parsed.mensagem || "", input);
  if (rewriteReason) {
    try {
      const fix = await callOpenAI({
        apiKey,
        system,
        user: buildRewritePrompt(parsed.mensagem || "", rewriteReason, input),
        temperature: 0.6,
        maxTokens: 900,
      });
      if (fix.ok) {
        logAiUsage({ feature: `${feature}-fix`, model: "gpt-4o-mini", usage: fix.data.usage });
        const fixed = JSON.parse(fix.data.choices?.[0]?.message?.content || "{}");
        if (fixed?.mensagem) parsed.mensagem = fixed.mensagem;
      }
    } catch (e) {
      console.error("approach rewrite falhou", String(e));
    }
  }

  parsed.mensagem = ensureSingleFinalQuestion(sanitizeMessage(parsed.mensagem || ""));
  return { parsed, rewriteReason, intent: classifyLeadResponse(input.leadResponse) };
}
