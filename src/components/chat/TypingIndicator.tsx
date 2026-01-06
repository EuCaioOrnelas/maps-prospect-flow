import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  name: string;
  className?: string;
}

export const TypingIndicator = ({ name, className }: TypingIndicatorProps) => {
  return (
    <div className={cn('flex justify-start px-3', className)}>
      <div className="bg-card text-card-foreground rounded-lg rounded-tl-none border border-border px-3 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground italic">{name} está digitando</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
