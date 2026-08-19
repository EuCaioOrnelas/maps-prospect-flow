import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem (JPG, PNG, WEBP, GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 8 MB.");
  }

  const form = new FormData();
  form.append("file", file);

  const { data, error } = await supabase.functions.invoke("blog-image-upload", { body: form });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || `Falha ao enviar a imagem (HTTP ${error.context.status}).`);
    }
    throw new Error(error.message || "Falha ao enviar a imagem.");
  }
  if (!data?.url) throw new Error(data?.error || "O upload não retornou a URL da imagem.");
  return data.url as string;
}
