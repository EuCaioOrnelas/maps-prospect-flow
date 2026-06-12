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
  messageId?: string;
  initialTranscription?: string | null;
}

const SPEEDS = [1, 1.5, 2];
const BAR_COUNT = 40;

export function WhatsAppAudio({ src, isOutbound, avatarUrl, avatarInitials = "", avatarColorClass = "bg-muted", messageId, initialTranscription }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [playableSrc, setPlayableSrc] = useState<string | null>(null);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [hoverAvatar, setHoverAvatar] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(initialTranscription || null);
  const [transcribing, setTranscribing] = useState(false);
  const [peaks, setPeaks] = useState<number[] | null>(null);

  // Fallback pseudo-random bars while real peaks load
  const fallbackBars = useMemo(() => {
    const out: number[] = [];
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) & 0xffffffff;
    for (let i = 0; i < BAR_COUNT; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const v = (seed % 100) / 100;
      out.push(0.25 + v * 0.75);
    }
    return out;
  }, [src]);

  const bars = peaks || fallbackBars;

  // Resolve src → playable blob (handles meta_media: refs)
  useEffect(() => {
    let cancelled = false;
    setPlayableSrc(null);
    setLoadError(false);
    setPeaks(null);
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }

    const load = async () => {
      try {
        let blob: Blob | null = null;
        if (src.startsWith("meta_media:")) {
          setLoadingSrc(true);
          const { data: { session } } = await supabase.auth.getSession();
          const baseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
          const anonKey = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const url = `${baseUrl}/functions/v1/fetch-meta-media?ref=${encodeURIComponent(src)}${messageId ? `&message_id=${messageId}` : ""}`;
          const res = await fetch(url, {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${session?.access_token || anonKey}`,
            },
          });
          if (!res.ok) throw new Error(`media ${res.status}`);
          blob = await res.blob();
        } else {
          // direct URL — fetch as blob so we can also decode peaks
          const res = await fetch(src);
          if (!res.ok) throw new Error(`media ${res.status}`);
          blob = await res.blob();
        }

        if (cancelled || !blob) return;
        const objUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objUrl;
        setPlayableSrc(objUrl);

        // Decode for real waveform peaks + reliable duration (ogg/opus blobs often report Infinity)
        try {
          const arrBuf = await blob.arrayBuffer();
          const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
          if (Ctx) {
            const ctx = new Ctx();
            const audioBuf = await ctx.decodeAudioData(arrBuf.slice(0));
            if (!cancelled && audioBuf.duration && isFinite(audioBuf.duration)) {
              setDuration(audioBuf.duration);
            }
            const channel = audioBuf.getChannelData(0);
            const samplesPerBar = Math.floor(channel.length / BAR_COUNT);
            const out: number[] = [];
            let max = 0;
            for (let i = 0; i < BAR_COUNT; i++) {
              let sum = 0;
              const start = i * samplesPerBar;
              for (let j = 0; j < samplesPerBar; j++) {
                const v = channel[start + j];
                sum += v * v;
              }
              const rms = Math.sqrt(sum / samplesPerBar);
              out.push(rms);
              if (rms > max) max = rms;
            }
            if (max > 0) {
              const norm = out.map(v => 0.2 + (v / max) * 0.8);
              if (!cancelled) setPeaks(norm);
            }
            try { ctx.close(); } catch {}
          }
        } catch (e) {
          // peaks decode failed — keep fallback bars
        }

      } catch (e) {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoadingSrc(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [src, messageId]);

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
  }, [playableSrc]);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = speed; }, [speed]);

  const toggle = async () => {
    const a = audioRef.current;
    if (!a || !playableSrc) {
      if (loadError) toast.error("Não foi possível carregar o áudio");
      return;
    }
    if (playing) { a.pause(); setPlaying(false); return; }
    try {
      // Workaround: some webm/ogg blobs report duration=Infinity until you seek to the end
      if (!isFinite(a.duration) || a.duration === 0) {
        await new Promise<void>((resolve) => {
          const onLoaded = () => { a.removeEventListener("durationchange", onLoaded); resolve(); };
          a.addEventListener("durationchange", onLoaded);
          try { a.currentTime = 1e101; } catch {}
          setTimeout(() => { a.removeEventListener("durationchange", onLoaded); resolve(); }, 800);
        });
        try { a.currentTime = 0; } catch {}
      }
      await a.play();
      setPlaying(true);
    } catch (err) {
      console.error("audio play", err);
      toast.error("Erro ao reproduzir áudio");
    }
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
        body: { audio_url: src, message_id: messageId },
      });
      if (error) throw error;
      const text = (data as any)?.text || "";
      if (!text) {
        toast.error("Não foi possível transcrever o áudio");
        return;
      }
      setTranscription(text);
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
        {playableSrc && <audio ref={audioRef} src={playableSrc} preload="metadata" />}

        <button
          onClick={toggle}
          disabled={!playableSrc}
          className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center text-[#54656f] hover:bg-black/5 transition-colors disabled:opacity-60"
          aria-label={playing ? "Pausar" : "Tocar"}
        >
          {loadingSrc ? <Loader2 size={18} className="animate-spin" />
            : playing ? <Pause size={18} className="fill-current" />
            : <Play size={18} className="fill-current" />}
        </button>

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
                  className={cn(
                    "flex-1 rounded-full transition-colors",
                    filled
                      ? "bg-[#53bdeb]"
                      : "bg-black/30 dark:bg-white/45"
                  )}
                  style={{ height: `${Math.max(h * 24, 3)}px` }}
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

      <div className="-mx-1 -mb-1 mt-1">
        {transcription ? (
          <div className="text-[12px] leading-relaxed bg-black/5 dark:bg-white/10 rounded-b-[7px] px-2.5 py-1.5 wa-text-primary whitespace-pre-wrap">
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
