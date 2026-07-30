import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn, RotateCw } from "lucide-react";

interface AvatarCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  isSaving?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const OUTPUT_SIZE = 512;

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, crop: Area, rotation: number): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado");

  // Rotated source canvas
  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const boxWidth = image.width * cos + image.height * sin;
  const boxHeight = image.width * sin + image.height * cos;

  const source = document.createElement("canvas");
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("Canvas não suportado");
  source.width = boxWidth;
  source.height = boxHeight;
  sourceCtx.translate(boxWidth / 2, boxHeight / 2);
  sourceCtx.rotate(radians);
  sourceCtx.drawImage(image, -image.width / 2, -image.height / 2);

  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  ctx.drawImage(
    source,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.92
    );
  });
}

export const AvatarCropDialog = ({ open, imageSrc, isSaving, onCancel, onConfirm }: AvatarCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || isSaving;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) {
          reset();
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajustar foto de perfil</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o zoom para enquadrar sua foto.
          </DialogDescription>
        </DialogHeader>

        <div className="relative w-full h-[280px] sm:h-[320px] bg-muted rounded-hover overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="rect"
              showGrid
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={(value) => setZoom(value[0])}
            />
          </div>
          <div className="flex items-center gap-3">
            <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => setRotation(value[0])}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onCancel();
            }}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !croppedAreaPixels}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
