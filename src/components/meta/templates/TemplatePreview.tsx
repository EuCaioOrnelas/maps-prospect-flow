import { Image, Video, FileText, ExternalLink, Phone, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftTemplate } from "@/lib/metaTemplates";
import { renderWithExamples } from "@/lib/metaTemplates";

interface TemplatePreviewProps {
  draft: DraftTemplate;
  className?: string;
}

const MEDIA_ICON = { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText } as const;
const MEDIA_LABEL = { IMAGE: "Imagem", VIDEO: "Vídeo", DOCUMENT: "Documento" } as const;

/** Simulação neutra de uma conversa, sem usar a marca do WhatsApp. */
export function TemplatePreview({ draft, className }: TemplatePreviewProps) {
  const body = renderWithExamples(draft.body, draft.bodyExamples);
  const header = draft.headerFormat === "TEXT"
    ? renderWithExamples(draft.headerText, [draft.headerExample])
    : "";
  const MediaIcon = draft.headerFormat !== "TEXT" && draft.headerFormat !== "NONE"
    ? MEDIA_ICON[draft.headerFormat as keyof typeof MEDIA_ICON]
    : null;

  return (
    <div className={cn("rounded-xl border border-border bg-muted/40 p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground mb-3">Prévia da mensagem</p>
      <div className="rounded-xl bg-background/60 border border-border/60 p-4">
        <div className="max-w-[300px] rounded-xl rounded-tl-sm bg-card border border-border shadow-sm overflow-hidden">
          {MediaIcon && (
            <div className="h-28 bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <MediaIcon className="h-6 w-6" aria-hidden />
              <span className="text-[11px]">{MEDIA_LABEL[draft.headerFormat as keyof typeof MEDIA_LABEL]}</span>
            </div>
          )}
          <div className="px-3 py-2.5 space-y-1.5">
            {header && <p className="text-sm font-semibold text-foreground break-words">{header}</p>}
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {body || <span className="text-muted-foreground">Escreva o corpo da mensagem…</span>}
            </p>
            {draft.footer.trim() && (
              <p className="text-[11px] text-muted-foreground break-words">{draft.footer}</p>
            )}
          </div>
          {draft.buttons.length > 0 && (
            <div className="border-t border-border divide-y divide-border">
              {draft.buttons.map((b, i) => {
                const Icon = b.type === "URL" ? ExternalLink : b.type === "PHONE_NUMBER" ? Phone : Reply;
                return (
                  <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-sm text-primary font-medium">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    <span className="truncate max-w-[220px]">{b.text || "Botão"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
