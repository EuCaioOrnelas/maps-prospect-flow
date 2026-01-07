import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { List, Grid } from 'lucide-react';

interface InteractiveData {
  type?: string;
  header?: {
    title?: string;
    subtitle?: string;
    hasMediaAttachment?: boolean;
  } | null;
  body?: {
    text?: string;
  } | null;
  footer?: {
    text?: string;
  } | null;
  buttons?: Array<{
    buttonId?: string;
    buttonText?: { displayText?: string };
  }>;
  sections?: Array<{
    title?: string;
    rows?: Array<{
      rowId?: string;
      title?: string;
      description?: string;
    }>;
  }>;
  title?: string;
  buttonText?: string;
  nativeFlowMessage?: unknown;
  collectionMessage?: unknown;
  shopStorefrontMessage?: unknown;
}

interface InteractiveMessageProps {
  interactive: InteractiveData;
  fromMe: boolean;
}

const InteractiveMessageComponent = ({ interactive, fromMe }: InteractiveMessageProps) => {
  const renderButtons = () => {
    if (!interactive.buttons || interactive.buttons.length === 0) return null;
    
    return (
      <div className="flex flex-col gap-1 mt-2">
        {interactive.buttons.map((btn, idx) => (
          <div
            key={btn.buttonId || idx}
            className={cn(
              "text-center py-2 px-3 rounded text-sm border",
              fromMe 
                ? "border-white/30 text-white/90" 
                : "border-primary/30 text-primary"
            )}
          >
            {btn.buttonText?.displayText || btn.buttonId || `Opção ${idx + 1}`}
          </div>
        ))}
      </div>
    );
  };

  const renderList = () => {
    if (!interactive.sections || interactive.sections.length === 0) return null;
    
    return (
      <div className="mt-2 space-y-2">
        {interactive.buttonText && (
          <div className={cn(
            "flex items-center justify-center gap-2 py-2 px-3 rounded text-sm border",
            fromMe 
              ? "border-white/30 text-white/90" 
              : "border-primary/30 text-primary"
          )}>
            <List className="h-4 w-4" />
            {interactive.buttonText}
          </div>
        )}
        {interactive.sections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <p className={cn(
                "text-xs font-semibold",
                fromMe ? "text-white/70" : "text-muted-foreground"
              )}>
                {section.title}
              </p>
            )}
            {section.rows?.map((row, rowIdx) => (
              <div
                key={row.rowId || rowIdx}
                className={cn(
                  "py-1.5 px-2 rounded text-sm",
                  fromMe 
                    ? "bg-white/10" 
                    : "bg-muted/50"
                )}
              >
                <p className="font-medium">{row.title || row.rowId}</p>
                {row.description && (
                  <p className={cn(
                    "text-xs",
                    fromMe ? "text-white/60" : "text-muted-foreground"
                  )}>
                    {row.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderFlowOrCollection = () => {
    // For native flow or collection messages, show an indicator
    const isFlow = interactive.type === 'flow' || interactive.nativeFlowMessage;
    const isCollection = interactive.type === 'collection' || interactive.collectionMessage;
    const isStorefront = interactive.type === 'storefront' || interactive.shopStorefrontMessage;
    
    if (!isFlow && !isCollection && !isStorefront) return null;
    
    return (
      <div className={cn(
        "flex items-center gap-2 mt-2 py-2 px-3 rounded text-sm",
        fromMe 
          ? "bg-white/10 text-white/70" 
          : "bg-muted text-muted-foreground"
      )}>
        <Grid className="h-4 w-4" />
        {isFlow && 'Mensagem interativa'}
        {isCollection && 'Catálogo'}
        {isStorefront && 'Loja'}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      {interactive.header?.title && (
        <p className="font-semibold">
          {interactive.header.title}
        </p>
      )}
      {interactive.header?.subtitle && (
        <p className={cn(
          "text-sm",
          fromMe ? "text-white/80" : "text-muted-foreground"
        )}>
          {interactive.header.subtitle}
        </p>
      )}
      
      {/* Body */}
      {interactive.body?.text && (
        <p className="whitespace-pre-wrap">{interactive.body.text}</p>
      )}
      
      {/* Footer */}
      {interactive.footer?.text && (
        <p className={cn(
          "text-xs italic",
          fromMe ? "text-white/60" : "text-muted-foreground"
        )}>
          {interactive.footer.text}
        </p>
      )}
      
      {/* Buttons (legacy) */}
      {interactive.type === 'buttons' && renderButtons()}
      
      {/* List */}
      {interactive.type === 'list' && renderList()}
      
      {/* Flow/Collection/Storefront indicator */}
      {renderFlowOrCollection()}
    </div>
  );
};

export const InteractiveMessage = memo(InteractiveMessageComponent);
