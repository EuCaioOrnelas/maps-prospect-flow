import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAccountMembers } from "@/hooks/useAccountMembers";
import { OverdueBadge, ProgressCell, ProjectStatusBadge } from "./ProjectBadges";
import { formatDateBR, friendlyDbError, isProjectOverdue, type Project } from "@/lib/projects";

const db = supabase as any;

/** Seção "Projetos" dentro do cadastro do cliente no CRM. */
export function LeadProjectsSection({ leadId }: { leadId: string }) {
  const navigate = useNavigate();
  const { members } = useAccountMembers();
  const q = useQuery({
    queryKey: ["lead-projects", leadId],
    queryFn: async () => {
      const { data, error } = await db.from("projects").select("*").eq("lead_id", leadId).order("archived_at", { ascending: true, nullsFirst: true }).order("due_date", { ascending: true, nullsFirst: false }).limit(50);
      if (error) throw error;
      return data as Project[];
    },
  });
  const name = (id: string | null) => members.find((m) => m.user_id === id)?.name || "—";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Projetos do cliente</p>
        <Button size="sm" variant="outline" className="h-8" onClick={() => navigate(`/projects/new?lead=${leadId}`)}>
          <Plus className="mr-1 h-3.5 w-3.5" />Novo projeto
        </Button>
      </div>
      {q.isLoading ? (
        <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : q.isError ? (
        <p className="text-sm text-destructive">{friendlyDbError(q.error)}</p>
      ) : !q.data?.length ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-8 text-center">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum projeto vinculado a este cliente.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {q.data.map((p) => (
            <li key={p.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/projects/${p.id}`} className="min-w-0 truncate text-sm font-medium hover:text-primary hover:underline">{p.name}</Link>
                <div className="flex shrink-0 gap-1">
                  <ProjectStatusBadge status={p.status} />
                  {isProjectOverdue(p) && <OverdueBadge />}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Responsável: <span className="text-foreground">{name(p.responsible_user_id)}</span></span>
                <span>Prazo: <span className="tabular-nums text-foreground">{formatDateBR(p.due_date)}</span></span>
                <span>Pendentes: <span className="tabular-nums text-foreground">{p.tasks_open}</span></span>
                <ProgressCell done={p.tasks_done} total={p.tasks_total} />
              </div>
              {p.archived_at && <p className="mt-1 text-[11px] text-muted-foreground">Arquivado</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
