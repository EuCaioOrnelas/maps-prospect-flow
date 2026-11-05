import { describe, expect, it } from "vitest";
import {
  authorizedPriceRanges,
  extractMentionedPrices,
  findUnauthorizedPrices,
  productPriceLabel,
} from "./sdrSales";

const siteProduct = {
  price_type: "fixed" as const,
  price_value: 2500,
  price_min: null,
  price_max: null,
  max_discount_percent: 10,
};

const trafficProduct = {
  price_type: "range" as const,
  price_value: null,
  price_min: 1200,
  price_max: 3000,
  max_discount_percent: 0,
};

const customProduct = {
  price_type: "custom" as const,
  price_value: null,
  price_min: null,
  price_max: null,
  max_discount_percent: 0,
};

describe("extractMentionedPrices", () => {
  it("extrai valores em R$ com formato pt-BR", () => {
    expect(extractMentionedPrices("O investimento é R$ 2.500,00 à vista")).toEqual([2500]);
    expect(extractMentionedPrices("fica R$ 1.200 por mês")).toEqual([1200]);
    expect(extractMentionedPrices("são 1500 reais")).toEqual([1500]);
  });

  it("ignora textos sem valor monetário", () => {
    expect(extractMentionedPrices("Posso te apresentar o que está incluído?")).toEqual([]);
  });
});

describe("authorizedPriceRanges", () => {
  it("aplica o desconto máximo no piso autorizado", () => {
    expect(authorizedPriceRanges([siteProduct])).toEqual([{ min: 2250, max: 2500 }]);
  });

  it("usa a faixa cadastrada quando não há desconto", () => {
    expect(authorizedPriceRanges([trafficProduct])).toEqual([{ min: 1200, max: 3000 }]);
  });

  it("produto sem preço numérico não autoriza nenhum valor", () => {
    expect(authorizedPriceRanges([customProduct])).toEqual([]);
  });
});

describe("findUnauthorizedPrices (anti-alucinação)", () => {
  const catalog = [siteProduct, trafficProduct, customProduct];

  it("aceita preço exato do catálogo", () => {
    expect(findUnauthorizedPrices(["O investimento é R$ 2.500,00"], catalog)).toEqual([]);
  });

  it("aceita preço dentro do desconto máximo autorizado", () => {
    expect(findUnauthorizedPrices(["Consigo fazer R$ 2.250,00 para fechar esta semana"], catalog)).toEqual([]);
  });

  it("bloqueia desconto acima do limite autorizado", () => {
    expect(findUnauthorizedPrices(["Fecho por R$ 1.800,00"], catalog)).toEqual([1800]);
  });

  it("bloqueia preço inventado fora do catálogo", () => {
    expect(findUnauthorizedPrices(["O site sai por R$ 999,00"], catalog)).toEqual([999]);
  });

  it("bloqueia qualquer valor quando o produto não tem preço cadastrado", () => {
    expect(findUnauthorizedPrices(["Custa uns R$ 800,00 mais ou menos"], [customProduct])).toEqual([800]);
  });

  it("aceita valor dentro da faixa de preço cadastrada", () => {
    expect(findUnauthorizedPrices(["A gestão fica entre R$ 1.200 e R$ 3.000, no seu caso R$ 1.800"], catalog)).toEqual([]);
  });
});

describe("productPriceLabel", () => {
  it("formata preço fixo mensal", () => {
    expect(productPriceLabel({ price_type: "fixed", price_value: 1500, billing_model: "mensal" })).toBe(
      "R$ 1.500,00/mês"
    );
  });

  it("formata faixa de preço", () => {
    expect(productPriceLabel({ price_type: "range", price_min: 1200, price_max: 3000, billing_model: "unico" })).toBe(
      "R$ 1.200,00 a R$ 3.000,00"
    );
  });

  it("informa investimento personalizado quando não há preço", () => {
    expect(productPriceLabel({ price_type: "custom" })).toBe("Investimento personalizado");
  });
});
