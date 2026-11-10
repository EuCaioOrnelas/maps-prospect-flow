import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "./ImageUploadField";
import { createModule, updateModule } from "@/services/aprendizado/learningService";
import { normalizeSlug, slugify } from "@/services/aprendizado/slug";
import type { LearningModuleWithLessons } from "@/types/aprendizado";

interface ModuleFormDialogProps {
  open: boolean;
  module: LearningModuleWithLessons | null;
  nextOrder: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ModuleFormDialog({ open, module, nextOrder, onOpenChange, onSaved }: ModuleFormDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(module?.title ?? "");
    setSlug(module?.slug ?? "");
    setSlugTouched(Boolean(module));
    setDescription(module?.description ?? "");
    setCover(module?.cover_path ?? null);
    setOrder(module?.display_order ?? nextOrder);
    setPublished(module?.is_published ?? false);
  }, [open, module, nextOrder]);

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Informe o nome do modulo.");
    if (!slug.trim()) return toast.error("Informe o endereco (slug) do modulo.");

    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      cover_path: cover,
      display_order: Number.isFinite(order) ? order : 0,
      is_published: published,
    };
    try {
      if (module) await updateModule(module.id, payload);
      else await createModule(payload);
      toast.success(module ? "Modulo atualizado" : "Modulo criado");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel salvar o modulo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{module ? "Editar modulo" : "Novo modulo"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="learning-module-title">Nome do modulo</Label>
            <Input
              id="learning-module-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
              placeholder="Ex.: Prospeccao de clientes"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="learning-module-slug">Endereco da pagina (slug)</Label>
            <Input
              id="learning-module-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(normalizeSlug(event.target.value));
              }}
              placeholder="prospeccao-de-clientes"
            />
            <p className="text-xs text-muted-foreground">/aprenda/{slug || "nome-do-modulo"}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="learning-module-description">Descricao</Label>
            <Textarea
              id="learning-module-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              placeholder="O que o usuario vai aprender neste modulo?"
            />
          </div>
          <ImageUploadField label="Banner de capa" value={cover} folder="modules" onChange={setCover} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="learning-module-order">Ordem de exibicao</Label>
              <Input
                id="learning-module-order"
                type="number"
                value={order}
                onChange={(event) => setOrder(Number(event.target.value))}
              />
            </div>
            <div className="flex items-end justify-between gap-3 rounded-lg border border-border p-3">
              <Label htmlFor="learning-module-published" className="text-sm">
                Publicado
              </Label>
              <Switch id="learning-module-published" checked={published} onCheckedChange={setPublished} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Somente modulos publicados aparecem na central. As aulas tambem precisam estar publicadas.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} className="gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}
            Salvar modulo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
