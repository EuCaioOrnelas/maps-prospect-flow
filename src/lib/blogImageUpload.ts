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

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (sessionError || !session?.user || !session.access_token) {
    throw new Error("Sua sessão expirou. Entre novamente e tente o upload.");
  }

  const safeName = sanitizeFileName(file.name) || "imagem.png";
  const uploadFile = safeName === file.name
    ? file
    : new File([file], safeName, { type: file.type, lastModified: file.lastModified });
  const formData = new FormData();
  formData.append("file", uploadFile);

  const backendUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!backendUrl || !publishableKey) {
    throw new Error("Falha ao enviar a imagem: armazenamento não configurado.");
  }

  const response = await fetch(`${backendUrl}/functions/v1/blog-image-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: publishableKey,
    },
    body: formData,
  });

  let data: { url?: string; error?: string } = {};
  try {
    data = await response.json();
  } catch {
    // A mensagem de status abaixo cobre respostas vazias ou inválidas.
  }
  if (!response.ok) {
    throw new Error(`Falha ao enviar a imagem: ${data.error || `erro ${response.status}`}`);
  }

  const url = typeof data.url === "string" ? data.url : "";
  if (!url) throw new Error("Falha ao enviar a imagem: o servidor não retornou a URL.");
  return url;
}
