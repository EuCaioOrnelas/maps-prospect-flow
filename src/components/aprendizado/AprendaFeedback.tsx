import { BookOpen, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AprendaLoading({ label = "Carregando conteudo..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

interface AprendaEmptyProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  searching?: boolean;
}

export function AprendaEmpty({ title, description, actionLabel, onAction, searching }: AprendaEmptyProps) {
  const Icon = searching ? SearchX : BookOpen;
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <Icon className="h-9 w-9 text-muted-foreground/60" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
