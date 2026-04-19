import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { buildCreditCardHolderInfo, buildDirectSubscriptionHolderInfo, normalizeBrazilianState } from "./index.ts";

Deno.test("normalizeBrazilianState returns UF when already valid", () => {
  assertEquals(normalizeBrazilianState("PR"), "PR");
});

Deno.test("normalizeBrazilianState converts state names to UF", () => {
  assertEquals(normalizeBrazilianState("Paraná"), "PR");
  assertEquals(normalizeBrazilianState("São Paulo"), "SP");
});

Deno.test("buildCreditCardHolderInfo includes city/state/complement for Asaas cardholder validation", () => {
  const holder = buildCreditCardHolderInfo({
    customerData: {
      name: "Caio Wiize",
      email: "caio@example.com",
      address: "Rua Germano Berloffa",
      addressNumber: "190",
      addressComplement: "Apto 12",
      neighborhood: "Central",
    },
    cpfCnpj: "15803674966",
    postalCode: "87140190",
    city: "Paiçandu",
    state: "PR",
    phone: "44988064161",
  });

  assertEquals(holder.postalCode, "87140190");
  assertEquals(holder.addressNumber, "190");
  assertEquals(holder.address, "Rua Germano Berloffa");
  assertEquals(holder.province, "Central");
  assertEquals((holder as Record<string, unknown>).city, "Paiçandu");
  assertEquals((holder as Record<string, unknown>).state, "Paraná");
  assertEquals((holder as Record<string, unknown>).complement, "Apto 12");
});

Deno.test("buildDirectSubscriptionHolderInfo sends expanded state name and city", () => {
  const holder = buildDirectSubscriptionHolderInfo({
    customerData: {
      name: "Caio Wiize",
      email: "caio@example.com",
      address: "Rua Germano Berloffa",
      addressNumber: "190",
      neighborhood: "Central",
    },
    cpfCnpj: "15803674966",
    postalCode: "87140190",
    city: "Paiçandu",
    state: "Paraná",
    phone: "44988064161",
  });

  assertEquals(holder.postalCode, "87140190");
  assertEquals(holder.address, "Rua Germano Berloffa");
  assertEquals(holder.province, "Central");
  assertEquals((holder as Record<string, unknown>).city, "Paiçandu");
  assertEquals((holder as Record<string, unknown>).state, "Paraná");
});