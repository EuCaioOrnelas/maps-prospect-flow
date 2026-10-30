import { useCallback, useEffect, useMemo, useState } from "react";
import { ThumbsUp, Lightbulb, Loader2, MessageSquarePlus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  IDEA_STATUS_CLASS, IDEA_STATUS_LABEL, type IdeaPeriod, type IdeaStatus,
} from "@/lib/suggestions";

interface Idea {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  public_status: IdeaStatus;
  community_votes: number;
  suggestions_count: number;
  demand: number;
  last_activity: string;
  user_voted: boolean;
}

const PERIODS: { id: IdeaPeriod; label: string }[] = [
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Todas" },
];

const PAGE_SIZE = 8;

/** Votação por ideia: a IA unifica sugestões parecidas e os votos somam na mesma ideia. */
export default function IdeaVoting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<IdeaPeriod>("all");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("list_suggestion_ideas", { _period: period });
    if (!error) setIdeas((data as Idea[]) || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, period]);

  // Mais votadas sempre no topo; busca filtra por nome, descrição e categoria.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? ideas.filter((i) =>
          [i.name, i.description, i.category].some((v) => v?.toLowerCase().includes(term)))
      : ideas;
    return [...filtered].sort((a, b) => b.demand - a.demand);
  }, [ideas, search]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageIdeas = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleVote = async (idea: Idea) => {
    if (!user?.id || busy) return;
    setBusy(idea.id);
    const voted = idea.user_voted;
    setIdeas((list) => list.map((i) => i.id === idea.id
      ? { ...i, user_voted: !voted, community_votes: i.community_votes + (voted ? -1 : 1), demand: i.demand + (voted ? -1 : 1) }
      : i));
    const table = (supabase.from as any)("suggestion_group_votes");
    const { error } = voted
      ? await table.delete().eq("group_id", idea.id).eq("user_id", user.id)
      : await table.insert({ group_id: idea.id, user_id: user.id });
    if (error) {
      toast({ title: "Não foi possível registrar o voto", variant: "destructive" });
      load();
    }
    setBusy(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Sugestões parecidas viram uma única ideia. Cada envio também conta como interesse.
        </p>
        <div className="inline-flex rounded-lg border border-border/60 bg-muted/50 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar ideias…"
          className="pl-10"
          aria-label="Pesquisar ideias"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : pageIdeas.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card py-14 text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <Lightbulb size={20} className="text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">
            {search.trim() ? "Nenhuma ideia encontrada para essa pesquisa." : "Nenhuma ideia neste período."}
          </p>
          <p className="text-sm text-muted-foreground">Envie uma sugestão e ela aparecerá aqui depois da análise.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {pageIdeas.map((idea) => (
              <div key={idea.id} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 transition-colors hover:border-primary/30">
                <Button
                  variant={idea.user_voted ? "default" : "outline"}
                  onClick={() => toggleVote(idea)}
                  disabled={busy === idea.id}
                  className="h-auto w-16 shrink-0 flex-col gap-1 py-2.5"
                  aria-label={idea.user_voted ? "Remover voto" : "Votar"}
                >
                  {busy === idea.id ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                  <span className="text-sm font-semibold tabular-nums">{idea.community_votes}</span>
                </Button>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">{idea.name}</h3>
                    <Badge variant="outline" className={IDEA_STATUS_CLASS[idea.public_status] || ""}>
                      {IDEA_STATUS_LABEL[idea.public_status] || "Em análise e votação"}
                    </Badge>
                  </div>
                  {idea.description && <p className="text-sm text-muted-foreground line-clamp-2">{idea.description}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {idea.category && <span className="capitalize">{idea.category}</span>}
                    <span className="inline-flex items-center gap-1">
                      <MessageSquarePlus size={12} /> {idea.suggestions_count} {idea.suggestions_count === 1 ? "pedido" : "pedidos"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages} · {visible.length} {visible.length === 1 ? "ideia" : "ideias"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} /> Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Próxima página"
                >
                  Próxima <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
