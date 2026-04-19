import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { buildCreditCardHolderInfo, buildDirectSubscriptionHolderInfo, normalizeBrazilianState } from "./index.ts";

Deno.test("normalizeBrazilianState returns UF when already valid", () => {
  assertEquals(normalizeBrazilianState("PR"), "PR");
});

Deno.test("normalizeBrazilianState converts state names to UF", () => {
  assertEquals(normalizeBrazilianState("Paraná"), "PR");
  assertEquals(normalizeBrazilianState("São Paulo"), "SP");
});

Deno.test("buildCreditCardHolderInfo sends only the address fields Asaas accepts", () => {
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
    phone: "44988064161",
  });

  assertEquals(holder.postalCode, "87140190");
  assertEquals(holder.addressNumber, "190");
  assertEquals(holder.address, "Rua Germano Berloffa");
  assertEquals(holder.province, "Central");
  assertEquals((holder as Record<string, unknown>).city, undefined);
  assertEquals((holder as Record<string, unknown>).state, undefined);
});

Deno.test("buildDirectSubscriptionHolderInfo omits city/state to satisfy Asaas validation", () => {
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
    phone: "44988064161",
  });

  assertEquals(holder.postalCode, "87140190");
  assertEquals(holder.address, "Rua Germano Berloffa");
  assertEquals(holder.province, "Central");
  assertEquals((holder as Record<string, unknown>).city, undefined);
  assertEquals((holder as Record<string, unknown>).state, undefined);
});