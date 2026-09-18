/**
 * Ponto único de configuração da versão da Meta Graph API no frontend.
 *
 * A versão da API não é segredo: pode ser pública. Tokens e credenciais
 * continuam exclusivamente no servidor.
 *
 * Para alterar a versão, mude aqui (frontend) e a variável de ambiente
 * META_API_VERSION (funções de servidor).
 */
export const META_API_VERSION =
  (import.meta.env.VITE_META_API_VERSION as string | undefined) || "v25.0";

/** Base da Graph API já com a versão central aplicada. */
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
