import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  Users,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Trophy,
  Loader2,
  Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CRMLeadItem {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  phone: string;
  pipeline_stage_id: string | null;
  tags: string[];
  ai_score: number;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
}

interface ScoreData {
  phone_e164: string;
  score_total: number;
  status_bucket: string;
}

type ScoreFilter = "all" | "very_hot" | "hot" | "engaged" | "cold" | "dropping";

interface CRMLeadImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** For WhatsApp campaign flow: receives Lead[] */
  onImportLeads?: (leads: { name: string; phone: string }[]) => void;
  /** For Meta campaign flow: receives phone strings */
  onImportPhones?: (phones: string[]) => void;
}

const SCORE_LABELS: Record<string, string> = {
  all: "Todos os scores",
  very_hot: "🔥 Pronto p/ venda (≥650)",
  hot: "🟠 Quente (350–649)",
  engaged: "🟡 Engajado (150–349)",
  cold: "❄️ Frio (<150)",
  dropping: "📉 Score em queda (3+ dias)",
};

export const CRMLeadImportDialog = ({
  open,
  onOpenChange,
  onImportLeads,
  onImportPhones,
}: CRMLeadImportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<CRMLeadItem[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [scoreMap, setScoreMap] = useState<Map<string, ScoreData>>(new Map());
  const [droppingPhones, setDroppingPhones] = useState<Set<string>>(new Set());

  // Filters
  const [stageFilter, setStageFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadData();
    }
  }, [open, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSelectAll(false);
      setStageFilter("all");
      setScoreFilter("all");
      setSearchTerm("");
    }
  }, [open]);

  const normalizePhone = (phone: string): string => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    // Remove leading 00
    if (digits.startsWith("00") && digits.length > 4) digits = digits.slice(2);
    // Add 55 if missing
    if (digits.length >= 10 && digits.length <= 11 && !digits.startsWith("55")) {
      digits = "55" + digits;
    }
    return digits;
  };

  const getPhoneKey = (phone: string) => phone.replace(/\D/g, "").slice(-8);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [leadsRes, stagesRes, scoresRes, droppingRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, company_name, contact_name, phone, pipeline_stage_id, tags, ai_score")
          .eq("user_id", user.id)
          .not("phone", "is", null)
          .limit(5000),
        supabase
          .from("pipeline_stages")
          .select("id, name, color")
          .eq("user_id", user.id)
          .order("position"),
        supabase
          .from("revenue_leads")
          .select("phone_e164, score_total, status_bucket")
          .eq("user_id", user.id),
        // Find leads with dropping scores (3+ days of decline)
        supabase
          .from("revenue_score_history")
          .select("phone_e164, score, recorded_at")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(5000),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (stagesRes.error) throw stagesRes.error;

      setLeads((leadsRes.data || []) as CRMLeadItem[]);
      setStages((stagesRes.data || []) as PipelineStage[]);

      // Build score map
      const sMap = new Map<string, ScoreData>();
      for (const row of scoresRes.data || []) {
        const key = getPhoneKey(row.phone_e164);
        sMap.set(key, row as ScoreData);
      }
      setScoreMap(sMap);

      // Detect dropping scores (3+ consecutive decreases)
      const dropping = new Set<string>();
      if (droppingRes.data) {
        const byPhone = new Map<string, number[]>();
        for (const row of droppingRes.data) {
          const key = getPhoneKey(row.phone_e164);
          if (!byPhone.has(key)) byPhone.set(key, []);
          byPhone.get(key)!.push(row.score);
        }
        for (const [key, scores] of byPhone) {
          // scores are ordered desc by date, so check first 4 entries
          if (scores.length >= 4) {
            let consecutive = 0;
            for (let i = 0; i < scores.length - 1 && i < 5; i++) {
              if (scores[i] < scores[i + 1]) consecutive++;
              else break;
            }
            if (consecutive >= 3) dropping.add(key);
          }
        }
      }
      setDroppingPhones(dropping);
    } catch (err) {
      console.error("Error loading CRM data:", err);
      toast({
        title: "Erro ao carregar contatos do CRM",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLeadScore = (lead: CRMLeadItem): ScoreData | undefined => {
    const key = getPhoneKey(lead.phone);
    return scoreMap.get(key);
  };

  const isDropping = (lead: CRMLeadItem): boolean => {
    const key = getPhoneKey(lead.phone);
    return droppingPhones.has(key);
  };

  const filteredLeads = useMemo(() => {
    let result = leads.filter((l) => l.phone && l.phone.replace(/\D/g, "").length >= 8);

    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (l) =>
          (l.company_name || "").toLowerCase().includes(q) ||
          (l.contact_name || "").toLowerCase().includes(q) ||
          l.phone.includes(q)
      );
    }

    // Stage filter
    if (stageFilter !== "all") {
      result = result.filter((l) => l.pipeline_stage_id === stageFilter);
    }

    // Score filter
    if (scoreFilter !== "all") {
      result = result.filter((l) => {
        const score = getLeadScore(l);
        if (scoreFilter === "dropping") return isDropping(l);
        if (!score) return scoreFilter === "cold";
        switch (scoreFilter) {
          case "very_hot": return score.score_total >= 650;
          case "hot": return score.score_total >= 350 && score.score_total < 650;
          case "engaged": return score.score_total >= 150 && score.score_total < 350;
          case "cold": return score.score_total < 150;
          default: return true;
        }
      });
    }

    return result;
  }, [leads, searchTerm, stageFilter, scoreFilter, scoreMap, droppingPhones]);

  // Select all toggle
  useEffect(() => {
    if (selectAll) {
      setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
    }
  }, [selectAll, filteredLeads]);

  const toggleLead = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
      setSelectAll(false);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectAll(true);
    }
  };

  const handleImport = () => {
    const selected = leads.filter((l) => selectedIds.has(l.id));
    const normalized = selected
      .map((l) => ({
        name: l.contact_name || l.company_name || "Sem nome",
        phone: normalizePhone(l.phone),
      }))
      .filter((l) => l.phone.length >= 12); // 55 + DDD + number = at least 12

    if (normalized.length === 0) {
      toast({
        title: "Nenhum contato válido",
        description: "Os contatos selecionados não possuem telefone válido com DDI",
        variant: "destructive",
      });
      return;
    }

    if (onImportLeads) {
      onImportLeads(normalized);
    }
    if (onImportPhones) {
      onImportPhones(normalized.map((l) => l.phone));
    }

    toast({
      title: `${normalized.length} contatos importados do CRM`,
      description: `Todos com DDI +55 aplicado automaticamente`,
    });
    onOpenChange(false);
  };

  const getScoreBadge = (lead: CRMLeadItem) => {
    const score = getLeadScore(lead);
    const dropping = isDropping(lead);

    if (!score) return null;

    let color = "bg-muted text-muted-foreground";
    let label = `${score.score_total}`;
    if (score.score_total >= 650) color = "bg-red-500/15 text-red-500";
    else if (score.score_total >= 350) color = "bg-orange-500/15 text-orange-500";
    else if (score.score_total >= 150) color = "bg-yellow-500/15 text-yellow-600";
    else color = "bg-blue-500/15 text-blue-500";

    return (
      <div className="flex items-center gap-1">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
          {label}
        </span>
        {dropping && <TrendingDown size={12} className="text-destructive" />}
      </div>
    );
  };

  const getStageName = (stageId: string | null) => {
    if (!stageId) return null;
    const stage = stages.find((s) => s.id === stageId);
    return stage ? stage : null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            Importar contatos do CRM
          </DialogTitle>
          <DialogDescription>
            Selecione contatos com base em filtros de pipeline, score e tendências
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="flex-1">
                <div className="flex items-center gap-2">
                  <Layers size={14} className="text-muted-foreground" />
                  <SelectValue placeholder="Etapa" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={scoreFilter} onValueChange={(v) => setScoreFilter(v as ScoreFilter)}>
              <SelectTrigger className="flex-1">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-muted-foreground" />
                  <SelectValue placeholder="Score" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCORE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhum contato encontrado com esses filtros</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between py-2 px-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-muted-foreground">
                    Selecionar todos ({filteredLeads.length})
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedIds.size} selecionados
                  </Badge>
                )}
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: "340px" }}>
                {filteredLeads.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  const stage = getStageName(lead.pipeline_stage_id);
                  const phoneNorm = normalizePhone(lead.phone);
                  const isValidPhone = phoneNorm.length >= 12;

                  return (
                    <div
                      key={lead.id}
                      onClick={() => isValidPhone && toggleLead(lead.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                        !isValidPhone
                          ? "opacity-40 cursor-not-allowed border-border"
                          : isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!isValidPhone}
                        className="pointer-events-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {lead.contact_name || lead.company_name || "Sem nome"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground">
                            +{phoneNorm}
                          </span>
                          {!isValidPhone && (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle size={10} /> inválido
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stage && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full border"
                            style={{
                              borderColor: stage.color,
                              color: stage.color,
                            }}
                          >
                            {stage.name}
                          </span>
                        )}
                        {getScoreBadge(lead)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            DDI +55 será adicionado automaticamente
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedIds.size === 0}
              className="gap-2"
            >
              <CheckCircle2 size={16} />
              Importar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
