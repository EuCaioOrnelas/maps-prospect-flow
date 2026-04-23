import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";

interface Material {
  id: string;
  category: string;
  title: string;
  description: string | null;
  content_text: string | null;
  asset_url: string | null;
  preview_url: string | null;
  format: string | null;
  is_active: boolean;
  display_order: number;
}

const emptyForm = {
  category: "copy", title: "", description: "", content_text: "",
  asset_url: "", preview_url: "", format: "text", is_active: true, display_order: 0,
};

export default function AdminPartnersMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("partner_materials").select("*").order("display_order", { ascending: true });
    setMaterials((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (m: Material) => { setEditing(m); setForm({ ...m }); setOpen(true); };

  const save = async () => {
    if (!form.title) { toast({ title: "Título é obrigatório", variant: "destructive" }); return; }
    const payload = {
      category: form.category, title: form.title, description: form.description || null,
      content_text: form.content_text || null, asset_url: form.asset_url || null,
      preview_url: form.preview_url || null, format: form.format || null,
      is_active: form.is_active, display_order: Number(form.display_order) || 0,
    };
    const { error } = editing
      ? await supabase.from("partner_materials").update(payload).eq("id", editing.id)
      : await supabase.from("partner_materials").insert(payload);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Material atualizado" : "Material criado" });
    setOpen(false); load();
  };

  const remove = async (m: Material) => {
    if (!confirm(`Excluir "${m.title}"?`)) return;
    const { error } = await supabase.from("partner_materials").delete().eq("id", m.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Material excluído" });
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Materiais de divulgação</h1>
          <p className="text-sm text-muted-foreground mt-1">Banners, copies, vídeos visíveis para parceiros ativos.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus size={16} /> Novo material</Button>
      </div>

      {loading ? (
        <div className="p-12 text-center"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" /></div>
      ) : materials.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhum material cadastrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {materials.map((m) => (
            <Card key={m.id} className={!m.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground capitalize w-20 text-center shrink-0">{m.category}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{m.title}</div>
                  {m.description && <div className="text-xs text-muted-foreground truncate">{m.description}</div>}
                </div>
                <div className="text-xs text-muted-foreground">#{m.display_order}</div>
                <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Edit size={14} /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(m)}><Trash2 size={14} /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar material" : "Novo material"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Mensagem / copy</SelectItem>
                    <SelectItem value="social">Redes sociais</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordem de exibição</Label>
                <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Conteúdo de texto (use {"{{LINK}}"}, {"{{NOME}}"}, {"{{SEU_NOME}}"})</Label>
              <Textarea rows={6} value={form.content_text} onChange={(e) => setForm({ ...form, content_text: e.target.value })} className="mt-1.5 font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>URL do arquivo (download)</Label>
                <Input value={form.asset_url} onChange={(e) => setForm({ ...form, asset_url: e.target.value })} className="mt-1.5" placeholder="https://..." />
              </div>
              <div>
                <Label>URL da prévia (imagem)</Label>
                <Input value={form.preview_url} onChange={(e) => setForm({ ...form, preview_url: e.target.value })} className="mt-1.5" placeholder="https://..." />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativo (visível aos parceiros)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
