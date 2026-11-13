import { supabase } from '@/integrations/supabase/client';
import type { WiizeUpdate } from './updates';

type MediaUrls = { media?: string; poster?: string };
type Entry = { expires: number; urls: Promise<MediaUrls>; warm?: Promise<void> };
const cache = new Map<string, Entry>();
let parkedVideo: HTMLVideoElement | undefined;
let generation = 0;
const keyFor = (item: WiizeUpdate) => JSON.stringify([item.id, item.media_type, item.media_path, item.poster_path]);

// Private signed URLs stay in memory only and are discarded on account changes.
export function clearUpdateMediaCache() {
  generation += 1;
  cache.clear();
  releaseVideo();
}
function releaseVideo() {
  if (!parkedVideo) return;
  parkedVideo.pause();
  parkedVideo.removeAttribute('src');
  parkedVideo.load();
  parkedVideo = undefined;
}
export function resolveUpdateMedia(item: WiizeUpdate): Promise<MediaUrls> {
  const key = keyFor(item);
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.urls;
  const paths = [...new Set([item.media_path, item.poster_path].filter((p): p is string => !!p))];
  if (!paths.length) return Promise.resolve({});
  const urls = supabase.storage.from('wiize-updates').createSignedUrls(paths, 3600).then(({ data, error }) => {
    if (error) throw error;
    const signed = new Map(data?.map(row => [row.path, row.signedUrl]));
    return { media: item.media_path ? signed.get(item.media_path) : undefined, poster: item.poster_path ? signed.get(item.poster_path) : undefined };
  });
  if (cache.size >= 4) cache.delete(cache.keys().next().value ?? '');
  cache.set(key, { expires: Date.now() + 50 * 60 * 1000, urls });
  void urls.catch(() => { if (cache.get(key)?.urls === urls) cache.delete(key); });
  return urls;
}
function warmImage(url: string) {
  return new Promise<void>(resolve => {
    const image = new Image();
    image.fetchPriority = 'low';
    image.onload = () => { void image.decode().catch(() => {}).finally(resolve); };
    image.onerror = () => resolve();
    image.src = url;
  });
}
function warmVideo(url: string) {
  releaseVideo();
  const video = document.createElement('video');
  parkedVideo = video;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  return new Promise<void>(resolve => {
    const finish = () => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('error', finish);
      resolve();
    };
    const loaded = () => { video.preload = 'metadata'; finish(); };
    const timer = setTimeout(() => { if (parkedVideo === video) releaseVideo(); finish(); }, 4000);
    video.addEventListener('loadeddata', loaded, { once: true });
    video.addEventListener('error', finish, { once: true });
    video.src = url;
    video.load();
  });
}
export function prepareUpdateMedia(item: WiizeUpdate): Promise<void> {
  const urls = resolveUpdateMedia(item);
  const entry = cache.get(keyFor(item));
  if (entry?.warm) return entry.warm;
  const currentGeneration = generation;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const warm = urls.then(async resolved => {
    if (currentGeneration !== generation) return;
    const work: Promise<void>[] = [];
    if (resolved.poster) work.push(warmImage(resolved.poster));
    if (resolved.media && item.media_type === 'image') work.push(warmImage(resolved.media));
    if (resolved.media && item.media_type === 'video' && !connection?.saveData && !['slow-2g', '2g'].includes(connection?.effectiveType ?? '')) work.push(warmVideo(resolved.media));
    await Promise.all(work);
  }).catch(() => {});
  if (entry) entry.warm = warm;
  return warm;
}
// Never hold the dashboard or a manual click indefinitely on a slow connection.
export async function waitForUpdateMedia(item: WiizeUpdate, budget = 1200) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([prepareUpdateMedia(item), new Promise<void>(resolve => { timer = setTimeout(resolve, budget); })]);
  clearTimeout(timer);
}