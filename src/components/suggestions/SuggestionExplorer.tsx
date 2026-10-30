import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, ThumbsUp, Lightbulb, Loader2, ArrowUpDown, Filter,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  SUGGESTION_ALL_CATEGORIES,
  SUGGESTION_STATUS_LABEL,
  SUGGESTION_STATUS_BADGE_CLASS,
  SUGGESTION_PUBLIC_STATUSES,
  formatSuggestionDateShort,
  type SuggestionRow,
  type SuggestionStatus,
} from "@/lib/suggestions";

const PAGE_SIZE = 10;

type SortMode = "voted" | "recent";

export default function SuggestionExplorer() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortMode>("voted");
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const buildQuery = useCallback(
    (from: number, to: number) => {
      let q = supabase
        .from("suggestions")
        .select("id, title, description, category, status, vote_count, created_at, user_name, company_name")
        .eq("is_public", true)
        .in("status", SUGGESTION_PUBLIC_STATUSES as string[]);
      if (category !== "all") q = q.eq("category", category);
      if (status !== "all") q = q.eq("status", status);
      if (debouncedSearch) {
        const term = `%${debouncedSearch}%`;
        q = q.or(`title.ilike.${term},description.ilike.${term}`);
      }
      q = q.order(sort === "voted" ? "vote_count" : "created_at", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);
      return q;
    },
    [category, status, debouncedSearch, sort]
  );

  const fetchFirstPage = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await buildQuery(0, PAGE_SIZE - 1);
      if (error) throw error;
      const list = (data || []) as unknown as SuggestionRow[];
      setRows(list);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e: any) {
      toast({ title: "Erro ao carregar sugestões", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [buildQuery, toast]);

  useEffect(() => { fetchFirstPage(); }, [fetchFirstPage]);

  // Votos do usuário logado
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("suggestion_votes")
        .select("suggestion_id")
        .eq("user_id", user.id);
      if (!cancelled) setMyVotes(new Set(((data || []) as any[]).map((v) => v.suggestion_id)));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const from = rows.length;
      const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const list = (data || []) as unknown as SuggestionRow[];
      setRows((prev) => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e: any) {
      toast({ title: "Erro ao carregar mais", description: e.message, variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleVote = async (row: SuggestionRow) => {
    if (!user?.id || votingId) return;
    setVotingId(row.id);
    const alreadyVoted = myVotes.has(row.id);
    // Otimista
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (alreadyVoted) next.delete(row.id); else next.add(row.id);
      return next;
    });
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id ? { ...r, vote_count: Math.max(0, r.vote_count + (alreadyVoted ? -1 : 1)) } : r
      )
    );
    try {
      if (alreadyVoted) {
        const { error } = await supabase
          .from("suggestion_votes")
          .delete()
          .eq("suggestion_id", row.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("suggestion_votes")
          .insert({ suggestion_id: row.id, user_id: user.id } as any);
        if (error) throw error;
      }
    } catch (e: any) {
      // Reverte o otimista
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (alreadyVoted) next.add(row.id); else next.delete(row.id);
        return next;
      });
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, vote_count: Math.max(0, r.vote_count + (alreadyVoted ? 1 : -1)) } : r
        )
      );
      toast({ title: "Não foi possível registrar o voto", description: e.message, variant: "destructive" });
    } finally {
      setVotingId(null);
    }
  };

  const statusOptions = useMemo(
    () => SUGGESTION_PUBLIC_STATUSES.map((s) => ({ value: s, label: SUGGESTION_STATUS_LABEL[s] })),
    []
  );

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar sugestões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 lg:flex gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="lg:w-48">
                  <Filter size={14} className="mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {SUGGESTION_ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="lg:w-52">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                <SelectTrigger className="lg:w-44">
                  <ArrowUpDown size={14} className="mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="voted">Mais votadas</SelectItem>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="py-16 px-6 flex flex-col items-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Lightbulb size={24} className="text-muted-foreground/40" />
            </div>
            <div className="space-y-1 max-w-md">
              <p className="font-medium text-foreground">Nenhuma sugestão encontrada.</p>
              <p className="text-sm text-muted-foreground">
                Seja o primeiro a compartilhar uma ideia com a comunidade.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 animate-fade-in">
          {rows.map((r) => {
            const voted = myVotes.has(r.id);
            return (
              <Card key={r.id} className="border-border/60 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex gap-4">
                  {/* Voto */}
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <Button
                      variant={voted ? "default" : "outline"}
                      size="sm"
                      disabled={votingId === r.id}
                      onClick={() => toggleVote(r)}
                      className={`flex-col h-auto py-2 px-3 gap-0.5 ${voted ? "" : "text-muted-foreground"}`}
                      aria-label={voted ? "Remover voto" : "Votar nesta sugestão"}
                    >
                      {votingId === r.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={15} className={voted ? "fill-current" : ""} />
                      )}
                      <span className="text-xs font-semibold">{r.vote_count}</span>
                    </Button>
                  </div>

                  {/* Conteúdo */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-medium text-foreground leading-snug">
                        {r.title}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {r.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge variant="outline" className="text-[11px] font-normal">
                        {r.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-normal ${SUGGESTION_STATUS_BADGE_CLASS[r.status] || ""}`}
                      >
                        {SUGGESTION_STATUS_LABEL[r.status as SuggestionStatus] || r.status}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatSuggestionDateShort(r.created_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
                {loadingMore && <Loader2 size={14} className="mr-2 animate-spin" />}
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
