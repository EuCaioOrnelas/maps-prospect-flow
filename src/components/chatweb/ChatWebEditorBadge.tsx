import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { chatwebIssues } from "@/lib/chatweb";

/** Selo no construtor: mostra que o fluxo também roda no ChatWeb e avisa blocos incompatíveis. */
export function ChatWebEditorBadge({ flowId, nodes }: { flowId?: string; nodes: any[] }) {
  const navigate = useNavigate();
  const { data: cfg } = useQuery({
    queryKey: ["chatweb-editor", flowId],
    enabled: !!flowId,
    queryFn: async () => (await supabase.from("chatweb_configurations").select("id,enabled,slug").eq("flow_id", flowId!).maybeSingle()).data,
  });
  const issues = useMemo(
    () => chatwebIssues(nodes.map((n) => ({ id: n.id, node_type: String(n.type), name: n.data?.label || n.data?.name, config: n.data?.config }))),
    [nodes],
  );
  if (!cfg?.enabled) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted border border-border shrink-0 hover:bg-muted/70">
          <Globe size={12} className="text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground">ChatWeb</span>
          {issues.length > 0 && <AlertTriangle size={12} className="text-destructive" aria-label={`${issues.length} avisos`} />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <p className="text-sm font-medium">Este fluxo também atende pelo ChatWeb</p>
        {issues.length === 0 ? (
          <p className="text-xs text-muted-foreground">Todos os blocos funcionam nos dois canais.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {issues.map((i) => (
              <p key={i.nodeId + i.message} className="text-xs"><b>{i.nodeName}:</b> {i.message}</p>
            ))}
          </div>
        )}
        <Button size="sm" variant="outline" className="w-full" onClick={() => navigate(`/fluxos/${flowId}/chatweb`)}>Configurar ChatWeb</Button>
      </PopoverContent>
    </Popover>
  );
}
