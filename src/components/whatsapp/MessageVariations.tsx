import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MessageSquare, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Info,
  AlertCircle,
  Link as LinkIcon,
  Copy
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

const MAX_CHARS = 120;

// Regex to detect links
const LINK_REGEX = /(?:https?:\/\/|www\.)[^\s]+/i;

export const MessageVariations = ({ 
  messages, 
  onMessagesChange, 
  onBack, 
  onNext, 
  canProceed,
  selectedLeads = []
}: MessageVariationsProps) => {
  
  const handleMessageChange = (index: number, value: string) => {
    // Limit to MAX_CHARS
    const limitedValue = value.slice(0, MAX_CHARS);
    const newMessages = [...messages];
    newMessages[index] = limitedValue;
    onMessagesChange(newMessages);
  };

  const firstLead = selectedLeads[0];

  // Validation checks
  const validationResult = useMemo(() => {
    const filledMessages = messages.filter(m => m.trim());
    const filledCount = filledMessages.length;
    const allFilled = filledCount === 5;

    // Check for links in any message
    const messagesWithLinks = messages
      .map((m, i) => ({ index: i, hasLink: LINK_REGEX.test(m) }))
      .filter(item => item.hasLink);
    const hasLinks = messagesWithLinks.length > 0;

    // Check for duplicates (normalize whitespace for comparison)
    const normalizedMessages = messages.map(m => m.trim().toLowerCase().replace(/\s+/g, ' '));
    const duplicates: number[] = [];
    const seen = new Map<string, number>();
    
    normalizedMessages.forEach((msg, index) => {
      if (msg.length > 0) {
        if (seen.has(msg)) {
          // Mark both the original and duplicate
          const originalIndex = seen.get(msg)!;
          if (!duplicates.includes(originalIndex)) {
            duplicates.push(originalIndex);
          }
          duplicates.push(index);
        } else {
          seen.set(msg, index);
        }
      }
    });

    const hasDuplicates = duplicates.length > 0;

    // Check character limits
    const overLimitMessages = messages
      .map((m, i) => ({ index: i, length: m.length }))
      .filter(item => item.length > MAX_CHARS);
    const hasOverLimit = overLimitMessages.length > 0;

    const isValid = allFilled && !hasLinks && !hasDuplicates && !hasOverLimit;

    return {
      filledCount,
      allFilled,
      hasLinks,
      messagesWithLinks,
      hasDuplicates,
      duplicates,
      hasOverLimit,
      overLimitMessages,
      isValid,
    };
  }, [messages]);

  const placeholders = [
    "Olá {nome}! Tenho uma proposta interessante...",
    "Oi {nome}! Podemos conversar?",
    "Olá! Gostaria de apresentar uma solução para você...",
    "Oi {nome}, tudo bem? Estou entrando em contato...",
    "Olá! Gostaria de apresentar uma oportunidade..."
  ];

  // Substitui variáveis na mensagem com dados do primeiro lead
  const replaceVariables = (message: string): string => {
    if (!firstLead || !message.trim()) return message;
    return message.replace(/\{nome\}/gi, firstLead.name || 'Cliente');
  };

  const canProceedFinal = canProceed && validationResult.isValid;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
          <MessageSquare size={24} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Variações de Mensagem</h2>
        <p className="text-muted-foreground">
          Crie 5 variações diferentes para evitar bloqueios (máx. {MAX_CHARS} caracteres)
        </p>
      </div>

      {/* Info Banner - How to use variables */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-info/10 border border-info/20 mb-6">
        <Info size={18} className="text-info mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-2">Como usar variáveis:</p>
          <ul className="text-muted-foreground space-y-1">
            <li>• Use <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-primary">{'{nome}'}</code> para inserir automaticamente o nome do lead/empresa</li>
            <li>• O sistema substituirá automaticamente pelos dados de cada contato</li>
            <li>• Exemplo: "Olá {'{nome}'}" → "Olá João Silva"</li>
          </ul>
        </div>
      </div>

      {/* Requirement warning - All 5 required */}
      {!validationResult.allFilled && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 mb-4">
          <AlertCircle size={18} className="text-warning mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Todas as 5 mensagens são obrigatórias</p>
            <p className="text-muted-foreground">
              Preencha todas as variações para evitar detecção como spam pelo WhatsApp
            </p>
          </div>
        </div>
      )}

      {/* Warning - Links detected */}
      {validationResult.hasLinks && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
          <LinkIcon size={18} className="text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Links não são permitidos</p>
            <p className="text-muted-foreground">
              Mensagens {validationResult.messagesWithLinks.map(m => m.index + 1).join(', ')} contêm links. 
              Remova os links para continuar.
            </p>
          </div>
        </div>
      )}

      {/* Warning - Duplicates detected */}
      {validationResult.hasDuplicates && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
          <Copy size={18} className="text-destructive mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-destructive">Mensagens duplicadas detectadas</p>
            <p className="text-muted-foreground">
              Mensagens {[...new Set(validationResult.duplicates)].map(i => i + 1).sort((a, b) => a - b).join(', ')} são iguais ou muito semelhantes. 
              Cada variação deve ser diferente.
            </p>
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6 p-3 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">Mensagens preenchidas:</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map(i => {
              const hasContent = messages[i]?.trim();
              const hasError = validationResult.duplicates.includes(i) || 
                               validationResult.messagesWithLinks.some(m => m.index === i);
              return (
                <div 
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    hasError ? 'bg-destructive' :
                    hasContent ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
              );
            })}
          </div>
          <span className={`text-sm font-medium ${
            validationResult.isValid ? 'text-primary' : 
            validationResult.filledCount === 5 ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {validationResult.filledCount}/5
          </span>
        </div>
      </div>

      {/* Message Inputs with Individual Previews */}
      <div className="space-y-6">
        {messages.map((message, index) => {
          const hasContent = message.trim().length > 0;
          const previewText = hasContent && firstLead ? replaceVariables(message) : null;
          const isDuplicate = validationResult.duplicates.includes(index);
          const hasLink = validationResult.messagesWithLinks.some(m => m.index === index);
          const isOverLimit = message.length > MAX_CHARS;
          const hasError = isDuplicate || hasLink || isOverLimit;
          const charsRemaining = MAX_CHARS - message.length;
          
          return (
            <div key={index} className={`space-y-2 p-4 rounded-lg border bg-card/50 ${
              hasError ? 'border-destructive/50' : 'border-border'
            }`}>
              <Label className="flex items-center gap-2">
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                  ${hasError ? 'bg-destructive text-destructive-foreground' :
                    hasContent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                `}>
                  {index + 1}
                </span>
                Mensagem {index + 1}
                {hasContent && !hasError && <Sparkles size={12} className="text-primary" />}
                {!hasContent && <span className="text-xs text-destructive">(obrigatória)</span>}
                {isDuplicate && <span className="text-xs text-destructive">(duplicada)</span>}
                {hasLink && <span className="text-xs text-destructive">(contém link)</span>}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => handleMessageChange(index, e.target.value)}
                placeholder={placeholders[index]}
                maxLength={MAX_CHARS}
                className={`min-h-[80px] resize-none ${hasError ? 'border-destructive/50 focus-visible:ring-destructive' : !hasContent ? 'border-warning/50' : ''}`}
              />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Dica: Use {'{nome}'} para personalizar</span>
                <span className={`font-medium ${
                  charsRemaining < 0 ? 'text-destructive' :
                  charsRemaining < 20 ? 'text-warning' : 'text-muted-foreground'
                }`}>
                  {message.length}/{MAX_CHARS}
                </span>
              </div>
              
              {/* Preview for this message */}
              {previewText && !hasError && (
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
        <Button onClick={onNext} disabled={!canProceedFinal} className="gap-2">
          {!validationResult.allFilled ? `Falta ${5 - validationResult.filledCount} mensagem${5 - validationResult.filledCount > 1 ? 's' : ''}` : 
           validationResult.hasLinks ? 'Remova os links' :
           validationResult.hasDuplicates ? 'Corrija duplicadas' :
           'Próximo'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
};