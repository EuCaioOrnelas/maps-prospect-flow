// Contrato único que TODO Provider da Integration Layer deve seguir.
// O Context Builder jamais conhece Providers diretamente — apenas o Registry.

import type { IntegrationFilters } from "../filters/filterSchema.ts";

export type PlanTier = "start" | "growth" | "scale";

export interface ProviderMetadata {
  name: string;
  description: string;
  version: string;
  requiredPermissions: string[];
  minimumPlan: PlanTier;
  supportedFilters: string[];
  defaultCacheTTL: number;   // segundos
  priority: number;          // menor = mais crítico
  dependencies: string[];
  inputSchema: Record<string, string>;   // documentação (name -> type)
  outputSchema: Record<string, string>;
  status: "stable" | "beta" | "not_implemented";
}

export interface ProviderContext {
  companyId: string;
  userId: string;
  permissions: string[];
  plan: PlanTier | string;
  filters: IntegrationFilters;
  // Providers NUNCA acessam outros providers diretamente;
  // se precisarem, o Registry injeta resultados de dependências aqui.
  dependencies: Record<string, unknown>;
}

export interface ProviderResultMeta {
  version: string;
  processing_time_ms: number;
  cache: { hit: boolean; ttl_s: number };
  filters_applied: Record<string, unknown>;
  records_count: number;
}

export interface ProviderResult<T = unknown> {
  data: T;
  metadata: ProviderResultMeta;
}

export interface Provider<T = unknown> {
  metadata: ProviderMetadata;
  execute(ctx: ProviderContext): Promise<{ data: T; recordsCount: number }>;
}
