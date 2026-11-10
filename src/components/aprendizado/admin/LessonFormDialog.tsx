import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "./ImageUploadField";
import { createLesson, updateLesson } from "@/services/aprendizado/learningService";
import { formatLessonDuration, parseLessonDuration } from "@/services/aprendizado/format";
import { extractYouTubeVideoId } from "@/services/aprendizado/youtube";
import { normalizeSlug, slugify } from "@/services/aprendizado/slug";
import type { LearningLesson } from "@/types/aprendizado";

interface LessonFormDialogProps {
  open: boolean;
  moduleId: string;
  lesson: LearningLesson | null;
  nextOrder: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function LessonFormDialog({ open, moduleId, lesson, nextOrder, onOpenChange, onSaved }: LessonFormDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(lesson?.title ?? "");
    setSlug(lesson?.slug ?? "");
    setSlugTouched(Boolean(lesson));
    setDescription(lesson?.description ?? "");
    setYoutubeUrl(lesson?.youtube_url ?? "");
    setDuration(formatLessonDuration(lesson?.duration_seconds) ?? "");
    setThumbnail(lesson?.thumbnail_path ?? null);
    setOrder(lesson?.display_order ?? nextOrder);
    setPublished(lesson?.is_published ?? false);
  }, [open, lesson, nextOrder]);

  const videoId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);
  const invalidVideo = youtubeUrl.trim().length > 0 && !videoId;

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Informe o titulo da aula.");
    if (!slug.trim()) return toast.error("Informe o endereco (slug) da aula.");
    if (!videoId) return toast.error("Cole um link valido do YouTube. Videos nao listados tambem funcionam.");
    if (duration.trim() && parseLessonDuration(duration) === null) {
      return toast.error("Duracao invalida. Use o formato mm:ss, por exemplo 12:30.");
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      youtube_url: youtubeUrl.trim(),
      youtube_video_id: videoId,
      thumbnail_path: thumbnail,
      duration_seconds: parseLessonDuration(duration),
      display_order: Number.isFinite(order) ? order : 0,
      is_published: published,
    };
    try {
      if (lesson) await updateLesson(lesson.id, payload);
      else await createLesson(moduleId, payload);
      toast.success(lesson ? "Aula atualizada" : "Aula criada");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar a aula.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{lesson ? "Editar aula" : "Nova aula"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="learning-lesson-title">Titulo da aula</Label>
            <Input
              id="learning-lesson-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              placeholder="Ex.: Como conectar seu numero de WhatsApp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="learning-lesson-slug">Endereco da aula (slug)</Label>
            <Input
              id="learning-lesson-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(normalizeSlug(event.target.value));
              }}
              placeholder="como-conectar-whatsapp"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="learning-lesson-youtube">Link do YouTube</Label>
            <Input
              id="learning-lesson-youtube"
              value={youtubeUrl}
              onChange={(event) => setYoutubeUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
            />
            {invalidVideo && <p className="text-xs text-destructive">Nao reconheci um video do YouTube nesse link.</p>}
            {videoId && <p className="text-xs text-muted-foreground">Video identificado: {videoId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="learning-lesson-description">Descricao da aula</Label>
            <Textarea
              id="learning-lesson-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="Resumo do que sera ensinado nesta aula."
            />
          </div>
          <ImageUploadField
            label="Thumbnail da aula"
            value={thumbnail}
            folder="lessons"
            onChange={setThumbnail}
            hint="Opcional. JPG, PNG ou WEBP de ate 5 MB."
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="learning-lesson-duration">Duracao (opcional)</Label>
              <Input
                id="learning-lesson-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="12:30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-lesson-order">Ordem de exibicao</Label>
              <Input
                id="learning-lesson-order"
                type="number"
                value={order}
                onChange={(event) => setOrder(Number(event.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor="learning-lesson-published" className="text-sm">
              Aula publicada
            </Label>
            <Switch id="learning-lesson-published" checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Salvar aula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
