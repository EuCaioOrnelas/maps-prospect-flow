import { Switch } from "@/components/ui/switch";
import { PhoneOff, Users, Wifi, CheckCheck, History, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type EvolutionSettings = {
  rejectCall: boolean;
  msgCall?: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  syncFullHistory: boolean;
  readStatus: boolean;
};

export const DEFAULT_EVOLUTION_SETTINGS: EvolutionSettings = {
  rejectCall: false,
  msgCall: "",
  groupsIgnore: true,
  alwaysOnline: false,
  readMessages: false,
  syncFullHistory: false,
  readStatus: false,
};

const OPTIONS: { key: keyof EvolutionSettings; icon: LucideIcon; title: string; description: string }[] = [
  { key: "rejectCall", icon: PhoneOff, title: "Rejeitar chamadas", description: "Recusa automaticamente todas as ligações recebidas." },
  { key: "groupsIgnore", icon: Users, title: "Ignorar grupos", description: "Não recebe nem processa mensagens de grupos." },
  { key: "alwaysOnline", icon: Wifi, title: "Sempre online", description: "Mantém o WhatsApp com status online o tempo todo." },
  { key: "readMessages", icon: CheckCheck, title: "Marcar como lidas", description: "Marca todas as mensagens recebidas como lidas." },
  { key: "syncFullHistory", icon: History, title: "Sincronizar histórico completo", description: "Importa todo o histórico de conversas ao ler o QR code." },
  { key: "readStatus", icon: Eye, title: "Ver status", description: "Marca todos os status (stories) como visualizados." },
];

interface Props {
  value: EvolutionSettings;
  onChange: (key: keyof EvolutionSettings, next: boolean) => void;
  pendingKey?: keyof EvolutionSettings | null;
  disabled?: boolean;
}

export function EvolutionSettingsForm({ value, onChange, pendingKey, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {OPTIONS.map(({ key, icon: Icon, title, description }) => {
        const checked = Boolean(value[key]);
        return (
          <label
            key={key}
            className={`flex items-center justify-between gap-4 rounded-xl border p-3.5 transition-colors cursor-pointer ${
              checked ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${checked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={checked}
              disabled={disabled || pendingKey === key}
              onCheckedChange={(v) => onChange(key, v)}
              aria-label={title}
            />
          </label>
        );
      })}
    </div>
  );
}
