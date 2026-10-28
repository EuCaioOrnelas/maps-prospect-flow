import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { friendlyDbError } from "@/lib/projects";

const db = supabase as any;
const BUCKET = "project-files";
const MAX_BYTES = 25 * 1024 * 1024;

const fmtSize = (b?: number | null) => (!b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export function ProjectFilesTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const files = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await db.from("project_files").select("*").eq("project_id", projectId).order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const upload = async (list: FileList | null) => {
    if (!list?.length || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name}: limite de 25 MB.`);
          continue;
        }
        const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-100);
        const path = `${projectId}/${Date.now()}_${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw up.error;
        const { error } = await db.from("project_files").insert({
          project_id: projectId, file_name: file.name, storage_path: path, size_bytes: file.size, mime_type: file.type || null, uploaded_by: user.id,
        });
        if (error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw error;
        }
      }
      toast.success("Arquivo enviado");
      qc.invalidateQueries({ queryKey: ["project-files", projectId] });
    } catch (err) {
      toast.error(friendlyDbError(err));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const download = async (f: any) => {
    setBusy(f.id);
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(f.storage_path, 60);
    setBusy(null);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (f: any) => {
    if (!window.confirm(`Excluir o arquivo “${f.file_name}”?`)) return;
    setBusy(f.id);
    const { error } = await db.from("project_files").delete().eq("id", f.id);
    if (!error) await supabase.storage.from(BUCKET).remove([f.storage_path]);
    setBusy(null);
    if (error) return toast.error(friendlyDbError(error));
    qc.invalidateQueries({ queryKey: ["project-files", projectId] });
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Arquivos do projeto</h3>
          <p className="text-xs text-muted-foreground">Até 25 MB por arquivo. Visíveis apenas para quem tem acesso ao projeto.</p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}Enviar
        </Button>
      </div>
      {files.isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : files.isError ? (
        <p className="text-sm text-destructive">{friendlyDbError(files.error)}</p>
      ) : !files.data?.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum arquivo enviado.</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.data.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.file_name}</p>
                <p className="text-xs text-muted-foreground">{fmtSize(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => download(f)} disabled={busy === f.id} aria-label="Baixar"><Download className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(f)} disabled={busy === f.id} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
