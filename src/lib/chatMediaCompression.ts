// Prepara arquivos do chat antes do envio: comprime fotos e bloqueia arquivos pesados.
export const CHAT_MAX_VIDEO_BYTES = 16 * 1024 * 1024;
export const CHAT_MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_IMAGE_SIDE = 1600;
const IMAGE_QUALITY = 0.8;

export function chatFileTooLarge(file: File): string | null {
  const limit = file.type.startsWith("video/") ? CHAT_MAX_VIDEO_BYTES : CHAT_MAX_FILE_BYTES;
  if (file.size <= limit) return null;
  return `Arquivo muito grande (máx. ${Math.round(limit / 1024 / 1024)} MB).`;
}

export async function compressChatImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 300 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", IMAGE_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
