import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TipTapEditor } from "@/components/admin/blog/TipTapEditor";
import { toast } from "sonner";
import type { LifecycleStep } from "@/hooks/useLifecycleCampaign";

const VARIABLES = [
  "{{user.name}}",
  "{{user.email}}",
  "{{company.name}}",
  "{{trial.days_remaining}}",
  "{{trial.end_date}}",
  "{{dashboard_url}}",
  "{{checkout_url}}",
];

interface Props {
  step: LifecycleStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stepId: string, patch: Partial<LifecycleStep>) => Promise<void>;
}

export function StepEditorDialog({ step, open, onOpenChange, onSave }: Props) {
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!step) return;
    setSubject(step.subject || "");
    setPreheader(step.preheader || "");
    setContent(step.content || "");
    setIsActive(step.is_active);
  }, [step]);

  if (!step) return null;

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("O assunto é obrigatório");
      return;
    }
    setSaving(true);
    try {
      await onSave(step.id, { subject: subject.trim(), preheader: preheader.trim(), content, is_active: isActive });
      toast.success("E-mail salvo");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">DIA {step.day_offset}</Badge>
            {step.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Etapa ativa</p>
              <p className="text-xs text-muted-foreground">Quando desativada, esta etapa é pulada no fluxo.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-1.5">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto do e-mail" />
          </div>

          <div className="space-y-1.5">
            <Label>Preheader (prévia na caixa de entrada)</Label>
            <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Texto curto de prévia" />
          </div>

          <div className="space-y-1.5">
            <Label>Variáveis disponíveis</Label>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(v);
                    toast.success(`${v} copiado`);
                  }}
                  className="text-[11px] px-2 py-1 rounded-md border border-border/60 bg-muted/40 hover:bg-muted transition-colors font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Se o dado não existir, a variável some do texto (nunca aparece "undefined").
            </p>
          </div>

          <Tabs defaultValue="visual">
            <TabsList>
              <TabsTrigger value="visual">Editor visual</TabsTrigger>
              <TabsTrigger value="html">HTML</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="mt-3">
              <TipTapEditor value={content} onChange={setContent} placeholder="Escreva o e-mail..." />
            </TabsContent>
            <TabsContent value="html" className="mt-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-xs min-h-[320px]"
              />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar e-mail"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
