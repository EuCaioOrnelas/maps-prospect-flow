import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { buildCreditCardHolderInfo, buildDirectSubscriptionHolderInfo, normalizeBrazilianState } from "./index.ts";

Deno.test("normalizeBrazilianState returns UF when already valid", () => {
  assertEquals(normalizeBrazilianState("PR"), "PR");
});

Deno.test("normalizeBrazilianState converts state names to UF", () => {
  assertEquals(normalizeBrazilianState("Paraná"), "PR");
  assertEquals(normalizeBrazilianState("São Paulo"), "SP");
});

Deno.test("buildCreditCardHolderInfo sends cityName and normalized state", () => {
  const holder = buildCreditCardHolderInfo({
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

  assertEquals(holder.cityName, "Paiçandu");
  assertEquals(holder.city, "Paiçandu");
  assertEquals(holder.state, "PR");
});

Deno.test("buildDirectSubscriptionHolderInfo sends city and cityName for Asaas compatibility", () => {
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

  assertEquals(holder.city, "Paiçandu");
  assertEquals(holder.cityName, "Paiçandu");
  assertEquals(holder.state, "PR");
});