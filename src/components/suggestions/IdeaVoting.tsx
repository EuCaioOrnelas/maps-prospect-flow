import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronUp, Check, Lightbulb, Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  type IdeaPeriod, type IdeaStatus,
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

function readToken(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : fallback;
}

function celebrate(el: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect();
  const origin = { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
  const colors = [readToken("--primary", "#16a34a"), readToken("--foreground", "#111"), readToken("--muted-foreground", "#888")];
  confetti({ particleCount: 70, spread: 75, startVelocity: 32, scalar: 0.85, ticks: 140, origin, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 30, spread: 110, startVelocity: 22, scalar: 0.7, ticks: 120, origin, colors, disableForReducedMotion: true }), 140);
}

/** Votação por ideia: a IA unifica sugestões parecidas e os votos somam na mesma ideia. */
export default function IdeaVoting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<IdeaPeriod>("all");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [pop, setPop] = useState<string | null>(null);
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

  const toggleVote = async (idea: Idea, el: HTMLElement) => {
    if (!user?.id || busy) return;
    setBusy(idea.id);
    const voted = idea.user_voted;
    if (!voted) {
      celebrate(el);
      setPop(idea.id);
      setTimeout(() => setPop(null), 450);
    }
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
    } else if (!voted) {
      toast({ title: "Voto registrado!", description: "Obrigado por ajudar a decidir o futuro da Wiize." });
    }
    setBusy(null);
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Período das ideias">
          {PERIODS.map((p) => (
            <Button key={p.id} variant="ghost" size="sm" onClick={() => setPeriod(p.id)} aria-pressed={period === p.id}
              className={cn("h-9 rounded-md px-4 text-xs font-medium shadow-none", period === p.id
                ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {p.label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar ideias…"
            className="h-10 rounded-md border-border bg-background pl-10" aria-label="Pesquisar ideias" />
        </div>
      </div>
      {loading ? (
        <div className="space-y-4 p-6 sm:p-8">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-md" />)}
        </div>
      ) : pageIdeas.length === 0 ? (
        <div className="space-y-3 px-6 py-16 text-center">
          <Lightbulb size={24} className="mx-auto text-muted-foreground" />
          <p className="font-medium text-foreground">{search.trim() ? "Nenhuma ideia encontrada." : "Nenhuma ideia neste período."}</p>
        </div>
      ) : (
        <>
          <div className="hidden grid-cols-[minmax(0,1fr)_112px] gap-8 border-b border-border bg-muted/20 px-7 py-3 sm:grid">
            <span className="text-xs font-medium text-muted-foreground">Ideias da comunidade</span>
            <span className="text-center text-xs font-medium text-muted-foreground">Votos</span>
          </div>
          <ul className="divide-y divide-border">
            {pageIdeas.map((idea) => (
              <li key={idea.id} className={cn(
                "grid grid-cols-[minmax(0,1fr)_64px] items-center gap-4 px-5 py-7 transition-colors duration-200 motion-reduce:transition-none sm:grid-cols-[minmax(0,1fr)_112px] sm:gap-8 sm:px-7 sm:py-8",
                idea.user_voted ? "bg-primary/[0.025]" : "hover:bg-muted/20",
              )}>
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold leading-snug text-foreground sm:text-lg">{idea.name}</h3>
                  {idea.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{idea.description}</p>}
                </div>
                <div className="flex justify-center">
                  <Button type="button" variant="outline" onClick={(e) => toggleVote(idea, e.currentTarget)}
                    disabled={busy !== null} aria-pressed={idea.user_voted}
                    aria-label={idea.user_voted ? "Remover voto" : "Votar"}
                    title={idea.user_voted ? "Remover meu voto" : "Votar nesta ideia"}
                    className={cn("h-20 w-16 shrink-0 flex-col gap-1 rounded-md px-2 py-3 shadow-none transition-all duration-200 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none sm:w-20",
                      idea.user_voted ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                      pop === idea.id && "scale-105",
                    )}>
                    {busy === idea.id ? <Loader2 size={17} className="animate-spin" /> : idea.user_voted ? <Check size={17} /> : <ChevronUp size={19} />}
                    <span className="text-lg font-semibold leading-none tabular-nums">{idea.community_votes}</span>
                    <span className="text-[10px] font-medium">{idea.user_voted ? "Votado" : "Votar"}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-7">
              <p className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label="Página anterior"><ChevronLeft size={14} /> Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label="Próxima página">Próxima <ChevronRight size={14} /></Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
