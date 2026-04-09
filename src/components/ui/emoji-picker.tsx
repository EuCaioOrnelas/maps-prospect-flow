"use client";

import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
} from "frimousse";
import { LoaderIcon, SearchIcon, SmileIcon, HeartIcon, CoffeeIcon, TreesIcon, PlaneIcon, LightbulbIcon, HashIcon, FlagIcon } from "lucide-react";
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
    <div className="flex items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <EmojiPickerPrimitive.Search
        className={cn(
          "flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          className,
        )}
        {...props}
      />
    </div>
  );
}

// Category navigation bar like WhatsApp
const CATEGORY_ICONS: { label: string; icon: React.ReactNode; emoji: string }[] = [
  { label: "Smileys", icon: <SmileIcon size={18} />, emoji: "😀" },
  { label: "Pessoas", icon: <HeartIcon size={18} />, emoji: "👋" },
  { label: "Animais", icon: <TreesIcon size={18} />, emoji: "🐶" },
  { label: "Comida", icon: <CoffeeIcon size={18} />, emoji: "🍔" },
  { label: "Viagens", icon: <PlaneIcon size={18} />, emoji: "✈️" },
  { label: "Atividades", icon: <LightbulbIcon size={18} />, emoji: "⚽" },
  { label: "Objetos", icon: <HashIcon size={18} />, emoji: "💡" },
  { label: "Bandeiras", icon: <FlagIcon size={18} />, emoji: "🏁" },
];

function EmojiPickerCategories() {
  return (
    <div className="flex items-center justify-around px-2 py-1.5 border-b">
      {CATEGORY_ICONS.map((cat) => (
        <button
          key={cat.label}
          title={cat.label}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {cat.icon}
        </button>
      ))}
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
        "flex size-8 items-center justify-center rounded-md text-base transition-colors hover:bg-accent/60",
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
      {...props}
    >
      {category.label}
    </div>
  );
}

function EmojiPickerContent({
  className,
  ...props
}: React.ComponentProps<typeof EmojiPickerPrimitive.Viewport>) {
  return (
    <EmojiPickerPrimitive.Viewport
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

function EmojiPickerFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 border-t p-2 text-sm",
        className,
      )}
      {...props}
    >
      <EmojiPickerPrimitive.ActiveEmoji>
        {({ emoji }) =>
          emoji ? (
            <>
              <div className="flex size-6 items-center justify-center text-lg">
                {emoji.emoji}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {emoji.label}
              </span>
            </>
          ) : (
            <span className="ml-1.5 text-xs text-muted-foreground">
              Selecione um emoji…
            </span>
          )
        }
      </EmojiPickerPrimitive.ActiveEmoji>
    </div>
  );
}

export {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerCategories,
  EmojiPickerContent,
  EmojiPickerFooter,
};
