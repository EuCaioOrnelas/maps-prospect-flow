import { ExternalLink, Phone, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatTemplateButton } from "@/lib/chatTemplatePresentation";

export function ChatTemplateButtons({ buttons }: { buttons: ChatTemplateButton[] }) {
  if (!buttons.length) return null;
  return (
    <div className="border-t border-border/50 min-w-[180px]" aria-label="Botões do template">
      {buttons.map((button, index) => {
        const Icon = button.type === "URL" ? ExternalLink : button.type === "PHONE_NUMBER" ? Phone : Reply;
        const content = <><Icon size={16} className="shrink-0" /><span className="min-w-0 break-words text-center">{button.text}</span></>;
        const className = "flex items-center justify-center gap-2 w-full min-h-10 px-3 py-2 text-sm font-medium wa-accent-text border-b last:border-b-0 border-border/50";
        return button.href ? (
          <Button key={index} variant="ghost" asChild className={`${className} h-auto rounded-none whitespace-normal`}>
            <a href={button.href} target={button.type === "URL" ? "_blank" : undefined} rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{content}</a>
          </Button>
        ) : <div key={index} className={className}>{content}</div>;
      })}
    </div>
  );
}