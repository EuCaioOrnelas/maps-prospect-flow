// Context Builder — cérebro da Integration Layer.
// Recebe módulos solicitados, decide quais Providers acionar, executa em paralelo,
// consolida em um único objeto de contexto e devolve.

import type { IntegrationFilters } from "./filters/filterSchema.ts";
import { getLeads, getPipeline } from "./providers/crmProvider.ts";
import { getMetaCampaigns } from "./providers/metaCampaignsProvider.ts";
import { getKPIs } from "./providers/kpisProvider.ts";

export const SUPPORTED_MODULES = [
  "crm.leads",
  "crm.pipeline",
  "campaigns.meta",
  "kpis.forecast",
] as const;
export type ModuleKey = typeof SUPPORTED_MODULES[number];

export interface BuildResult {
  context: Record<string, unknown>;
  errors: Array<{ code: string; message: string; provider: string }>;
  recordsReturned: number;
}

export async function buildContext(params: {
  companyId: string;
  modules: ModuleKey[];
  filters: IntegrationFilters;
}): Promise<BuildResult> {
  const context: Record<string, unknown> = {};
  const errors: BuildResult["errors"] = [];
  let recordsReturned = 0;

  const tasks = params.modules.map(async (mod) => {
    try {
      switch (mod) {
        case "crm.leads": {
          const r = await getLeads(params.companyId, params.filters);
          context[mod] = r;
          recordsReturned += r.data.length;
          return;
        }
        case "crm.pipeline": {
          const r = await getPipeline(params.companyId);
          context[mod] = r;
          recordsReturned += r.data.length;
          return;
        }
        case "campaigns.meta": {
          const r = await getMetaCampaigns(params.companyId, params.filters);
          context[mod] = r;
          recordsReturned += r.data.length;
          return;
        }
        case "kpis.forecast": {
          const r = await getKPIs(params.companyId, params.filters);
          context[mod] = r;
          recordsReturned += 1;
          return;
        }
        default: {
          errors.push({ code: "VALIDATION_MODULES", message: `Módulo não suportado: ${mod}`, provider: mod });
        }
      }
    } catch (e) {
      errors.push({ code: "PROVIDER_ERROR", message: (e as Error).message, provider: mod });
    }
  });

  await Promise.all(tasks);
  return { context, errors, recordsReturned };
}
