import { blogSupabase } from "@/integrations/blog/client";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/blog-image-upload`;

export async function uploadBlogImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo precisa ser uma imagem (JPG, PNG, WEBP, GIF).");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Imagem muito grande. Máximo: 8 MB.");
  }

  const { data: sessionData } = await blogSupabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sessão de admin do blog expirada. Faça login novamente.");

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.url) {
    throw new Error(json?.error || `Falha no upload (HTTP ${res.status}).`);
  }
  return json.url as string;
}
