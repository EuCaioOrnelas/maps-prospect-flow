import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { SDRTestChatDialog } from "./SDRTestChatDialog";
Object.defineProperty(HTMLElement.prototype, "scrollTo", { configurable: true, value: vi.fn() });

afterEach(() => { cleanup(); invoke.mockReset(); });
describe("SDR test conversation", () => {
  it("sends a lead message, reads the response and retries a failure without duplicating the lead message", async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: "Conecte sua chave de inteligência." } })
      .mockResolvedValueOnce({ data: { messages: ["Olá! Qual é a necessidade da sua empresa?"], analysis: {}, next_action: "responder" }, error: null });
    render(<SDRTestChatDialog agent={{ id: "vendor-1", name: "Vendedor" }} open onOpenChange={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Escreva como o lead responderia..."), { target: { value: "Quero uma proposta" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem de teste" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Conecte sua chave de inteligência.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Olá! Qual é a necessidade da sua empresa?")).toBeInTheDocument();
    expect(screen.getAllByText("Quero uma proposta")).toHaveLength(1);
    expect(invoke).toHaveBeenLastCalledWith("sdr-brain", expect.objectContaining({ body: expect.objectContaining({ persist: false, message: "Quero uma proposta", agentId: "vendor-1" }) }));
  });
  it("lets the vendor initiate a test without sending anything to WhatsApp", async () => {
    invoke.mockResolvedValue({ data: { messages: ["Olá, sou seu vendedor."], analysis: {} }, error: null });
    render(<SDRTestChatDialog agent={{ id: "vendor-1" }} open onOpenChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "SDR inicia a conversa" }));
    expect(await screen.findByText("Olá, sou seu vendedor.")).toBeInTheDocument();
    await waitFor(() => expect(invoke).toHaveBeenCalledWith("sdr-brain", expect.objectContaining({ body: expect.objectContaining({ persist: false, triggerType: "outbound", message: "" }) })));
  });
});