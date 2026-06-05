"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ArticleCardProps {
  headline: string;
  excerpt: string;
  cover?: string;
  tag?: string;
  tagColor?: string | null;
  readingTime?: number; // minutes
  writer?: string;
  publishedAt?: Date | string | null;
  clampLines?: number;
  href?: string;
  className?: string;
}

export function formatReadTime(minutes?: number): string {
  if (!minutes || minutes < 1) return "Menos de 1 min de leitura";
  return `${minutes} min de leitura`;
}

export function formatPostDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  cover,
  tag,
  tagColor,
  readingTime,
  headline,
  excerpt,
  writer,
  publishedAt,
  clampLines = 3,
  href,
  className,
}) => {
  const hasMeta = tag || readingTime;
  const hasFooter = writer || publishedAt;

  const inner = (
    <Card
      className={cn(
        "group h-full overflow-hidden border-border/60 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-xl",
        className
      )}
    >
      {cover ? (
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <img
            src={cover}
            alt={headline}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      )}

      <CardHeader className="space-y-3 pb-3">
        {hasMeta && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {tag && (
              <Badge
                variant="secondary"
                className="rounded-full"
                style={tagColor ? { backgroundColor: `${tagColor}20`, color: tagColor } : undefined}
              >
                {tag}
              </Badge>
            )}
            {tag && readingTime ? <span className="opacity-50">•</span> : null}
            {readingTime ? <span>{formatReadTime(readingTime)}</span> : null}
          </div>
        )}
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary line-clamp-2">
          {headline}
        </h3>
      </CardHeader>

      <CardContent className="pb-4">
        <p
          className={cn("text-sm leading-relaxed text-muted-foreground", clampLines > 0 && "line-clamp-3")}
          style={clampLines ? { WebkitLineClamp: clampLines } : undefined}
        >
          {excerpt}
        </p>
      </CardContent>

      {hasFooter && (
        <CardFooter className="mt-auto flex items-center justify-between border-t border-border/50 pt-4 text-xs">
          {writer && (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Por</span>
              <span className="font-medium text-foreground">{writer}</span>
            </div>
          )}
          {publishedAt && (
            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Publicado</span>
              <span className="font-medium text-foreground">{formatPostDate(publishedAt)}</span>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );

  if (href) {
    return (
      <a href={href} className="block h-full">
        {inner}
      </a>
    );
  }
  return inner;
};
