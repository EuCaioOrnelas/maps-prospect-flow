import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, ArrowLeft, Check, Loader2, AlertTriangle, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { SEO } from "@/components/SEO";
import { trackSignupCompleted } from "@/hooks/useLandingPageTracking";
import { supabase } from "@/integrations/supabase/client";
import { EmailVerificationDialog } from "@/components/EmailVerificationDialog";

interface SignupStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: string;
}

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [signupSteps, setSignupSteps] = useState<SignupStep[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const updateStep = (stepName: string, status: SignupStep['status'], message?: string, duration?: string) => {
    setSignupSteps(prev => {
      const existing = prev.find(s => s.step === stepName);
      if (existing) {
        return prev.map(s => s.step === stepName ? { ...s, status, message, duration } : s);
      }
      return [...prev, { step: stepName, status, message, duration }];
    });
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const copyDebugLogs = () => {
    const logsText = debugLogs.join('\n');
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Logs copiados!",
      description: "Cole em um email para o suporte se necessário.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formStartTime = Date.now();
    
    // Reset debug state
    setSignupSteps([]);
    setDebugLogs([]);
    setShowDebugInfo(false);
    
    addDebugLog(`Iniciando cadastro para ${email.substring(0, 3)}***`);
    console.log('[Signup Form] Submit started', { 
      timestamp: new Date().toISOString(),
      email: email.substring(0, 3) + '***',
      hasName: !!name,
      acceptedTerms
    });
    
    if (!acceptedTerms) {
      addDebugLog('Erro: Termos não aceitos');
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os Termos de Uso e a Política de Reembolso para criar sua conta.",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(password)) {
      addDebugLog('Erro: Senha muito fraca');
      toast({
        title: "Senha muito fraca",
        description: "Sua senha precisa ser média ou forte. Adicione mais caracteres, números ou símbolos especiais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Initialize steps
    updateStep('Validação', 'success', 'Dados validados');
    updateStep('Verificação de segurança', 'running');
    addDebugLog('Validação concluída, iniciando verificação de segurança...');

    try {
      const { error } = await signUp(email, password, name);
      
      const duration = Date.now() - formStartTime + 'ms';
      addDebugLog(`signUp retornou após ${duration}`);
      
      console.log('[Signup Form] signUp returned', { 
        hasError: !!error,
        errorMessage: error?.message,
        duration
      });

      if (error) {
        setIsLoading(false);
        
        // Determine which step failed based on error message
        let errorMessage = "Erro ao criar conta. Tente novamente.";
        let failedStep = 'Criação da conta';
        
        // Log the full error for debugging
        console.error('[Signup Form] Signup error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        addDebugLog(`ERRO: ${error.message}`);
        
        if (error.message.includes("fingerprint") || error.message.includes("IP")) {
          failedStep = 'Verificação de segurança';
          updateStep('Verificação de segurança', 'error', error.message);
        } else if (error.message.includes("User already registered")) {
          errorMessage = "Este email já está cadastrado. Faça login.";
          failedStep = 'Verificação de email';
          updateStep('Verificação de segurança', 'success');
          updateStep('Verificação de email', 'error', 'Email já cadastrado');
        } else if (error.message.includes("Invalid email")) {
          errorMessage = "Email inválido. Verifique o formato.";
          failedStep = 'Validação de email';
          updateStep('Verificação de segurança', 'success');
          updateStep('Validação de email', 'error', 'Formato inválido');
        } else if (error.message.includes("suspeita") || error.message.includes("suporte")) {
          // Fraud-related errors
          errorMessage = error.message;
          failedStep = 'Verificação de segurança';
          updateStep('Verificação de segurança', 'error', 'Atividade suspeita detectada');
        } else if (error.message.includes("limite") || error.message.includes("atingido") || error.message.includes("dispositivo")) {
          // Limit-related errors
          errorMessage = error.message;
          failedStep = 'Verificação de segurança';
          updateStep('Verificação de segurança', 'error', error.message);
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet.";
          failedStep = 'Conexão';
          updateStep('Verificação de segurança', 'error', 'Falha de conexão');
        } else {
          updateStep('Verificação de segurança', 'success');
          updateStep('Criação da conta', 'error', error.message);
        }

        addDebugLog(`Etapa com falha: ${failedStep}`);
        setShowDebugInfo(true);

        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Success path
      updateStep('Verificação de segurança', 'success', 'Aprovado');
      updateStep('Criação da conta', 'success', 'Conta criada');
      addDebugLog('Conta criada com sucesso!');
      
      console.log('[Signup Form] Signup successful, tracking analytics...');
      
      // Track signup completion for landing page analytics
      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser) {
        updateStep('Configuração inicial', 'success', 'Concluída');
        addDebugLog(`Usuário criado: ${newUser.id.substring(0, 8)}...`);
        await trackSignupCompleted(newUser.id);
      }

      addDebugLog(`Cadastro completo em ${Date.now() - formStartTime}ms`);
      
      // Show email verification dialog
      setShowEmailVerification(true);
      setIsLoading(false);
    } catch (unexpectedError) {
      console.error('[Signup Form] Unexpected exception:', unexpectedError);
      const errorMsg = unexpectedError instanceof Error ? unexpectedError.message : 'Erro desconhecido';
      addDebugLog(`EXCEÇÃO: ${errorMsg}`);
      updateStep('Sistema', 'error', errorMsg);
      setShowDebugInfo(true);
      setIsLoading(false);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Por favor, recarregue a página e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRetry = () => {
    setShowEmailVerification(false);
    setEmail("");
    setPassword("");
    setName("");
    setAcceptedTerms(false);
    setSignupSteps([]);
    setDebugLogs([]);
    setShowDebugInfo(false);
  };

  const benefits = [
    "10 buscas estratégicas grátis",
    "Download ilimitado de leads",
    "Sem cartão de crédito",
  ];

  const hasError = signupSteps.some(s => s.status === 'error');

  return (
    <>
      <SEO 
        title="Criar Conta Grátis"
        description="Crie sua conta grátis no Wiize e ganhe 10 buscas estratégicas. Comece a prospectar novos clientes com inteligência artificial."
        keywords="criar conta, cadastro, prospecção grátis, leads grátis, vendas B2B"
      />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-glow opacity-30" />
        
        <div className="w-full max-w-md relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 sm:mb-8 transition-colors text-sm sm:text-base">
            <ArrowLeft size={16} />
            <span>Voltar para home</span>
          </Link>

          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="flex justify-center mb-6 sm:mb-8">
              <Logo size="lg" />
            </div>

            <h1 className="font-display text-xl sm:text-2xl font-bold text-center mb-2">
              Crie sua conta grátis
            </h1>
            <p className="text-muted-foreground text-center mb-4 sm:mb-6 text-sm sm:text-base">
              Comece a prospectar novos clientes agora
            </p>

            {/* Benefits */}
            <div className="bg-primary/10 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8">
              <ul className="space-y-2">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs sm:text-sm">
                    <Check size={14} className="text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Progress Steps - Show during loading or after error */}
            {(isLoading || hasError) && signupSteps.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  {isLoading ? 'Progresso do cadastro:' : 'Status do cadastro:'}
                </p>
                <div className="space-y-2">
                  {signupSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {step.status === 'running' && (
                        <Loader2 size={12} className="animate-spin text-primary" />
                      )}
                      {step.status === 'success' && (
                        <CheckCircle size={12} className="text-green-500" />
                      )}
                      {step.status === 'error' && (
                        <AlertTriangle size={12} className="text-destructive" />
                      )}
                      {step.status === 'pending' && (
                        <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                      )}
                      <span className={step.status === 'error' ? 'text-destructive' : ''}>
                        {step.step}
                        {step.message && (
                          <span className="text-muted-foreground ml-1">
                            - {step.message}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Debug Info Panel - Show on error */}
            {showDebugInfo && hasError && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Informações para suporte
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyDebugLogs}
                    className="h-6 px-2 text-xs"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={10} className="mr-1" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy size={10} className="mr-1" />
                        Copiar logs
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-background/50 rounded p-2 max-h-32 overflow-y-auto">
                  <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">
                    {debugLogs.join('\n')}
                  </pre>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Se o problema persistir, copie os logs acima e envie para o suporte.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm sm:text-base">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 bg-secondary border-border text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 bg-secondary border-border text-sm sm:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className="h-11 sm:h-12 bg-secondary border-border pr-12 text-foreground text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-0.5"
                  disabled={isLoading}
                />
                <Label htmlFor="terms" className="text-xs sm:text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <Link to="/terms" className="text-primary hover:underline" target="_blank">
                    Termos de Uso
                  </Link>
                  ,{" "}
                  <Link to="/privacy" className="text-primary hover:underline" target="_blank">
                    Política de Privacidade
                  </Link>{" "}
                  e{" "}
                  <Link to="/refund-policy" className="text-primary hover:underline" target="_blank">
                    Política de Reembolso
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full h-11 sm:h-12 text-sm sm:text-base"
                disabled={isLoading || !acceptedTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Criando conta...
                  </>
                ) : (
                  "Criar conta grátis"
                )}
              </Button>
            </form>

            <p className="text-center text-muted-foreground mt-3 sm:mt-4 text-xs sm:text-sm">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Email Verification Dialog */}
      <EmailVerificationDialog
        open={showEmailVerification}
        onOpenChange={setShowEmailVerification}
        email={email}
        onRetry={handleRetry}
      />
    </>
  );
};

export default Signup;
