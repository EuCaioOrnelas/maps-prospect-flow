/** Extracao e montagem de URLs do YouTube para as aulas da central. */

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const PATH_PREFIXES = ["embed", "shorts", "live", "v"];

/** Retorna o ID de 11 caracteres do video ou null quando a URL nao e do YouTube. */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const input = rawUrl.trim();
  if (!input) return null;

  // Aceita o ID puro colado pelo administrador.
  if (VIDEO_ID_PATTERN.test(input)) return input;

  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  if (host !== "youtube.com" && host !== "youtube-nocookie.com" && host !== "youtu.be") return null;

  const segments = url.pathname.split("/").filter(Boolean);
  let candidate: string | null = null;

  if (host === "youtu.be") {
    candidate = segments[0] ?? null;
  } else if (url.pathname === "/watch") {
    candidate = url.searchParams.get("v");
  } else if (segments.length >= 2 && PATH_PREFIXES.includes(segments[0])) {
    candidate = segments[1];
  } else if (segments[0] === "watch") {
    candidate = url.searchParams.get("v");
  } else if (segments[0] === "attribution_link") {
    candidate = url.searchParams.get("v");
  }

  if (!candidate) return null;
  const clean = candidate.split(/[?&#]/)[0];
  return VIDEO_ID_PATTERN.test(clean) ? clean : null;
}

export function getYouTubeEmbedUrl(videoId: string, autoplay = false): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}${autoplay ? "?autoplay=1" : ""}`;
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
