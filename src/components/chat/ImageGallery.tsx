import { useState, memo, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  X,
  ChevronLeft,
  ChevronRight,
  Images,
  Forward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageItem {
  url: string;
  caption?: string;
  filename?: string;
  messageId?: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  fromMe?: boolean;
  onForward?: (mediaUrls: string[]) => void;
}

const ImageGalleryComponent = ({ images, fromMe, onForward }: ImageGalleryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const validImages = images.filter((img, idx) => {
    const isValidUrl = img.url && img.url.length > 0 && !img.url.includes('mmg.whatsapp.net') && !img.url.includes('.enc');
    return isValidUrl && !imageErrors.has(idx);
  });

  const handleImageError = useCallback((index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  }, []);

  const handleDownload = useCallback((url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDownloadAll = useCallback(() => {
    validImages.forEach((img, idx) => {
      setTimeout(() => {
        handleDownload(img.url, img.filename || `image_${idx + 1}`);
      }, idx * 300);
    });
  }, [validImages, handleDownload]);

  const handleForwardCurrent = useCallback(() => {
    if (onForward && validImages[currentIndex]) {
      onForward([validImages[currentIndex].url]);
    }
  }, [onForward, validImages, currentIndex]);

  const handleForwardAll = useCallback(() => {
    if (onForward && validImages.length > 0) {
      onForward(validImages.map(img => img.url));
    }
  }, [onForward, validImages]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : validImages.length - 1));
  }, [validImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < validImages.length - 1 ? prev + 1 : 0));
  }, [validImages.length]);

  const openGallery = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  if (validImages.length === 0) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg min-w-[200px]",
        fromMe ? "bg-primary-foreground/10" : "bg-muted"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          fromMe ? "bg-primary-foreground/20" : "bg-primary/10"
        )}>
          <Images className={cn("h-5 w-5", fromMe ? "text-primary-foreground" : "text-primary")} />
        </div>
        <div className="flex-1 text-left">
          <p className={cn(
            "text-sm font-medium",
            fromMe ? "text-primary-foreground" : "text-foreground"
          )}>
            [{images.length} imagens não disponíveis]
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

  // Grid layout based on number of images
  const getGridClass = () => {
    if (validImages.length === 1) return 'grid-cols-1';
    if (validImages.length === 2) return 'grid-cols-2';
    if (validImages.length === 3) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  const getImageClass = (index: number) => {
    if (validImages.length === 3 && index === 0) return 'col-span-2';
    return '';
  };

  return (
    <>
      <div className={cn(
        "rounded-lg overflow-hidden w-full max-w-[220px]",
        fromMe ? "bg-whatsapp-outgoing" : "bg-card"
      )}>
        <div className={cn(
          "grid gap-0.5 rounded-lg overflow-hidden",
          getGridClass()
        )}>
          {validImages.slice(0, 4).map((img, idx) => (
            <div 
              key={idx}
              className={cn(
                "relative cursor-pointer overflow-hidden",
                getImageClass(idx),
                idx === 3 && validImages.length > 4 && "relative"
              )}
              onClick={() => openGallery(idx)}
            >
              <img 
                src={img.url} 
                alt={img.filename || `Image ${idx + 1}`}
                className={cn(
                  "w-full object-cover hover:opacity-90 transition-opacity",
                  validImages.length === 1 ? "h-auto max-h-[300px]" : "h-[100px]"
                )}
                loading="lazy"
                onError={() => handleImageError(images.indexOf(img))}
              />
              {idx === 3 && validImages.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xl font-bold">+{validImages.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Caption for first image with caption or count indicator */}
        <div className="mt-1 flex items-center justify-between">
          {images[0]?.caption && (
            <p className="text-sm whitespace-pre-wrap break-words flex-1">{images[0].caption}</p>
          )}
          {validImages.length > 1 && (
            <span className={cn(
              "text-xs flex items-center gap-1 ml-auto",
              fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <Images className="h-3 w-3" />
              {validImages.length}
            </span>
          )}
        </div>
      </div>

      {/* Full screen gallery dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl p-0 bg-black/95 border-none [&>button]:hidden">
          <button 
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          
          {/* Navigation arrows */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-6 w-6 text-white" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-6 w-6 text-white" />
              </button>
            </>
          )}
          
          {/* Main image */}
          <div className="flex items-center justify-center min-h-[50vh]">
            <img 
              src={validImages[currentIndex]?.url} 
              alt={validImages[currentIndex]?.filename || 'Image'} 
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
          
          {/* Image counter and caption */}
          <div className="absolute bottom-16 left-0 right-0 text-center">
            {validImages[currentIndex]?.caption && (
              <p className="text-white text-sm mb-2 px-4">{validImages[currentIndex].caption}</p>
            )}
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {validImages.length}
            </span>
          </div>
          
          {/* Bottom actions */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between">
            {/* Forward actions - left side */}
            {onForward && (
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleForwardCurrent}
                  className="bg-black/50 hover:bg-black/70 text-white border-none"
                >
                  <Forward className="h-4 w-4 mr-2" />
                  Encaminhar
                </Button>
                {validImages.length > 1 && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleForwardAll}
                    className="bg-black/50 hover:bg-black/70 text-white border-none"
                  >
                    <Forward className="h-4 w-4 mr-2" />
                    Encaminhar todas ({validImages.length})
                  </Button>
                )}
              </div>
            )}
            
            {/* Download actions - right side */}
            <div className="flex gap-2 ml-auto">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleDownload(validImages[currentIndex]?.url, validImages[currentIndex]?.filename)}
                className="bg-black/50 hover:bg-black/70 text-white border-none"
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              {validImages.length > 1 && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleDownloadAll}
                  className="bg-black/50 hover:bg-black/70 text-white border-none"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar todas ({validImages.length})
                </Button>
              )}
            </div>
          </div>
          
          {/* Thumbnail strip */}
          {validImages.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1 p-2 bg-black/30 rounded-lg max-w-[80%] overflow-x-auto">
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "w-12 h-12 rounded overflow-hidden shrink-0 transition-all",
                    currentIndex === idx ? "ring-2 ring-white opacity-100" : "opacity-50 hover:opacity-75"
                  )}
                >
                  <img 
                    src={img.url} 
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export const ImageGallery = memo(ImageGalleryComponent);
