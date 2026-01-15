import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Flame, Snowflake, Thermometer } from "lucide-react";

interface WarmingWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warmingLevel: number;
  warmingStatus: 'cold' | 'warm' | 'hot';
}

export const WarmingWarningModal = ({
  isOpen,
  onClose,
  onConfirm,
  warmingLevel,
  warmingStatus,
}: WarmingWarningModalProps) => {
  const getStatusInfo = () => {
    if (warmingStatus === 'cold') {
      return {
        icon: <Snowflake className="h-8 w-8 text-blue-400" />,
        label: 'Frio',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        description: 'Este número ainda está nos primeiros passos do aquecimento e tem maior risco de bloqueio.',
      };
    }
    return {
      icon: <Thermometer className="h-8 w-8 text-yellow-500" />,
      label: 'Morno',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      description: 'Este número está no meio do processo de aquecimento. Ainda há risco moderado de bloqueio.',
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex flex-col items-center text-center mb-4">
            <div className={`p-4 rounded-full ${statusInfo.bgColor} mb-4`}>
              <AlertTriangle className="h-10 w-10 text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-xl">
              Atenção: Número Não Aquecido
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-center space-y-4">
            <div className={`p-4 rounded-lg ${statusInfo.bgColor} border ${statusInfo.borderColor}`}>
              <div className="flex items-center justify-center gap-3 mb-2">
                {statusInfo.icon}
                <div>
                  <p className={`font-semibold ${statusInfo.color}`}>
                    Nível {warmingLevel}/4 - {statusInfo.label}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div 
                        key={level}
                        className={`h-2 w-8 rounded-full ${
                          level <= warmingLevel
                            ? warmingStatus === 'cold' 
                              ? 'bg-blue-400' 
                              : 'bg-yellow-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-muted-foreground">
              {statusInfo.description}
            </p>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-left">
              <p className="text-sm text-destructive font-medium mb-1">
                ⚠️ Riscos de usar um número não aquecido:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Bloqueio temporário ou permanente do WhatsApp</li>
                <li>Perda do número e histórico de conversas</li>
                <li>Necessidade de adquirir um novo chip</li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Recomendamos aguardar o aquecimento completo (🔥 Aquecido) antes de fazer disparos em massa.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="w-full sm:w-auto">
            Cancelar e Aguardar Aquecimento
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
          >
            Entendo os Riscos, Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
