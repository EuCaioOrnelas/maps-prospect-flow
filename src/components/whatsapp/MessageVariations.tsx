import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Info
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

  // Pega a primeira mensagem preenchida para mostrar o preview
  const firstFilledMessage = messages.find(m => m.trim());
  const previewMessage = firstFilledMessage ? replaceVariables(firstFilledMessage) : null;

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

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/10 border border-info/20 mb-6">
        <Info size={18} className="text-info mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">Dicas para suas mensagens:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Use <code className="bg-muted px-1 rounded">{'{nome}'}</code> para inserir o nome do lead</li>
            <li>• Use <code className="bg-muted px-1 rounded">{'{categoria}'}</code> para inserir a categoria</li>
            <li>• Varie o início e o tom de cada mensagem</li>
            <li>• O sistema escolherá aleatoriamente entre as 5 variações</li>
          </ul>
        </div>
      </div>

      {/* Message Preview */}
      {previewMessage && firstLead && (
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Preview para o primeiro contato ({firstLead.name}):
          </p>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-foreground whitespace-pre-wrap">{previewMessage}</p>
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

      {/* Message Inputs */}
      <div className="space-y-4">
        {messages.map((message, index) => (
          <div key={index} className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className={`
                inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium
                ${message.trim() ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </span>
              Mensagem {index + 1}
              {message.trim() && <Sparkles size={12} className="text-primary" />}
            </Label>
            <Textarea
              value={message}
              onChange={(e) => handleMessageChange(index, e.target.value)}
              placeholder={placeholders[index]}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length} caracteres
            </p>
          </div>
        ))}
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
