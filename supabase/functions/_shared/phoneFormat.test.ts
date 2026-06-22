// Regressão: formatPhoneForMeta vs requisitos Meta Cloud API
// Meta exige: E.164 sem "+", 10–15 dígitos. Ex: 5511999998888
// Doc: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { formatPhoneForMeta } from "./phoneFormat.ts";

Deno.test("BR celular 11 dígitos sem DDI → adiciona 55", () => {
  assertEquals(formatPhoneForMeta("11999998888"), "5511999998888");
});

Deno.test("BR celular formatado humano → normaliza", () => {
  assertEquals(formatPhoneForMeta("(11) 99999-8888"), "5511999998888");
});

Deno.test("BR fixo 10 dígitos sem DDI → adiciona 55 + insere 9º dígito (assume mobile)", () => {
  // Comportamento atual: fixos viram mobile. Usuário aceita pois fixos hoje podem ter WhatsApp.
  assertEquals(formatPhoneForMeta("1133334444"), "5511933334444");
});

Deno.test("BR já com 55 + DDD + 8 dígitos (12 totais) → insere 9º dígito", () => {
  assertEquals(formatPhoneForMeta("551199998888"), "5511999998888");
});

Deno.test("BR já formatado E.164 13 dígitos → mantém intacto (idempotente)", () => {
  assertEquals(formatPhoneForMeta("5511999998888"), "5511999998888");
});

Deno.test("Internacional com + → strip + mantém DDI", () => {
  assertEquals(formatPhoneForMeta("+14155552671"), "14155552671"); // USA
  assertEquals(formatPhoneForMeta("+351912345678"), "351912345678"); // PT
});

Deno.test("Internacional com 00 prefix → strip 00 mantém DDI", () => {
  assertEquals(formatPhoneForMeta("0014155552671"), "14155552671");
});

Deno.test("Internacional sem + NÃO recebe 55 BR se tem 12+ dígitos", () => {
  assertEquals(formatPhoneForMeta("351912345678"), "351912345678");
});

Deno.test("Vazio/inválido → retorna string vazia", () => {
  assertEquals(formatPhoneForMeta(""), "");
  assertEquals(formatPhoneForMeta("abc"), "");
  assertEquals(formatPhoneForMeta("123"), ""); // < 10 dígitos
  assertEquals(formatPhoneForMeta("1234567890123456"), ""); // > 15 dígitos
});

Deno.test("Meta E.164 compliance: resultado sempre entre 10 e 15 dígitos, só números", () => {
  const samples = [
    "11999998888",
    "(11) 99999-8888",
    "+14155552671",
    "5511999998888",
    "551199998888",
  ];
  for (const s of samples) {
    const out = formatPhoneForMeta(s);
    if (out) {
      const ok = /^\d{10,15}$/.test(out);
      assertEquals(ok, true, `Falhou Meta E.164: ${s} → ${out}`);
    }
  }
});
