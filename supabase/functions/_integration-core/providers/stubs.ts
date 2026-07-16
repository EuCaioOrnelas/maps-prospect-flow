// Stubs de Providers ainda não implementados.
// Todos seguem o contrato Provider e retornam data: { status: "not_implemented" }
// mantendo o Registry funcional end-to-end e permitindo consumidores
// integrarem contra o schema antes da implementação real.
//
// Cada stub declara sua metadata final — o dia da implementação real
// bastará trocar o corpo de execute().

import type { Provider, ProviderContext, ProviderMetadata } from "../registry/ProviderInterface.ts";

function stub(meta: Omit<ProviderMetadata, "status">): Provider {
  return {
    metadata: { ...meta, status: "not_implemented" },
    async execute(_ctx: ProviderContext) {
      return {
        data: {
          status: "not_implemented",
          message: `Provider "${meta.name}" registrado, execução real pendente.`,
        },
        recordsCount: 0,
      };
    },
  };
}

export const opportunitiesProvider = stub({
  name: "opportunities",
  description: "Oportunidades quentes, score e nível de negócio.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period", "pagination", "sort"], defaultCacheTTL: 60, priority: 2,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const forecastProvider = stub({
  name: "forecast",
  description: "Previsão de receita e conversões futuras a partir do pipeline atual.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 120, priority: 4,
  dependencies: ["pipeline", "cockpit"], inputSchema: {}, outputSchema: {},
});

export const contactsProvider = stub({
  name: "contacts",
  description: "Contatos únicos da empresa (deduplicação por telefone/e-mail).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["pagination"], defaultCacheTTL: 60, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const analyticsProvider = stub({
  name: "analytics",
  description: "Eventos analíticos agregados (tracking, funis, cohorts).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 120, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const dashboardProvider = stub({
  name: "dashboard",
  description: "Snapshot completo do dashboard principal (widgets consolidados).",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["period"], defaultCacheTTL: 30, priority: 2,
  dependencies: ["cockpit", "pipeline"], inputSchema: {}, outputSchema: {},
});

export const financeProvider = stub({
  name: "finance",
  description: "Assinatura, plano, cobranças e MRR da empresa.",
  version: "0.1.0", requiredPermissions: ["role:admin"], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 300, priority: 4,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const automationProvider = stub({
  name: "automation",
  description: "Fluxos de automação WhatsApp, gatilhos e execução.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["pagination"], defaultCacheTTL: 60, priority: 4,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const conversationsProvider = stub({
  name: "conversations",
  description: "Conversas ativas do Chat com atendente humano ou agente.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period", "pagination"], defaultCacheTTL: 15, priority: 3,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const leadsProvider = stub({
  name: "leads",
  description: "Alias público de CRM com foco em detalhamento de lead único.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: ["pagination"], defaultCacheTTL: 30, priority: 3,
  dependencies: ["crm"], inputSchema: {}, outputSchema: {},
});

export const scoresProvider = stub({
  name: "scores",
  description: "Score de leads e evolução histórica.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period", "pagination"], defaultCacheTTL: 60, priority: 5,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const usersProvider = stub({
  name: "users",
  description: "Membros da conta e status de acesso.",
  version: "0.1.0", requiredPermissions: ["role:admin"], minimumPlan: "growth",
  supportedFilters: [], defaultCacheTTL: 120, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const companyProvider = stub({
  name: "company",
  description: "Perfil da empresa, serviços cadastrados e configurações.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 300, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const settingsProvider = stub({
  name: "settings",
  description: "Configurações da conta que impactam automações e chat.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 300, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const permissionsProvider = stub({
  name: "permissions",
  description: "Permissões efetivas do usuário autenticado.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "start",
  supportedFilters: [], defaultCacheTTL: 60, priority: 6,
  dependencies: [], inputSchema: {}, outputSchema: {},
});

export const insightsProvider = stub({
  name: "insights",
  description: "Insights de IA sobre oportunidades e performance de campanhas.",
  version: "0.1.0", requiredPermissions: [], minimumPlan: "growth",
  supportedFilters: ["period"], defaultCacheTTL: 300, priority: 5,
  dependencies: ["cockpit", "campaigns"], inputSchema: {}, outputSchema: {},
});
