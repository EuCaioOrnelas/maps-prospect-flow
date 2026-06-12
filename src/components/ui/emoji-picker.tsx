"use client";

import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import {
  LoaderIcon, SearchIcon,
  Smile, Users, Dog, UtensilsCrossed, Plane, Dribbble, Lightbulb, Heart, Flag,
} from "lucide-react";
import { forwardRef, useRef, useEffect, useCallback } from "react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function EmojiPicker({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn("flex flex-col isolate", className)}
      locale="en"
      columns={8}
      {...props}
    />
  );
}

function EmojiPickerSearch({
  className,
  ...props
}: ComponentProps<typeof EmojiPickerPrimitive.Search>) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 border-b">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        className={cn(
          "flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

// English category labels emitted by frimousse (locale="en") mapped to our identifiers
const EN_LABEL_TO_ID: Record<string, string> = {
  "Smileys & Emotion": "smileys",
  "People & Body": "people",
  "Animals & Nature": "animals",
  "Food & Drink": "food",
  "Travel & Places": "travel",
  "Activities": "activities",
  "Objects": "objects",
  "Symbols": "symbols",
  "Flags": "flags",
};

const CATEGORIES = [
  { id: "smileys", label: "Smileys e emoções", Icon: Smile },
  { id: "people", label: "Pessoas", Icon: Users },
  { id: "animals", label: "Animais e natureza", Icon: Dog },
  { id: "food", label: "Comida e bebida", Icon: UtensilsCrossed },
  { id: "travel", label: "Viagens e lugares", Icon: Plane },
  { id: "activities", label: "Atividades", Icon: Dribbble },
  { id: "objects", label: "Objetos", Icon: Lightbulb },
  { id: "symbols", label: "Símbolos", Icon: Heart },
  { id: "flags", label: "Bandeiras", Icon: Flag },
];

function EmojiPickerCategories({ activeCategoryId, onCategoryClick }: { activeCategoryId?: string; onCategoryClick: (id: string) => void }) {
  return (
    <div className="flex items-center justify-around px-1 py-0.5 border-b gap-0">
      {CATEGORIES.map((cat) => {
        const Icon = cat.Icon;
        const isActive = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            title={cat.label}
            onClick={() => onCategoryClick(cat.id)}
            className={cn(
              "w-9 h-9 flex items-center justify-center transition-all relative",
              isActive ? "opacity-100" : "opacity-50 hover:opacity-80"
            )}
          >
            <Icon size={18} className={isActive ? "text-[#00a884]" : "wa-icon-panel"} strokeWidth={1.8} />
            <span
              className={cn(
                "absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-full transition-all duration-200",
                isActive ? "w-6 bg-[#00a884]" : "w-0 bg-transparent"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function EmojiPickerRow({ children, ...props }: EmojiPickerListRowProps) {
  return (
    <div className="flex justify-between" {...props}>
      {children}
    </div>
  );
}

function EmojiPickerEmoji({
  emoji,
  className,
  ...props
}: EmojiPickerListEmojiProps) {
  return (
    <button
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-base transition-colors hover:bg-gray-200/50 dark:hover:bg-gray-600/30",
        className,
      )}
      {...props}
    >
      {emoji.emoji}
    </button>
  );
}

function EmojiPickerCategoryHeader({
  category,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  const id = EN_LABEL_TO_ID[category.label] || category.label;
  const ptLabel = CATEGORIES.find(c => c.id === id)?.label || category.label;
  return (
    <div
      className="bg-background px-1 py-2 text-xs font-medium text-muted-foreground"
      data-category-id={id}
      {...props}
    >
      {ptLabel}
    </div>
  );
}

type EmojiPickerContentProps = ComponentProps<typeof EmojiPickerPrimitive.Viewport> & {
  onVisibleCategoryChange?: (id: string) => void;
};

const EmojiPickerContent = forwardRef<HTMLDivElement, EmojiPickerContentProps>(function EmojiPickerContent({
  className,
  onVisibleCategoryChange,
  ...props
}, forwardedRef) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const setViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  useEffect(() => {
    if (!onVisibleCategoryChange || !viewportRef.current) return;
    const viewport = viewportRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).getAttribute("data-category-id");
            if (id) onVisibleCategoryChange(id);
          }
        }
      },
      { root: viewport, threshold: 0.1, rootMargin: "0px 0px -80% 0px" }
    );

    const attach = () => {
      const headers = viewport.querySelectorAll("[data-category-id]");
      headers.forEach(h => observer.observe(h));
    };
    const timer = setTimeout(attach, 300);
    const mo = new MutationObserver(() => attach());
    mo.observe(viewport, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      mo.disconnect();
      observer.disconnect();
    };
  }, [onVisibleCategoryChange]);

  return (
    <EmojiPickerPrimitive.Viewport
      ref={setViewportRef}
      className={cn("outline-none", className)}
      {...props}
    >
      <EmojiPickerPrimitive.Loading>
        <div className="flex flex-1 items-center justify-center">
          <LoaderIcon className="size-5 animate-spin opacity-50" />
        </div>
      </EmojiPickerPrimitive.Loading>
      <EmojiPickerPrimitive.Empty>
        <span className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Nenhum emoji encontrado.
        </span>
      </EmojiPickerPrimitive.Empty>
      <EmojiPickerPrimitive.List
        className="select-none px-1.5 pb-1.5"
        components={{
          Row: EmojiPickerRow,
          Emoji: EmojiPickerEmoji,
          CategoryHeader: EmojiPickerCategoryHeader,
        }}
      />
    </EmojiPickerPrimitive.Viewport>
  );
});

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerCategories,
  EmojiPickerContent,
  CATEGORIES,
  EN_LABEL_TO_ID,
};
