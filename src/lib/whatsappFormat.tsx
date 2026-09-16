import React from "react";

/**
 * Formatação no padrão WhatsApp:
 *   *negrito*  _itálico_  ~riscado~  ```monoespaçado```  `código`
 * Extra (não existe no WhatsApp, mas é útil internamente):
 *   __sublinhado__
 *
 * O parser é recursivo (negrito dentro de itálico etc.) e nunca injeta HTML —
 * retorna apenas nós React, então não há risco de XSS.
 */

const TOKEN_RE =
  /```([\s\S]+?)```|`([^`\n]+?)`|__([^_\n]+?)__|\*([^*\n]+?)\*|_([^_\n]+?)_|~([^~\n]+?)~/;

/** URLs (http/https), domínios com www ou TLD comum e e-mails. */
const LINK_RE =
  /((?:https?:\/\/|www\.)[^\s<>()[\]{}"']+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|(?:[a-zA-Z0-9-]+\.)+(?:com|com\.br|net|br|org|org\.br|io|app|dev|co|me|info|shop|site|store|link|page)(?:\/[^\s<>()[\]{}"']*)?)/gi;

/** Pontuação final que não faz parte do link. */
function trimTrailing(raw: string): { url: string; trail: string } {
  let url = raw;
  let trail = "";
  while (url.length > 1 && /[.,;:!?)\]}>'"]$/.test(url)) {
    // mantém o parêntese se ele estiver balanceado dentro da URL
    const last = url[url.length - 1];
    if (last === ")" && (url.match(/\(/g) || []).length > (url.match(/\)/g) || []).length) break;
    trail = last + trail;
    url = url.slice(0, -1);
  }
  return { url, trail };
}

/** Converte URLs/e-mails de um trecho de texto puro em links clicáveis. */
function linkify(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  LINK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(text)) !== null) {
    const raw = m[0];
    const { url, trail } = trimTrailing(raw);
    if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index));
    const isEmail = /^[^\s@]+@[^\s@]+$/.test(url);
    const href = isEmail ? `mailto:${url}` : /^https?:\/\//i.test(url) ? url : `https://${url}`;
    out.push(
      <a
        key={`${keyPrefix}-l-${i++}`}
        href={href}
        target={isEmail ? undefined : "_blank"}
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="underline underline-offset-2 break-all wa-accent-text hover:opacity-80"
      >
        {url}
      </a>
    );
    if (trail) out.push(trail);
    lastIndex = m.index + raw.length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

export function parseWhatsAppText(text: string, keyPrefix = "f"): React.ReactNode[] {
  if (!text) return [];
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let i = 0;

  while (rest.length > 0) {
    const match = TOKEN_RE.exec(rest);
    if (!match || match.index === undefined) {
      nodes.push(rest);
      break;
    }
    if (match.index > 0) nodes.push(rest.slice(0, match.index));

    const key = `${keyPrefix}-${i++}`;
    const [full, block, code, underline, bold, italic, strike] = match;

    if (block !== undefined || code !== undefined) {
      nodes.push(
        <code key={key} className="font-mono text-[0.92em] px-[3px] py-[1px] rounded bg-foreground/10">
          {block ?? code}
        </code>
      );
    } else if (underline !== undefined) {
      nodes.push(<u key={key}>{parseWhatsAppText(underline, key)}</u>);
    } else if (bold !== undefined) {
      nodes.push(<strong key={key} className="font-semibold">{parseWhatsAppText(bold, key)}</strong>);
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{parseWhatsAppText(italic, key)}</em>);
    } else if (strike !== undefined) {
      nodes.push(<s key={key}>{parseWhatsAppText(strike, key)}</s>);
    }

    rest = rest.slice(match.index + full.length);
  }

  return nodes;
}

/** Envolve a seleção com o marcador (ou remove, se já estiver aplicado). */
export function toggleWhatsAppMarker(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  marker: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);
  if (!selected) return { value, selectionStart, selectionEnd };

  const already = selected.startsWith(marker) && selected.endsWith(marker) && selected.length > marker.length * 2;
  if (already) {
    const stripped = selected.slice(marker.length, selected.length - marker.length);
    return {
      value: before + stripped + after,
      selectionStart,
      selectionEnd: selectionStart + stripped.length,
    };
  }
  const wrapped = `${marker}${selected}${marker}`;
  return {
    value: before + wrapped + after,
    selectionStart,
    selectionEnd: selectionStart + wrapped.length,
  };
}
