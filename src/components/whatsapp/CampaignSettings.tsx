import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Settings, 
  ArrowLeft, 
  ArrowRight,
  Clock,
  Users,
  Pause,
  AlertTriangle,
  Info,
  FileText,
  Shuffle
} from "lucide-react";
import { CampaignScheduler } from "./CampaignScheduler";
import { NumberSelectorWithBalance } from "./NumberSelectorWithBalance";
import type { WhatsAppNumber } from "@/hooks/useWhatsAppNumbers";

interface CampaignSettingsProps {
  campaignName: string;
  onCampaignNameChange: (value: string) => void;
  delaySecondsMin: number;
  delaySecondsMax: number;
  onDelayMinChange: (value: number) => void;
  onDelayMaxChange: (value: number) => void;
  pauseAfterContacts: number;
  onPauseAfterContactsChange: (value: number) => void;
  pauseMinutes: number;
  onPauseMinutesChange: (value: number) => void;
  enableSmartPause: boolean;
  onEnableSmartPauseChange: (value: boolean) => void;
  isScheduled: boolean;
  onScheduleChange: (value: boolean) => void;
  scheduledDate: Date | undefined;
  onScheduledDateChange: (date: Date | undefined) => void;
  scheduledTime: string;
  onScheduledTimeChange: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
  isConnected: boolean;
  totalLeads: number;
  // Number selection props
  numbers?: WhatsAppNumber[];
  selectedNumberId?: string | null;
  onSelectNumber?: (numberId: string | null) => void;
  dailyLimit?: number;
  maxNumbers?: number;
  userPlan?: string;
}

export const CampaignSettings = ({
  campaignName,
  onCampaignNameChange,
  delaySecondsMin,
  delaySecondsMax,
  onDelayMinChange,
  onDelayMaxChange,
  pauseAfterContacts,
  onPauseAfterContactsChange,
  pauseMinutes,
  onPauseMinutesChange,
  enableSmartPause,
  onEnableSmartPauseChange,
  isScheduled,
  onScheduleChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  onBack,
  onNext,
  isConnected,
  totalLeads,
  numbers = [],
  selectedNumberId = null,
  onSelectNumber,
  dailyLimit = 200,
  maxNumbers = 1,
  userPlan = 'free'
}: CampaignSettingsProps) => {
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const canProceed = delaySecondsMin >= 120 && delaySecondsMax >= delaySecondsMin && !!selectedNumberId;
  
  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <Settings size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Configurações de Disparo</h2>
        <p className="text-muted-foreground">
          Ajuste o tempo entre mensagens e pausas inteligentes
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 mb-6">
        <AlertTriangle size={18} className="text-warning mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">Importante para evitar bloqueios:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Delay mínimo recomendado: 40 segundos</li>
            <li>• Ative a pausa inteligente para descansos automáticos</li>
            <li>• Quanto maior o delay, menor o risco de bloqueio</li>
          </ul>
        </div>
      </div>

      <div className="space-y-8">
        {/* Campaign Name */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            Nome da campanha (opcional)
          </Label>
          <Input
            value={campaignName}
            onChange={(e) => onCampaignNameChange(e.target.value)}
            placeholder={`Campanha ${new Date().toLocaleDateString('pt-BR')}`}
            className="bg-secondary border-border"
          />
        </div>

        {/* Smart Delay - Min/Max */}
        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Shuffle size={18} className="text-primary" />
            <Label className="font-medium">Delay Inteligente</Label>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            O sistema escolherá aleatoriamente um tempo entre o mínimo e máximo para cada mensagem, 
            tornando o padrão de envio mais natural e reduzindo risco de bloqueio.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Minimum Delay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Mínimo</Label>
                <span className="text-sm font-medium text-primary">{formatTime(delaySecondsMin)}</span>
              </div>
              <Slider
                value={[delaySecondsMin]}
                onValueChange={([value]) => {
                  onDelayMinChange(value);
                  if (value > delaySecondsMax) {
                    onDelayMaxChange(value);
                  }
                }}
                min={120}
                max={300}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2min</span>
                <span>5min</span>
              </div>
            </div>

            {/* Maximum Delay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Máximo</Label>
                <span className="text-sm font-medium text-primary">{formatTime(delaySecondsMax)}</span>
              </div>
              <Slider
                value={[delaySecondsMax]}
                onValueChange={([value]) => {
                  if (value >= delaySecondsMin) {
                    onDelayMaxChange(value);
                  }
                }}
                min={120}
                max={600}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2min</span>
                <span>10min</span>
              </div>
            </div>
          </div>

          {/* Example */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2 p-2 rounded bg-muted/50">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              Exemplo: com {formatTime(delaySecondsMin)} a {formatTime(delaySecondsMax)}, cada mensagem pode sair em {delaySecondsMin}s, {Math.floor((delaySecondsMin + delaySecondsMax) / 2)}s, {delaySecondsMax}s...
            </p>
          </div>

          {delaySecondsMin < 60 && (
            <p className="text-xs text-warning flex items-center gap-1 mt-2">
              <AlertTriangle size={12} />
              Delay mínimo baixo pode aumentar o risco de bloqueio
            </p>
          )}
        </div>

        {/* Smart Pause Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Pause size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-medium">Pausa Inteligente</p>
              <p className="text-sm text-muted-foreground">Pausar automaticamente após X contatos</p>
            </div>
          </div>
          <Switch
            checked={enableSmartPause}
            onCheckedChange={onEnableSmartPauseChange}
          />
        </div>

        {/* Smart Pause Settings */}
        {enableSmartPause && (
          <div className="space-y-6 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users size={16} className="text-muted-foreground" />
                  Pausar a cada
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pauseAfterContacts}
                    onChange={(e) => onPauseAfterContactsChange(Math.max(10, parseInt(e.target.value) || 10))}
                    className="w-20 text-center"
                    min={10}
                    max={200}
                  />
                  <span className="text-sm text-muted-foreground">contatos</span>
                </div>
              </div>
              
              <Slider
                value={[pauseAfterContacts]}
                onValueChange={([value]) => onPauseAfterContactsChange(value)}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock size={16} className="text-muted-foreground" />
                  Duração da pausa
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={pauseMinutes}
                    onChange={(e) => onPauseMinutesChange(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center"
                    min={1}
                    max={30}
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>
              </div>
              
              <Slider
                value={[pauseMinutes]}
                onValueChange={([value]) => onPauseMinutesChange(value)}
                min={1}
                max={30}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p>
                A cada {pauseAfterContacts} contatos, o sistema pausará automaticamente por {pauseMinutes} minuto{pauseMinutes > 1 ? 's' : ''} antes de continuar.
              </p>
            </div>
          </div>
        )}

        {/* Number Selector */}
        {onSelectNumber && (
          <NumberSelectorWithBalance
            numbers={numbers}
            selectedNumberId={selectedNumberId}
            onSelectNumber={onSelectNumber}
            leadsCount={totalLeads}
            isScheduled={isScheduled}
            scheduledDate={scheduledDate}
            maxNumbers={maxNumbers}
            userPlan={userPlan}
          />
        )}

        {/* Campaign Scheduler */}
        <CampaignScheduler
          isScheduled={isScheduled}
          onScheduleChange={onScheduleChange}
          scheduledDate={scheduledDate}
          onDateChange={onScheduledDateChange}
          scheduledTime={scheduledTime}
          onTimeChange={onScheduledTimeChange}
        />
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t border-border">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          Próximo
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
