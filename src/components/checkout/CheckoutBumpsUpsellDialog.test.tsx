import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutBumpsUpsellDialog } from "./CheckoutBumpsUpsellDialog";

vi.mock("@/config/orderBumps", async () => {
  const actual = await vi.importActual<typeof import("@/config/orderBumps")>("@/config/orderBumps");
  return {
    ...actual,
    getBumpsForPlan: () => [],
  };
});

describe("CheckoutBumpsUpsellDialog", () => {
  it("não deixa uma janela invisível quando não existem adicionais", () => {
    render(
      <CheckoutBumpsUpsellDialog
        open
        onOpenChange={() => {}}
        planKey="sem-adicionais"
        planName="Plano"
        billingPeriod="monthly"
        selection={{ numbers: 0, contacts: 0, opportunities: 0 }}
        onChange={() => {}}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
