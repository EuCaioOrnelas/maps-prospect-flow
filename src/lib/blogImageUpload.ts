import { supabase } from "@/integrations/supabase/client";

const BUCKET = "blog-images";
// 10 anos (em segundos) — URL assinada de longa duração para uso público no blog
const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 10;

const sanitize = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem (JPG, PNG, WEBP, GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 8 MB.");
  }

  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const base = sanitize(file.name.replace(/\.[^.]+$/, "") || "imagem");
  const path = `${new Date().getFullYear()}/${Date.now()}-${base}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
  if (upErr) throw new Error(upErr.message);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Não foi possível gerar a URL da imagem.");
  }
  return data.signedUrl;
}
