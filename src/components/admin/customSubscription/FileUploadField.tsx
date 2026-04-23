import { useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FileUploadFieldProps {
  label: string;
  fileUrl?: string;
  fileName?: string;
  onChange: (url: string | null, name: string | null) => void;
  bucket?: string;
  accept?: string;
}

/**
 * Upload helper for the private "custom-contracts" bucket.
 * Returns a signed URL valid for 10 years.
 */
export const FileUploadField = ({
  label,
  fileUrl,
  fileName,
  onChange,
  bucket = "custom-contracts",
  accept = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx",
}: FileUploadFieldProps) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      onChange(signed?.signedUrl || null, file.name);
      toast.success("Arquivo enviado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {fileUrl ? (
        <div className="flex items-center justify-between gap-2 p-2 rounded-[var(--radius-input)] border border-border bg-muted/30">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText size={14} className="text-primary shrink-0" />
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs truncate hover:underline"
            >
              {fileName || "arquivo"}
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onChange(null, null)}
          >
            <X size={12} />
          </Button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 h-10 border border-dashed border-border rounded-[var(--radius-input)] cursor-pointer hover:bg-muted/30 text-xs text-muted-foreground transition">
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Enviando...
            </>
          ) : (
            <>
              <Upload size={14} /> Clique para anexar
            </>
          )}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      )}
    </div>
  );
};
