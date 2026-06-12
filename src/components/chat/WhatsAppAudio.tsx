import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, Mic, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  src: string;
  isOutbound: boolean;
  avatarUrl?: string | null;
  avatarInitials?: string;
  avatarColorClass?: string;
  /** When provided, persists the transcription on the message metadata */
  messageId?: string;
  /** Initial transcription if already stored */
  initialTranscription?: string | null;
}

const SPEEDS = [1, 1.5, 2];

/** WhatsApp-style audio player with waveform + speed toggle on avatar hover */
export function WhatsAppAudio({ src, isOutbound, avatarUrl, avatarInitials = "", avatarColorClass = "bg-muted", messageId, initialTranscription }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hoverAvatar, setHoverAvatar] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(initialTranscription || null);
  const [transcribing, setTranscribing] = useState(false);

  // Generate stable pseudo-random bar heights from src
  const bars = useMemo(() => {
    const out: number[] = [];
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) & 0xffffffff;
    for (let i = 0; i < 40; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = (seed % 100) / 100;
      out.push(0.25 + v * 0.75);
    }
    return out;
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(a.currentTime);
    const onDur = () => setDuration(isFinite(a.duration) ? a.duration : 0);
    const onEnd = () => { setPlaying(false); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const cycleSpeed = () => {
    const idx = SPEEDS.indexOf(speed);
    setSpeed(SPEEDS[(idx + 1) % SPEEDS.length]);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const handleTranscribe = async () => {
    if (transcribing || transcription) return;
    setTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: { audio_url: src },
      });
      if (error) throw error;
      const text = (data as any)?.text || "";
      if (!text) {
        toast.error("Não foi possível transcrever o áudio");
        return;
      }
      setTranscription(text);
      // Persist on message metadata (best-effort)
      if (messageId) {
        try {
          const { data: msg } = await supabase.from("chat_messages").select("metadata").eq("id", messageId).single();
          const nextMeta = { ...((msg?.metadata as any) || {}), transcription: text };
          await supabase.from("chat_messages").update({ metadata: nextMeta }).eq("id", messageId);
        } catch (e) {
          console.warn("[transcribe] persist failed", e);
        }
      }
    } catch (e: any) {
      console.error("[transcribe] error", e);
      toast.error("Erro ao transcrever: " + (e?.message || "tente novamente"));
    } finally {
      setTranscribing(false);
    }
  };

  const progress = duration > 0 ? current / duration : 0;
  const displayTime = playing || current > 0 ? current : duration;
  const fmt = (s: number) => {
    if (!isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60); const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-w-[260px] max-w-[330px]">
      <div className="flex items-center gap-2 px-1 py-1">
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Play / Pause */}
        <button
          onClick={toggle}
          className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors"
          aria-label={playing ? "Pausar" : "Tocar"}
        >
          {playing ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current" />}
        </button>

        {/* Waveform + time */}
        <div className="flex-1 min-w-0">
          <div
            onClick={seek}
            className="relative h-[28px] flex items-center gap-[2px] cursor-pointer select-none"
          >
            {bars.map((h, i) => {
              const filled = i / bars.length <= progress;
              return (
                <span
                  key={i}
                  className="flex-1 rounded-full transition-colors"
                  style={{
                    height: `${Math.max(h * 24, 3)}px`,
                    backgroundColor: filled ? "#53bdeb" : "rgba(0,0,0,0.22)",
                  }}
                />
              );
            })}
            <span
              className="absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] rounded-full bg-[#53bdeb] shadow-sm pointer-events-none"
              style={{ left: `calc(${progress * 100}% - 5px)` }}
            />
          </div>
          <div className="flex items-center justify-between mt-[2px] px-[2px]">
            <span className="text-[11px] wa-text-timestamp">{fmt(displayTime)}</span>
          </div>
        </div>

        {/* Avatar / Speed toggle */}
        <button
          onClick={cycleSpeed}
          onMouseEnter={() => setHoverAvatar(true)}
          onMouseLeave={() => setHoverAvatar(false)}
          className={cn(
            "relative shrink-0 w-[36px] h-[36px] rounded-full overflow-hidden flex items-center justify-center text-white text-[12px] font-semibold transition-transform hover:scale-105",
            avatarColorClass
          )}
          title="Velocidade do áudio"
          aria-label="Alterar velocidade"
        >
          {avatarUrl ? (
            <img src={avatarUrl} className="w-full h-full object-cover" alt="" />
          ) : (
            <span>{avatarInitials}</span>
          )}
          {!hoverAvatar && speed === 1 && (
            <span className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] rounded-full bg-[#53bdeb] flex items-center justify-center border-2 border-white">
              <Mic size={9} className="text-white" />
            </span>
          )}
          {(hoverAvatar || speed !== 1) && (
            <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-[11px] font-bold">
              {speed}x
            </span>
          )}
        </button>
      </div>

      {/* Transcribe button / transcription text */}
      <div className="px-1 mt-1">
        {transcription ? (
          <div className="text-[12px] leading-relaxed bg-black/5 dark:bg-white/5 rounded-md px-2 py-1.5 wa-text-primary whitespace-pre-wrap">
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block mb-0.5">Transcrição</span>
            {transcription}
          </div>
        ) : (
          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="flex items-center gap-1 text-[11px] opacity-70 hover:opacity-100 transition-opacity disabled:opacity-50"
          >
            {transcribing ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
            <span>{transcribing ? "Transcrevendo..." : "Transcrever áudio"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
