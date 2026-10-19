import { describe, expect, it, vi } from 'vitest';
import { withRequestTimeout } from './requestTimeout';

describe('bounded reads', () => {
  it('returns a successful read', async () => {
    await expect(withRequestTimeout(Promise.resolve(42))).resolves.toBe(42);
  });

  it('rejects a stalled read and ignores a late response', async () => {
    vi.useFakeTimers();
    let resolveLate: (value: number) => void = () => {};
    const request = withRequestTimeout(new Promise<number>(resolve => { resolveLate = resolve; }), 15_000);
    const assertion = expect(request).rejects.toThrow('A conexão demorou demais');
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    resolveLate(42);
    vi.useRealTimers();
  });
});