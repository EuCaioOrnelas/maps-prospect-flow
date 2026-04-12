import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Check, Loader2, Send, Shield, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { z } from "zod";

const formSchema = z.object({
  partnerName: z.string().min(2, "Nome do sócio é obrigatório").max(100),
  companyName: z.string().min(2, "Nome da empresa é obrigatório").max(200),
  cnpj: z.string().min(14, "CNPJ inválido").max(18),
  niche: z.string().min(2, "Nicho de atuação é obrigatório").max(200),
  email: z.string().email("Email inválido").max(255),
  phone: z.string().min(10, "Telefone inválido").max(20),
  teamSize: z.string().min(1, "Selecione o tamanho da equipe").max(50),
  objective: z.string().min(10, "Descreva seu objetivo com mais detalhes").max(1000),
  currentTools: z.string().max(500).optional(),
  monthlyLeadVolume: z.string().max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

const benefits = [
  { icon: Building2, title: "Estrutura sob medida", description: "Infraestrutura personalizada para sua operação" },
  { icon: Users, title: "Gerente exclusivo", description: "Atendimento dedicado com especialista" },
  { icon: Zap, title: "Volume ilimitado", description: "Números e oportunidades sem restrições" },
  { icon: Shield, title: "Prioridade total", description: "Processamento e suporte prioritário" },
];

const EnterpriseContact = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    partnerName: "",
    companyName: "",
    cnpj: "",
    niche: "",
    email: "",
    phone: "",
    teamSize: "",
    objective: "",
    currentTools: "",
    monthlyLeadVolume: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    return digits.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
  };

  const handleChange = (field: keyof FormData, value: string) => {
    let formatted = value;
    if (field === "cnpj") formatted = formatCNPJ(value);
    if (field === "phone") formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof FormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-enterprise-contact", {
        body: formData,
      });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: "Solicitação enviada com sucesso!",
        description: "Nossa equipe entrará em contato em até 24 horas.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEO title="Obrigado — Wiize Enterprise" description="Recebemos sua solicitação Enterprise." />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg w-full text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Solicitação recebida!
            </h1>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Nossa equipe analisará seu perfil e entrará em contato em até <strong>24 horas úteis</strong> com uma proposta personalizada para sua operação.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate("/")}>
              Voltar ao início
            </Button>
          </motion.div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Enterprise — Wiize Scale"
        description="Solicite uma estrutura personalizada para sua operação B2B. Gerente dedicado, volume ilimitado e infraestrutura sob medida."
        keywords="enterprise, B2B, vendas, automação, plano corporativo, Wiize"
      />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-sm px-3">
                <ArrowLeft size={16} />
                Voltar
              </Button>
              <Logo size="md" />
              <div className="w-20" />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 sm:py-16 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Left - Info */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full mb-6">
                  <Building2 size={12} />
                  ENTERPRISE
                </span>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
                  Escale sua operação<br />
                  <span className="text-primary">sem limites</span>
                </h1>

                <p className="text-muted-foreground text-base sm:text-lg mb-10 leading-relaxed">
                  Preencha o formulário e receba uma proposta personalizada para sua empresa. Nossa equipe especializada criará uma estrutura sob medida para maximizar seus resultados.
                </p>

                <div className="space-y-5">
                  {benefits.map((b, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-start gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <b.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{b.title}</p>
                        <p className="text-muted-foreground text-sm">{b.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-10 p-5 rounded-xl border border-border/50 bg-card/30">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">💬 Resposta rápida:</strong> Nossa equipe responde em até 24 horas úteis com uma análise completa e proposta personalizada.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right - Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-3"
            >
              <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm p-6 sm:p-8">
                <div className="mb-8">
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                    Solicitar proposta Enterprise
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Preencha os dados abaixo para que possamos montar a melhor solução para sua empresa.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="partnerName">Nome do sócio / responsável *</Label>
                      <Input
                        id="partnerName"
                        placeholder="João Silva"
                        value={formData.partnerName}
                        onChange={e => handleChange("partnerName", e.target.value)}
                        className={errors.partnerName ? "border-destructive" : ""}
                      />
                      {errors.partnerName && <p className="text-xs text-destructive">{errors.partnerName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nome da empresa *</Label>
                      <Input
                        id="companyName"
                        placeholder="Empresa Ltda"
                        value={formData.companyName}
                        onChange={e => handleChange("companyName", e.target.value)}
                        className={errors.companyName ? "border-destructive" : ""}
                      />
                      {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ *</Label>
                      <Input
                        id="cnpj"
                        placeholder="00.000.000/0001-00"
                        value={formData.cnpj}
                        onChange={e => handleChange("cnpj", e.target.value)}
                        className={errors.cnpj ? "border-destructive" : ""}
                      />
                      {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="niche">Nicho de atuação *</Label>
                      <Input
                        id="niche"
                        placeholder="Ex: Tecnologia, Consultoria, Agência..."
                        value={formData.niche}
                        onChange={e => handleChange("niche", e.target.value)}
                        className={errors.niche ? "border-destructive" : ""}
                      />
                      {errors.niche && <p className="text-xs text-destructive">{errors.niche}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email corporativo *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contato@empresa.com"
                        value={formData.email}
                        onChange={e => handleChange("email", e.target.value)}
                        className={errors.email ? "border-destructive" : ""}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        value={formData.phone}
                        onChange={e => handleChange("phone", e.target.value)}
                        className={errors.phone ? "border-destructive" : ""}
                      />
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Tamanho da equipe comercial *</Label>
                    <select
                      id="teamSize"
                      value={formData.teamSize}
                      onChange={e => handleChange("teamSize", e.target.value)}
                      className={`flex h-10 w-full rounded-md border ${errors.teamSize ? "border-destructive" : "border-input"} bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                    >
                      <option value="">Selecione...</option>
                      <option value="1-5">1 a 5 pessoas</option>
                      <option value="6-15">6 a 15 pessoas</option>
                      <option value="16-50">16 a 50 pessoas</option>
                      <option value="50+">Mais de 50 pessoas</option>
                    </select>
                    {errors.teamSize && <p className="text-xs text-destructive">{errors.teamSize}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyLeadVolume">Volume mensal de leads desejado</Label>
                    <Input
                      id="monthlyLeadVolume"
                      placeholder="Ex: 10.000, 50.000..."
                      value={formData.monthlyLeadVolume}
                      onChange={e => handleChange("monthlyLeadVolume", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentTools">Ferramentas que usa atualmente</Label>
                    <Input
                      id="currentTools"
                      placeholder="Ex: HubSpot, RD Station, planilhas..."
                      value={formData.currentTools}
                      onChange={e => handleChange("currentTools", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objective">Qual objetivo pretende alcançar com a Wiize? *</Label>
                    <Textarea
                      id="objective"
                      placeholder="Descreva como pretende usar a plataforma, seus desafios atuais e o resultado esperado..."
                      rows={4}
                      value={formData.objective}
                      onChange={e => handleChange("objective", e.target.value)}
                      className={errors.objective ? "border-destructive" : ""}
                    />
                    {errors.objective && <p className="text-xs text-destructive">{errors.objective}</p>}
                  </div>

                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Enviar solicitação Enterprise
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Ao enviar, você concorda com nossos{" "}
                    <a href="/terms" className="text-primary hover:underline">Termos de Uso</a>{" "}
                    e{" "}
                    <a href="/privacy" className="text-primary hover:underline">Política de Privacidade</a>.
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </>
  );
};

export default EnterpriseContact;
