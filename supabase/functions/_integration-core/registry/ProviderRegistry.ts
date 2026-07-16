// Provider Registry — núcleo de descoberta, resolução de dependências,
// paralelismo controlado e cache por provider.
//
// O Context Builder NUNCA conhece Providers diretamente. Toda comunicação
// passa por aqui, garantindo Open/Closed: novos módulos = registrar + pronto.

import type { Provider, ProviderContext, ProviderResult } from "./ProviderInterface.ts";
import { makeCacheKey, cacheGet, cacheSet } from "../cache.ts";
import type { IntegrationFilters } from "../filters/filterSchema.ts";

export class ProviderNotFoundError extends Error {
  constructor(public providerName: string) {
    super(`Provider not registered: ${providerName}`);
  }
}

export class ProviderRegistry {
  private providers = new Map<string, Provider>();
  private lastExecution = new Map<string, { at: string; ms: number; success: boolean }>();

  register(provider: Provider): void {
    if (this.providers.has(provider.metadata.name)) {
      console.warn(`[registry] Provider "${provider.metadata.name}" already registered — replacing.`);
    }
    this.providers.set(provider.metadata.name, provider);
  }

  has(name: string): boolean { return this.providers.has(name); }
  resolve(name: string): Provider {
    const p = this.providers.get(name);
    if (!p) throw new ProviderNotFoundError(name);
    return p;
  }
  list(): Provider[] { return Array.from(this.providers.values()); }

  /** Snapshot serializável — usado pelo Developer Center. */
  getCatalog() {
    return this.list().map((p) => ({
      ...p.metadata,
      last_execution: this.lastExecution.get(p.metadata.name) ?? null,
    }));
  }

  /**
   * Executa um único Provider com cache-aside.
   * @param bypassCache força re-execução ignorando o cache.
   */
  async execute<T = unknown>(
    name: string,
    ctx: ProviderContext,
    bypassCache = false,
  ): Promise<ProviderResult<T>> {
    const provider = this.resolve(name);
    const cacheKey = await makeCacheKey(name, ctx.companyId, {
      f: ctx.filters, u: ctx.userId, deps: Object.keys(ctx.dependencies).sort(),
    });

    if (!bypassCache && provider.metadata.defaultCacheTTL > 0) {
      const hit = cacheGet<ProviderResult<T>>(cacheKey);
      if (hit) {
        return {
          data: hit.value.data,
          metadata: {
            ...hit.value.metadata,
            cache: { hit: true, ttl_s: Math.max(0, Math.round((hit.expiresAt - Date.now()) / 1000)) },
          },
        };
      }
    }

    const started = Date.now();
    try {
      const { data, recordsCount } = await provider.execute(ctx);
      const elapsed = Date.now() - started;
      const result: ProviderResult<T> = {
        data: data as T,
        metadata: {
          version: provider.metadata.version,
          processing_time_ms: elapsed,
          cache: { hit: false, ttl_s: provider.metadata.defaultCacheTTL },
          filters_applied: (ctx.filters as unknown as Record<string, unknown>) ?? {},
          records_count: recordsCount,
        },
      };
      if (provider.metadata.defaultCacheTTL > 0) {
        cacheSet(cacheKey, result, provider.metadata.defaultCacheTTL);
      }
      this.lastExecution.set(name, { at: new Date().toISOString(), ms: elapsed, success: true });
      return result;
    } catch (e) {
      const elapsed = Date.now() - started;
      this.lastExecution.set(name, { at: new Date().toISOString(), ms: elapsed, success: false });
      throw e;
    }
  }

  /**
   * Executa vários providers resolvendo dependências e maximizando paralelismo.
   * Kahn topological sort → executa cada "camada" em paralelo.
   */
  async executeMany(
    names: string[],
    baseCtx: Omit<ProviderContext, "dependencies">,
    opts: { bypassCache?: boolean } = {},
  ): Promise<{
    results: Record<string, ProviderResult>;
    errors: Array<{ provider: string; code: string; message: string }>;
  }> {
    const results: Record<string, ProviderResult> = {};
    const errors: Array<{ provider: string; code: string; message: string }> = [];

    // Expande dependências transitivas dentro do conjunto pedido.
    const required = new Set<string>();
    const stack = [...names];
    while (stack.length) {
      const n = stack.pop()!;
      if (required.has(n)) continue;
      if (!this.has(n)) {
        errors.push({ provider: n, code: "PROVIDER_NOT_FOUND", message: `Provider não registrado: ${n}` });
        continue;
      }
      required.add(n);
      for (const dep of this.resolve(n).metadata.dependencies) stack.push(dep);
    }

    // Grafo de dependências restrito ao conjunto required.
    const remaining = new Map<string, Set<string>>();
    for (const n of required) {
      const deps = new Set(this.resolve(n).metadata.dependencies.filter((d) => required.has(d)));
      remaining.set(n, deps);
    }

    // Executa em camadas: cada camada = providers cujas deps já foram resolvidas.
    while (remaining.size > 0) {
      const layer = Array.from(remaining.entries())
        .filter(([, deps]) => deps.size === 0)
        .map(([n]) => n);

      if (layer.length === 0) {
        // ciclo — falha explícita para todos os pendentes.
        for (const [n] of remaining) {
          errors.push({ provider: n, code: "PROVIDER_ERROR", message: "Dependência circular detectada." });
        }
        break;
      }

      const settled = await Promise.allSettled(
        layer.map(async (n) => {
          const p = this.resolve(n);
          // Só passa dependências que estão em required E já foram executadas com sucesso.
          const depsData: Record<string, unknown> = {};
          for (const d of p.metadata.dependencies) {
            if (results[d]) depsData[d] = results[d].data;
          }
          const ctx: ProviderContext = { ...baseCtx, dependencies: depsData };
          const r = await this.execute(n, ctx, opts.bypassCache);
          return [n, r] as const;
        }),
      );

      for (let i = 0; i < settled.length; i++) {
        const n = layer[i];
        const s = settled[i];
        if (s.status === "fulfilled") {
          results[s.value[0]] = s.value[1];
        } else {
          errors.push({ provider: n, code: "PROVIDER_ERROR", message: (s.reason as Error)?.message ?? "erro desconhecido" });
        }
      }

      // Remove a camada e desconta das deps dos pendentes.
      for (const n of layer) remaining.delete(n);
      for (const [, deps] of remaining) for (const n of layer) deps.delete(n);
    }

    return { results, errors };
  }

  /** Aplica filtros = defaults quando ausentes. Facilita chamadas one-shot ao Registry. */
  buildContext(base: {
    companyId: string;
    userId: string;
    permissions: string[];
    plan: string;
    filters: IntegrationFilters;
  }): Omit<ProviderContext, "dependencies"> {
    return { ...base };
  }
}
