import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  onClose?: () => void;
}

export const ZoomableImage = ({ src, alt, onClose }: ZoomableImageProps) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialScale, setInitialScale] = useState(1);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const minScale = 1;
  const maxScale = 5;

  // Calculate max pan limits based on image and container size
  const getMaxPan = useCallback(() => {
    if (!imageSize.width || !containerSize.width) {
      return { x: 0, y: 0 };
    }
    
    const scaledWidth = imageSize.width * scale;
    const scaledHeight = imageSize.height * scale;
    
    const maxPanX = Math.max(0, (scaledWidth - containerSize.width) / 2);
    const maxPanY = Math.max(0, (scaledHeight - containerSize.height) / 2);
    
    return { x: maxPanX, y: maxPanY };
  }, [scale, imageSize, containerSize]);

  // Update container size on mount and resize
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  // Handle image load to get dimensions
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // Get the displayed size (after object-contain scaling)
    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
    const containerHeight = containerRef.current?.clientHeight || window.innerHeight * 0.9;
    
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;
    
    let displayWidth, displayHeight;
    if (imgAspect > containerAspect) {
      displayWidth = Math.min(containerWidth, img.naturalWidth);
      displayHeight = displayWidth / imgAspect;
    } else {
      displayHeight = Math.min(containerHeight, img.naturalHeight);
      displayWidth = displayHeight * imgAspect;
    }
    
    setImageSize({ width: displayWidth, height: displayHeight });
  }, []);

  // Reset zoom and position
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Clamp position within bounds
  const clampPosition = useCallback((x: number, y: number) => {
    const maxPan = getMaxPan();
    return {
      x: Math.max(-maxPan.x, Math.min(maxPan.x, x)),
      y: Math.max(-maxPan.y, Math.min(maxPan.y, y))
    };
  }, [getMaxPan]);

  // Handle double click/tap to toggle zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.5);
      setPosition({ x: 0, y: 0 });
    }
  }, [scale, resetZoom]);

  // Get distance between two touch points
  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialScale(scale);
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  }, [scale, position]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const newScale = Math.min(maxScale, Math.max(minScale, initialScale * (distance / initialPinchDistance)));
      setScale(newScale);
      
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Pan
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const clamped = clampPosition(newX, newY);
      setPosition(clamped);
    }
  }, [initialPinchDistance, initialScale, isDragging, scale, dragStart, clampPosition]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    setInitialPinchDistance(null);
    setIsDragging(false);
    
    if (scale < 1.1) {
      resetZoom();
    }
  }, [scale, resetZoom]);

  // Handle mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      const clamped = clampPosition(newX, newY);
      setPosition(clamped);
    }
  }, [isDragging, scale, dragStart, clampPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom for desktop
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    const newScale = Math.min(maxScale, Math.max(minScale, scale + delta));
    setScale(newScale);
    
    if (newScale <= 1) {
      setPosition({ x: 0, y: 0 });
    } else {
      // Clamp position when zooming out
      const clamped = clampPosition(position.x, position.y);
      setPosition(clamped);
    }
  }, [scale, position, clampPosition]);

  return (
    <div className="relative w-full h-full">
      {/* Close button - always visible */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/70 hover:bg-black/90 transition-colors shadow-lg"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      )}
      
      <div
        ref={containerRef}
        className={cn(
          "flex items-center justify-center w-full h-full min-h-[50vh] max-h-[90vh] overflow-hidden touch-none select-none",
          scale > 1 ? "cursor-grab" : "cursor-zoom-in",
          isDragging && "cursor-grabbing"
        )}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain transition-transform duration-100"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center'
          }}
          onLoad={handleImageLoad}
          draggable={false}
        />
      </div>
      
      {/* Zoom indicator */}
      {scale > 1 && (
        <div className="absolute top-4 left-4 z-10 text-white text-sm bg-black/50 px-2 py-1 rounded">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
};
