/**
 * =============================================================================
 * CheckoutSuccess.tsx - Página de Sucesso Pós-Pagamento
 * =============================================================================
 * 
 * Esta página é exibida após o usuário completar um pagamento no Stripe.
 * 
 * FUNCIONALIDADES:
 * 1. Exibe confirmação visual de pagamento (confetti + animações)
 * 2. Permite criar conta (para guests) ou fazer login (usuários existentes)
 * 3. Usa skipFraudCheck=true no signup (usuário já pagou, não bloquear)
 * 4. Mostra progress steps e logs para debug
 * 
 * FLUXO:
 * - Stripe redireciona aqui após checkout bem-sucedido
 * - stripe-webhook já processou o pagamento (profile.plan atualizado ou pendente)
 * - Usuário cria conta → plano vinculado automaticamente pelo email
 * 
 * IMPORTANTE:
 * - O email do signup DEVE ser o mesmo usado no checkout Stripe
 * - skipFraudCheck evita bloqueio de usuários legítimos
 * 
 * @see docs/CHECKOUT_FLOW.md para fluxo completo
 * =============================================================================
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  Rocket, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Mail, 
  Lock, 
  User,
  PartyPopper,
  Crown,
  AlertTriangle,
  CheckCircle,
  Copy
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Confetti } from "@/components/ui/confetti";
import { motion } from "framer-motion";
import { EmailVerificationDialog } from "@/components/EmailVerificationDialog";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";

interface SignupStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  
  // Progress tracking state
  const [signupSteps, setSignupSteps] = useState<SignupStep[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [copied, setCopied] = useState(false);

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const updateStep = (stepName: string, status: SignupStep['status'], message?: string) => {
    setSignupSteps(prev => {
      const existing = prev.find(s => s.step === stepName);
      if (existing) {
        return prev.map(s => s.step === stepName ? { ...s, status, message } : s);
      }
      return [...prev, { step: stepName, status, message }];
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

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset debug state
    setSignupSteps([]);
    setDebugLogs([]);
    setShowDebugInfo(false);
    
    addDebugLog(`Iniciando criação de conta pós-checkout para ${email.substring(0, 3)}***`);
    
    // Validate password strength
    if (!isPasswordStrong(password)) {
      addDebugLog('Erro: Senha muito fraca');
      toast({
        title: "Senha muito fraca",
        description: "Sua senha precisa ser média ou forte. Adicione mais caracteres, números ou símbolos especiais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    updateStep('Validação', 'success', 'Dados validados');
    updateStep('Criação da conta', 'running');
    addDebugLog('Validação concluída, criando conta (fraud check desabilitado para pagantes)...');

    try {
      // Use signUp with skipFraudCheck=true since user already paid
      const { error } = await signUp(email, password, name, true);

      if (error) {
        addDebugLog(`ERRO: ${error.message}`);
        updateStep('Criação da conta', 'error', error.message);
        setShowDebugInfo(true);

        // Handle specific error messages
        let errorMessage = error.message || "Erro ao criar conta. Tente novamente.";
        
        if (error.message.includes("User already registered")) {
          errorMessage = "Este email já está cadastrado. Faça login para acessar seu plano.";
          addDebugLog('Email já cadastrado - usuário deve fazer login');
        }

        toast({
          title: "Erro no cadastro",
          description: errorMessage,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Success
      updateStep('Criação da conta', 'success', 'Conta criada');
      updateStep('Vinculando plano', 'success', 'Plano ativo');
      addDebugLog('Conta criada com sucesso! Plano será vinculado automaticamente.');

      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode acessar sua conta.",
      });
      
      // Show email verification or redirect
      setShowEmailVerification(true);
      setLoading(false);
    } catch (unexpectedError: any) {
      console.error("Signup error:", unexpectedError);
      const errorMsg = unexpectedError instanceof Error ? unexpectedError.message : 'Erro desconhecido';
      addDebugLog(`EXCEÇÃO: ${errorMsg}`);
      updateStep('Sistema', 'error', errorMsg);
      setShowDebugInfo(true);
      
      toast({
        title: "Erro ao criar conta",
        description: errorMsg || "Tente novamente mais tarde",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const hasError = signupSteps.some(s => s.status === 'error');

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <Confetti trigger={showConfetti} />
      
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <Link to="/">
              <Logo size="md" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative container mx-auto px-4 py-12 max-w-lg">
        {/* Success Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="relative w-24 h-24 mx-auto mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-primary rounded-full animate-pulse" />
            <div className="absolute inset-1 bg-background rounded-full flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-primary rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-white" strokeWidth={3} />
              </div>
            </div>
            <motion.div
              className="absolute -top-2 -right-2"
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <PartyPopper className="w-8 h-8 text-amber-500" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">
                Pagamento Confirmado!
              </span>
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            
            <h1 className="font-display text-4xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Obrigado pela sua compra!
            </h1>
            
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Seu plano já está ativo. Crie sua conta ou faça login para começar a usar todas as funcionalidades.
            </p>
          </motion.div>
        </motion.div>

        {/* Main Card */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-primary/20 to-emerald-500/20 rounded-3xl blur-xl" />
          
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            {/* Important Notice - Single Message */}
            <motion.div 
              className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-primary/10 border border-emerald-500/20 rounded-xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-primary flex items-center justify-center flex-shrink-0">
                  <Crown className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    Sua assinatura está ativa! 🎉
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Novo aqui?</strong> Crie sua conta com o email usado na compra. <br />
                    <strong className="text-foreground">Já tem conta?</strong> Faça login com o mesmo email para vincular seu plano.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Progress Steps - Show during loading or after error */}
            {(loading || hasError) && signupSteps.length > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-3 font-medium">
                  {loading ? 'Progresso do cadastro:' : 'Status do cadastro:'}
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

            {/* Create Account Form */}
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Use o mesmo email do pagamento"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </motion.div>

              <motion.div 
                className="space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
              >
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={loading}
                  className="h-12"
                />
                <PasswordStrength password={password} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
              >
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-primary hover:from-emerald-700 hover:to-primary/90" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Criando conta...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Criar conta e acessar
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <Link to="/login">
                <Button variant="outline" className="w-full h-12 text-base">
                  <User className="w-5 h-5 mr-2" />
                  Já tenho uma conta - Fazer login
                </Button>
              </Link>
            </motion.div>

            <motion.p 
              className="text-center text-sm text-muted-foreground mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              Precisa de ajuda?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Entre em contato conosco
              </Link>
            </motion.p>
          </div>
        </motion.div>

        {/* Footer Message */}
        <motion.p 
          className="text-center text-sm text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          Obrigado por escolher a Wiize! 💚
        </motion.p>
      </main>

      {/* Email Verification Dialog */}
      <EmailVerificationDialog
        open={showEmailVerification}
        onOpenChange={setShowEmailVerification}
        email={email}
        onRetry={() => {
          setEmail("");
          setPassword("");
          setName("");
          setSignupSteps([]);
          setDebugLogs([]);
          setShowDebugInfo(false);
        }}
      />
    </div>
  );
};

export default CheckoutSuccess;
