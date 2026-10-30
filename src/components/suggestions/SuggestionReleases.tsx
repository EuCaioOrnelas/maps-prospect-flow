import { useEffect, useState } from "react";
import { Hammer, PackageCheck, ExternalLink, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatSuggestionDateShort, type SuggestionReleaseRow } from "@/lib/suggestions";

/**
 * Seções públicas "Em desenvolvimento na Wiize" e "Últimas melhorias
 * implementadas", alimentadas pelo planejamento administrativo.
 */
export default function SuggestionReleases() {
  const [items, setItems] = useState<SuggestionReleaseRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("suggestion_releases")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!cancelled) {
        setItems((data || []) as unknown as SuggestionReleaseRow[]);
        setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded || items.length === 0) return null;

  const inDevelopment = items.filter((i) => i.status === "em_desenvolvimento");
  const released = items.filter((i) => i.status === "implementada");

  const renderCard = (item: SuggestionReleaseRow, done: boolean) => (
    <Card key={item.id} className="border-border/60">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground leading-snug">{item.title}</h3>
          {item.category && (
            <Badge variant="outline" className="text-[11px] font-normal shrink-0">
              {item.category}
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {item.description}
          </p>
        )}
        {item.benefit && (
          <p className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-medium">Benefício: </span>
            {item.benefit}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
          {done && item.released_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} />
              Lançada em {formatSuggestionDateShort(item.released_at)}
            </span>
          )}
          {!done && item.expected_date && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={11} />
              Previsão: {formatSuggestionDateShort(item.expected_date)}
            </span>
          )}
          {item.doc_url && (
            <a
              href={item.doc_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink size={11} />
              Saiba mais
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {inDevelopment.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hammer size={16} className="text-primary" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Em desenvolvimento na Wiize
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {inDevelopment.map((i) => renderCard(i, false))}
          </div>
        </section>
      )}

      {released.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <PackageCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Últimas melhorias implementadas
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {released.map((i) => renderCard(i, true))}
          </div>
        </section>
      )}
    </div>
  );
}
