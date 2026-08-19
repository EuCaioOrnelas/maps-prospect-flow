import { supabase } from "@/integrations/supabase/client";

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
  if (error) throw new Error(error.message || "Falha ao enviar a imagem.");
  if (!data?.url) throw new Error(data?.error || "O upload não retornou a URL da imagem.");
  return data.url as string;
}
