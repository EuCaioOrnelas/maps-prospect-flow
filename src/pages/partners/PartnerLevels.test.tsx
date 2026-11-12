import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import PartnerLevels from "./PartnerLevels";

vi.mock("react-router-dom", () => ({
  useOutletContext: () => ({ partner: { id: "partner-regression" } }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = {
        data: table === "partners"
          ? { level: "legacy_level", custom_commission_percent: null }
          : table === "partner_settings"
            ? {
                select_commission_percent: 10,
                signature_commission_percent: 15,
                prime_commission_percent: 20,
                signature_threshold_clients: 10,
                prime_threshold_clients: 20,
              }
            : [],
      };
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
    rpc: async () => ({ data: 0 }),
  },
}));

describe("PartnerLevels runtime regression", () => {
  it("finishes loading with an unsupported persisted level instead of reading label from undefined", async () => {
    const view = render(<PartnerLevels />);
    await waitFor(() => expect(view.queryByText("Níveis & Progresso")).not.toBeNull());
    expect(view.queryByText("Seu nível atual")).not.toBeNull();
  });
});