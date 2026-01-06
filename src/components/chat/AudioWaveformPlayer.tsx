import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioWaveformPlayerProps {
  url: string;
  fromMe: boolean;
}

const BARS_COUNT = 28;

const AudioWaveformPlayerComponent = ({ url, fromMe }: AudioWaveformPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleWaveformClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audio.currentTime = percentage * duration;
  }, [duration]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
        fromMe ? "bg-primary-foreground/10" : "bg-muted"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
        )}>
          <Mic className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1 text-left">
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
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg min-w-[220px] max-w-[280px]",
      fromMe ? "bg-primary-foreground/10" : "bg-muted"
    )}>
      <audio ref={audioRef} src={url} preload="metadata" />
      
      {/* Play/Pause Button */}
      <button 
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
          fromMe ? "bg-primary-foreground/20 hover:bg-primary-foreground/30" : "bg-primary/10 hover:bg-primary/20",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        {isPlaying ? (
          <Pause className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <Play className={cn("h-5 w-5 ml-0.5", fromMe ? "text-primary-foreground" : "text-primary")} />
        )}
      </button>
      
      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div 
          className="flex items-center gap-[2px] h-8 cursor-pointer"
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
                    "w-[3px] rounded-full transition-all duration-100",
                    isPlayed
                      ? fromMe ? "bg-primary-foreground" : "bg-primary"
                      : fromMe ? "bg-primary-foreground/40" : "bg-primary/40"
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
                  "w-[3px] rounded-full animate-pulse",
                  fromMe ? "bg-primary-foreground/30" : "bg-primary/30"
                )}
                style={{ height: `${20 + Math.random() * 60}%` }}
              />
            ))
          )}
        </div>
        
        {/* Time */}
        <div className="flex justify-between text-[10px]">
          <span className={cn(
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(currentTime)}
          </span>
          <span className={cn(
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AudioWaveformPlayer = memo(AudioWaveformPlayerComponent);
