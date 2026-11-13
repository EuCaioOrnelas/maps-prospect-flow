import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { save, insert } = vi.hoisted(() => ({ save: vi.fn(), insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ insert }), functions: { invoke: vi.fn().mockResolvedValue({}) },
} }));
import { CancellationFeedbackDialog } from "./CancellationFeedbackDialog";
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("motivo obrigatório antes de cancelar", () => {
  const openForm = () => {
    insert.mockReturnValue({ select: () => ({ single: save }) });
    const confirm = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn();
    render(<CancellationFeedbackDialog open onOpenChange={close} onConfirm={confirm} userId="user-1" provider="stripe" />);
    return { confirm, close };
  };
  const complete = () => {
    fireEvent.click(screen.getByRole("radio", { name: "Não vi resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("radio", { name: "Talvez no futuro" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelamento" }));
  };
  it("não avança sem motivo e não cancela se o registro falhar", async () => {
    save.mockResolvedValue({ data: null, error: { message: "permission denied" } });
    const { confirm, close } = openForm();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
    complete();
    await screen.findByRole("alert");
    expect(confirm).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
  it("envia o motivo escolhido e só cancela depois de confirmar a gravação", async () => {
    save.mockResolvedValue({ data: { id: "feedback-1" }, error: null });
    const { confirm, close } = openForm();
    complete();
    await waitFor(() => expect(confirm).toHaveBeenCalledWith("feedback-1"));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user-1", cancellation_reason: "no_results" }));
    await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  });
});