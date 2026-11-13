import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ManualUserAccessDialog } from "./ManualUserAccessDialog";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), saved: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  rpc: mocks.rpc,
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { updated_at: "2026-11-13T13:00:00Z" } }) }) }) }),
} }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("manual user access", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ data: { success: true }, error: null }); });
  it("requests seven additional Growth trial days without confirming a payment", async () => {
    render(<ManualUserAccessDialog profile={{ id: "user-1", name: "Cliente", plan: "free" }} onSaved={mocks.saved} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar usuário e acesso" }));
    fireEvent.change(screen.getByLabelText("Motivo / observação"), { target: { value: "Prorrogação solicitada" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar alteração" })).toBeEnabled());
    fireEvent.submit(screen.getByRole("button", { name: "Salvar alteração" }).closest("form") as HTMLFormElement);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    expect(mocks.rpc.mock.calls[0][1]._payload).toMatchObject({ action: "trial", plan: "growth", days: 7, payment_confirmed: false, expected_updated_at: "2026-11-13T13:00:00Z" });
    expect(mocks.saved).toHaveBeenCalledOnce();
  });
  it("does not report a successful save if the server rejects the change", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "Somente administradores" } });
    render(<ManualUserAccessDialog profile={{ id: "user-1", name: "Cliente", plan: "free" }} onSaved={mocks.saved} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar usuário e acesso" }));
    fireEvent.change(screen.getByLabelText("Motivo / observação"), { target: { value: "Teste recusado" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar alteração" })).toBeEnabled());
    fireEvent.submit(screen.getByRole("button", { name: "Salvar alteração" }).closest("form") as HTMLFormElement);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalled());
    expect(mocks.saved).not.toHaveBeenCalled();
  });
});