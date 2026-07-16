export interface ErrorDoc {
  code: string;
  status: number;
  meaning: string;
  action: string;
}

export const ERROR_DOCS: ErrorDoc[] = [
  { code: "AUTH_MISSING_CLIENT", status: 401, meaning: "Faltam headers x-integration-client-id / x-integration-client-secret.", action: "Enviar ambos os headers." },
  { code: "AUTH_INVALID_CLIENT", status: 401, meaning: "Client ID ou secret incorretos.", action: "Confirmar credenciais com o time Wiize." },
  { code: "AUTH_MISSING_USER_TOKEN", status: 401, meaning: "Bearer token do usuário ausente.", action: "Enviar Authorization: Bearer <jwt>." },
  { code: "AUTH_INVALID_USER_TOKEN", status: 401, meaning: "JWT expirado ou inválido.", action: "Renovar sessão do usuário." },
  { code: "PERM_NO_COMPANY", status: 403, meaning: "Usuário sem empresa associada.", action: "Usuário precisa completar cadastro na Wiize." },
  { code: "VALIDATION_BODY", status: 400, meaning: "Body JSON malformado.", action: "Enviar JSON válido." },
  { code: "VALIDATION_MODULES", status: 400, meaning: "Lista de módulos vazia ou desconhecida.", action: "Usar módulos suportados: crm.leads, crm.pipeline, campaigns.meta, kpis.forecast." },
  { code: "VALIDATION_FILTERS", status: 400, meaning: "Filtros com formato inválido.", action: "Ver seção Filtros." },
  { code: "VALIDATION_VERSION", status: 400, meaning: "Versão não suportada.", action: "Enviar version: 'v1'." },
  { code: "RATE_LIMIT_EXCEEDED", status: 429, meaning: "Limite de req/min atingido.", action: "Respeitar header Retry-After." },
  { code: "PROVIDER_ERROR", status: 502, meaning: "Provider interno falhou.", action: "Retentar com backoff. Persistindo, contatar Wiize." },
  { code: "INTERNAL_ERROR", status: 500, meaning: "Erro inesperado.", action: "Retentar. Se persistir, abrir ticket." },
];
