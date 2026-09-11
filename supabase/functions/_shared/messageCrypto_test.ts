import { assert, assertEquals, assertNotEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decryptMessage, encryptMessage, isEncryptedMessage } from "./messageCrypto.ts";

const KEY_A = "test-key-a-with-at-least-thirty-two-characters";
const KEY_B = "test-key-b-with-at-least-thirty-two-characters";

Deno.test("AES-GCM round-trip preserves Unicode content", async () => {
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", KEY_A);
  const encrypted = await encryptMessage("Olá, mensagem segura 🔐");
  assert(isEncryptedMessage(encrypted));
  assertEquals(await decryptMessage(encrypted), "Olá, mensagem segura 🔐");
});

Deno.test("AES-GCM uses a unique IV for each encryption", async () => {
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", KEY_A);
  const first = await encryptMessage("same message");
  const second = await encryptMessage("same message");
  assertNotEquals(first, second);
});

Deno.test("AES-GCM rejects a wrong key", async () => {
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", KEY_A);
  const encrypted = await encryptMessage("secret");
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", KEY_B);
  await assertRejects(() => decryptMessage(encrypted), Error, "could not be authenticated");
});

Deno.test("AES-GCM rejects tampered ciphertext", async () => {
  Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", KEY_A);
  const encrypted = await encryptMessage("secret");
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
  await assertRejects(() => decryptMessage(tampered), Error, "could not be authenticated");
});