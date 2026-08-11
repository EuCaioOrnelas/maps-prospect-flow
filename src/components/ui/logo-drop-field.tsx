import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoDropFieldProps {
  label?: string;
  value: string | null;
  uploading?: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}

const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

/** Campo de logo com upload por clique ou arrastar e soltar (padrão Wiize). */
export function LogoDropField({ label = "Logo da empresa", value, uploading, onFile, onRemove }: LogoDropFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files?: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1.5">
        <ImageIcon className="w-3.5 h-3.5 text-primary" /> {label}
      </Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 cursor-pointer transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <div className="w-16 h-16 rounded-xl border border-border/60 bg-background flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img src={value} alt={label} className="max-w-full max-h-full object-contain" />
          ) : (
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">Arraste a imagem aqui ou clique para enviar</p>
          <p className="text-[10.5px] text-muted-foreground mt-0.5">PNG, JPG, WEBP ou SVG até 2MB.</p>
          <div className="flex items-center gap-2 mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-xl"
              disabled={uploading}
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 mr-1.5" />
              )}
              Enviar logo
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

export default LogoDropField;
