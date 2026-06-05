"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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
  !m || m < 1 ? "1 min de leitura" : `${m} min de leitura`;

const formatDate = (d?: Date | string | null) => {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const initials = (name?: string) =>
  (name || "W")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
  const inner = (
    <article
      className={cn(
        "group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-3 sm:p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-lg",
        className
      )}
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={headline}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        )}
      </div>

      {/* Title + excerpt */}
      <div className="flex flex-1 flex-col px-1 pt-4 sm:px-2">
        <h3 className="text-base sm:text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {headline}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {excerpt}
        </p>

        {/* Author pill */}
        <div className="mt-auto pt-4">
          <div className="inline-flex items-center gap-2.5 rounded-full bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary overflow-hidden">
              {writerAvatar ? (
                <img src={writerAvatar} alt={writer || "Autor"} className="h-full w-full object-cover" />
              ) : (
                initials(writer)
              )}
            </span>
            <span className="font-medium text-foreground">{writer || "Wian"}</span>
            {publishedAt && <span className="opacity-60">{formatDate(publishedAt)}</span>}
            {readingTime ? (
              <>
                <span className="opacity-40">•</span>
                <span>{formatReadTime(readingTime)}</span>
              </>
            ) : null}
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
