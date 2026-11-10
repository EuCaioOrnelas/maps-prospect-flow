import { getYouTubeEmbedUrl } from "@/services/aprendizado/youtube";

/** Player incorporado do YouTube (dominio nocookie), inclusive para videos nao listados. */
export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border border-border bg-foreground">
      <iframe
        src={getYouTubeEmbedUrl(videoId)}
        title={title}
        className="h-full w-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
