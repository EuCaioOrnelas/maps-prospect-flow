import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput";

vi.mock("@/hooks/useQuickReplies", () => ({
  useQuickReplies: () => ({ items: [] }),
  applyQuickReplyVariables: (content: string) => content,
  quickReplySteps: () => [],
}));
vi.mock("@/hooks/useQuickReplyContext", () => ({ useQuickReplyContext: () => ({}) }));
vi.mock("@/hooks/useContactAIApproach", () => ({
  useContactAIApproach: () => ({ message: null, leadName: null }),
}));
vi.mock("@/lib/quickReplyRuns", () => ({
  startQuickReplyRun: vi.fn(),
  cancelQuickReplyRun: vi.fn(),
  getQuickReplyRun: () => null,
  subscribeQuickReplyRuns: () => () => {},
}));

describe("ChatInput external draft", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("fills the generated approach without sending until the user clicks send", async () => {
    const onSendMessage = vi.fn();
    const onSendMedia = vi.fn();
    const message = "Olá! Preparei esta abordagem para a sua empresa.";

    render(
      <ChatInput
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        conversation={{ contact_name: "Empresa", contact_phone: "5511999999999" }}
        conversationId="conversation-1"
        inputDraft={{ conversationId: "conversation-1", text: message, version: 1 }}
      />,
    );

    const input = screen.getByPlaceholderText("Digite uma mensagem");
    await waitFor(() => expect(input).toHaveValue(message));
    expect(onSendMessage).not.toHaveBeenCalled();
    expect(onSendMedia).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("wiize:chat:draft:conversation-1")).toBe(message);

    fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));

    expect(onSendMessage).toHaveBeenCalledWith(message, undefined);
    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("");
  });

  it("does not apply a draft addressed to another conversation", async () => {
    const onSendMessage = vi.fn();
    render(
      <ChatInput
        onSendMessage={onSendMessage}
        onSendMedia={vi.fn()}
        conversation={{ contact_phone: "5511999999999" }}
        conversationId="conversation-2"
        inputDraft={{ conversationId: "conversation-1", text: "Não usar neste contato", version: 1 }}
      />,
    );

    await waitFor(() => expect(screen.getByPlaceholderText("Digite uma mensagem")).toHaveValue(""));
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
