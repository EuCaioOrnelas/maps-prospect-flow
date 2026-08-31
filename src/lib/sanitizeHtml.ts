import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML antes de renderizar com dangerouslySetInnerHTML.
 * Remove scripts, handlers inline (onerror/onclick), iframes maliciosos,
 * `javascript:` em href/src e demais vetores de XSS armazenado.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel', 'colspan', 'rowspan'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'formaction'],
  });
}
