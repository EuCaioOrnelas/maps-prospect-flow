import { describe, expect, it, vi } from "vitest";
import { getSdrTestError, requestSdrTest } from "./sdrTestRequest";

describe("SDR internal test", () => {
  it("shows the actual missing-key error rather than generic function failure", async () => {
    const error = { message: "Edge Function returned a non-2xx status code", context: new Response(JSON.stringify({ error: "Conecte sua chave na etapa Inteligência do SDR." }), { status: 400 }) };
    expect(await getSdrTestError(error)).toBe("Conecte sua chave na etapa Inteligência do SDR.");
  });
  it("keeps test turns non-persistent and returns the vendor response", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { messages: ["Olá! Como posso ajudar?"] }, error: null });
    const body = { agentId: "agent", persist: false, message: "Olá", triggerType: "inbound" };
    expect((await requestSdrTest(invoke, body, new AbortController().signal)).messages).toEqual(["Olá! Como posso ajudar?"]);
    expect(invoke).toHaveBeenCalledWith("sdr-brain", expect.objectContaining({ body: expect.objectContaining({ persist: false }) }));
  });
  it("never leaves the tester waiting indefinitely", async () => {
    await expect(requestSdrTest(() => new Promise(() => {}), {}, new AbortController().signal, 5)).rejects.toThrow("demorou para responder");
  });
  it("ends a test when its dialog is closed", async () => {
    const controller = new AbortController();
    const request = requestSdrTest(() => new Promise(() => {}), {}, controller.signal);
    controller.abort();
    await expect(request).rejects.toThrow("Teste interrompido");
  });
  it("rejects incomplete responses instead of pretending the SDR chose silence", async () => {
    await expect(requestSdrTest(async () => ({ data: {}, error: null }), {}, new AbortController().signal)).rejects.toThrow("resposta incompleta");
  });
});