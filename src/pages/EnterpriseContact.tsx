import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Check, Loader2, Send, Shield, Users, Zap, Globe, Headphones } from "lucide-react";
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
  monthlyRevenue: z.string().max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

const benefits = [
  { icon: Building2, title: "Infraestrutura dedicada", description: "Servidores e processamento exclusivos para sua operação" },
  { icon: Headphones, title: "Gerente de sucesso", description: "Especialista dedicado ao crescimento da sua empresa" },
  { icon: Zap, title: "Volume ilimitado", description: "Sem limites de números, leads ou campanhas" },
  { icon: Shield, title: "SLA prioritário", description: "Suporte técnico com tempo de resposta garantido" },
  { icon: Globe, title: "API personalizada", description: "Integrações sob medida com seus sistemas" },
  { icon: Users, title: "Onboarding completo", description: "Treinamento e implantação assistida" },
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
    monthlyRevenue: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const isFormValid = useMemo(() => {
    return (
      formData.partnerName.length >= 2 &&
      formData.companyName.length >= 2 &&
      formData.cnpj.replace(/\D/g, "").length >= 14 &&
      formData.niche.length >= 2 &&
      formData.email.includes("@") &&
      formData.phone.replace(/\D/g, "").length >= 10 &&
      formData.teamSize.length >= 1 &&
      formData.objective.length >= 10
    );
  }, [formData]);

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
      const msg = err?.message || "";
      if (msg.includes("Limite de envios")) {
        toast({
          title: "Limite atingido",
          description: "Você já enviou o máximo de solicitações hoje. Tente novamente amanhã.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao enviar",
          description: "Tente novamente mais tarde.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <SEO title="Obrigado — Wiize Enterprise" description="Recebemos sua solicitação Enterprise." />
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Check className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mb-4 text-foreground">
              Solicitação recebida!
            </h1>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Nossa equipe analisará seu perfil e entrará em contato em até <strong className="text-foreground">24 horas úteis</strong> com uma proposta personalizada.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate("/")}>
              Voltar ao início
            </Button>
          </div>
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[100px]" />
        </div>

        {/* Header */}
        <header className="border-b border-border/40 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-sm px-3">
                <ArrowLeft size={16} />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <Logo size="md" />
              <div className="w-16 sm:w-20" />
            </div>
          </div>
        </header>

        <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 lg:py-16 max-w-6xl">
          {/* Hero - mobile first */}
          <div className="text-center mb-8 sm:mb-12 lg:hidden">
            <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full mb-4 tracking-wider">
              <Building2 size={10} />
              ENTERPRISE
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3 leading-tight">
              Escale sua operação <span className="text-primary">sem limites</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              Receba uma proposta personalizada para maximizar seus resultados.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-14 items-start">
            {/* Left - Info (desktop only) */}
            <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-24">
              <span className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full mb-6 tracking-wider">
                <Building2 size={10} />
                ENTERPRISE
              </span>

              <h1 className="font-display text-4xl xl:text-[2.75rem] font-bold text-foreground mb-4 leading-[1.15]">
                Escale sua operação<br />
                <span className="text-primary">sem limites</span>
              </h1>

              <p className="text-muted-foreground text-base mb-10 leading-relaxed">
                Preencha o formulário e receba uma proposta personalizada. Nossa equipe especializada criará uma estrutura sob medida para sua empresa.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3.5 group">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08] group-hover:bg-primary/[0.12] transition-colors">
                      <b.icon className="h-[18px] w-[18px] text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[13px] leading-tight">{b.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 rounded-xl border border-border/40 bg-card/20">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">⚡ Resposta rápida:</strong> Nossa equipe responde em até 24h úteis com análise completa e proposta personalizada.
                </p>
              </div>
            </div>

            {/* Right - Form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 sm:p-7 relative overflow-hidden">
                {/* Form glow */}
                <div className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/[0.05] blur-[80px]" />

                <div className="relative z-10">
                  <div className="mb-6">
                    <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">
                      Solicitar proposta Enterprise
                    </h2>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                      Todos os campos com * são obrigatórios.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="partnerName" className="text-xs font-medium">Nome do sócio *</Label>
                        <Input
                          id="partnerName"
                          placeholder="João Silva"
                          value={formData.partnerName}
                          onChange={e => handleChange("partnerName", e.target.value)}
                          className={`h-9 text-sm ${errors.partnerName ? "border-destructive" : ""}`}
                        />
                        {errors.partnerName && <p className="text-[11px] text-destructive">{errors.partnerName}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="companyName" className="text-xs font-medium">Empresa *</Label>
                        <Input
                          id="companyName"
                          placeholder="Empresa Ltda"
                          value={formData.companyName}
                          onChange={e => handleChange("companyName", e.target.value)}
                          className={`h-9 text-sm ${errors.companyName ? "border-destructive" : ""}`}
                        />
                        {errors.companyName && <p className="text-[11px] text-destructive">{errors.companyName}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="cnpj" className="text-xs font-medium">CNPJ *</Label>
                        <Input
                          id="cnpj"
                          placeholder="00.000.000/0001-00"
                          value={formData.cnpj}
                          onChange={e => handleChange("cnpj", e.target.value)}
                          className={`h-9 text-sm ${errors.cnpj ? "border-destructive" : ""}`}
                        />
                        {errors.cnpj && <p className="text-[11px] text-destructive">{errors.cnpj}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="niche" className="text-xs font-medium">Nicho de atuação *</Label>
                        <Input
                          id="niche"
                          placeholder="Tecnologia, Consultoria..."
                          value={formData.niche}
                          onChange={e => handleChange("niche", e.target.value)}
                          className={`h-9 text-sm ${errors.niche ? "border-destructive" : ""}`}
                        />
                        {errors.niche && <p className="text-[11px] text-destructive">{errors.niche}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-medium">Email corporativo *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="contato@empresa.com"
                          value={formData.email}
                          onChange={e => handleChange("email", e.target.value)}
                          className={`h-9 text-sm ${errors.email ? "border-destructive" : ""}`}
                        />
                        {errors.email && <p className="text-[11px] text-destructive">{errors.email}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs font-medium">WhatsApp *</Label>
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={formData.phone}
                          onChange={e => handleChange("phone", e.target.value)}
                          className={`h-9 text-sm ${errors.phone ? "border-destructive" : ""}`}
                        />
                        {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="teamSize" className="text-xs font-medium">Equipe comercial *</Label>
                        <select
                          id="teamSize"
                          value={formData.teamSize}
                          onChange={e => handleChange("teamSize", e.target.value)}
                          className={`flex h-9 w-full rounded-md border ${errors.teamSize ? "border-destructive" : "border-input"} bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
                        >
                          <option value="">Selecione...</option>
                          <option value="1-5">1 a 5 pessoas</option>
                          <option value="6-15">6 a 15 pessoas</option>
                          <option value="16-50">16 a 50 pessoas</option>
                          <option value="50+">Mais de 50</option>
                        </select>
                        {errors.teamSize && <p className="text-[11px] text-destructive">{errors.teamSize}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="monthlyRevenue" className="text-xs font-medium">Faturamento mensal médio</Label>
                        <Input
                          id="monthlyRevenue"
                          placeholder="Ex: R$ 50.000, R$ 200.000..."
                          value={formData.monthlyRevenue}
                          onChange={e => handleChange("monthlyRevenue", e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="currentTools" className="text-xs font-medium">Ferramentas que usa atualmente (se houver)</Label>
                      <Input
                        id="currentTools"
                        placeholder="HubSpot, RD Station, planilhas, nenhuma..."
                        value={formData.currentTools}
                        onChange={e => handleChange("currentTools", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="objective" className="text-xs font-medium">Objetivo com a Wiize *</Label>
                      <Textarea
                        id="objective"
                        placeholder="Descreva seus desafios atuais e o resultado esperado..."
                        rows={3}
                        value={formData.objective}
                        onChange={e => handleChange("objective", e.target.value)}
                        className={`text-sm resize-none ${errors.objective ? "border-destructive" : ""}`}
                      />
                      {errors.objective && <p className="text-[11px] text-destructive">{errors.objective}</p>}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full mt-2"
                      disabled={loading || !isFormValid}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Enviar solicitação
                        </>
                      )}
                    </Button>

                    {!isFormValid && (
                      <p className="text-[11px] text-center text-muted-foreground/70">
                        Preencha todos os campos obrigatórios para habilitar o envio.
                      </p>
                    )}

                    <p className="text-[10px] text-center text-muted-foreground pt-1">
                      Ao enviar, você concorda com nossos{" "}
                      <a href="/terms" className="text-primary hover:underline">Termos</a>{" "}
                      e{" "}
                      <a href="/privacy" className="text-primary hover:underline">Privacidade</a>.
                    </p>
                  </form>
                </div>
              </div>

              {/* Benefits mobile */}
              <div className="lg:hidden mt-8 grid grid-cols-2 gap-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-border/30 bg-card/20">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/[0.08]">
                      <b.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-[11px] leading-tight">{b.title}</p>
                      <p className="text-muted-foreground text-[10px] mt-0.5">{b.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default EnterpriseContact;
