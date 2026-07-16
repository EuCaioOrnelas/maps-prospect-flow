// Catálogo oficial de erros da Integration Layer.
// Nunca expor stack trace, SQL ou detalhes internos. Sempre usar um código daqui.

export const ERROR_CATALOG = {
  AUTH_MISSING_CLIENT:      { status: 401, message: "Credenciais de cliente ausentes." },
  AUTH_INVALID_CLIENT:      { status: 401, message: "Credenciais de cliente inválidas." },
  AUTH_MISSING_USER_TOKEN:  { status: 401, message: "Token do usuário ausente no header Authorization." },
  AUTH_INVALID_USER_TOKEN:  { status: 401, message: "Token do usuário inválido ou expirado." },
  PERM_NO_COMPANY:          { status: 403, message: "Usuário autenticado não possui empresa associada." },
  PERM_MODULE_FORBIDDEN:    { status: 403, message: "Usuário não possui permissão para este módulo." },
  PERM_PLAN_REQUIRED:       { status: 403, message: "Plano atual não contempla este módulo." },
  VALIDATION_BODY:          { status: 400, message: "Corpo da requisição inválido." },
  VALIDATION_MODULES:       { status: 400, message: "Lista de módulos inválida ou vazia." },
  VALIDATION_FILTERS:       { status: 400, message: "Filtros inválidos." },
  VALIDATION_VERSION:       { status: 400, message: "Versão não suportada." },
  PROVIDER_NOT_FOUND:       { status: 404, message: "Provider não registrado." },
  RATE_LIMIT_EXCEEDED:      { status: 429, message: "Limite de requisições excedido. Tente novamente em instantes." },
  PROVIDER_ERROR:           { status: 502, message: "Falha ao consultar dados do provider." },
  INTERNAL_ERROR:           { status: 500, message: "Erro interno da Integration Layer." },
} as const;

export type ErrorCode = keyof typeof ERROR_CATALOG;
