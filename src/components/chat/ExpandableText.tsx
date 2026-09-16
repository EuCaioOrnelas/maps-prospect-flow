import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { parseWhatsAppText } from "@/lib/whatsappFormat";

interface Props {
  text: string;
  /** When this value changes, the text collapses again (e.g. conversation id). */
  collapseKey?: string | null;
  className?: string;
  /** Max collapsed height in px */
  collapsedMaxHeight?: number;
}

/**
 * WhatsApp-style "Ver mais" / "Ver menos" for long texts.
 * Collapses automatically whenever collapseKey changes (leaving the conversation).
 * Smooth height animation using measured px values (no jump to max-height: none).
 */
export function ExpandableText({ text, collapseKey, className, collapsedMaxHeight = 220 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [fullHeight, setFullHeight] = useState<number>(collapsedMaxHeight);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setExpanded(false);
  }, [collapseKey, text]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const h = el.scrollHeight;
      setFullHeight(h);
      setOverflowing(h > collapsedMaxHeight + 8);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, collapsedMaxHeight]);

  const collapsed = overflowing && !expanded;
  const maxHeight = !overflowing
    ? "none"
    : expanded
      ? `${fullHeight}px`
      : `${collapsedMaxHeight}px`;

  return (
    <div className="w-full">
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight }}
      >
        <span
          ref={ref}
          className={cn("block whitespace-pre-wrap break-words", className)}
        >
          {text}
        </span>
      </div>
      {overflowing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="mt-[2px] text-[12.5px] font-semibold wa-accent-text hover:underline"
        >
          {expanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}
