/** Slugs amigaveis para as URLs publicas de modulos e aulas. */

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

/** Normaliza um slug digitado manualmente pelo administrador. */
export function normalizeSlug(value: string): string {
  return slugify(value);
}
