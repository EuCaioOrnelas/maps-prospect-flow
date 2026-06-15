import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WORKFORCE_NODE_META, type WorkforceNodeKind } from "../nodeTypes";

interface NodeData {
  kind: WorkforceNodeKind;
  title?: string;
  summary?: string;
  [key: string]: unknown;
}

interface Props {
  node: { id: string; data: NodeData } | null;
  onClose: () => void;
  onChange: (id: string, patch: Partial<NodeData>) => void;
}

export function NodeConfigDrawer({ node, onClose, onChange }: Props) {
  if (!node) return null;
  const meta = WORKFORCE_NODE_META[node.data.kind];

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-card">
        <SheetHeader>
          <SheetTitle>{meta.label}</SheetTitle>
          <SheetDescription>{meta.description}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label className="text-xs">Título exibido</Label>
            <Input
              value={node.data.title ?? ""}
              placeholder={meta.label}
              onChange={(e) => onChange(node.id, { title: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Resumo / instruções</Label>
            <Textarea
              rows={6}
              value={node.data.summary ?? ""}
              placeholder={meta.description}
              onChange={(e) => onChange(node.id, { summary: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mais configurações específicas deste card serão disponibilizadas em breve.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
