// Bootstrap único do Provider Registry.
// Novo provider = criar o arquivo, importar aqui, chamar register(). Nada mais.
// O Context Builder e endpoints jamais alteram — Open/Closed 100%.

import { ProviderRegistry } from "./ProviderRegistry.ts";
import { crmProvider } from "../providers/crmProvider.ts";
import { pipelineProvider } from "../providers/pipelineProvider.ts";
import { campaignsProvider, metaProvider } from "../providers/campaignsProvider.ts";
import { cockpitProvider } from "../providers/cockpitProvider.ts";
import { opportunitiesProvider } from "../providers/opportunitiesProvider.ts";
import { financeProvider } from "../providers/financeProvider.ts";
import {
  forecastProvider, contactsProvider, analyticsProvider,
  dashboardProvider, automationProvider, conversationsProvider,
  leadsProvider, scoresProvider, usersProvider, companyProvider,
  settingsProvider, permissionsProvider, insightsProvider,
} from "../providers/stubs.ts";

let _registry: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (_registry) return _registry;
  const r = new ProviderRegistry();
  // Ordem não importa — grafo de dependências é resolvido em runtime.
  r.register(cockpitProvider);
  r.register(crmProvider);
  r.register(pipelineProvider);
  r.register(campaignsProvider);
  r.register(metaProvider);
  r.register(opportunitiesProvider);
  r.register(forecastProvider);
  r.register(contactsProvider);
  r.register(analyticsProvider);
  r.register(dashboardProvider);
  r.register(financeProvider);
  r.register(automationProvider);
  r.register(conversationsProvider);
  r.register(leadsProvider);
  r.register(scoresProvider);
  r.register(usersProvider);
  r.register(companyProvider);
  r.register(settingsProvider);
  r.register(permissionsProvider);
  r.register(insightsProvider);
  _registry = r;
  return r;
}

export { ProviderRegistry };
