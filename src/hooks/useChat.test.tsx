import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useChat';

const mocks = vi.hoisted(() => ({ query: vi.fn(), invoke: vi.fn(), owner: 'owner' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' }, accountOwnerId: mocks.owner }) }));
vi.mock('@/lib/profilePicCache', () => ({ hydrateProfilePics: (rows: unknown) => rows }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: () => ({ select: () => ({ eq: mocks.query }) }),
  functions: { invoke: mocks.invoke },
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
} }));

describe('Chat startup recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.invoke.mockResolvedValue({ data: { conversations: [] }, error: null });
  });
  it('settles a connection failure and retries successfully', async () => {
    mocks.query.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).not.toBeNull();
    mocks.query.mockResolvedValue({ data: [{ id: 'number', provider: 'evolution', status: 'active', evolution_state: 'open' }], error: null });
    act(() => result.current.retryLoad());
    await waitFor(() => expect(result.current.activeConnectionId).toBe('number'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadError).toBeNull();
  });
  it('loads again after leaving and returning to Chat', async () => {
    mocks.query.mockResolvedValue({ data: [{ id: 'number', provider: 'evolution', status: 'active', evolution_state: 'open' }], error: null });
    const first = renderHook(() => useChat());
    await waitFor(() => expect(first.result.current.activeConnectionId).toBe('number'));
    first.unmount();
    const second = renderHook(() => useChat());
    await waitFor(() => expect(second.result.current.activeConnectionId).toBe('number'));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.loadError).toBeNull();
  });
});