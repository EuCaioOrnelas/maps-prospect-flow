"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import wianAvatar from "@/assets/wian-avatar.png";

export interface ArticleCardProps {
  headline: string;
  excerpt: string;
  cover?: string;
  tag?: string;
  tagColor?: string | null;
  readingTime?: number;
  writer?: string;
  writerAvatar?: string;
  publishedAt?: Date | string | null;
  href?: string;
  className?: string;
}

const formatReadTime = (m?: number) =>
  !m || m < 1 ? "1 min. de leitura" : `${m} min. de leitura`;

const formatDate = (d?: Date | string | null) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export const ArticleCard: React.FC<ArticleCardProps> = ({
  cover,
  readingTime,
  headline,
  excerpt,
  writer,
  writerAvatar,
  publishedAt,
  href,
  className,
}) => {
  const isWian = !writer || writer.toLowerCase() === "wian";
  const avatarSrc = writerAvatar || (isWian ? wianAvatar : undefined);

  const inner = (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-2 sm:p-2.5 transform-gpu transition-transform duration-300 ease-out hover:-translate-y-1 will-change-transform [backface-visibility:hidden]",
        className
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={headline}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        )}
      </div>

      {/* Title + excerpt */}
      <div className="flex flex-1 flex-col px-1 pt-4">
        <h3 className="text-base sm:text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {headline}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
          {excerpt}
        </p>

        {/* Author pill — no inner border, aligned with cover image */}
        <div className="mt-auto pt-4">
          <div className="flex w-full items-center gap-3 rounded-2xl bg-muted/40 px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background overflow-hidden ring-1 ring-border/50">
              {avatarSrc ? (
                <img src={avatarSrc} alt={writer || "Wian"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-primary">
                  {(writer || "W").slice(0, 1).toUpperCase()}
                </span>
              )}
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">{writer || "Wian"}</span>
              <span className="text-[11px] text-muted-foreground truncate">
                {publishedAt && <>{formatDate(publishedAt)}</>}
                {publishedAt && readingTime ? " • " : ""}
                {readingTime ? formatReadTime(readingTime) : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );


  return href ? (
    <a href={href} className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
};
