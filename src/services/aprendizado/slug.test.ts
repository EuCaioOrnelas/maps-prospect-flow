import { describe, expect, it } from "vitest";
import { normalizeSlug, slugify } from "./slug";

describe("slugify", () => {
  it("gera o slug do exemplo da especificacao", () => {
    expect(slugify("Prospecção de clientes")).toBe("prospeccao-de-clientes");
  });

  it("remove acentos, simbolos e espacos repetidos", () => {
    expect(slugify("  Configurações & Integrações! ")).toBe("configuracoes-integracoes");
  });

  it("nao deixa hifens nas pontas", () => {
    expect(slugify("--Aula 01--")).toBe("aula-01");
    expect(normalizeSlug("Como Conectar WhatsApp")).toBe("como-conectar-whatsapp");
  });
});
