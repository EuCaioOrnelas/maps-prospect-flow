import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheckoutBumpsUpsellDialog } from "./CheckoutBumpsUpsellDialog";

describe("CheckoutBumpsUpsellDialog", () => {
  it("renderiza um único controle de fechar e libera a página ao usá-lo", () => {
    const onOpenChange = vi.fn();
    render(
      <CheckoutBumpsUpsellDialog
        open
        onOpenChange={onOpenChange}
        planKey="growth"
        planName="Plano"
        billingPeriod="monthly"
        selection={{ numbers: 0, contacts: 0, opportunities: 0 }}
        onChange={() => {}}
      />,
    );

    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    expect(closeButtons).toHaveLength(1);
    fireEvent.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
