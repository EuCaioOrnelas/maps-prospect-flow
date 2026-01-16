import { useState, memo, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Download, 
  FileText, 
  X,
  Mic,
  ZoomIn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AudioWaveformPlayer } from './AudioWaveformPlayer';
import { ZoomableImage } from './ZoomableImage';
interface MediaPreviewProps {
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  filename?: string;
  caption?: string;
  fromMe?: boolean;
}

const MediaPreviewComponent = ({ type, url, filename, caption, fromMe }: MediaPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [url, filename]);

  // Check if URL is valid (not a temporary WhatsApp URL or undefined)
  const isValidUrl = url && url.length > 0 && !url.includes('mmg.whatsapp.net') && !url.includes('.enc');

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
          className="cursor-pointer rounded-lg overflow-hidden w-fit max-w-[250px] sm:max-w-[280px]"
          onClick={() => setIsOpen(true)}
        >
          <div className="max-h-[300px] overflow-hidden rounded-lg">
            <img 
              src={url} 
              alt={filename || 'Image'} 
              className="w-auto max-w-full h-auto max-h-[300px] object-contain hover:opacity-90 transition-opacity"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
          {caption && (
            <p className="text-sm mt-2 whitespace-pre-wrap break-words max-w-[250px] sm:max-w-[280px]">{caption}</p>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] w-[98vw] h-[98vh] p-0 bg-black/95 border-none [&>button]:hidden overflow-hidden">
            <ZoomableImage 
              src={url!} 
              alt={filename || 'Image'} 
              onClose={() => setIsOpen(false)}
            />
            
            <div className="absolute bottom-4 right-4 flex gap-2">
              <div className="text-white/60 text-xs bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                <ZoomIn className="h-3 w-3" />
                Pinça ou duplo toque
              </div>
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
          className="cursor-pointer rounded-lg overflow-hidden w-fit max-w-[250px] sm:max-w-[280px] relative group"
          onClick={() => setIsOpen(true)}
        >
          <video 
            src={url}
            className="w-auto max-w-full h-auto max-h-[300px] rounded-lg"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <Play className="h-6 w-6 text-black ml-1" />
            </div>
          </div>
          {caption && (
            <p className="text-sm mt-2 whitespace-pre-wrap break-words max-w-[250px] sm:max-w-[280px]">{caption}</p>
          )}
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/95 border-none [&>button]:hidden">
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
    if (!isValidUrl) {
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

    return <AudioWaveformPlayer url={url} fromMe={fromMe ?? false} />;
  }

  if (type === 'document') {
    return (
      <button 
        onClick={handleDownload}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg w-full hover:opacity-80 transition-opacity",
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
