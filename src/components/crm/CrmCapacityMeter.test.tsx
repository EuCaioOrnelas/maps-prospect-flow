import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrmCapacityMeter } from "./CrmCapacityMeter";

const base = {
  count: 0,
  limit: 1000,
  baseLimit: 1000,
  extraContacts: 0,
  extraPacks: 0,
  hasLimit: true,
  atLimit: false,
  nearLimit: false,
  onUpgrade: vi.fn(),
};

describe("CrmCapacityMeter", () => {
  it("shows used contacts, the percentage and the upgrade link when the plan has a limit", () => {
    const onUpgrade = vi.fn();
    const { container } = render(<CrmCapacityMeter {...base} count={640} onUpgrade={onUpgrade} />);
    expect(container.textContent).toContain("640");
    expect(container.textContent).toContain("/ 1.000");
    expect(container.textContent).toContain("64% usado");
    fireEvent.click(screen.getByRole("button", { name: "Aumentar capacidade" }));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  it("warns when the CRM is full", () => {
    const { container } = render(
      <CrmCapacityMeter {...base} count={1000} atLimit nearLimit onUpgrade={vi.fn()} />,
    );
    expect(container.textContent).toContain("CRM lotado");
    expect(container.textContent).not.toContain("64% usado");
  });

  it("shows the plan plus extra contacts when add-ons are active", () => {
    const { container } = render(
      <CrmCapacityMeter
        {...base}
        count={1200}
        limit={2000}
        extraContacts={1000}
        extraPacks={1}
        onUpgrade={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("1.200");
    expect(container.textContent).toContain("/ 2.000");
    expect(container.textContent).toContain("plano 1.000 + 1.000 extras");
  });

  it("says the plan has no limit and hides the upgrade link in that case", () => {
    const { container } = render(
      <CrmCapacityMeter
        {...base}
        limit={Infinity}
        baseLimit={Infinity}
        hasLimit={false}
        onUpgrade={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("Seu plano não tem limite de contatos.");
    expect(screen.queryByRole("button", { name: "Aumentar capacidade" })).not.toBeInTheDocument();
  });
});
