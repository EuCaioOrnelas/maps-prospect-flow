// Cache in-memory por instância. Chave por provider + tenant + filtros.
// Limitação conhecida: cache é local à instância da Edge Function. Suficiente
// para janelas curtas (30-120s) e coerente com o modelo serverless.
// Futuro: migrar para Deno KV ou Redis mantendo o mesmo contrato.

export interface CacheEntry<T = unknown> { value: T; expiresAt: number; storedAt: number; ttlSeconds: number; }

const store = new Map<string, CacheEntry>();

async function hash(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export async function makeCacheKey(providerName: string, companyId: string, filters: unknown): Promise<string> {
  const h = await hash(JSON.stringify(filters ?? {}));
  return `provider:${providerName}:${companyId}:${h}`;
}

export function cacheGet<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
  return entry;
}

export function cacheSet<T>(key: string, value: T, ttlSeconds: number): CacheEntry<T> {
  const now = Date.now();
  const entry: CacheEntry<T> = { value, ttlSeconds, storedAt: now, expiresAt: now + ttlSeconds * 1000 };
  store.set(key, entry);
  return entry;
}

export function cacheClear(): void { store.clear(); }
export function cacheSize(): number { return store.size; }
