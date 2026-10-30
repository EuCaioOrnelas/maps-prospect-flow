import { useCallback, useEffect, useState } from "react";
import { ThumbsUp, Lightbulb, Loader2, MessageSquarePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/** Votação por ideia: a IA unifica sugestões parecidas e os votos somam na mesma ideia. */
export default function IdeaVoting() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = useState<IdeaPeriod>("all");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as any)("list_suggestion_ideas", { _period: period });
    if (!error) setIdeas((data as Idea[]) || []);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

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

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : ideas.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card py-14 text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
            <Lightbulb size={20} className="text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma ideia neste período.</p>
          <p className="text-sm text-muted-foreground">Envie uma sugestão e ela aparecerá aqui depois da análise.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
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
      )}
    </div>
  );
}
