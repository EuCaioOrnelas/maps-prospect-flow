import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  Settings, 
  ArrowLeft, 
  Clock,
  Users,
  Pause,
  AlertTriangle,
  Info,
  FileText,
  Send,
  WifiOff
} from "lucide-react";

interface CampaignSettingsProps {
  campaignName: string;
  onCampaignNameChange: (value: string) => void;
  delaySeconds: number;
  onDelayChange: (value: number) => void;
  pauseAfterContacts: number;
  onPauseAfterContactsChange: (value: number) => void;
  pauseMinutes: number;
  onPauseMinutesChange: (value: number) => void;
  enableSmartPause: boolean;
  onEnableSmartPauseChange: (value: boolean) => void;
  onBack: () => void;
  onStartCampaign: () => void;
  canProceed: boolean;
  isConnected: boolean;
  totalLeads: number;
}

export const CampaignSettings = ({
  campaignName,
  onCampaignNameChange,
  delaySeconds,
  onDelayChange,
  pauseAfterContacts,
  onPauseAfterContactsChange,
  pauseMinutes,
  onPauseMinutesChange,
  enableSmartPause,
  onEnableSmartPauseChange,
  onBack,
  onStartCampaign,
  canProceed,
  isConnected,
  totalLeads
}: CampaignSettingsProps) => {
  
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} segundos`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}min ${secs}s` : `${mins} minuto${mins > 1 ? 's' : ''}`;
  };

  const estimatedTimePerContact = delaySeconds;
  const pauseTime = enableSmartPause ? Math.ceil(pauseAfterContacts / pauseAfterContacts) * pauseMinutes * 60 : 0;
  
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

        {/* Delay Between Messages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Delay entre mensagens
            </Label>
            <span className="text-sm font-medium text-primary">{formatTime(delaySeconds)}</span>
          </div>
          
          <Slider
            value={[delaySeconds]}
            onValueChange={([value]) => onDelayChange(value)}
            min={40}
            max={180}
            step={5}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>40s (mínimo)</span>
            <span>180s (mais seguro)</span>
          </div>

          {delaySeconds < 60 && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle size={12} />
              Delay baixo pode aumentar o risco de bloqueio
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
      </div>

      {/* Campaign Summary & Start */}
      <div className="mt-6 pt-6 border-t border-border space-y-4">
        {!isConnected && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
            <WifiOff size={16} className="text-warning" />
            <span>Conecte seu WhatsApp no botão do topo para iniciar</span>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">Resumo da campanha</p>
            <p className="text-sm text-muted-foreground">{totalLeads} leads • {formatTime(delaySeconds)} de delay</p>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <Button onClick={onStartCampaign} disabled={!canProceed} className="gap-2">
            <Send size={16} />
            Iniciar Disparos
          </Button>
        </div>
      </div>
    </div>
  );
};
