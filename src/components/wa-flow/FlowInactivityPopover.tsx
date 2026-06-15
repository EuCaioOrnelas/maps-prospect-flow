import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Node } from "@xyflow/react";

interface Props {
  flowId: string;
  flow: any;
  nodes: Node[];
}

const TIMEOUT_PRESETS = [
  { value: 300, label: "5 minutos" },
  { value: 900, label: "15 minutos" },
  { value: 1800, label: "30 minutos" },
  { value: 3600, label: "1 hora" },
  { value: 21600, label: "6 horas" },
  { value: 43200, label: "12 horas" },
  { value: 86400, label: "24 horas" },
];

export function FlowInactivityPopover({ flowId, flow, nodes }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState<number>(900);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [action, setAction] = useState<string>("restart");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!flow) return;
    setEnabled(!!flow.inactivity_reset_enabled);
    const t = flow.inactivity_timeout_seconds || 900;
    setTimeoutSec(t);
    if (!TIMEOUT_PRESETS.some((p) => p.value === t)) {
      setCustomMinutes(String(Math.round(t / 60)));
    }
    setAction(flow.inactivity_action || "restart");
    setTargetNodeId(flow.inactivity_target_node_id || "");
    setMessage(flow.inactivity_message || "");
  }, [flow]);

  const usableNodes = nodes.filter((n) => n.type !== "entry");
  const isCustom = !TIMEOUT_PRESETS.some((p) => p.value === timeoutSec);

  const save = async () => {
    setSaving(true);
    try {
      const finalTimeout = isCustom
        ? Math.max(60, parseInt(customMinutes || "0") * 60)
        : timeoutSec;
      const { error } = await supabase
        .from("wa_automation_flows")
        .update({
          inactivity_reset_enabled: enabled,
          inactivity_timeout_seconds: enabled ? finalTimeout : null,
          inactivity_action: enabled ? action : null,
          inactivity_target_node_id: enabled && action === "goto_node" ? targetNodeId || null : null,
          inactivity_message: enabled ? (message || null) : null,
        } as any)
        .eq("id", flowId);
      if (error) throw error;
      toast.success("Reset por inatividade salvo");
      qc.invalidateQueries({ queryKey: ["wa-flow", flowId] });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-full" title="Reset por inatividade">
          <Timer size={14} />
          Inatividade
          {flow?.inactivity_reset_enabled && (
            <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-4 space-y-4" align="end">
        <div>
          <p className="text-sm font-semibold">Reset por inatividade</p>
          <p className="text-[11px] text-muted-foreground">
            Se o lead ficar sem responder pelo tempo definido, o fluxo executa uma ação.
          </p>
        </div>

        <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/20">
          <Label className="text-xs font-medium">Ativar</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tempo de inatividade</Label>
              <Select
                value={isCustom ? "custom" : String(timeoutSec)}
                onValueChange={(v) => {
                  if (v === "custom") {
                    setCustomMinutes(String(Math.round(timeoutSec / 60)));
                    setTimeoutSec(-1);
                  } else {
                    setTimeoutSec(parseInt(v));
                    setCustomMinutes("");
                  }
                }}
              >
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEOUT_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {isCustom && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="number"
                    min={1}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    placeholder="Minutos"
                    className="h-8 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground">minutos</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ação após inatividade</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restart">Reiniciar fluxo do início</SelectItem>
                  <SelectItem value="main_menu">Voltar ao menu principal</SelectItem>
                  <SelectItem value="end">Encerrar atendimento</SelectItem>
                  <SelectItem value="goto_node">Ir para card específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === "goto_node" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Card de destino</Label>
                <Select value={targetNodeId} onValueChange={setTargetNodeId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar card..." /></SelectTrigger>
                  <SelectContent>
                    {usableNodes.map((n: any) => (
                      <SelectItem key={n.id} value={n.id}>
                        {(n.data?.label as string) || n.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Salve o fluxo antes para garantir que o card destino exista no banco.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Mensagem antes do reset (opcional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Percebemos que você ficou algum tempo sem responder. Vamos reiniciar o atendimento."
                className="text-sm min-h-[60px]"
              />
            </div>
          </>
        )}

        <Button onClick={save} disabled={saving} className="w-full h-9 text-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : "Salvar"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
