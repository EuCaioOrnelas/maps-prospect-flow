import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const BAR_COUNT = 32;

interface Props {
  /** Blob URL do áudio gravado */
  src: string;
  /** Duração conhecida em segundos (fallback quando o blob não reporta) */
  seconds?: number;
  avatarUrl?: string | null;
  initials?: string;
  /** Texto reconhecido pela Wian */
  transcript?: string | null;
}

/** Card de áudio no padrão WhatsApp, adaptado ao tema da Wiize (claro e escuro). */
export function BriefingAudioBubble({ src, seconds = 0, avatarUrl, initials = "EU", transcript }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(seconds);

  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) & 0x7fffffff;
    return Array.from({ length: BAR_COUNT }, () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return 0.28 + ((seed % 100) / 100) * 0.72;
    });
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    let raf = 0;
    const tick = () => {
      if (a && !a.paused && !a.ended) {
        setCurrent(a.currentTime);
        raf = requestAnimationFrame(tick);
      }
    };
    const onPlay = () => {
      setPlaying(true);
      raf = requestAnimationFrame(tick);
    };
    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(raf);
    };
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
      cancelAnimationFrame(raf);
    };
    const onDur = () => {
      if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
    };
  }, [src]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void a.play().catch(() => setPlaying(false));
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const progress = duration > 0 ? Math.min(1, current / duration) : 0;
  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-w-[230px] max-w-[300px]">
      <div className="flex items-center gap-2.5">
        <audio ref={audioRef} src={src} preload="metadata" />

        <button
          type="button"
          onClick={toggle}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-colors"
          aria-label={playing ? "Pausar áudio" : "Tocar áudio"}
        >
          {playing ? <Pause size={15} className="fill-current" /> : <Play size={15} className="fill-current" />}
        </button>

        <div className="flex-1 min-w-0">
          <div onClick={seek} className="relative h-[24px] flex items-center gap-[2px] cursor-pointer select-none">
            {bars.map((h, i) => {
              const filled = progress >= (i + 1) / bars.length;
              return (
                <span
                  key={i}
                  className={cn(
                    "flex-1 rounded-full transition-colors",
                    filled ? "bg-primary-foreground" : "bg-primary-foreground/40",
                  )}
                  style={{ height: `${Math.max(h * 20, 3)}px` }}
                />
              );
            })}
          </div>
          <span className="text-[10px] opacity-80">{fmt(playing || current > 0 ? current : duration)}</span>
        </div>

        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-sm overflow-hidden bg-primary-foreground/20 flex items-center justify-center text-[11px] font-semibold">
            {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <span>{initials}</span>}
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-foreground flex items-center justify-center">
            <Mic size={9} className="text-primary" />
          </span>
        </div>
      </div>

      {transcript && (
        <div className="mt-2 pt-2 border-t border-primary-foreground/25 text-[12px] leading-snug opacity-90 whitespace-pre-wrap">
          {transcript}
        </div>
      )}
    </div>
  );
}
