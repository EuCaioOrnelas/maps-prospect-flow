import { useState, memo, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Download, 
  FileText, 
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  filename?: string;
  caption?: string;
  fromMe?: boolean;
}

const MediaPreviewComponent = ({ type, url, filename, caption, fromMe }: MediaPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [audioError, setAudioError] = useState(false);

  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, filename]);

  // Check if URL is valid (not a temporary WhatsApp URL)
  const isValidUrl = url && !url.includes('mmg.whatsapp.net') && !url.includes('.enc');

  if (type === 'image') {
    if (!isValidUrl || imageError) {
      return (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
          fromMe ? "bg-primary-foreground/10" : "bg-muted"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
          )}>
            <FileText className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
          </div>
          <div className="flex-1 text-left">
            <p className={cn(
              "text-sm font-medium",
              fromMe ? "text-primary-foreground" : "text-foreground"
            )}>
              [Imagem não disponível]
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
      <>
        <div 
          className="cursor-pointer rounded-lg overflow-hidden max-w-[280px]"
          onClick={() => setIsOpen(true)}
        >
          <img 
            src={url} 
            alt={filename || 'Image'} 
            className="w-full h-auto object-cover rounded-lg hover:opacity-90 transition-opacity"
            loading="lazy"
            onError={() => setImageError(true)}
          />
          {caption && (
            <p className="text-sm mt-2 whitespace-pre-wrap break-words">{caption}</p>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <div className="flex items-center justify-center min-h-[50vh]">
              <img 
                src={url} 
                alt={filename || 'Image'} 
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
            <div className="absolute bottom-4 right-4">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleDownload}
                className="bg-black/50 hover:bg-black/70 text-white border-none"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (type === 'video') {
    if (!isValidUrl) {
      return (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
          fromMe ? "bg-primary-foreground/10" : "bg-muted"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
          )}>
            <Play className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
          </div>
          <div className="flex-1 text-left">
            <p className={cn(
              "text-sm font-medium",
              fromMe ? "text-primary-foreground" : "text-foreground"
            )}>
              [Vídeo não disponível]
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
      <>
        <div 
          className="cursor-pointer rounded-lg overflow-hidden max-w-[280px] relative group"
          onClick={() => setIsOpen(true)}
        >
          <video 
            src={url}
            className="w-full h-auto rounded-lg"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-black ml-1" />
            </div>
          </div>
          {caption && (
            <p className="text-sm mt-2 whitespace-pre-wrap break-words">{caption}</p>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            <div className="flex items-center justify-center min-h-[50vh]">
              <video 
                src={url}
                controls
                autoPlay
                className="max-w-full max-h-[80vh]"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (type === 'audio') {
    if (!isValidUrl || audioError) {
      return (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
          fromMe ? "bg-primary-foreground/10" : "bg-muted"
        )}>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
          )}>
            <Volume2 className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
          </div>
          <div className="flex-1 text-left">
            <p className={cn(
              "text-sm font-medium",
              fromMe ? "text-primary-foreground" : "text-foreground"
            )}>
              [Áudio não disponível]
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
        "flex items-center gap-3 p-2 rounded-lg min-w-[200px]",
        fromMe ? "bg-primary-foreground/10" : "bg-muted"
      )}>
        <button 
          onClick={() => {
            const audio = document.getElementById(`audio-${url}`) as HTMLAudioElement;
            if (audio) {
              if (isPlaying) {
                audio.pause();
              } else {
                audio.play().catch(() => setAudioError(true));
              }
              setIsPlaying(!isPlaying);
            }
          }}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
          )}
        >
          {isPlaying ? (
            <Pause className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
          ) : (
            <Play className={cn("h-5 w-5 ml-0.5", fromMe ? "text-primary-foreground" : "text-primary")} />
          )}
        </button>
        
        <div className="flex-1">
          <div className="h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                fromMe ? "bg-primary-foreground/50" : "bg-primary/50"
              )}
              style={{ width: `${audioProgress}%` }}
            />
          </div>
          <audio 
            id={`audio-${url}`}
            src={url}
            onTimeUpdate={(e) => {
              const audio = e.currentTarget;
              setAudioProgress((audio.currentTime / audio.duration) * 100);
            }}
            onEnded={() => {
              setIsPlaying(false);
              setAudioProgress(0);
            }}
            onError={() => setAudioError(true)}
          />
        </div>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1"
        >
          {isMuted ? (
            <VolumeX className={cn("h-4 w-4", fromMe ? "text-primary-foreground/70" : "text-muted-foreground")} />
          ) : (
            <Volume2 className={cn("h-4 w-4", fromMe ? "text-primary-foreground/70" : "text-muted-foreground")} />
          )}
        </button>
      </div>
    );
  }

  if (type === 'document') {
    return (
      <button 
        onClick={handleDownload}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg min-w-[200px] hover:opacity-80 transition-opacity",
          fromMe ? "bg-primary-foreground/10" : "bg-muted"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
        )}>
          <FileText className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1 text-left">
          <p className={cn(
            "text-sm font-medium truncate max-w-[150px]",
            fromMe ? "text-primary-foreground" : "text-foreground"
          )}>
            {filename || 'Documento'}
          </p>
          <p className={cn(
            "text-xs",
            fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            Clique para baixar
          </p>
        </div>
        <Download className={cn("h-4 w-4", fromMe ? "text-primary-foreground/70" : "text-muted-foreground")} />
      </button>
    );
  }

  return null;
};

export const MediaPreview = memo(MediaPreviewComponent);
