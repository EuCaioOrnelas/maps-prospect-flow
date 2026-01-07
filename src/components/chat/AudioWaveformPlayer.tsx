import { useState, useRef, useEffect, memo, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Global audio management - only one audio plays at a time
let currentPlayingAudio: HTMLAudioElement | null = null;
let currentPlayingUrl: string | null = null;

const pauseCurrentAudio = () => {
  if (currentPlayingAudio) {
    currentPlayingAudio.pause();
    currentPlayingAudio = null;
    currentPlayingUrl = null;
  }
};

interface AudioWaveformPlayerProps {
  url: string;
  fromMe: boolean;
}

const BARS_COUNT = 24;
const PLAYBACK_SPEEDS = [0.5, 1, 1.5, 2];

const AudioWaveformPlayerComponent = ({ url, fromMe }: AudioWaveformPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  // Transcription state
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);

  // Generate waveform data from audio
  useEffect(() => {
    const generateWaveform = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const rawData = audioBuffer.getChannelData(0);
        const samples = BARS_COUNT;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        // Normalize
        const maxVal = Math.max(...filteredData);
        const normalizedData = filteredData.map(val => 
          Math.max(0.15, val / maxVal) // Minimum height of 15%
        );
        
        setWaveformData(normalizedData);
        audioContext.close();
      } catch (err) {
        console.error('Error generating waveform:', err);
        // Generate random waveform as fallback
        const randomWaveform = Array.from({ length: BARS_COUNT }, () => 
          0.2 + Math.random() * 0.8
        );
        setWaveformData(randomWaveform);
      }
    };

    if (url) {
      generateWaveform();
    }
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handleError = () => {
      setError(true);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Listen for this audio being paused externally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePause = () => {
      if (currentPlayingUrl !== url) {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('pause', handlePause);
    return () => audio.removeEventListener('pause', handlePause);
  }, [url]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      currentPlayingAudio = null;
      currentPlayingUrl = null;
    } else {
      // Pause any other playing audio first
      if (currentPlayingAudio && currentPlayingAudio !== audio) {
        currentPlayingAudio.pause();
      }
      
      // Set this as current and play
      currentPlayingAudio = audio;
      currentPlayingUrl = url;
      audio.play().catch(() => setError(true));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, url]);

  const handleSpeedChange = useCallback((speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.playbackRate = speed;
    setPlaybackSpeed(speed);
  }, []);

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * duration;
  }, [duration]);

  const handleTranscribe = useCallback(async () => {
    if (transcription) {
      setShowTranscription(!showTranscription);
      return;
    }

    setIsTranscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('audio-transcribe', {
        body: { audioUrl: url }
      });

      if (error) throw error;

      if (data?.transcription) {
        setTranscription(data.transcription);
        setShowTranscription(true);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      console.error('Transcription error:', err);
      toast.error('Erro ao transcrever áudio');
    } finally {
      setIsTranscribing(false);
    }
  }, [url, transcription, showTranscription]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-2xl min-w-[240px]",
        fromMe ? "bg-primary-foreground/10" : "bg-muted"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
        )}>
          <Mic className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            fromMe ? "text-primary-foreground" : "text-foreground"
          )}>
            Áudio não disponível
          </p>
          <p className={cn(
            "text-xs",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            Mídia expirada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-2xl w-full min-w-[280px] my-1",
        fromMe ? "bg-primary-foreground/10" : "bg-muted"
      )}>
        <audio ref={audioRef} src={url} preload="metadata" />
        
        {/* Play/Pause Button */}
        <button 
          onClick={togglePlay}
          disabled={isLoading}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95",
            fromMe 
              ? "bg-primary-foreground text-primary hover:bg-primary-foreground/90" 
              : "bg-primary text-primary-foreground hover:bg-primary/90",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>
        
        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          {/* Waveform */}
          <div 
            className="flex items-center justify-between h-6 cursor-pointer w-full"
            onClick={handleWaveformClick}
          >
            {waveformData.length > 0 ? (
              waveformData.map((height, index) => {
                const barProgress = (index / BARS_COUNT) * 100;
                const isPlayed = barProgress < progress;
                
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex-1 min-w-[2px] max-w-[6px] rounded-full transition-colors duration-75",
                      isPlayed
                        ? fromMe ? "bg-primary-foreground" : "bg-primary"
                        : fromMe ? "bg-primary-foreground/35" : "bg-primary/35"
                    )}
                    style={{ height: `${height * 100}%` }}
                  />
                );
              })
            ) : (
              // Loading skeleton
              Array.from({ length: BARS_COUNT }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex-1 min-w-[2px] max-w-[6px] rounded-full animate-pulse",
                    fromMe ? "bg-primary-foreground/30" : "bg-primary/30"
                  )}
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))
            )}
          </div>
          
          {/* Time and controls */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-[11px] font-medium tabular-nums",
              fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
            </span>
            
            <div className="flex items-center gap-1.5">
              {/* Transcribe button */}
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className={cn(
                  "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors",
                  fromMe 
                    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" 
                    : "bg-primary/10 text-primary hover:bg-primary/20",
                  isTranscribing && "opacity-50 cursor-not-allowed"
                )}
                title="Transcrever áudio"
              >
                {isTranscribing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <FileText className="h-3 w-3" />
                    {transcription && (
                      showTranscription ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />
                    )}
                  </>
                )}
              </button>
              
              {/* Speed selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button 
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors",
                      fromMe 
                        ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30" 
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {playbackSpeed}x
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  side="top"
                  className="min-w-[60px] bg-popover border border-border shadow-lg"
                >
                  {PLAYBACK_SPEEDS.map((speed) => (
                    <DropdownMenuItem
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={cn(
                        "text-xs cursor-pointer justify-center",
                        playbackSpeed === speed && "bg-accent"
                      )}
                    >
                      {speed}x
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transcription display */}
      {showTranscription && transcription && (
        <div className={cn(
          "mt-1 px-3 py-2 rounded-xl text-sm max-w-[280px]",
          fromMe ? "bg-primary-foreground/5 text-primary-foreground/90" : "bg-muted/50 text-foreground/90"
        )}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">{transcription}</p>
        </div>
      )}
    </div>
  );
};

export const AudioWaveformPlayer = memo(AudioWaveformPlayerComponent);
