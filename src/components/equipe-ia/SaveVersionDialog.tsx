import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName?: string;
  loading?: boolean;
  onConfirm: (name: string, notes: string) => void;
}

export function SaveVersionDialog({ open, onOpenChange, defaultName, loading, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const ts = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
      setName(defaultName || `Versão ${ts}`);
      setNotes("");
    }
  }, [open, defaultName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Salvar versão</DialogTitle>
          <DialogDescription>
            Dê um nome para esta versão. Você poderá restaurá-la depois na aba <span className="font-semibold text-foreground">Versões</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Nome da versão</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Adicionei regras de cobrança" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Notas (opcional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="O que mudou nesta versão?" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={() => onConfirm(name.trim() || "Sem nome", notes.trim())} disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Save className="size-4 mr-1.5" />}
            Salvar versão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
