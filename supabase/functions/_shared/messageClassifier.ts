// Shared message classifier — used by revenue-processor and any scoring/agent code
// that needs to understand WhatsApp message intent in PT-BR.
//
// All scoring rules that depend on the *meaning* of a message MUST funnel through
// `classifyMessage()` so the lexicon stays in one place and evolves uniformly.

export const GREETING_LEXICON = [
  "oi", "ola", "olá", "opa", "eai", "e ai", "e aí",
  "bom dia", "boa tarde", "boa noite", "bom dia!", "boa tarde!", "boa noite!",
  "salve", "tudo bem", "tudo bom", "td bem", "tdb",
];

export const FAREWELL_LEXICON = [
  "tchau", "ate mais", "até mais", "ate logo", "até logo",
  "obrigado", "obrigada", "valeu", "vlw", "vlw!", "vlw obrigado",
  "agradeço", "agradecido", "agradecida", "grato", "grata",
  "boa noite!", "boa semana", "ate amanha", "até amanhã",
  "fechou", "show", "👍", "👌", "ok", "ok!", "okay",
];

// Strong "buy now / fechar" signals
export const INTENT_BUY_NOW = [
  "quero comprar", "quero fechar", "quero contratar", "fechado", "vamos fechar",
  "pode mandar o pagamento", "como faço pra pagar", "como faço para pagar",
  "manda o link de pagamento", "manda o pix", "manda o boleto",
  "to dentro", "tô dentro", "topo", "topei", "manda ver", "bora fechar",
];

// Price / commercial intent
export const INTENT_PRICE = [
  "quanto custa", "qual o preço", "qual o valor", "valores", "preços",
  "tabela de preço", "tabela de preços", "investimento", "qual o investimento",
  "quanto fica", "quanto sai", "qto custa", "quanto é",
];

// Demo / scheduling intent
export const INTENT_DEMO = [
  "agendar", "marcar", "demonstração", "demo", "apresentação",
  "quero ver funcionando", "posso testar", "tem teste", "trial",
  "agenda", "disponibilidade", "horário", "que horas",
];

// Objections
export const OBJECTION_PRICE = [
  "caro", "está caro", "tá caro", "ta caro", "muito caro",
  "fora do orçamento", "fora do orcamento", "não tenho como pagar",
  "nao tenho como pagar", "sem grana", "tá apertado",
];

export const OBJECTION_TIMING = [
  "depois", "mais pra frente", "mais para frente", "agora não", "agora nao",
  "não é o momento", "nao e o momento", "vou pensar", "preciso pensar",
  "deixa eu pensar", "te aviso", "te falo depois",
];

// Hard-stop signals
export const OPT_OUT = [
  "para de mandar", "pare de mandar", "não quero mais", "nao quero mais",
  "remover meu número", "remova meu numero", "desinscrever", "sair da lista",
  "denunciar", "reportar spam", "spam", "bloquear",
];

export interface ClassifiedMessage {
  /** Lowercased, accent-stripped, trimmed */
  normalized: string;
  /** Original length in chars (raw) */
  length: number;
  /** True if message only contains greeting/farewell/emoji/thanks — should NOT trigger SLA */
  isSocial: boolean;
  isGreeting: boolean;
  isFarewell: boolean;
  /** Detected intent tags */
  intents: Array<"buy_now" | "price" | "demo">;
  /** Detected objection tags */
  objections: Array<"price" | "timing">;
  /** Hard-stop opt-out detected */
  optOut: boolean;
  /** Only emojis/punctuation */
  emojiOnly: boolean;
  /** True if message ends with `?` (question signal) */
  isQuestion: boolean;
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function containsAny(text: string, lexicon: string[]): boolean {
  return lexicon.some((kw) => text.includes(stripAccents(kw.toLowerCase())));
}

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}]/u;
const ONLY_PUNCT_REGEX = /^[\s\W_]*$/;

export function classifyMessage(raw: string | null | undefined): ClassifiedMessage {
  const original = String(raw ?? "");
  const length = original.length;
  const normalized = stripAccents(original.toLowerCase().trim());

  const isGreeting = containsAny(normalized, GREETING_LEXICON.map(stripAccents).map((s) => s.toLowerCase()));
  const isFarewell = containsAny(normalized, FAREWELL_LEXICON.map(stripAccents).map((s) => s.toLowerCase()));
  const emojiOnly = !!normalized && (ONLY_PUNCT_REGEX.test(normalized) || (!normalized.match(/[a-z0-9]/) && EMOJI_REGEX.test(original)));

  const intents: ClassifiedMessage["intents"] = [];
  if (containsAny(normalized, INTENT_BUY_NOW.map(stripAccents))) intents.push("buy_now");
  if (containsAny(normalized, INTENT_PRICE.map(stripAccents))) intents.push("price");
  if (containsAny(normalized, INTENT_DEMO.map(stripAccents))) intents.push("demo");

  const objections: ClassifiedMessage["objections"] = [];
  if (containsAny(normalized, OBJECTION_PRICE.map(stripAccents))) objections.push("price");
  if (containsAny(normalized, OBJECTION_TIMING.map(stripAccents))) objections.push("timing");

  const optOut = containsAny(normalized, OPT_OUT.map(stripAccents));
  const isQuestion = original.trim().endsWith("?");

  // Social-only: short, greeting/farewell/emoji-only AND no intents/objections
  const hasMeaningfulIntent = intents.length > 0 || objections.length > 0 || optOut;
  const isShort = length <= 35;
  const isSocial =
    !hasMeaningfulIntent &&
    (emojiOnly || ((isGreeting || isFarewell) && isShort));

  return {
    normalized,
    length,
    isSocial,
    isGreeting,
    isFarewell,
    intents,
    objections,
    optOut,
    emojiOnly,
    isQuestion,
  };
}
