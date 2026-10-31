import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WiizeUpdate } from './updates';
import { clearUpdateMediaCache, prepareUpdateMedia, resolveUpdateMedia, waitForUpdateMedia } from './updateMedia';

const mocks = vi.hoisted(() => ({ sign: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ createSignedUrls: mocks.sign }) } } }));
const item = { id: 'notice', media_type: 'video', media_path: 'movie.mp4', poster_path: 'cover.webp' } as WiizeUpdate;

describe('update media preparation', () => {
  beforeEach(() => {
    clearUpdateMediaCache();
    vi.clearAllMocks();
    mocks.sign.mockResolvedValue({ data: [{ path: 'movie.mp4', signedUrl: '/movie' }, { path: 'cover.webp', signedUrl: '/cover' }], error: null });
  });
  it('signs video and cover together and reuses the same request on opening', async () => {
    const first = resolveUpdateMedia(item);
    const second = resolveUpdateMedia(item);
    expect(first).toBe(second);
    expect(await first).toEqual({ media: '/movie', poster: '/cover' });
    expect(mocks.sign).toHaveBeenCalledTimes(1);
    expect(mocks.sign).toHaveBeenCalledWith(['movie.mp4', 'cover.webp'], 3600);
  });
  it('does not reuse private signed URLs after an account change', async () => {
    await resolveUpdateMedia(item);
    clearUpdateMediaCache();
    await resolveUpdateMedia(item);
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });
  it('signs edited media again instead of showing an old video', async () => {
    await resolveUpdateMedia(item);
    await resolveUpdateMedia({ ...item, media_path: 'new.mp4' });
    expect(mocks.sign).toHaveBeenLastCalledWith(['new.mp4', 'cover.webp'], 3600);
  });
  it('does not download video speculatively when data saver is enabled', async () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } });
    const create = vi.spyOn(document, 'createElement');
    await prepareUpdateMedia({ ...item, poster_path: null });
    expect(create).not.toHaveBeenCalledWith('video');
    create.mockRestore();
    Object.defineProperty(navigator, 'connection', { configurable: true, value: undefined });
  });
  it('bounds presentation waiting even when storage does not respond', async () => {
    vi.useFakeTimers();
    mocks.sign.mockReturnValue(new Promise(() => {}));
    let completed = false;
    const work = waitForUpdateMedia(item).then(() => { completed = true; });
    await vi.advanceTimersByTimeAsync(1199);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await work;
    expect(completed).toBe(true);
    vi.useRealTimers();
  });
  it('retries a failed signature instead of keeping a broken cache entry', async () => {
    mocks.sign.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(resolveUpdateMedia(item)).rejects.toThrow('offline');
    await resolveUpdateMedia(item);
    expect(mocks.sign).toHaveBeenCalledTimes(2);
  });
});