import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useUserNotifications } from "./useUserNotifications";

const rpc = vi.fn();
const updatePayloads: Record<string, unknown>[] = [];
let notifications: Array<Record<string, unknown>> = [];

const makeQuery = () => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    update: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload);
      return query;
    }),
    then: (resolve: (value: unknown) => void) =>
      resolve({ data: notifications, error: null, count: notifications.length }),
  };
  return query;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => makeQuery()),
    rpc: (...args: unknown[]) => rpc(...args),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const updateNotification = {
  id: "n1",
  kind: "wiize_update",
  title: "Novidade",
  body: null,
  link: null,
  metadata: { announcement_id: "announcement-1" },
  read_at: null,
  created_at: "2026-01-01",
};
const commentNotification = {
  id: "n2",
  kind: "task_comment",
  title: "Comentario",
  body: null,
  link: null,
  metadata: {},
  read_at: null,
  created_at: "2026-01-02",
};

const updateEvents = () => rpc.mock.calls.filter(([name]) => name === "updates_record_event");

describe("useUserNotifications - sincronizacao com o popup de novidades", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    updatePayloads.length = 0;
    notifications = [updateNotification, commentNotification];
  });

  it("apagar uma novidade no sino registra view e dismiss com a mesma apresentacao", async () => {
    const { result } = renderHook(() => useUserNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.clearOne("n1");
    });

    const events = updateEvents();
    expect(events.map(([, args]: any) => args._event)).toEqual(["view", "dismiss"]);
    expect(events[0][1]._id).toBe("announcement-1");
    expect(events[0][1]._presentation).toBe(events[1][1]._presentation);
    expect(updatePayloads.some((payload) => "cleared_at" in payload)).toBe(true);
    expect(result.current.items.map((item) => item.id)).toEqual(["n2"]);
  });

  it("marcar novidade como lida tambem impede o popup de voltar", async () => {
    const { result } = renderHook(() => useUserNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.markRead("n1");
    });

    expect(updateEvents().map(([, args]: any) => args._event)).toEqual(["view", "dismiss"]);
  });

  it("avisos comuns nao geram eventos de novidade", async () => {
    const { result } = renderHook(() => useUserNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.clearOne("n2");
    });

    expect(updateEvents()).toHaveLength(0);
  });

  it("marcar tudo como lido sincroniza apenas as novidades", async () => {
    const { result } = renderHook(() => useUserNotifications());
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    await act(async () => {
      await result.current.markAllRead();
    });

    const events = updateEvents();
    expect(events).toHaveLength(2);
    expect(events.every(([, args]: any) => args._id === "announcement-1")).toBe(true);
  });
});
