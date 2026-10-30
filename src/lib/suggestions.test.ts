import { describe, it, expect } from "vitest";
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_ALL_CATEGORIES,
  SUGGESTION_LEGACY_CATEGORIES,
  SUGGESTION_STATUS_LABEL,
  SUGGESTION_PUBLIC_STATUSES,
  SUGGESTION_STATUS_BADGE_CLASS,
  SUGGESTION_TITLE_MAX,
  SUGGESTION_DESCRIPTION_MAX,
} from "./suggestions";

describe("Wiize Evolui — regras de domínio", () => {
  it("mantém as categorias históricas disponíveis para filtros (compatibilidade)", () => {
    for (const legacy of SUGGESTION_LEGACY_CATEGORIES) {
      expect(SUGGESTION_ALL_CATEGORIES).toContain(legacy);
    }
  });

  it("novas categorias do formulário incluem Gestão de projetos e Pagamentos", () => {
    expect(SUGGESTION_CATEGORIES).toContain("Gestão de projetos");
    expect(SUGGESTION_CATEGORIES).toContain("Pagamentos");
    expect(SUGGESTION_CATEGORIES).toContain("Segurança");
  });

  it("todos os status novos do ciclo de vida têm rótulo e identidade visual", () => {
    const novos = [
      "recebida", "em_analise", "em_avaliacao_comunidade",
      "planejada", "em_desenvolvimento", "implementada", "nao_planejada",
    ] as const;
    for (const s of novos) {
      expect(SUGGESTION_STATUS_LABEL[s]).toBeTruthy();
      expect(SUGGESTION_STATUS_BADGE_CLASS[s]).toBeTruthy();
    }
  });

  it("status legados continuam com rótulo (registros antigos não quebram)", () => {
    expect(SUGGESTION_STATUS_LABEL.lida).toBe("Lida");
    expect(SUGGESTION_STATUS_LABEL.entregue).toBe("Entregue");
    expect(SUGGESTION_STATUS_LABEL.arquivada).toBe("Arquivada");
  });

  it("listagem pública nunca exibe status internos/legados", () => {
    expect(SUGGESTION_PUBLIC_STATUSES).not.toContain("lida");
    expect(SUGGESTION_PUBLIC_STATUSES).not.toContain("arquivada");
    expect(SUGGESTION_PUBLIC_STATUSES).not.toContain("nao_planejada");
    expect(SUGGESTION_PUBLIC_STATUSES).toContain("implementada");
  });

  it("limites de tamanho do formulário permanecem preservados", () => {
    expect(SUGGESTION_TITLE_MAX).toBe(100);
    expect(SUGGESTION_DESCRIPTION_MAX).toBe(1000);
  });
});
