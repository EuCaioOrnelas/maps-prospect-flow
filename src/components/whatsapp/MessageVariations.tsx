import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Info,
  AlertCircle
} from "lucide-react";

interface Lead {
  name: string;
  category?: string;
  phone: string;
}

interface MessageVariationsProps {
  messages: string[];
  onMessagesChange: (messages: string[]) => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  selectedLeads?: Lead[];
}

export const MessageVariations = ({ 
  messages, 
  onMessagesChange, 
  onBack, 
  onNext, 
  canProceed,
  selectedLeads = []
}: MessageVariationsProps) => {
  
  const handleMessageChange = (index: number, value: string) => {
    const newMessages = [...messages];
    newMessages[index] = value;
    onMessagesChange(newMessages);
  };

  const filledCount = messages.filter(m => m.trim()).length;
  const firstLead = selectedLeads[0];
  const allFilled = filledCount === 5;

  const placeholders = [
    "Olá {nome}! Vi que você trabalha com {categoria}. Tenho uma proposta que pode interessar...",
    "Oi {nome}! Sou especialista em ajudar empresas como a sua. Podemos conversar?",
    "Olá! Encontrei sua empresa {nome} e gostaria de apresentar uma solução para você...",
    "Oi {nome}, tudo bem? Estou entrando em contato porque...",
    "Olá! Sou da [sua empresa] e gostaria de apresentar uma oportunidade para {nome}..."
  ];

  // Substitui variáveis na mensagem com dados do primeiro lead
  const replaceVariables = (message: string): string => {
    if (!firstLead || !message.trim()) return message;
    
    return message
      .replace(/\{nome\}/gi, firstLead.name || 'Cliente')
      .replace(/\{categoria\}/gi, firstLead.category || 'sua área');
  };

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <MessageSquare size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Variações de Mensagem</h2>
        <p className="text-muted-foreground">
          Crie 5 variações diferentes para evitar bloqueios
        </p>
      </div>

      {/* Info Banner - How to use variables */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/10 border border-info/20 mb-6">
        <Info size={18} className="text-info mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-2">Como usar variáveis:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Use <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">{'{nome}'}</code> para inserir automaticamente o nome do lead/empresa</li>
            <li>• Use <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">{'{categoria}'}</code> para inserir a categoria do lead</li>
            <li>• O sistema substituirá automaticamente pelos dados de cada contato</li>
            <li>• Exemplo: "Olá {'{nome}'}" → "Olá João Silva"</li>
          </ul>
        </div>
      </div>

      {/* Requirement warning */}
      {!allFilled && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 mb-6">
          <AlertCircle size={18} className="text-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Todas as 5 mensagens são obrigatórias</p>
            <p className="text-muted-foreground">
              Preencha todas as variações para evitar detecção como spam pelo WhatsApp
            </p>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">Mensagens preenchidas:</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  messages[i]?.trim() ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <span className={`text-sm font-medium ${filledCount === 5 ? 'text-primary' : 'text-muted-foreground'}`}>
            {filledCount}/5
          </span>
        </div>
      </div>

      {/* Message Inputs with Individual Previews */}
      <div className="space-y-6">
        {messages.map((message, index) => {
          const hasContent = message.trim().length > 0;
          const previewText = hasContent && firstLead ? replaceVariables(message) : null;
          
          return (
            <div key={index} className="space-y-2 p-4 rounded-lg border border-border bg-card/50">
              <Label className="flex items-center gap-2">
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                  ${hasContent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {index + 1}
                </span>
                Mensagem {index + 1}
                {hasContent && <Sparkles size={12} className="text-primary" />}
                {!hasContent && <span className="text-xs text-destructive">(obrigatória)</span>}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => handleMessageChange(index, e.target.value)}
                placeholder={placeholders[index]}
                className={`min-h-[100px] resize-none ${!hasContent ? 'border-warning/50' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Dica: Use {'{nome}'} para personalizar</span>
                <span>{message.length} caracteres</span>
              </div>
              
              {/* Preview for this message */}
              {previewText && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Preview para "{firstLead.name}":
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{previewText}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-6 border-t border-border">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} />
          Voltar
        </Button>
        <Button onClick={onNext} disabled={!canProceed} className="gap-2">
          {!allFilled ? `Falta ${5 - filledCount} mensagem${5 - filledCount > 1 ? 's' : ''}` : 'Próximo'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};
