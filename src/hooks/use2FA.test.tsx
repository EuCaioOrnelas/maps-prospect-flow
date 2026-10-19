import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { use2FAStatus } from './use2FA';

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), getSession: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession }, functions: { invoke: mocks.invoke },
} }));

describe('second-factor recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } } });
  });
  it('never replaces a failed check with an unlocked status and can retry', async () => {
    mocks.invoke.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => use2FAStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).not.toBeNull();
    mocks.invoke.mockResolvedValueOnce({ data: { two_factor_enabled: true, session_verified: false }, error: null });
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status?.two_factor_enabled).toBe(true);
    expect(result.current.status?.session_verified).toBe(false);
    expect(result.current.error).toBeNull();
  });
});