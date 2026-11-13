export interface ChatTemplateButton {
  type: string;
  text: string;
  href?: string;
}

function safeHref(type: string, value: unknown): string | undefined {
  if (typeof value !== "string" || value.includes("{{")) return undefined;
  if (type === "PHONE_NUMBER") {
    const phone = value.replace(/[^\d+]/g, "");
    return /^\+?\d{8,15}$/.test(phone) ? `tel:${phone}` : undefined;
  }
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** Outbound quick replies belong to the recipient, never to the operator. */
export function getChatTemplatePresentation(
  message: { content?: string | null; direction: string; message_type: string; metadata?: any },
  templates: { name: string; language?: string; components?: any[] }[] = [],
) {
  const content = message.content || "";
  const meta = message.metadata || {};
  if (message.direction !== "outbound" || (!meta.template_name && message.message_type !== "template")) {
    return { text: content, buttons: [] as ChatTemplateButton[] };
  }
  const definition = templates.find(t => t.name === meta.template_name && (!meta.template_language || t.language === meta.template_language));
  const components = meta.template_definition?.components || definition?.components || [];
  const rawButtons = meta.template_buttons || components.find((c: any) => String(c.type).toUpperCase() === "BUTTONS")?.buttons;
  const buttons: ChatTemplateButton[] = Array.isArray(rawButtons) ? rawButtons.flatMap((b: any) => {
    if (typeof b?.text !== "string" || !b.text.trim()) return [];
    const type = String(b.type || "QUICK_REPLY").toUpperCase();
    return [{ type, text: b.text.trim(), href: safeHref(type, type === "PHONE_NUMBER" ? b.phone_number : b.url) }];
  }) : [];

  // Campaigns historically appended button labels to the encrypted body.
  // Read that legacy representation without rewriting the customer's history.
  const lines = content.trimEnd().split("\n");
  const legacy: ChatTemplateButton[] = [];
  while (lines.length) {
    const match = lines[lines.length - 1].match(/^(🔘|🔗|📞)\s+(.+)$/u);
    if (!match) break;
    const type = match[1] === "🔗" ? "URL" : match[1] === "📞" ? "PHONE_NUMBER" : "QUICK_REPLY";
    const target = type !== "QUICK_REPLY" ? match[2].match(/^(.*?)\s+\(([^)]+)\)$/) : null;
    legacy.unshift({ type, text: target ? target[1] : match[2], href: target ? safeHref(type, target[2]) : undefined });
    lines.pop();
  }
  return { text: legacy.length ? lines.join("\n").trimEnd() : content, buttons: buttons.length ? buttons : legacy };
}