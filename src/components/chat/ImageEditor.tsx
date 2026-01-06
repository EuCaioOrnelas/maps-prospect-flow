import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  Crop as CropIcon, 
  RotateCcw, 
  RotateCw, 
  Check, 
  X, 
  FlipHorizontal,
  FlipVertical,
  ZoomIn,
  Maximize2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (editedBlob: Blob) => void;
  onCancel: () => void;
}

type AspectRatioOption = 'free' | '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

const ASPECT_RATIOS: { value: AspectRatioOption; label: string; icon: React.ReactNode; ratio?: number }[] = [
  { value: 'free', label: 'Livre', icon: <Maximize2 className="h-4 w-4" /> },
  { value: '1:1', label: '1:1', icon: <Square className="h-4 w-4" />, ratio: 1 },
  { value: '4:3', label: '4:3', icon: <RectangleHorizontal className="h-4 w-4" />, ratio: 4/3 },
  { value: '16:9', label: '16:9', icon: <RectangleHorizontal className="h-4 w-4" />, ratio: 16/9 },
  { value: '3:4', label: '3:4', icon: <RectangleVertical className="h-4 w-4" />, ratio: 3/4 },
  { value: '9:16', label: '9:16', icon: <RectangleVertical className="h-4 w-4" />, ratio: 9/16 },
];

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export const ImageEditor = ({ imageSrc, onSave, onCancel }: ImageEditorProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [scale, setScale] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('free');
  const [isCropping, setIsCropping] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // Set initial crop to center 90%
    const initialCrop = centerAspectCrop(width, height, width / height);
    setCrop(initialCrop);
  }, []);

  const handleAspectChange = (newAspect: AspectRatioOption) => {
    setAspectRatio(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const ratio = ASPECT_RATIOS.find(r => r.value === newAspect)?.ratio;
      if (ratio) {
        setCrop(centerAspectCrop(width, height, ratio));
      }
    }
  };

  const rotateLeft = () => setRotation(r => (r - 90) % 360);
  const rotateRight = () => setRotation(r => (r + 90) % 360);
  const toggleFlipH = () => setFlipH(f => !f);
  const toggleFlipV = () => setFlipV(f => !f);

  const generateEditedImage = async (): Promise<Blob> => {
    const image = imgRef.current;
    const canvas = canvasRef.current;
    
    if (!image || !canvas) {
      throw new Error('Image or canvas not available');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Determine output dimensions
    let outputWidth: number;
    let outputHeight: number;

    if (isCropping && completedCrop && completedCrop.width && completedCrop.height) {
      // Use crop dimensions
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      outputWidth = completedCrop.width * scaleX;
      outputHeight = completedCrop.height * scaleY;
    } else {
      // Use full image dimensions
      outputWidth = image.naturalWidth;
      outputHeight = image.naturalHeight;
    }

    // Swap dimensions for 90/270 degree rotations
    const isRotated = Math.abs(rotation) === 90 || Math.abs(rotation) === 270;
    if (isRotated) {
      canvas.width = outputHeight;
      canvas.height = outputWidth;
    } else {
      canvas.width = outputWidth;
      canvas.height = outputHeight;
    }

    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.scale(scale, scale);

    // Draw image
    if (isCropping && completedCrop && completedCrop.width && completedCrop.height) {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        -outputWidth / 2,
        -outputHeight / 2,
        outputWidth,
        outputHeight
      );
    } else {
      ctx.drawImage(
        image,
        -outputWidth / 2,
        -outputHeight / 2,
        outputWidth,
        outputHeight
      );
    }

    ctx.restore();

    // Convert to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      const blob = await generateEditedImage();
      onSave(blob);
    } catch (error) {
      console.error('Error saving edited image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentAspectRatio = ASPECT_RATIOS.find(r => r.value === aspectRatio)?.ratio;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
        <span className="font-medium text-foreground">Editar imagem</span>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleSave}
          disabled={isProcessing}
          className="text-primary"
        >
          <Check className="h-5 w-5" />
        </Button>
      </div>

      {/* Image preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-black/90">
        <div 
          className="max-w-full max-h-full"
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1}) scale(${scale})`,
            transition: 'transform 0.3s ease',
          }}
        >
          {isCropping ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={currentAspectRatio}
              className="max-w-full max-h-[60vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Edit"
                onLoad={onImageLoad}
                className="max-w-full max-h-[60vh] object-contain"
                style={{ transform: 'none' }}
              />
            </ReactCrop>
          ) : (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Preview"
              onLoad={onImageLoad}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Crop aspect ratio options */}
      {isCropping && (
        <div className="px-4 py-2 border-t border-border bg-card">
          <div className="flex gap-2 overflow-x-auto justify-center">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                onClick={() => handleAspectChange(ratio.value)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors shrink-0",
                  aspectRatio === ratio.value 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {ratio.icon}
                <span className="text-xs">{ratio.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Zoom slider */}
      <div className="px-6 py-3 border-t border-border bg-card">
        <div className="flex items-center gap-4">
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          <Slider
            value={[scale * 100]}
            onValueChange={([value]) => setScale(value / 100)}
            min={50}
            max={200}
            step={5}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">{Math.round(scale * 100)}%</span>
        </div>
      </div>

      {/* Tools */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center justify-center gap-3">
          <Button
            variant={isCropping ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCropping(!isCropping)}
            className="gap-2"
          >
            <CropIcon className="h-4 w-4" />
            Recortar
          </Button>
          
          <Button variant="outline" size="icon" onClick={rotateLeft}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="icon" onClick={rotateRight}>
            <RotateCw className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={flipH ? "default" : "outline"} 
            size="icon" 
            onClick={toggleFlipH}
          >
            <FlipHorizontal className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={flipV ? "default" : "outline"} 
            size="icon" 
            onClick={toggleFlipV}
          >
            <FlipVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
