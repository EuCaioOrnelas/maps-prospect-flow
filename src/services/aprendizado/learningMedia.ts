import { supabase } from "@/integrations/supabase/client";

export const LEARNING_MEDIA_BUCKET = "learning-media";
const SIGNED_URL_TTL_SECONDS = 3600;
const CACHE_TTL_MS = 50 * 60 * 1000;
const MAX_CACHE_ENTRIES = 40;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type CacheEntry = { expires: number; url: Promise<string> };
const cache = new Map<string, CacheEntry>();

/** URLs assinadas ficam apenas em memoria e expiram junto com o link. */
export function resolveLearningImage(path: string): Promise<string> {
  const existing = cache.get(path);
  if (existing && existing.expires > Date.now()) return existing.url;

  const url = supabase.storage
    .from(LEARNING_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    .then(({ data, error }) => {
      if (error || !data?.signedUrl) throw error ?? new Error("Imagem indisponivel");
      return data.signedUrl;
    });

  if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value ?? "");
  cache.set(path, { expires: Date.now() + CACHE_TTL_MS, url });
  void url.catch(() => {
    if (cache.get(path)?.url === url) cache.delete(path);
  });
  return url;
}

export function clearLearningImageCache() {
  cache.clear();
}

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);

/** Envia a imagem para o bucket privado e devolve o caminho salvo no banco. */
export async function uploadLearningImage(file: File, folder: "modules" | "lessons"): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("O arquivo precisa ser uma imagem (JPG, PNG ou WEBP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Imagem muito grande. Maximo: 5 MB.");
  }

  const safeName = sanitizeFileName(file.name) || "imagem.png";
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(LEARNING_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Nao foi possivel enviar a imagem.");
  clearLearningImageCache();
  return path;
}

export async function deleteLearningImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  cache.delete(path);
  await supabase.storage.from(LEARNING_MEDIA_BUCKET).remove([path]);
}
