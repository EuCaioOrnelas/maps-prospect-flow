import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WiizePayEmbedFrame } from "./WiizePayEmbedFrame";
import { createWiizePayEmbedTicket } from "@/hooks/useWiizePayCharges";

vi.mock("@/hooks/useWiizePayCharges", () => ({
  WIIZEPAY_ORIGIN: "https://wiizepay.com",
  createWiizePayEmbedTicket: vi.fn(),
}));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("WiizePay embedded loading", () => {
  it("reserves space before the ticket arrives and removes the loader without an extra delay", async () => {
    vi.mocked(createWiizePayEmbedTicket).mockResolvedValue({ url: "https://wiizepay.com.br/embed/contract", origin: "https://wiizepay.com.br" });
    render(<WiizePayEmbedFrame kind="contract" onEvent={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Conectando à WiizePay");
    const frame = await screen.findByTitle("WiizePay");
    expect(frame).toHaveClass("h-full", "border-0");
    fireEvent.load(frame);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("accepts messages only from the actual approved origin and its frame", async () => {
    const onEvent = vi.fn();
    vi.mocked(createWiizePayEmbedTicket).mockResolvedValue({ url: "https://wiizepay.com.br/embed/service", origin: "https://wiizepay.com.br" });
    render(<WiizePayEmbedFrame kind="service" onEvent={onEvent} />);
    const frame = await screen.findByTitle("WiizePay") as HTMLIFrameElement;
    const data = { source: "wiizepay", type: "wiizepay:contract.selected", contract_id: "contract-1" };
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://untrusted.example", source: frame.contentWindow, data })));
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://wiizepay.com.br", source: window, data })));
    expect(onEvent).not.toHaveBeenCalled();
    act(() => window.dispatchEvent(new MessageEvent("message", { origin: "https://wiizepay.com.br", source: frame.contentWindow, data })));
    expect(onEvent).toHaveBeenCalledWith({ type: data.type, contract_id: "contract-1" });
  });

  it("rejects a ticket URL outside WiizePay", async () => {
    vi.mocked(createWiizePayEmbedTicket).mockResolvedValue({ url: "https://untrusted.example/embed", origin: "https://untrusted.example" });
    render(<WiizePayEmbedFrame kind="charge" onEvent={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Endereço da WiizePay não reconhecido"));
    expect(screen.queryByTitle("WiizePay")).not.toBeInTheDocument();
  });

  it("offers retry when opening takes too long", async () => {
    vi.useFakeTimers();
    vi.mocked(createWiizePayEmbedTicket).mockReturnValue(new Promise(() => {}));
    render(<WiizePayEmbedFrame kind="charge" onEvent={vi.fn()} />);
    act(() => vi.advanceTimersByTime(12000));
    expect(screen.getByRole("status")).toHaveTextContent("mais tempo que o habitual");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(createWiizePayEmbedTicket).toHaveBeenCalledTimes(2);
  });

  it("forwards the chosen service name, amount and type", async () => {
    const onEvent = vi.fn();
    vi.mocked(createWiizePayEmbedTicket).mockResolvedValue({ url: "https://wiizepay.com/embed/service", origin: "https://wiizepay.com" });
    render(<WiizePayEmbedFrame kind="service" onEvent={onEvent} />);
    const frame = await screen.findByTitle("WiizePay") as HTMLIFrameElement;
    act(() => window.dispatchEvent(new MessageEvent("message", {
      origin: "https://wiizepay.com",
      source: frame.contentWindow,
      data: { source: "wiizepay", type: "wiizepay:service.selected", service_id: "s-1", name: "Consultoria", amount_cents: 150000, service_type: "recurring", created: true },
    })));
    expect(onEvent).toHaveBeenCalledWith({ type: "wiizepay:service.selected", service_id: "s-1", name: "Consultoria", amount_cents: 150000, service_type: "recurring", created: true });
  });

  it("keeps the service when the type is unknown", async () => {
    const onEvent = vi.fn();
    vi.mocked(createWiizePayEmbedTicket).mockResolvedValue({ url: "https://wiizepay.com/embed/service", origin: "https://wiizepay.com" });
    render(<WiizePayEmbedFrame kind="service" onEvent={onEvent} />);
    const frame = await screen.findByTitle("WiizePay") as HTMLIFrameElement;
    act(() => window.dispatchEvent(new MessageEvent("message", {
      origin: "https://wiizepay.com",
      source: frame.contentWindow,
      data: { source: "wiizepay", type: "wiizepay:service.selected", service_id: "s-2", name: "Suporte", amount_cents: 8900, service_type: "weird" },
    })));
    expect(onEvent).toHaveBeenCalledWith({ type: "wiizepay:service.selected", service_id: "s-2", name: "Suporte", amount_cents: 8900, service_type: undefined, created: false });
  });
});