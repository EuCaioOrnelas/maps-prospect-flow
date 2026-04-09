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
import { useRef, useEffect } from "react";
import type * as React from "react";

import { cn } from "@/lib/utils";

function EmojiPicker({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Root>) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn("flex flex-col", className)}
      locale="pt"
      {...props}
    />
  );
}

function EmojiPickerSearch({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Search>) {
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

const CATEGORIES = [
  { id: 0, label: "Smileys e emoções", Icon: Smile },
  { id: 1, label: "Pessoas", Icon: Users },
  { id: 2, label: "Animais e natureza", Icon: Dog },
  { id: 3, label: "Comida e bebida", Icon: UtensilsCrossed },
  { id: 4, label: "Viagens e lugares", Icon: Plane },
  { id: 5, label: "Atividades", Icon: Dribbble },
  { id: 6, label: "Objetos", Icon: Lightbulb },
  { id: 7, label: "Símbolos", Icon: Heart },
  { id: 8, label: "Bandeiras", Icon: Flag },
];

function EmojiPickerCategories({ activeCategory, onCategoryClick }: { activeCategory?: number; onCategoryClick: (idx: number) => void }) {
  return (
    <div className="flex items-center justify-around px-1 py-0.5 border-b gap-0">
      {CATEGORIES.map((cat, idx) => {
        const Icon = cat.Icon;
        const isActive = activeCategory === idx;
        return (
          <button
            key={cat.id}
            title={cat.label}
            onClick={() => onCategoryClick(idx)}
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
    <div className="flex" {...props}>
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
  return (
    <div
      className="bg-background px-1 py-2 text-xs font-medium text-muted-foreground"
      data-category-header={category.label}
      {...props}
    >
      {category.label}
    </div>
  );
}

function EmojiPickerContent({
  className,
  onVisibleCategoryChange,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport> & { onVisibleCategoryChange?: (idx: number) => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onVisibleCategoryChange || !viewportRef.current) return;
    const viewport = viewportRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const label = (entry.target as HTMLElement).getAttribute("data-category-header");
            if (label) {
              const idx = CATEGORIES.findIndex(c => c.label === label);
              if (idx >= 0) onVisibleCategoryChange(idx);
            }
          }
        }
      },
      { root: viewport, threshold: 0.5, rootMargin: "0px 0px -80% 0px" }
    );

    const timer = setTimeout(() => {
      const headers = viewport.querySelectorAll("[data-category-header]");
      headers.forEach(h => observer.observe(h));
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [onVisibleCategoryChange]);

  return (
    <EmojiPickerPrimitive.Viewport
      ref={viewportRef}
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
}

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerCategories,
  EmojiPickerContent,
  CATEGORIES,
};
