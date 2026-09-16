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
