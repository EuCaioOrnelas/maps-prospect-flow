import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets that are private: objects are only reachable through short-lived
 * signed URLs generated for the authenticated owner.
 */
export const PRIVATE_BUCKETS = ["chat-media", "deal-attachments"] as const;

const SIGN_TTL_SECONDS = 60 * 60 * 6; // 6h

type ParsedObject = { bucket: string; path: string };

/**
 * Extracts { bucket, path } from a Supabase storage URL (public or signed).
 * Returns null when the URL does not belong to a private bucket.
 */
export function parsePrivateStorageUrl(url?: string | null): ParsedObject | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?]+)\/(.+?)(?:\?|$)/);
  if (!match) return null;
  const bucket = match[1];
  if (!(PRIVATE_BUCKETS as readonly string[]).includes(bucket)) return null;
  let path: string;
  try {
    path = decodeURIComponent(match[2]);
  } catch {
    path = match[2];
  }
  return { bucket, path };
}

const cache = new Map<string, { url: string; expiresAt: number }>();

/** Resolves a single stored URL to a usable (signed) URL. */
export async function resolveStorageUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  const parsed = parsePrivateStorageUrl(url);
  if (!parsed) return url;

  const key = `${parsed.bucket}/${parsed.path}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGN_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;

  cache.set(key, { url: data.signedUrl, expiresAt: Date.now() + (SIGN_TTL_SECONDS - 300) * 1000 });
  return data.signedUrl;
}

/** Resolves many URLs at once, returning a map keyed by the original URL. */
export async function resolveStorageUrls(urls: Array<string | null | undefined>): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = Array.from(new Set(urls.filter((u): u is string => !!u && !!parsePrivateStorageUrl(u))));
  await Promise.all(
    unique.map(async (u) => {
      const signed = await resolveStorageUrl(u);
      if (signed) out.set(u, signed);
    })
  );
  return out;
}

/** Opens a (possibly private) stored file in a new tab. */
export async function openStorageUrl(url?: string | null) {
  const resolved = await resolveStorageUrl(url);
  if (resolved) window.open(resolved, "_blank", "noopener,noreferrer");
}
