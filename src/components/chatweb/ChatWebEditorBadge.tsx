import { useMemo, useState } from "react";
import { ActivateChatWebDialog } from "./ActivateChatWebDialog";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Globe, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { chatwebIssues } from "@/lib/chatweb";

/** Selo no construtor: mostra que o fluxo também roda no ChatWeb e avisa blocos incompatíveis. */
export function ChatWebEditorBadge({ flowId, nodes, flowName }: { flowId?: string; nodes: any[]; flowName?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: flowRow } = useQuery({
    queryKey: ["chatweb-editor-flow", flowId],
    enabled: !!flowId,
    queryFn: async () => (await supabase.from("wa_automation_flows" as any).select("id,name,user_id,owner_user_id").eq("id", flowId!).maybeSingle()).data as any,
  });
  const { data: cfg, refetch } = useQuery({
    queryKey: ["chatweb-editor", flowId],
    enabled: !!flowId,
    queryFn: async () => (await supabase.from("chatweb_configurations").select("id,enabled,slug").eq("flow_id", flowId!).maybeSingle()).data,
  });
  const issues = useMemo(
    () => chatwebIssues(nodes.map((n) => ({ id: n.id, node_type: String(n.type), name: n.data?.label || n.data?.name, config: n.data?.config }))),
    [nodes],
  );
  if (!flowId) return null;
  if (!cfg?.enabled) {
    return (
      <>
        <button onClick={() => setOpen(true)} disabled={!flowRow} className="h-9 flex items-center gap-1.5 px-3 rounded-full border border-dashed border-input bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 transition-colors disabled:opacity-50">
          <Globe size={14} className="text-primary" />
          Transformar em ChatWeb
        </button>
        <ActivateChatWebDialog
          flow={open && flowRow ? { ...flowRow, name: flowName || flowRow.name } : null}
          existing={cfg ? { id: cfg.id, enabled: cfg.enabled } : null}
          onOpenChange={(o) => { if (!o) setOpen(false); }}
          onDone={() => refetch()}
        />
      </>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-9 flex items-center gap-1.5 px-3 rounded-full border border-input bg-background text-sm font-medium text-foreground hover:bg-accent shrink-0 transition-colors">
          <Globe size={14} className="text-primary" />
          ChatWeb
          {issues.length > 0 && <AlertTriangle size={14} className="text-destructive" aria-label={`${issues.length} avisos`} />}
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
