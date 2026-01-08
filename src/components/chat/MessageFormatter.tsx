import { memo, useMemo, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MessageFormatterProps {
  content: string;
  fromMe: boolean;
  fontSize: string;
}

// Parse WhatsApp-style formatting: *bold*, _italic_, ~strikethrough~, and lists with -
const parseWhatsAppFormatting = (text: string, fromMe: boolean): ReactNode[] => {
  const lines = text.split('\n');
  const result: ReactNode[] = [];
  let currentListItems: string[] = [];
  let lineIndex = 0;

  const flushList = () => {
    if (currentListItems.length > 0) {
      result.push(
        <ul key={`list-${lineIndex}`} className="list-disc list-inside my-1 space-y-0.5">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="text-left">
              {formatInlineText(item.trim(), fromMe, `li-${lineIndex}-${idx}`)}
            </li>
          ))}
        </ul>
      );
      currentListItems = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if line starts with - (list item)
    if (trimmedLine.startsWith('- ') || trimmedLine === '-') {
      const listContent = trimmedLine.startsWith('- ') ? trimmedLine.slice(2) : '';
      currentListItems.push(listContent);
    } else {
      // Flush any pending list
      flushList();
      
      // Add regular line with inline formatting
      if (trimmedLine.length > 0) {
        result.push(
          <span key={`line-${lineIndex}`}>
            {result.length > 0 && <br />}
            {formatInlineText(line, fromMe, `text-${lineIndex}`)}
          </span>
        );
      } else if (result.length > 0) {
        // Empty line = line break
        result.push(<br key={`br-${lineIndex}`} />);
      }
    }
    lineIndex++;
  }

  // Flush remaining list items
  flushList();

  return result;
};

// Format inline text: *bold*, _italic_, ~strikethrough~, `code`, and URLs
const formatInlineText = (text: string, fromMe: boolean, keyPrefix: string): ReactNode[] => {
  const result: ReactNode[] = [];
  let partIndex = 0;

  // Combined regex to find all formatting markers AND URLs
  // URL regex must come first to avoid matching partial URLs inside formatting
  const combinedRegex = /(https?:\/\/[^\s]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|`[^`\n]+`)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const matchedText = match[0];
    const key = `${keyPrefix}-${partIndex++}`;

    // Check if it's a URL first
    if (matchedText.startsWith('http://') || matchedText.startsWith('https://')) {
      result.push(
        <a
          key={key}
          href={matchedText}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'underline hover:opacity-80 transition-opacity break-all',
            fromMe ? 'text-primary-foreground' : 'text-primary'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {matchedText}
        </a>
      );
    } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
      result.push(<strong key={key}>{matchedText.slice(1, -1)}</strong>);
    } else if (matchedText.startsWith('_') && matchedText.endsWith('_')) {
      result.push(<em key={key}>{matchedText.slice(1, -1)}</em>);
    } else if (matchedText.startsWith('~') && matchedText.endsWith('~')) {
      result.push(<s key={key}>{matchedText.slice(1, -1)}</s>);
    } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
      result.push(
        <code key={key} className={cn(
          "px-1 py-0.5 rounded text-xs font-mono",
          fromMe ? "bg-black/20" : "bg-muted"
        )}>
          {matchedText.slice(1, -1)}
        </code>
      );
    }

    lastIndex = combinedRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : [text];
};

const MessageFormatterComponent = ({ content, fromMe, fontSize }: MessageFormatterProps) => {
  const formattedContent = useMemo(() => {
    return parseWhatsAppFormatting(content, fromMe);
  }, [content, fromMe]);

  return (
    <div className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere]', fontSize)}>
      {formattedContent}
    </div>
  );
};

export const MessageFormatter = memo(MessageFormatterComponent);
