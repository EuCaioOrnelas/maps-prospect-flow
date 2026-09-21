/**
 * Resolve a origem REAL de um lead capturado por formulário/link rastreado.
 *
 * Regras:
 * - UTM sempre vence (é a origem declarada pela campanha).
 * - Identificadores de clique (gclid, fbclid, ttclid, msclkid) viram origem paga.
 * - Referência do próprio site (ex.: wiize.com.br abrindo o próprio formulário)
 *   é descartada, porque não informa nada útil.
 * - Domínios conhecidos recebem nome amigável (Google, Instagram, WhatsApp...).
 */

const SELF_HOSTS = ["wiize.com.br", "wiize.lovable.app", "lovable.app", "localhost", "127.0.0.1"];

const KNOWN_HOSTS: { match: string; label: string }[] = [
  { match: "google.", label: "Google" },
  { match: "bing.", label: "Bing" },
  { match: "duckduckgo.", label: "DuckDuckGo" },
  { match: "instagram.", label: "Instagram" },
  { match: "facebook.", label: "Facebook" },
  { match: "fb.", label: "Facebook" },
  { match: "l.facebook", label: "Facebook" },
  { match: "whatsapp", label: "WhatsApp" },
  { match: "wa.me", label: "WhatsApp" },
  { match: "linkedin.", label: "LinkedIn" },
  { match: "lnkd.in", label: "LinkedIn" },
  { match: "youtube.", label: "YouTube" },
  { match: "youtu.be", label: "YouTube" },
  { match: "tiktok.", label: "TikTok" },
  { match: "t.co", label: "X (Twitter)" },
  { match: "twitter.", label: "X (Twitter)" },
  { match: "x.com", label: "X (Twitter)" },
  { match: "mail.google", label: "E-mail" },
  { match: "outlook.", label: "E-mail" },
  { match: "t.me", label: "Telegram" },
];

const CLICK_IDS: { param: string; source: string; medium: string }[] = [
  { param: "gclid", source: "google", medium: "cpc" },
  { param: "gbraid", source: "google", medium: "cpc" },
  { param: "wbraid", source: "google", medium: "cpc" },
  { param: "fbclid", source: "facebook", medium: "paid-social" },
  { param: "ttclid", source: "tiktok", medium: "paid-social" },
  { param: "msclkid", source: "bing", medium: "cpc" },
  { param: "li_fat_id", source: "linkedin", medium: "paid-social" },
];

export const hostFromUrl = (url?: string | null): string => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

export const isInternalHost = (host: string): boolean =>
  !!host && SELF_HOSTS.some((self) => host === self || host.endsWith(`.${self}`) || host.includes(self));

const prettifyHost = (host: string): string => {
  const known = KNOWN_HOSTS.find((entry) => host.includes(entry.match));
  return known ? known.label : host;
};

const prettifySource = (source: string): string => {
  const normalized = source.trim().toLowerCase();
  const known = KNOWN_HOSTS.find((entry) => normalized.includes(entry.match.replace(/\.$/, "")));
  if (known) return known.label;
  return source.trim().replace(/^\w/, (c) => c.toUpperCase());
};

export const NOT_IDENTIFIED = "Não identificado";

/**
 * Normalização central do HTTP Referer.
 * Entrada: "https://www.youtube.com/watch?v=123" → { source: "YouTube", referrer: "..." }
 * Entrada vazia/bloqueada/interna → { source: "Não identificado", referrer: null }
 */
export function getReferralSource(referrer?: string | null): { source: string; referrer: string | null } {
  const raw = (referrer || "").trim();
  const host = hostFromUrl(raw);
  if (!host || isInternalHost(host)) return { source: NOT_IDENTIFIED, referrer: raw || null };
  return { source: prettifyHost(host), referrer: raw };
}

export interface OriginInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
}

export interface ResolvedOrigin {
  /** Rótulo curto para tabelas e gráficos. Ex.: "Google Ads". */
  label: string;
  /** Complemento opcional (campanha ou domínio completo). */
  detail: string | null;
}

export function resolveLeadOrigin(input: OriginInput): ResolvedOrigin {
  const source = (input.utm_source || "").trim();
  const medium = (input.utm_medium || "").trim().toLowerCase();
  const campaign = (input.utm_campaign || "").trim();

  if (source) {
    const base = prettifySource(source);
    const paid = ["cpc", "ppc", "paid", "paid-social", "ads", "display"].includes(medium);
    return { label: paid ? `${base} Ads` : base, detail: campaign || null };
  }

  const host = hostFromUrl(input.referrer);
  if (host && !isInternalHost(host)) {
    return { label: prettifyHost(host), detail: host };
  }

  return { label: NOT_IDENTIFIED, detail: null };
}

export const formatLeadOrigin = (input: OriginInput): string => {
  const { label, detail } = resolveLeadOrigin(input);
  return detail && detail !== label ? `${label} · ${detail}` : label;
};

/**
 * Deduz origem a partir dos parâmetros da URL quando a campanha não enviou UTM
 * (ex.: anúncio do Google com gclid, link do Instagram com fbclid).
 */
export function inferUtmFromParams(params: URLSearchParams, referrer?: string | null): Record<string, string> {
  const inferred: Record<string, string> = {};
  const clickId = CLICK_IDS.find((entry) => params.get(entry.param));
  if (clickId) {
    inferred.utm_source = clickId.source;
    inferred.utm_medium = clickId.medium;
    return inferred;
  }
  const host = hostFromUrl(referrer);
  if (host && !isInternalHost(host)) {
    inferred.utm_source = prettifyHost(host).toLowerCase();
    inferred.utm_medium = "referral";
  }
  return inferred;
}
