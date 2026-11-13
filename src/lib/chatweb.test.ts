import { describe, it, expect } from "vitest";
import { normalizeSlug, slugProblem, chatwebIssues, widgetEmbedCode, inlineEmbedCode, readTheme } from "./chatweb";

describe("endereço do ChatWeb", () => {
  it("normaliza para minúsculas, sem acentos e com hífens", () => {
    expect(normalizeSlug("  Atendimento Minha Empresa ")).toBe("atendimento-minha-empresa");
    expect(normalizeSlug("Suporte_Ágil!!")).toBe("suporte-agil");
    expect(normalizeSlug("--a--b--")).toBe("a-b");
  });
  it("bloqueia palavras reservadas e endereços curtos", () => {
    expect(slugProblem("admin")).toBe("reserved");
    expect(slugProblem("wiize")).toBe("reserved");
    expect(slugProblem("ab")).toBe("short");
    expect(slugProblem("minhaempresa")).toBeNull();
  });
});

describe("compatibilidade dos blocos", () => {
  it("avisa sobre blocos exclusivos do Instagram sem alterá-los", () => {
    const nodes = [{ id: "1", node_type: "ig_send_dm", name: "DM" }, { id: "2", node_type: "buttons", name: "Menu" }];
    const issues = chatwebIssues(nodes);
    expect(issues).toHaveLength(1);
    expect(issues[0].nodeId).toBe("1");
    expect(issues[0].level).toBe("error");
  });
  it("avisa sobre templates da Meta em mensagens", () => {
    expect(chatwebIssues([{ id: "m", node_type: "message", config: { message_type: "template" } }])[0].level).toBe("warning");
  });
});

describe("códigos de instalação", () => {
  it("não aceita cores ou textos que injetem código", () => {
    const code = widgetEmbedCode("loja", { position: "left", color: "red;alert(1)", label: '"><script>' }, "https://x.com");
    expect(code).toContain('data-color="#00a884"');
    expect(code).not.toContain("<script>\"");
    expect(code).toContain("&lt;script&gt;");
  });
  it("sanitiza medidas do iframe", () => {
    const code = inlineEmbedCode("loja", { width: "100%;x:y", height: "500px", minHeight: "300px", radius: 99, border: false, margin: "0" }, "https://x.com");
    expect(code).toContain("width:100%;height:500px");
    expect(code).toContain("border-radius:40px");
  });
  it("tema ignora valores inválidos", () => {
    expect(readTheme({ primary: "javascript:1" }).primary).toBe("#00a884");
  });
});
