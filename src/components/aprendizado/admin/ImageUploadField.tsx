import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LearningImage } from "@/components/aprendizado/LearningImage";
import { uploadLearningImage } from "@/services/aprendizado/learningMedia";

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  folder: "modules" | "lessons";
  onChange: (path: string | null) => void;
  hint?: string;
}

/** Upload de capa/thumbnail para o bucket privado da central. */
export function ImageUploadField({ label, value, folder, onChange, hint }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadLearningImage(file, folder);
      onChange(path);
      toast.success("Imagem enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel enviar a imagem.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <LearningImage path={value} alt={label} className="aspect-video w-full max-w-sm rounded-lg border border-border" />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="gap-2" disabled={uploading} onClick={() => onChange(null)}>
            <Trash2 size={15} />
            Remover
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint ?? "JPG, PNG ou WEBP de ate 5 MB."}</p>
    </div>
  );
}
