import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudienceConfig {
  crm_status?: "any" | "not_in_crm" | "in_crm";
  stage_ids?: string[];
  tags?: string[];
  customer?: "any" | "only" | "exclude";
  min_score?: string | number | null;
  max_score?: string | number | null;
  exclude_archived?: boolean;
}

interface Props {
  value: AudienceConfig;
  onChange: (next: AudienceConfig) => void;
}

/**
 * Filtro de público do gatilho: só entram no fluxo os contatos que passarem
 * nestes critérios (CRM, etapa, score, tags, clientes).
 */
export function EntryAudienceFilter({ value, onChange }: Props) {
  const { user } = useAuth();
  const aud = value || {};
  const crmStatus = aud.crm_status || "any";
  const stageIds = aud.stage_ids || [];
  const tags = aud.tags || [];
  const leadFiltersDisabled = crmStatus === "not_in_crm";

  const set = (patch: Partial<AudienceConfig>) => onChange({ ...aud, ...patch });

  const { data: stages = [] } = useQuery({
    queryKey: ["flow-audience-stages", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("id,name,position")
        .order("position", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: crmTags = [] } = useQuery({
    queryKey: ["flow-audience-tags", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("crm_tags").select("id,name").order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const toggle = (list: string[], item: string, key: "stage_ids" | "tags") => {
    const next = list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
    set({ [key]: next } as Partial<AudienceConfig>);
  };

  const activeCount =
    (crmStatus !== "any" ? 1 : 0) +
    (stageIds.length ? 1 : 0) +
    (tags.length ? 1 : 0) +
    (aud.customer && aud.customer !== "any" ? 1 : 0) +
    (aud.min_score ? 1 : 0) +
    (aud.max_score ? 1 : 0);

  return (
    <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-primary" />
        <Label className="text-xs font-medium">Filtro de público</Label>
        {activeCount > 0 && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
            {activeCount} ativo{activeCount > 1 ? "s" : ""}
          </span>
        )}
        {activeCount > 0 && (
          <button
            onClick={() => onChange({})}
            className="ml-auto text-[10px] text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <X size={10} /> Limpar
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Mesmo que o gatilho aconteça, o fluxo só inicia para contatos que passarem nestes critérios.
      </p>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">Situação no CRM</Label>
        <Select value={crmStatus} onValueChange={(v) => set({ crm_status: v as AudienceConfig["crm_status"] })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Todos os contatos</SelectItem>
            <SelectItem value="in_crm">Apenas quem já está no CRM</SelectItem>
            <SelectItem value="not_in_crm">Apenas quem NÃO está no CRM</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className={cn("space-y-3", leadFiltersDisabled && "opacity-40 pointer-events-none")}>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Etapas do CRM (deixe vazio para todas)</Label>
          <div className="flex flex-wrap gap-1.5">
            {stages.length === 0 && <span className="text-[10px] text-muted-foreground">Nenhuma etapa cadastrada</span>}
            {stages.map((s: any) => (
              <button
                key={s.id}
                onClick={() => toggle(stageIds, s.id, "stage_ids")}
                className={cn(
                  "text-[10px] px-2 py-1 rounded-md border transition-colors",
                  stageIds.includes(s.id)
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Score mínimo</Label>
            <Input
              type="number"
              value={aud.min_score ?? ""}
              onChange={(e) => set({ min_score: e.target.value })}
              placeholder="Ex.: 700"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Score máximo</Label>
            <Input
              type="number"
              value={aud.max_score ?? ""}
              onChange={(e) => set({ max_score: e.target.value })}
              placeholder="Ex.: 400"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {crmTags.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Tags (qualquer uma)</Label>
            <div className="flex flex-wrap gap-1.5">
              {crmTags.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => toggle(tags, t.name, "tags")}
                  className={cn(
                    "text-[10px] px-2 py-1 rounded-md border transition-colors",
                    tags.includes(t.name)
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border/50 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Clientes</Label>
          <Select value={aud.customer || "any"} onValueChange={(v) => set({ customer: v as AudienceConfig["customer"] })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Tanto faz</SelectItem>
              <SelectItem value="only">Apenas quem já comprou</SelectItem>
              <SelectItem value="exclude">Apenas quem ainda não comprou</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={aud.exclude_archived !== false}
            onCheckedChange={(v) => set({ exclude_archived: v })}
          />
          <Label className="text-[10px] text-muted-foreground">Ignorar leads arquivados</Label>
        </div>
      </div>
    </div>
  );
}
