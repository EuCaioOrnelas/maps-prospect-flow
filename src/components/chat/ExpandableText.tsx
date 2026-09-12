import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
 */
export function ExpandableText({ text, collapseKey, className, collapsedMaxHeight = 220 }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    setExpanded(false);
  }, [collapseKey, text]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollHeight > collapsedMaxHeight + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, collapsedMaxHeight]);

  const collapsed = overflowing && !expanded;

  return (
    <div className="w-full">
      <div
        className="relative overflow-hidden transition-[max-height] duration-200"
        style={{ maxHeight: collapsed ? `${collapsedMaxHeight}px` : "none" }}
      >
        <span
          ref={ref}
          className={cn("block whitespace-pre-wrap break-words", className)}
        >
          {text}
        </span>
        {collapsed && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-8 wa-fade-bottom" />
        )}
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
