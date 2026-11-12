import { describe, expect, it } from "vitest";
import { getChatTemplatePresentation } from "./chatTemplatePresentation";

const message = { direction: "outbound", message_type: "text", metadata: { template_name: "pergunta" }, content: "Podemos conversar?\n\n🔘 Sim\n🔘 Não" };
describe("template presentation", () => {
  it("recovers Sim and Não from historical campaign messages without including them in the body", () => {
    const result = getChatTemplatePresentation(message);
    expect(result.text).toBe("Podemos conversar?");
    expect(result.buttons.map(b => b.text)).toEqual(["Sim", "Não"]);
    expect(result.buttons.every(b => !b.href)).toBe(true);
  });
  it("uses approved template definitions for messages without legacy labels", () => {
    const result = getChatTemplatePresentation({ ...message, content: "Podemos conversar?" }, [{ name: "pergunta", components: [{ type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sim" }, { type: "QUICK_REPLY", text: "Não" }] }] }]);
    expect(result.buttons.map(b => b.text)).toEqual(["Sim", "Não"]);
  });
  it("does not transform a received answer into outbound buttons", () => {
    expect(getChatTemplatePresentation({ ...message, direction: "inbound" }).buttons).toEqual([]);
  });
  it("blocks script URLs and unresolved parameters", () => {
    const result = getChatTemplatePresentation({ ...message, metadata: { template_name: "pergunta", template_buttons: [{ type: "URL", text: "Abrir", url: "javascript:alert(1)" }, { type: "URL", text: "Link", url: "https://example.com/{{1}}" }] } });
    expect(result.buttons.map(b => b.href)).toEqual([undefined, undefined]);
  });
  it("preserves safe link and telephone actions", () => {
    const result = getChatTemplatePresentation({ ...message, content: "Contato\n\n🔗 Site (https://example.com)\n📞 Ligar (+5511999999999)" });
    expect(result.buttons.map(b => b.href)).toEqual(["https://example.com/", "tel:+5511999999999"]);
  });
});