import { supabase } from "@/integrations/supabase/client";

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sua sessão expirou. Entre novamente e tente o upload.");
  }

  const safeName = sanitizeFileName(file.name) || "imagem.png";
  const uploadFile = safeName === file.name
    ? file
    : new File([file], safeName, { type: file.type, lastModified: file.lastModified });
  const formData = new FormData();
  formData.append("file", uploadFile);

  const { data, error } = await supabase.functions.invoke("blog-image-upload", {
    body: formData,
  });

  if (error) {
    let detail = error.message;
    const response = (error as { context?: Response }).context;
    if (response) {
      try {
        const payload = await response.clone().json() as { error?: string };
        if (payload.error) detail = payload.error;
      } catch {
        // Mantém a mensagem original quando a resposta não for JSON.
      }
    }
    throw new Error(`Falha ao enviar a imagem: ${detail}`);
  }

  const url = typeof data?.url === "string" ? data.url : "";
  if (!url) throw new Error("Falha ao enviar a imagem: o servidor não retornou a URL.");
  return url;
}
