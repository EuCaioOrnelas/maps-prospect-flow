import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { encryptMessageFields } from "./messageCrypto.ts";

Deno.test("Evolution encrypted inbound reaches brain and sends a visible reply; a concurrent pause stops it", async () => {
  const originalFetch = globalThis.fetch;
  const originalServe = Deno.serve;
  const envNames = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "EVOLUTION_API_URL", "EVOLUTION_API_KEY", "WIIZE_MESSAGE_ENCRYPTION_KEY"];
  const saved = envNames.map((name) => Deno.env.get(name));
  let handler: ((req: Request) => Promise<Response>) | undefined;
  let paused = false;
  let sends = 0;
  let recorded = 0;
  let brainCalls = 0;
  const respond = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
  try {
    Deno.env.set("SUPABASE_URL", "https://sdr-test.invalid");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("EVOLUTION_API_URL", "https://evolution-test.invalid");
    Deno.env.set("EVOLUTION_API_KEY", "test-provider-key");
    Deno.env.set("WIIZE_MESSAGE_ENCRYPTION_KEY", "test-only-encryption-key-not-for-production-123456");
    const encrypted = await encryptMessageFields({ content: "Olá, quero conhecer a Wiize", media_caption: null });
    const session = { id: "session", status: "active", replies_received: 0, objective: "reuniao" };
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      const method = init?.method ?? "GET";
      if (url.pathname.endsWith("/sdr-brain")) {
        brainCalls++;
        const body = JSON.parse(String(init?.body));
        assertEquals(body.history[0].content, "Olá, quero conhecer a Wiize");
        return respond({ messages: ["Olá! Qual é o segmento da sua empresa?"], next_action: "responder" });
      }
      if (url.hostname === "evolution-test.invalid") {
        sends++;
        return respond({ key: { id: "outbound-id" } });
      }
      if (url.pathname.endsWith("/sdr_agents")) return respond([{ id: "agent", name: "Vendedor", objective: "reuniao", whatsapp_number_ids: ["connection"], triggers: { activation: ["inbound_all"], reply_delay: "immediate" } }]);
      if (url.pathname.endsWith("/sdr_sessions")) {
        if (method === "GET" && url.searchParams.get("select") === "status") return respond([{ status: paused ? "paused" : "active" }]);
        return respond([session]);
      }
      if (url.pathname.endsWith("/chat_messages")) {
        if (method === "POST") {
          recorded++;
          const body = JSON.parse(String(init?.body));
          assertEquals(body.waba_message_id, "outbound-id");
          assertEquals(body.status, "sent");
          assertEquals(body.content.startsWith("enc:v1:"), true);
          return respond(null);
        }
        return respond([{ direction: "inbound", content: encrypted.content }]);
      }
      if (url.pathname.endsWith("/user_waba_connections")) return respond([{ provider: "evolution", evolution_instance_name: "test-instance" }]);
      return respond([]);
    };
    // Capture the deployed entrypoint without starting a server.
    Deno.serve = ((callback: (req: Request) => Promise<Response>) => { handler = callback; return {}; }) as typeof Deno.serve;
    await import("./index.ts");
    if (!handler) throw new Error("Dispatch handler was not registered");
    const request = () => new Request("https://sdr-test.invalid/functions/v1/sdr-dispatch", {
      method: "POST", headers: { Authorization: "Bearer test-service-key", "Content-Type": "application/json" },
      body: JSON.stringify({ owner_user_id: "owner", waba_connection_id: "connection", conversation_id: "conversation", contact_phone: "5511999990000", message: "Olá, quero conhecer a Wiize" }),
    });
    const first = await handler(request());
    assertEquals(first.status, 200);
    assertEquals((await first.json()).sent, 1);
    assertEquals(sends, 1);
    assertEquals(recorded, 1);
    paused = true;
    const second = await handler(request());
    assertEquals((await second.json()).sent, 0);
    assertEquals(sends, 1);
    assertEquals(brainCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    Deno.serve = originalServe;
    envNames.forEach((name, i) => saved[i] === undefined ? Deno.env.delete(name) : Deno.env.set(name, saved[i]));
  }
});