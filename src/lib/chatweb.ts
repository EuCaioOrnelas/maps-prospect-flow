// Wiize ChatWeb — regras compartilhadas (endereço, compatibilidade de blocos, códigos de instalação, imagem).

export const CHATWEB_RESERVED = [
  "admin", "api", "app", "www", "wiize", "suporte-wiize", "login", "auth", "dashboard", "chat", "chatweb", "c",
  "embed", "widget", "static", "assets", "help", "ajuda", "status", "null", "undefined", "root", "sistema", "oficial", "wiizepay",
];

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

/** Normaliza o final do endereço: minúsculas, sem acentos, espaços viram hífen, só a-z 0-9 e hífen. */
export function normalizeSlug(input: string): string {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/g, "");
}

export type SlugProblem = "short" | "format" | "reserved" | null;

export function slugProblem(slug: string): SlugProblem {
  if (slug.length < 3) return "short";
  if (!SLUG_RE.test(slug)) return "format";
  if (CHATWEB_RESERVED.includes(slug)) return "reserved";
  return null;
}

export function chatwebBaseUrl(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://wiize-lb2.lovable.app";
}

export function chatwebLink(slug: string, base = chatwebBaseUrl()): string {
  return `${base}/c/${slug}`;
}

// ---------- Compatibilidade dos blocos ----------
export type NodeSupport = "both" | "adjusted" | "whatsapp_only";

const NODE_SUPPORT: Record<string, { support: NodeSupport; note?: string }> = {
  entry: { support: "both", note: "No ChatWeb, o fluxo começa quando o visitante abre o chat." },
  message: { support: "adjusted", note: "Áudios e modelos (templates) do WhatsApp aparecem como texto/arquivo no ChatWeb." },
  buttons: { support: "both" },
  condition: { support: "both" },
  wait: { support: "both" },
  action: { support: "both" },
  handoff: { support: "adjusted", note: "No ChatWeb, a conversa fica marcada como “aguardando atendente”." },
  end: { support: "both" },
  ai_agent: { support: "both" },
  data_collect: { support: "both" },
  ab_test: { support: "both" },
  random_split: { support: "both" },
  google_sheets: { support: "both" },
  google_calendar: { support: "both" },
  gmail: { support: "both" },
  rating: { support: "both" },
  instagram_entry: { support: "whatsapp_only", note: "Gatilho exclusivo do Instagram." },
  ig_reply_comment: { support: "whatsapp_only", note: "Responder comentário só existe no Instagram." },
  ig_send_dm: { support: "whatsapp_only", note: "Direct só existe no Instagram." },
};

export function nodeSupport(nodeType: string) {
  return NODE_SUPPORT[nodeType] || { support: "both" as NodeSupport };
}

export interface ChatWebIssue { nodeId: string; nodeName: string; level: "error" | "warning"; message: string }

/** Lista avisos para um fluxo com ChatWeb ativo. Não altera os blocos. */
export function chatwebIssues(nodes: { id: string; node_type: string; name?: string | null; config?: any }[]): ChatWebIssue[] {
  const out: ChatWebIssue[] = [];
  for (const n of nodes) {
    const info = nodeSupport(n.node_type);
    const name = n.name || n.node_type;
    if (info.support === "whatsapp_only") out.push({ nodeId: n.id, nodeName: name, level: "error", message: `${info.note} Este bloco é ignorado no ChatWeb — use um bloco de Mensagem ou Botões.` });
    if (n.node_type === "message") {
      const items: any[] = Array.isArray(n.config?.items) ? n.config.items : [];
      if (n.config?.message_type === "template" || items.some((i) => i?.type === "template")) {
        out.push({ nodeId: n.id, nodeName: name, level: "warning", message: "Modelos (templates) da Meta não existem no ChatWeb; o visitante verá apenas o nome do modelo. Use texto." });
      }
      if (items.some((i) => i?.type === "audio")) {
        out.push({ nodeId: n.id, nodeName: name, level: "warning", message: "Áudio aparece como arquivo para baixar no ChatWeb." });
      }
    }
    if (n.node_type === "condition" && n.config?.condition_type === "customer_status") {
      out.push({ nodeId: n.id, nodeName: name, level: "warning", message: "Condição por status de cliente depende do telefone; no ChatWeb só funciona depois de coletar o telefone." });
    }
  }
  return out;
}

