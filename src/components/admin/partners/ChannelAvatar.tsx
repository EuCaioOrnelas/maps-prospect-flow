import { useEffect, useState } from "react";
import { Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Avatar do canal do YouTube.
 * As URLs do `yt3.ggpht.com` quebram quando o navegador envia o header Referer,
 * por isso usamos `referrerPolicy="no-referrer"` + fallback com iniciais/ícone.
 */
interface Props {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export function ChannelAvatar({ src, name, size = 36, className }: Props) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);

  const initials = (name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const style = { width: size, height: size, minWidth: size };

  if (!src || broken) {
    return (
      <div
        style={style}
        className={cn(
          "rounded-xl bg-muted ring-1 ring-border flex items-center justify-center text-muted-foreground shrink-0",
          className,
        )}
      >
        {initials ? (
          <span className="text-[11px] font-semibold">{initials}</span>
        ) : (
          <Youtube size={Math.round(size * 0.45)} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name || "Canal"}
      style={style}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className={cn("rounded-xl object-cover ring-1 ring-border shrink-0 bg-muted", className)}
    />
  );
}
