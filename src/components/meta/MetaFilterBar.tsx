import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

interface MetaFilterBarProps {
  period: string;
  onPeriodChange: (v: string) => void;
  campaign?: string;
  onCampaignChange?: (v: string) => void;
  numero?: string;
  onNumeroChange?: (v: string) => void;
  status?: string;
  onStatusChange?: (v: string) => void;
}

export function MetaFilterBar({
  period,
  onPeriodChange,
  campaign = "all",
  onCampaignChange,
  numero = "all",
  onNumeroChange,
  status = "all",
  onStatusChange,
}: MetaFilterBarProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="h-9 w-[170px] text-xs border-border/60">
          <Calendar size={13} className="mr-1.5" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onCampaignChange && (
        <Select value={campaign} onValueChange={onCampaignChange}>
          <SelectTrigger className="h-9 w-[170px] text-xs border-border/60">
            <Filter size={13} className="mr-1.5" />
            <SelectValue placeholder="Campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as campanhas</SelectItem>
            <SelectItem value="cold-1">Frio Odonto Q1</SelectItem>
            <SelectItem value="cold-2">Frio Estética Q1</SelectItem>
            <SelectItem value="reengage">Reengajamento Geral</SelectItem>
          </SelectContent>
        </Select>
      )}

      {onNumeroChange && (
        <Select value={numero} onValueChange={onNumeroChange}>
          <SelectTrigger className="h-9 w-[170px] text-xs border-border/60">
            <SelectValue placeholder="Número" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os números</SelectItem>
            <SelectItem value="n1">+55 11 99999-1111</SelectItem>
            <SelectItem value="n2">+55 11 99999-2222</SelectItem>
          </SelectContent>
        </Select>
      )}

      {onStatusChange && (
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-[140px] text-xs border-border/60">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativa</SelectItem>
            <SelectItem value="paused">Pausada</SelectItem>
            <SelectItem value="archived">Arquivada</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
