import { supabase } from "@/integrations/supabase/client";

const BLOG_BUCKET = "blog-images";

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem (JPG, PNG, WEBP, GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 8 MB.");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Sua sessão expirou. Entre novamente e tente o upload.");

  const extension = (file.name.split(".").pop() || "png").toLowerCase();
  const baseName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "") || "imagem");
  const path = `${userId}/${new Date().getFullYear()}/${Date.now()}-${baseName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BLOG_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploadError) {
    throw new Error(`Falha ao enviar a imagem: ${uploadError.message}`);
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BLOG_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);

  if (signedError || !signed?.signedUrl) {
    await supabase.storage.from(BLOG_BUCKET).remove([path]);
    throw new Error(`Imagem enviada, mas a URL não pôde ser gerada: ${signedError?.message || "erro interno"}`);
  }

  return signed.signedUrl;
}
