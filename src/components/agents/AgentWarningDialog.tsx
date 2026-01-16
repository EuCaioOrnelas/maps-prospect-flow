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
import { AlertTriangle, Shield, Ban, CheckCircle } from "lucide-react";

interface AgentWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export function AgentWarningDialog({ open, onOpenChange, onAccept }: AgentWarningDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-yellow-500/20">
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-xl">
              Atenção: Agentes de IA requerem cuidado
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-muted-foreground">
                Agentes de IA para WhatsApp são uma ferramenta <strong className="text-foreground">poderosa mas arriscada</strong>. 
                O uso incorreto pode levar a <strong className="text-destructive">bloqueios permanentes</strong> do seu número.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <Ban className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-500">O que pode causar bloqueio:</p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      <li>• Enviar muitas mensagens em pouco tempo</li>
                      <li>• Usar mensagens que parecem spam</li>
                      <li>• Continuar enviando após ser ignorado/bloqueado</li>
                      <li>• Usar números frios (sem aquecimento)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-500">Boas práticas:</p>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      <li>• Aqueça seu número antes de usar com agentes</li>
                      <li>• Comece com limites baixos (5-10/dia)</li>
                      <li>• Use horário comercial realista</li>
                      <li>• Monitore a taxa de resposta diariamente</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <Shield className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-500">Proteção do sistema:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Limitamos a <strong>1 agente por número</strong> para proteger seus números de sobrecarga.
                      Se um número já tem um agente, você precisará desativá-lo antes de criar outro.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground italic">
                Ao continuar, você confirma que entende os riscos e se compromete a usar o recurso de forma responsável.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>
            Entendi e Aceito
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
