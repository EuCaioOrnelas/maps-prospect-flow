import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decryptMessageFields, encryptMessageFields } from "./messageCrypto.ts";

Deno.test("encrypted incoming Portuguese message can be read by the SDR", async () => {
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", "test-only-encryption-key-not-for-production-123456");
  const message = { content: "Olá, quero conhecer a Wiize!", media_caption: "Cotação" };
  const encrypted = await encryptMessageFields(message);
  assertEquals(encrypted.content === message.content, false);
  assertEquals(await decryptMessageFields(encrypted), message);
});

Deno.test("unencrypted legacy message stays readable", async () => {
  assertEquals(await decryptMessageFields({ content: "Olá", media_caption: null }), { content: "Olá", media_caption: null });
});

Deno.test("invalid ciphertext must not be accepted", async () => {
  await assertRejects(() => decryptMessageFields({ content: "enc:v1:AAAA:AAAA" }));
});