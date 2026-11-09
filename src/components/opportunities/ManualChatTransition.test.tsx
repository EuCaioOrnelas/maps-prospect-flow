import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManualChatTransitionProvider, useManualChatTransition } from "./ManualChatTransition";

function Harness() {
  const transition = useManualChatTransition();
  return (
    <>
      <button onClick={transition.start}>Iniciar</button>
      <button onClick={() => transition.advance("draft")}>Rascunho</button>
      <button onClick={transition.complete}>Concluir</button>
      <button onClick={transition.cancel}>Cancelar</button>
    </>
  );
}

describe("ManualChatTransition", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("só chega a 100% quando o Chat confirma que o rascunho está pronto", () => {
    render(<ManualChatTransitionProvider><Harness /></ManualChatTransitionProvider>);
    act(() => screen.getByRole("button", { name: "Iniciar" }).click());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

    act(() => screen.getByRole("button", { name: "Rascunho" }).click());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "88");
    expect(screen.getByTestId("manual-chat-transition")).toBeInTheDocument();

    act(() => screen.getByRole("button", { name: "Concluir" }).click());
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    act(() => { vi.advanceTimersByTime(451); });
    expect(screen.queryByTestId("manual-chat-transition")).not.toBeInTheDocument();
  });

  it("fecha sem concluir quando a conexão precisa ser feita pelo usuário", () => {
    render(<ManualChatTransitionProvider><Harness /></ManualChatTransitionProvider>);
    act(() => screen.getByRole("button", { name: "Iniciar" }).click());
    act(() => screen.getByRole("button", { name: "Cancelar" }).click());
    expect(screen.queryByTestId("manual-chat-transition")).not.toBeInTheDocument();
  });
});
