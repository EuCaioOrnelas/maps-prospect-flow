import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSDRContactStatus } from "./useSDRContactStatus";

const mocks = vi.hoisted(() => ({ contains: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));

describe("SDR contact connection isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contains.mockResolvedValue({ data: [], error: null });
    const query = { select: () => query, eq: () => query, contains: mocks.contains };
    mocks.from.mockReturnValue(query);
  });
  it("only looks up agents linked to the selected WhatsApp number", async () => {
    const { result } = renderHook(() => useSDRContactStatus("5511999990000", "owner", "evolution-number"));
    await waitFor(() => expect(result.current.status?.state).toBe("no_agent"));
    expect(mocks.contains).toHaveBeenCalledWith("whatsapp_number_ids", ["evolution-number"]);
  });
  it("does not select an arbitrary agent when the connection is absent", () => {
    renderHook(() => useSDRContactStatus("5511999990000", "owner", null));
    expect(mocks.from).not.toHaveBeenCalled();
  });
});