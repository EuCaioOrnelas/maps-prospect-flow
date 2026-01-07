import { createContext, useContext, useRef, useCallback, useState, ReactNode } from 'react';

interface AudioPlayerContextType {
  currentAudioUrl: string | null;
  registerAudio: (url: string, audioRef: HTMLAudioElement) => void;
  unregisterAudio: (url: string) => void;
  playAudio: (url: string) => void;
  pauseAudio: (url: string) => void;
  isPlaying: (url: string) => boolean;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  const registerAudio = useCallback((url: string, audioRef: HTMLAudioElement) => {
    audioRefs.current.set(url, audioRef);
  }, []);

  const unregisterAudio = useCallback((url: string) => {
    audioRefs.current.delete(url);
    if (currentAudioUrl === url) {
      setCurrentAudioUrl(null);
    }
  }, [currentAudioUrl]);

  const playAudio = useCallback((url: string) => {
    // Pause all other audios first
    audioRefs.current.forEach((audio, audioUrl) => {
      if (audioUrl !== url && !audio.paused) {
        audio.pause();
      }
    });
    
    setCurrentAudioUrl(url);
  }, []);

  const pauseAudio = useCallback((url: string) => {
    if (currentAudioUrl === url) {
      setCurrentAudioUrl(null);
    }
  }, [currentAudioUrl]);

  const isPlaying = useCallback((url: string) => {
    return currentAudioUrl === url;
  }, [currentAudioUrl]);

  return (
    <AudioPlayerContext.Provider value={{ 
      currentAudioUrl,
      registerAudio, 
      unregisterAudio, 
      playAudio, 
      pauseAudio,
      isPlaying 
    }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