// ---------- Códigos de instalação ----------
export interface InlineEmbedOptions { width: string; height: string; minHeight: string; radius: number; border: boolean; margin: string }
export interface WidgetEmbedOptions { position: "right" | "left"; color: string; label: string }

const safeCss = (v: string, fallback: string) => (/^[0-9.]+(px|%|vh|vw|rem)?$/.test(String(v).trim()) ? String(v).trim() : fallback);
const safeColor = (v: string) => (/^#[0-9a-fA-F]{3,8}$/.test(v) ? v : "#16a34a");
const escAttr = (v: string) => String(v).replace(/[&"<>]/g, (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]!);

export function inlineEmbedCode(slug: string, o: InlineEmbedOptions, base = chatwebBaseUrl()): string {
  const style = [
    `width:${safeCss(o.width, "100%")}`,
    `height:${safeCss(o.height, "600px")}`,
    `min-height:${safeCss(o.minHeight, "420px")}`,
    `margin:${safeCss(o.margin, "0")}`,
    `border:${o.border ? "1px solid #e5e7eb" : "0"}`,
    `border-radius:${Math.max(0, Math.min(40, Number(o.radius) || 0))}px`,
    "max-width:100%",
  ].join(";");
  return `<iframe src="${base}/c/${slug}?embed=inline" title="Atendimento" style="${style}" allow="clipboard-write" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

export function widgetEmbedCode(slug: string, o: WidgetEmbedOptions, base = chatwebBaseUrl()): string {
  return `<script src="${base}/chatweb-widget.js" data-wiize-chat="${slug}" data-position="${o.position === "left" ? "left" : "right"}" data-color="${safeColor(o.color)}" data-label="${escAttr(o.label.slice(0, 40))}" async></script>`;
}

// ---------- Tema ----------
export interface ChatWebTheme {
  primary: string; secondary: string; sentBubble: string; receivedBubble: string; text: string; background: string; icon: "message" | "sparkles" | "headset"; whatsapp?: string;
  header: string; inputBackground: string; optionStyle: "whatsapp" | "pill"; pattern: boolean;
}
export const DEFAULT_THEME: ChatWebTheme = {
  primary: "#00a884", secondary: "#dfe5e7", header: "#f0f2f5", sentBubble: "#d9fdd3", receivedBubble: "#ffffff", text: "#111b21", background: "#efeae2", icon: "message",
  inputBackground: "#ffffff", optionStyle: "whatsapp", pattern: true,
};
export function readTheme(t: any): ChatWebTheme {
  const out = { ...DEFAULT_THEME };
  for (const k of [...Object.keys(DEFAULT_THEME), "whatsapp"] as (keyof ChatWebTheme)[]) {
    const v = t?.[k];
    if (k === "optionStyle") { if (v === "pill" || v === "whatsapp") out.optionStyle = v; }
    else if (k === "pattern") { if (typeof v === "boolean") out.pattern = v; }
    else if (k === "icon") { if (["message", "sparkles", "headset"].includes(v)) out.icon = v; }
    else if (k === "whatsapp") { const d = String(v || "").replace(/\D/g, ""); if (d.length >= 10 && d.length <= 15) out.whatsapp = d; }
    else if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) (out as any)[k] = v;
  }
  return out;
}
/** Cor do texto legível sobre um fundo. */
export function contrastText(hex: string): string {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#ffffff";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? "#0f172a" : "#ffffff";
}

// ---------- Foto de perfil otimizada ----------
/** Corta em quadrado, redimensiona e gera WebP sem metadados (o canvas descarta EXIF). */
export async function optimizeAvatar(file: File, size = 256, maxBytes = 100_000): Promise<{ main: Blob; thumb: Blob; type: string }> {
  if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) throw new Error("Formato não suportado. Use PNG, JPG ou WebP.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Imagem muito grande (máx. 15 MB).");
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const render = async (px: number, quality: number) => {
    const c = document.createElement("canvas");
    c.width = px; c.height = px;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, px, px);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/webp", quality));
    if (blob && blob.type === "image/webp") return blob;
    return await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", quality));
  };
  let q = 0.86;
  let main = await render(size, q);
  while (main.size > maxBytes && q > 0.5) { q -= 0.08; main = await render(size, q); }
  const thumb = await render(64, 0.8);
  bmp.close?.();
  return { main, thumb, type: main.type };
}
