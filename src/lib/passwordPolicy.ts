/** Regras de senha do cadastro: critérios básicos + padrões previsíveis. */

export interface PasswordContext {
  email?: string;
  name?: string;
}

const COMMON = [
  "senha", "password", "admin", "qwerty", "wiize", "brasil", "teste", "mudar", "acesso",
  "abc123", "iloveyou", "welcome", "letmein", "amor", "deus", "jesus", "flamengo",
  "corinthians", "palmeiras", "123456", "12345678", "asdf", "zxcv",
];

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];

export const basicCriteria = (p: string) => [
  { label: "Mínimo 8 caracteres", met: p.length >= 8 },
  { label: "Letra maiúscula", met: /[A-Z]/.test(p) },
  { label: "Letra minúscula", met: /[a-z]/.test(p) },
  { label: "Número", met: /[0-9]/.test(p) },
  { label: "Caractere especial (!@#$%)", met: /[^A-Za-z0-9]/.test(p) },
];

function hasSequence(p: string): boolean {
  const s = p.toLowerCase();
  for (const seq of SEQUENCES) {
    const rev = [...seq].reverse().join("");
    for (let i = 0; i + 4 <= seq.length; i++) {
      if (s.includes(seq.slice(i, i + 4)) || s.includes(rev.slice(i, i + 4))) return true;
    }
  }
  return false;
}

/** Dicas do que evitar (vazio = sem padrões previsíveis). */
export function getPasswordWarnings(p: string, ctx: PasswordContext = {}): string[] {
  if (!p) return [];
  const w: string[] = [];
  const low = p.toLowerCase();
  if (COMMON.some((c) => low.includes(c))) {
    w.push("Evite palavras comuns como “senha”, “admin”, “wiize” ou “123456”.");
  }
  if (hasSequence(p)) w.push("Evite sequências como “1234”, “abcd” ou “qwer”.");
  if (/(.)\1\1/.test(p)) w.push("Evite repetir o mesmo caractere (ex.: “aaa”, “111”).");
  if (/(19|20)\d{2}/.test(p)) w.push("Evite anos e datas (ex.: “2024”, “1990”).");
  const emailUser = (ctx.email || "").split("@")[0].toLowerCase();
  const nameParts = (ctx.name || "").toLowerCase().split(/\s+/).filter((n) => n.length >= 3);
  if ((emailUser.length >= 3 && low.includes(emailUser)) || nameParts.some((n) => low.includes(n))) {
    w.push("Não use seu nome ou e-mail na senha.");
  }
  return w;
}

export function isPasswordAcceptable(p: string, ctx: PasswordContext = {}): boolean {
  const met = basicCriteria(p).filter((c) => c.met).length;
  return p.length >= 8 && met >= 4 && getPasswordWarnings(p, ctx).length === 0;
}

/** Detecta recusa de senha vinda do servidor (fraca, vazada, curta). */
export function isPasswordAuthError(message: string | undefined | null): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("weak_password") || (m.includes("password") && /(weak|guess|pwned|leak|short|least|known)/.test(m));
}

export const PASSWORD_REJECTED_MESSAGE =
  "Esta senha é muito comum ou já apareceu em vazamentos na internet. Crie uma senha mais pessoal — por exemplo, junte duas palavras e números sem sequência (ex.: Sol#Verde942).";

/** Traduz erros de autenticação para português. */
export function translateAuthError(message: string | undefined | null): string {
  const m = (message || "").toLowerCase();
  if (isPasswordAuthError(m)) return PASSWORD_REJECTED_MESSAGE;
  if (/already registered|already exists|already been registered/.test(m)) return "Este e-mail já tem cadastro. Faça login ou use “Esqueci minha senha”.";
  if (/invalid email|invalid_email|email address .* invalid/.test(m)) return "O e-mail informado é inválido. Confira e tente novamente.";
  if (/rate limit|too many|after \d+ seconds/.test(m)) return "Muitas tentativas seguidas. Aguarde alguns segundos e tente de novo.";
  if (/network|failed to fetch/.test(m)) return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  if (/timeout|timed out/.test(m)) return "O servidor demorou para responder. Tente novamente em alguns segundos.";
  if (/signup.*disabled|signups not allowed/.test(m)) return "O cadastro está temporariamente indisponível. Tente mais tarde.";
  if (/invalid login|invalid credentials/.test(m)) return "E-mail ou senha incorretos.";
  return "Não foi possível concluir. Tente novamente em instantes.";
}
