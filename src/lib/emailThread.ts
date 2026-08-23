/**
 * Limpeza de respostas de e-mail: remove trechos citados ("Em ... escreveu:",
 * "On ... wrote:", assinaturas de reencaminhamento e linhas com ">") para que
 * o chat mostre apenas o que a pessoa realmente escreveu.
 */
const QUOTE_MARKERS: RegExp[] = [
  /^[ \t]*(?:Em|On|El|Le)\b[\s\S]{0,400}?(?:escreveu|wrote|escribió|a écrit)\s*:?[ \t]*$/im,
  /^[ \t]*-{2,}\s*(?:Mensagem original|Original Message|Forwarded message|Mensagem encaminhada)/im,
  /^[ \t]*(?:De|From|Van|Von)\s*:\s*.+<[^>]+>[ \t]*$/im,
  /^[ \t]*_{5,}[ \t]*$/m,
  /^[ \t]*Enviado do meu \w+/im,
];

export function cleanQuotedReply(input?: string | null): string {
  let text = String(input ?? "").replace(/\r\n/g, "\n");
  let cut = text.length;

  for (const marker of QUOTE_MARKERS) {
    const match = text.match(marker);
    if (match?.index !== undefined && match.index < cut) cut = match.index;
  }

  text = text.slice(0, cut);

  return text
    .replace(/(^[ \t]*>.*$\n?)+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Data curta no estilo chat: "17:27" hoje, "ontem 17:27" ou "23/08 17:27". */
export function formatChatTimestamp(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return `Hoje ${time}`;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return `Ontem ${time}`;

  const sameYear = date.getFullYear() === today.getFullYear();
  const day = date.toLocaleDateString("pt-BR", sameYear
    ? { day: "2-digit", month: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day} ${time}`;
}
