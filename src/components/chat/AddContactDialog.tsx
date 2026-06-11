import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";

interface AddContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: string;
  defaultName?: string | null;
  onSave: (name: string) => Promise<void>;
}

export function AddContactDialog({ open, onOpenChange, phone, defaultName, onSave }: AddContactDialogProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(defaultName || "");
  }, [open, defaultName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-popover">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full wa-accent-bg-soft flex items-center justify-center mb-2">
            <UserPlus size={22} className="wa-accent-text" />
          </div>
          <DialogTitle>Salvar contato</DialogTitle>
          <DialogDescription>
            Salve este número no CRM com um nome para identificá-lo nas próximas conversas.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Nome do contato</Label>
            <Input
              id="contact-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João Silva"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            Telefone: <span className="font-mono">{phone}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Salvando..." : "Salvar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
