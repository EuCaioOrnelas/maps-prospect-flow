import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronUp, Lightbulb, Loader2, MessageSquarePlus, Search, ChevronLeft, ChevronRight, Flame, Users } from "lucide-react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const topDemand = visible[0]?.demand ?? 0;

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
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar ideias…"
            className="h-11 rounded-xl border-border/60 bg-card pl-11"
            aria-label="Pesquisar ideias"
          />
        </div>
        <div className="inline-flex h-11 shrink-0 items-center rounded-xl border border-border/60 bg-muted/50 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "h-full rounded-lg px-3.5 text-xs font-medium transition-all",
                period === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users size={13} /> Sugestões parecidas viram uma única ideia. Cada envio também conta como interesse.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
      ) : pageIdeas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card py-16 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Lightbulb size={22} className="text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">
            {search.trim() ? "Nenhuma ideia encontrada para essa pesquisa." : "Nenhuma ideia neste período."}
          </p>
          <p className="text-sm text-muted-foreground">Envie uma sugestão e ela aparecerá aqui depois da análise.</p>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {pageIdeas.map((idea, idx) => {
              const rank = (currentPage - 1) * PAGE_SIZE + idx + 1;
              const share = topDemand > 0 ? Math.max(6, Math.round((idea.demand / topDemand) * 100)) : 0;
              return (
                <li
                  key={idea.id}
                  className={cn(
                    "group relative flex items-stretch gap-4 overflow-hidden rounded-2xl border bg-card p-4 sm:p-5 transition-all duration-300 animate-fade-in",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    idea.user_voted ? "border-primary/40" : "border-border/60 hover:border-border",
                  )}
                  style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                >
                  <button
                    type="button"
                    onClick={(e) => toggleVote(idea, e.currentTarget)}
                    disabled={busy === idea.id}
                    aria-pressed={idea.user_voted}
                    aria-label={idea.user_voted ? "Remover voto" : "Votar"}
                    className={cn(
                      "flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-200 active:scale-90",
                      idea.user_voted
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:border-primary/60 hover:text-primary",
                      pop === idea.id && "scale-110",
                    )}
                  >
                    {busy === idea.id
                      ? <Loader2 size={18} className="animate-spin" />
                      : <ChevronUp size={20} strokeWidth={2.5} className={cn("transition-transform", !idea.user_voted && "group-hover:-translate-y-0.5")} />}
                    <span className="text-base font-bold tabular-nums leading-none">{idea.community_votes}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {idea.user_voted ? "Votado" : "Votar"}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {rank <= 3 && !search.trim() && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                          <Flame size={11} className="text-primary" /> #{rank}
                        </span>
                      )}
                      <Badge variant="outline" className={cn("rounded-full text-[11px]", IDEA_STATUS_CLASS[idea.public_status] || "")}>
                        {IDEA_STATUS_LABEL[idea.public_status] || "Em análise e votação"}
                      </Badge>
                      {idea.category && (
                        <span className="text-[11px] font-medium text-muted-foreground">{idea.category}</span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-foreground">{idea.name}</h3>
                    {idea.description && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{idea.description}</p>}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${share}%` }} />
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquarePlus size={12} /> {idea.suggestions_count} {idea.suggestions_count === 1 ? "pedido" : "pedidos"}
                        <span className="mx-1 opacity-40">·</span> demanda {idea.demand}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground">
                Página {currentPage} de {totalPages} · {visible.length} {visible.length === 1 ? "ideia" : "ideias"}
              </p>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} aria-label="Página anterior">
                  <ChevronLeft size={14} /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} aria-label="Próxima página">
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
