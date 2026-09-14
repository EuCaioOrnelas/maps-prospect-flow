import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, Filter, RotateCcw } from "lucide-react";
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
  const activeCount =
    (crmStatus !== "any" ? 1 : 0) +
    (stageIds.length ? 1 : 0) +
    (tags.length ? 1 : 0) +
    (aud.customer && aud.customer !== "any" ? 1 : 0) +
    (aud.min_score !== undefined && aud.min_score !== null && aud.min_score !== "" ? 1 : 0) +
    (aud.max_score !== undefined && aud.max_score !== null && aud.max_score !== "" ? 1 : 0);
  const [isOpen, setIsOpen] = useState(activeCount > 0);

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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="flex items-center gap-2 p-3">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start p-0 hover:bg-transparent">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Filter size={14} />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-xs font-semibold text-foreground">Filtrar público</span>
              <span className="block truncate text-[10px] font-normal text-muted-foreground">
                {activeCount > 0 ? `${activeCount} critério${activeCount > 1 ? "s" : ""} aplicado${activeCount > 1 ? "s" : ""}` : "Todos os contatos podem entrar"}
              </span>
            </span>
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        {activeCount > 0 && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onChange({})} title="Limpar filtros">
            <RotateCcw size={13} />
          </Button>
        )}
      </div>

      <CollapsibleContent className="border-t border-border/50">
        <div className="space-y-4 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            O fluxo será iniciado somente para contatos que atendam aos critérios abaixo.
          </p>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground">Presença no CRM</Label>
            <Select value={crmStatus} onValueChange={(v) => set({ crm_status: v as AudienceConfig["crm_status"] })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Todos os contatos</SelectItem>
                <SelectItem value="in_crm">Somente contatos no CRM</SelectItem>
                <SelectItem value="not_in_crm">Somente contatos fora do CRM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!leadFiltersDisabled && <div className="space-y-4 border-t border-border/40 pt-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-foreground">Etapas do CRM</Label>
          <p className="text-[10px] text-muted-foreground">Sem seleção, todas as etapas serão consideradas.</p>
          <div className="flex flex-wrap gap-1.5">
            {stages.length === 0 && <span className="text-[10px] text-muted-foreground">Nenhuma etapa cadastrada</span>}
            {stages.map((s: any) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toggle(stageIds, s.id, "stage_ids")}
                className={cn(
                  "h-7 px-2 text-[10px]",
                  stageIds.includes(s.id)
                    ? "border-primary bg-primary/10 text-foreground font-medium"
                    : "border-border/50 text-muted-foreground hover:border-primary/40",
                )}
              >
                {s.name}
              </Button>
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
              placeholder="Ex.: 1000"
              className="h-8 text-xs"
            />
          </div>
        </div>

        {crmTags.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground">Tags</Label>
            <p className="text-[10px] text-muted-foreground">O contato precisa ter pelo menos uma das tags selecionadas.</p>
            <div className="flex flex-wrap gap-1.5">
              {crmTags.map((t: any) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => toggle(tags, t.name, "tags")}
                  className={cn(
                    "h-7 px-2 text-[10px]",
                    tags.includes(t.name)
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border/50 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-foreground">Perfil do contato</Label>
          <Select value={aud.customer || "any"} onValueChange={(v) => set({ customer: v as AudienceConfig["customer"] })}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Todos: leads e clientes</SelectItem>
              <SelectItem value="only">Somente clientes</SelectItem>
              <SelectItem value="exclude">Somente leads</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
          <div>
            <Label className="text-[11px] font-medium text-foreground">Ignorar arquivados</Label>
            <p className="text-[9px] text-muted-foreground">Não incluir contatos arquivados no CRM.</p>
          </div>
          <Switch
            checked={aud.exclude_archived !== false}
            onCheckedChange={(v) => set({ exclude_archived: v })}
          />
        </div>
          </div>}

          {leadFiltersDisabled && (
            <div className="rounded-md bg-muted/40 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
              Os filtros de etapa, score, tags e perfil não se aplicam a contatos que ainda estão fora do CRM.
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
