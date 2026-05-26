import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PasswordStrength, isPasswordStrong } from "@/components/ui/password-strength";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, ArrowLeft, Check, Sparkles, Wallet, TrendingUp, Megaphone,
  Target, Users, ShieldCheck, Upload, X, FileText, Loader2, CheckCircle2, ExternalLink,
  AlertCircle, Camera, ImageIcon,
} from "lucide-react";
import {
  maskCPF, maskCNPJ, maskCEP, maskPhone, isValidCPF, isValidCNPJ,
  onlyDigits, BR_STATES,
} from "@/lib/brMasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import wiizeLogo from "@/assets/logo-icon-new.png";

const STORAGE_KEY = "wiize_partner_application_draft_v1";
const MIN_CHARS = {
  reason_to_be_partner: 30,
  reason_to_be_approved: 30,
  how_would_sell: 30,
  differential: 20,
  results_90_days: 20,
} as const;

const STEPS = [
  "Identificação",
  "Acesso",
  "Perfil",
  "Audiência",
  "Parceria",
  "Sobre você",
  "Documentos",
  "Termos",
];

const benefits = [
  { icon: Wallet, title: "Comissão recorrente até 24 meses", desc: "Receba todo mês enquanto seu indicado for cliente." },
  { icon: TrendingUp, title: "Níveis até 25%", desc: "Quanto mais vendas, maior sua comissão." },
  { icon: Megaphone, title: "Materiais prontos", desc: "Banners, copies e roteiros validados." },
  { icon: Target, title: "Atribuição last-click 2 anos", desc: "A venda continua sua mesmo se demorar a fechar." },
  { icon: Users, title: "Painel exclusivo", desc: "Cliques, leads, vendas e comissões em tempo real." },
  { icon: ShieldCheck, title: "Saque a partir de R$ 100", desc: "Pix em até 5 dias úteis após aprovação." },
];

const profileOptions = [
  { id: "influencer", label: "Influenciador" },
  { id: "agency", label: "Agência de marketing" },
  { id: "freelancer", label: "Freelancer" },
  { id: "consultant", label: "Consultor comercial" },
  { id: "automation", label: "Especialista em automação" },
  { id: "reseller", label: "Revendedor SaaS" },
  { id: "wiize_client", label: "Cliente atual da Wiize" },
  { id: "tech_company", label: "Empresa de tecnologia" },
  { id: "other", label: "Outro" },
];

const yearsOptions = [
  { id: "beginner", label: "Iniciante" },
  { id: "1-2", label: "1-2 anos" },
  { id: "3-5", label: "3-5 anos" },
  { id: "5+", label: "5+ anos" },
];

const channelOptions = [
  "Conteúdo orgânico", "YouTube", "Instagram", "TikTok", "Tráfego pago",
  "Base de clientes própria", "Agência / carteira de clientes", "Eventos",
  "Indicação direta", "Revenda consultiva", "Networking", "Outro",
];

const docTypes = [
  { key: "id_doc", label: "Documento pessoal (RG ou CNH)", required: true, hint: "Frente e verso legíveis" },
  { key: "cnpj_card", label: "Cartão CNPJ", required: false, requiredIfCnpj: true, hint: "Obrigatório se você preencheu CNPJ" },
  { key: "selfie", label: "Selfie segurando o documento", required: true, hint: "Segure o documento próximo ao rosto, com o rosto visível" },
  { key: "address_proof", label: "Comprovante de endereço (opcional)", required: false, hint: "Conta de luz, água ou internet recente" },
];

interface FormState {
  // 1
  full_name: string; company_name: string; cpf: string; cnpj: string;
  email: string; phone: string; phone_secondary: string;
  country: string; state: string; city: string; address: string; postal_code: string;
  // 2
  access_email: string; password: string; password_confirm: string;
  // 3
  profile: string; years_in_market: string; has_team: string;
  current_clients_count: string;
  // 4
  instagram_url: string; youtube_url: string; tiktok_url: string;
  linkedin_url: string; website_url: string; community_url: string;
  audience_size: string; monthly_leads_estimate: string;
  // 5
  promotion_channels: string[]; expected_monthly_referrals: string;
  promoted_other_softwares: string; other_softwares_details: string;
  // 6
  reason_to_be_partner: string; reason_to_be_approved: string;
  how_would_sell: string; differential: string; results_90_days: string;
  // 7
  documents: Array<{ type: string; url: string; filename: string; size: number; path: string }>;
  // 8
  terms_accepted: boolean; info_accuracy_confirmed: boolean; contact_authorized: boolean;
  // honeypot
  website: string;
}

const initialState: FormState = {
  full_name: "", company_name: "", cpf: "", cnpj: "",
  email: "", phone: "", phone_secondary: "",
  country: "BR", state: "", city: "", address: "", postal_code: "",
  access_email: "", password: "", password_confirm: "",
  profile: "", years_in_market: "", has_team: "",
  current_clients_count: "",
  instagram_url: "", youtube_url: "", tiktok_url: "",
  linkedin_url: "", website_url: "", community_url: "",
  audience_size: "", monthly_leads_estimate: "",
  promotion_channels: [], expected_monthly_referrals: "",
  promoted_other_softwares: "", other_softwares_details: "",
  reason_to_be_partner: "", reason_to_be_approved: "",
  how_would_sell: "", differential: "", results_90_days: "",
  documents: [],
  terms_accepted: false, info_accuracy_confirmed: false, contact_authorized: false,
  website: "",
};

export default function PartnersApply() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadSession] = useState(() => crypto.randomUUID());
  const [docDialog, setDocDialog] = useState<{ key: string; label: string } | null>(null);

  // Auto-sync access email with main email if empty
  useEffect(() => {
    if (form.email && !form.access_email) {
      setForm((p) => ({ ...p, access_email: form.email }));
    }
  }, [form.email]);

  // --- LocalStorage persistence (everything EXCEPT senha) ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        setForm((p) => ({ ...p, ...saved, password: "", password_confirm: "" }));
        if (typeof saved.__step === "number") setStep(saved.__step);
        if (saved.__started) setStarted(true);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (submitted) return;
    try {
      const { password, password_confirm, website, ...safe } = form;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...safe, __step: step, __started: started })
      );
    } catch { /* ignore quota */ }
  }, [form, step, started, submitted]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k as string]) setErrors((e) => { const c = { ...e }; delete c[k as string]; return c; });
  };

  const validateStep = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!form.full_name.trim() || form.full_name.trim().length < 3) e.full_name = "Nome completo obrigatório";
      if (!form.cpf || !isValidCPF(form.cpf)) e.cpf = "CPF inválido";
      if (form.cnpj && !isValidCNPJ(form.cnpj)) e.cnpj = "CNPJ inválido";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
      if (onlyDigits(form.phone).length < 10) e.phone = "WhatsApp inválido";
      if (!form.state) e.state = "Estado obrigatório";
      if (!form.city.trim()) e.city = "Cidade obrigatória";
      if (form.postal_code && onlyDigits(form.postal_code).length !== 8) e.postal_code = "CEP inválido";
    }
    if (s === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.access_email)) e.access_email = "E-mail de acesso inválido";
      if (!isPasswordStrong(form.password)) e.password = "Senha muito fraca";
      if (form.password !== form.password_confirm) e.password_confirm = "Senhas não conferem";
    }
    if (s === 2) {
      if (!form.profile) e.profile = "Selecione um perfil";
      if (!form.years_in_market) e.years_in_market = "Informe sua experiência";
      if (!form.has_team) e.has_team = "Informe se possui equipe";
    }
    if (s === 4) {
      if (form.promotion_channels.length === 0) e.promotion_channels = "Selecione ao menos um canal";
      if (!form.expected_monthly_referrals || parseInt(form.expected_monthly_referrals) < 1)
        e.expected_monthly_referrals = "Informe uma estimativa";
      if (!form.promoted_other_softwares) e.promoted_other_softwares = "Responda esta pergunta";
    }
    if (s === 5) {
      const check = (field: keyof typeof MIN_CHARS, label: string) => {
        const len = (form[field] as string).trim().length;
        const min = MIN_CHARS[field];
        if (len < min) {
          e[field] = len === 0
            ? `Campo obrigatório — escreva ao menos ${min} caracteres sobre ${label}.`
            : `Faltam ${min - len} caracteres (mínimo ${min}). Você escreveu apenas ${len}.`;
        }
      };
      check("reason_to_be_partner", "seu interesse em ser parceiro");
      check("reason_to_be_approved", "por que você merece ser aprovado");
      check("how_would_sell", "como pretende vender a Wiize");
      check("differential", "seu diferencial");
      check("results_90_days", "resultados esperados em 90 dias");
    }
    if (s === 6) {
      const hasDoc = (key: string) => form.documents.some((d) => d.type === key);
      if (!hasDoc("id_doc")) e.id_doc = "Documento pessoal (RG ou CNH) é obrigatório.";
      if (form.cnpj && onlyDigits(form.cnpj).length === 14 && !hasDoc("cnpj_card")) {
        e.cnpj_card = "Como você preencheu o CNPJ, o Cartão CNPJ é obrigatório.";
      }
      if (!hasDoc("selfie")) e.selfie = "Selfie segurando o documento é obrigatória.";
    }
    if (s === 7) {
      if (!form.terms_accepted) e.terms_accepted = "Aceite os termos";
      if (!form.info_accuracy_confirmed) e.info_accuracy_confirmed = "Confirme a veracidade";
      if (!form.contact_authorized) e.contact_authorized = "Autorize o contato";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validateStep(step)) {
      toast({ title: "Verifique os campos", description: "Há informações pendentes nesta etapa.", variant: "destructive" });
      return;
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const prev = () => {
    if (step > 0) { setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const toggleChannel = (ch: string) => {
    const list = form.promotion_channels.includes(ch)
      ? form.promotion_channels.filter((c) => c !== ch)
      : [...form.promotion_channels, ch];
    set("promotion_channels", list);
  };

  const handleFileUpload = async (file: File, docType: string) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Limite de 10 MB.", variant: "destructive" });
      return;
    }
    setUploadingDoc(docType);
    try {
      const { data: signed, error: signedErr } = await supabase.functions.invoke("partner-application-upload-url", {
        body: { filename: file.name, size: file.size, application_session: uploadSession },
      });
      if (signedErr || !signed?.signed_url) throw new Error("Falha ao gerar URL de upload");

      const uploadRes = await fetch(signed.signed_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!uploadRes.ok) throw new Error("Upload falhou");

      const newDoc = { type: docType, url: signed.path, filename: file.name, size: file.size, path: signed.path };
      const filtered = form.documents.filter((d) => d.type !== docType);
      set("documents", [...filtered, newDoc]);
      toast({ title: "Arquivo enviado", description: file.name });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  const removeDoc = (docType: string) => {
    set("documents", form.documents.filter((d) => d.type !== docType));
  };

  const handleSubmit = async () => {
    if (!validateStep(7)) return;
    setSubmitting(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        company_name: form.company_name.trim() || undefined,
        cpf: onlyDigits(form.cpf),
        cnpj: form.cnpj ? onlyDigits(form.cnpj) : undefined,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        phone_secondary: form.phone_secondary.trim() || undefined,
        country: form.country,
        state: form.state,
        city: form.city.trim(),
        address: form.address.trim() || undefined,
        postal_code: form.postal_code ? onlyDigits(form.postal_code) : undefined,
        access_email: form.access_email.trim().toLowerCase(),
        password: form.password,
        profile: form.profile,
        years_in_market: form.years_in_market,
        has_team: form.has_team === "yes",
        current_clients_count: form.current_clients_count ? parseInt(form.current_clients_count) : undefined,
        instagram_url: form.instagram_url.trim() || undefined,
        youtube_url: form.youtube_url.trim() || undefined,
        tiktok_url: form.tiktok_url.trim() || undefined,
        linkedin_url: form.linkedin_url.trim() || undefined,
        website_url: form.website_url.trim() || undefined,
        community_url: form.community_url.trim() || undefined,
        audience_size: form.audience_size.trim() || undefined,
        monthly_leads_estimate: form.monthly_leads_estimate.trim() || undefined,
        promotion_channels: form.promotion_channels,
        expected_monthly_referrals: form.expected_monthly_referrals
          ? parseInt(form.expected_monthly_referrals) : undefined,
        promoted_other_softwares: form.promoted_other_softwares === "yes",
        other_softwares_details: form.other_softwares_details.trim() || undefined,
        reason_to_be_partner: form.reason_to_be_partner.trim(),
        reason_to_be_approved: form.reason_to_be_approved.trim(),
        how_would_sell: form.how_would_sell.trim(),
        differential: form.differential.trim(),
        results_90_days: form.results_90_days.trim(),
        documents: form.documents.map((d) => ({ type: d.type, url: d.path, filename: d.filename, size: d.size })),
        terms_accepted: form.terms_accepted,
        info_accuracy_confirmed: form.info_accuracy_confirmed,
        contact_authorized: form.contact_authorized,
        utm_source: params.get("utm_source") || undefined,
        utm_medium: params.get("utm_medium") || undefined,
        utm_campaign: params.get("utm_campaign") || undefined,
        source: "landing_partners_apply",
        website: form.website,
      };

      const { data, error } = await supabase.functions.invoke("submit-partner-application", { body: payload });
      if (error) {
        // Tenta extrair mensagem do FunctionsHttpError
        let msg = "Não foi possível enviar.";
        try {
          const ctx = (error as any).context;
          if (ctx?.json) msg = ctx.json.error || msg;
          else if (ctx?.body) {
            const parsed = typeof ctx.body === "string" ? JSON.parse(ctx.body) : ctx.body;
            msg = parsed?.error || msg;
          }
        } catch { /* ignore */ }
        toast({ title: "Erro ao enviar", description: msg, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      if (!data?.success) {
        toast({ title: "Erro ao enviar", description: data?.error || "Tente novamente.", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================ SUCCESS SCREEN ============================
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-6">
        <Helmet><title>Candidatura recebida — Wiize Partners</title></Helmet>
        <div className="max-w-xl w-full text-center space-y-6 bg-card border border-border rounded-3xl p-10 shadow-elegant">
          <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Recebemos sua candidatura!</h1>
          <p className="text-muted-foreground leading-relaxed">
            Nossa equipe vai analisar suas informações com cuidado e responderemos por e-mail
            em até <strong className="text-foreground">5 dias úteis</strong>.
          </p>
          <div className="bg-muted/40 rounded-2xl p-4 text-sm text-left">
            <div className="font-semibold mb-2">Próximos passos</div>
            <ul className="space-y-1.5 text-muted-foreground">
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Você receberá um e-mail confirmando o recebimento</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Análise interna em até 5 dias úteis</li>
              <li className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Se aprovado, receberá login e senha temporária</li>
            </ul>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={() => navigate("/")}>Voltar ao site</Button>
            <Button onClick={() => navigate("/partners/login")}>Acessar portal</Button>
          </div>
        </div>
      </div>
    );
  }

  // ============================ LANDING (pre-form) ============================
  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
        <Helmet>
          <title>Torne-se Parceiro Wiize Partners</title>
          <meta name="description" content="Indique clientes, monetize sua audiência e receba comissões recorrentes como parceiro Wiize Partners." />
        </Helmet>

        {/* Nav */}
        <nav className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={wiizeLogo} alt="Wiize" className="h-8 w-8" />
              <span className="font-semibold text-lg">Wiize Partners</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/partners/login" className="text-sm text-muted-foreground hover:text-foreground">
                Já sou parceiro
              </Link>
              <Button onClick={() => setStarted(true)} size="sm">Candidatar-se</Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Programa Oficial de Parceiros
          </div>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto leading-[1.05]">
            Torne-se <span className="text-primary">Parceiro Wiize Partners</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Indique clientes, monetize sua audiência ou ofereça Wiize aos seus clientes
            e receba comissões recorrentes por até 24 meses.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="xl" onClick={() => setStarted(true)} className="gap-2">
              Quero me candidatar <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link to="/parceiros">Ver como funciona</Link>
            </Button>
          </div>
        </section>

        {/* Benefits */}
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Por que ser parceiro Wiize Partners</h2>
            <p className="text-muted-foreground mt-3">Tudo que você precisa para gerar receita recorrente</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <div key={i} className="group bg-card border border-border rounded-2xl p-6 transition-all duration-300 hover:shadow-elegant">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[8deg]">
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold mb-1.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl p-10">
            <h2 className="text-3xl font-semibold tracking-tight">Pronto para começar?</h2>
            <p className="text-muted-foreground mt-3 mb-8">
              O processo leva cerca de 7 minutos. Análise em até 5 dias úteis.
            </p>
            <Button size="xl" onClick={() => setStarted(true)} className="gap-2">
              Iniciar candidatura <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
          © Wiize · <Link to="/privacy" className="hover:text-foreground">Privacidade</Link> · <Link to="/terms" className="hover:text-foreground">Termos</Link>
        </footer>
      </div>
    );
  }

  // ============================ FORM ============================
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Helmet>
        <title>Candidatura — Wiize Partners</title>
      </Helmet>

      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link to="/" className="flex items-center gap-2">
              <img src={wiizeLogo} alt="Wiize" className="h-7 w-7" />
              <span className="font-semibold">Wiize Partners</span>
            </Link>
            <span className="text-xs text-muted-foreground">
              Etapa {step + 1} de {STEPS.length} · {STEPS[step]}
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="bg-card border border-border rounded-3xl p-6 md:p-10 shadow-sm">
          {/* Honeypot */}
          <input
            type="text" name="website" tabIndex={-1} autoComplete="off"
            value={form.website} onChange={(e) => set("website", e.target.value)}
            style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0 }}
            aria-hidden
          />

          {/* STEP 0 — IDENTIFICAÇÃO */}
          {step === 0 && (
            <div className="space-y-5">
              <Header title="Quem é você?" subtitle="Vamos começar com seus dados pessoais." />
              <Field label="Nome completo" error={errors.full_name} required>
                <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Como aparece no documento" />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="CPF" error={errors.cpf} required>
                  <Input value={form.cpf} onChange={(e) => set("cpf", maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
                </Field>
                <Field label="CNPJ (opcional)" error={errors.cnpj}>
                  <Input value={form.cnpj} onChange={(e) => set("cnpj", maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" />
                </Field>
              </div>
              <Field label="Nome da empresa (opcional)">
                <Input value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="Razão social ou marca" />
              </Field>
              <Field label="E-mail principal" error={errors.email} required>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" />
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="WhatsApp" error={errors.phone} required>
                  <Input value={form.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" />
                </Field>
                <Field label="Telefone secundário (opcional)">
                  <Input value={form.phone_secondary} onChange={(e) => set("phone_secondary", maskPhone(e.target.value))} placeholder="(00) 00000-0000" inputMode="tel" />
                </Field>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="País" required>
                  <Select value={form.country} onValueChange={(v) => set("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="BR">Brasil</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Estado" error={errors.state} required>
                  <Select value={form.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Cidade" error={errors.city} required>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Sua cidade" />
                </Field>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="CEP" error={errors.postal_code}>
                  <Input value={form.postal_code} onChange={(e) => set("postal_code", maskCEP(e.target.value))} placeholder="00000-000" inputMode="numeric" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Endereço completo">
                    <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número, complemento" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1 — ACESSO */}
          {step === 1 && (
            <div className="space-y-5">
              <Header title="Acesso ao portal" subtitle="Crie suas credenciais para acessar o portal de parceiros após aprovação." />
              <Field label="E-mail de acesso" error={errors.access_email} required>
                <Input type="email" value={form.access_email} onChange={(e) => set("access_email", e.target.value)} placeholder="acesso@email.com" />
              </Field>
              <Field label="Criar senha" error={errors.password} required>
                <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Mínimo 8 caracteres" />
                <PasswordStrength password={form.password} />
              </Field>
              <Field label="Confirmar senha" error={errors.password_confirm} required>
                <Input type="password" value={form.password_confirm} onChange={(e) => set("password_confirm", e.target.value)} placeholder="Repita a senha" />
              </Field>
              <div className="bg-muted/40 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Dica de segurança:</strong> sua senha será aplicada apenas após a aprovação.
                Se aprovado, você receberá uma senha temporária por e-mail e poderá alterá-la no primeiro login.
              </div>
            </div>
          )}

          {/* STEP 2 — PERFIL */}
          {step === 2 && (
            <div className="space-y-6">
              <Header title="Perfil profissional" subtitle="Conte-nos como você atua no mercado." />
              <Field label="Qual melhor define você?" error={errors.profile} required>
                <div className="grid sm:grid-cols-2 gap-2">
                  {profileOptions.map((opt) => (
                    <button
                      key={opt.id} type="button"
                      onClick={() => set("profile", opt.id)}
                      className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                        form.profile === opt.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Há quantos anos atua no mercado?" error={errors.years_in_market} required>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {yearsOptions.map((y) => (
                    <button
                      key={y.id} type="button" onClick={() => set("years_in_market", y.id)}
                      className={`px-3 py-2.5 rounded-xl border text-sm transition-all ${
                        form.years_in_market === y.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 text-muted-foreground"
                      }`}
                    >
                      {y.label}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Possui equipe?" error={errors.has_team} required>
                  <RadioGroup value={form.has_team} onValueChange={(v) => set("has_team", v)} className="flex gap-6 pt-1">
                    <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="team-y" /><Label htmlFor="team-y" className="cursor-pointer">Sim</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="no" id="team-n" /><Label htmlFor="team-n" className="cursor-pointer">Não</Label></div>
                  </RadioGroup>
                </Field>
                <Field label="Número de clientes atuais">
                  <Input type="number" min="0" value={form.current_clients_count}
                    onChange={(e) => set("current_clients_count", e.target.value)} placeholder="Ex: 12" />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 3 — AUDIÊNCIA */}
          {step === 3 && (
            <div className="space-y-5">
              <Header title="Audiência e canais" subtitle="Quanto mais informações, melhor avaliamos seu potencial. Todos opcionais." />
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Instagram URL"><Input value={form.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} placeholder="https://instagram.com/seuperfil" /></Field>
                <Field label="YouTube URL"><Input value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} placeholder="https://youtube.com/@canal" /></Field>
                <Field label="TikTok URL"><Input value={form.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@perfil" /></Field>
                <Field label="LinkedIn URL"><Input value={form.linkedin_url} onChange={(e) => set("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/voce" /></Field>
                <Field label="Site oficial"><Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="https://seusite.com" /></Field>
                <Field label="Comunidade / Telegram / Discord"><Input value={form.community_url} onChange={(e) => set("community_url", e.target.value)} placeholder="Link da comunidade" /></Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Tamanho médio da audiência">
                  <Input value={form.audience_size} onChange={(e) => set("audience_size", e.target.value)} placeholder="Ex: 25.000 seguidores" />
                </Field>
                <Field label="Média de leads mensais gerados">
                  <Input value={form.monthly_leads_estimate} onChange={(e) => set("monthly_leads_estimate", e.target.value)} placeholder="Ex: 200 leads/mês" />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 4 — PARCERIA */}
          {step === 4 && (
            <div className="space-y-6">
              <Header title="Modelo de parceria" subtitle="Como você pretende promover a Wiize?" />
              <Field label="Canais de promoção" error={errors.promotion_channels} required>
                <div className="grid sm:grid-cols-2 gap-2">
                  {channelOptions.map((ch) => {
                    const active = form.promotion_channels.includes(ch);
                    return (
                      <button
                        key={ch} type="button" onClick={() => toggleChannel(ch)}
                        className={`flex items-center gap-2 text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                          active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 text-muted-foreground"
                        }`}
                      >
                        <div className={`h-4 w-4 rounded flex items-center justify-center border ${active ? "bg-primary border-primary" : "border-border"}`}>
                          {active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Quantos clientes acredita conseguir indicar por mês?" error={errors.expected_monthly_referrals} required>
                <Input type="number" min="1" value={form.expected_monthly_referrals}
                  onChange={(e) => set("expected_monthly_referrals", e.target.value)} placeholder="Ex: 5" />
              </Field>
              <Field label="Já promoveu outros softwares antes?" error={errors.promoted_other_softwares} required>
                <RadioGroup value={form.promoted_other_softwares} onValueChange={(v) => set("promoted_other_softwares", v)} className="flex gap-6 pt-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="psw-y" /><Label htmlFor="psw-y" className="cursor-pointer">Sim</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="no" id="psw-n" /><Label htmlFor="psw-n" className="cursor-pointer">Não</Label></div>
                </RadioGroup>
              </Field>
              {form.promoted_other_softwares === "yes" && (
                <Field label="Quais softwares?">
                  <Textarea rows={3} value={form.other_softwares_details}
                    onChange={(e) => set("other_softwares_details", e.target.value)}
                    placeholder="Ex: ActiveCampaign, RD Station..." />
                </Field>
              )}
            </div>
          )}

          {/* STEP 5 — RESPOSTAS LIVRES */}
          {step === 5 && (
            <div className="space-y-5">
              <Header title="Conte mais sobre você" subtitle="Suas respostas nos ajudam a entender seu potencial. Seja direto e específico." />
              <LongField min={MIN_CHARS.reason_to_be_partner} label="Por que deseja ser parceiro da Wiize?" value={form.reason_to_be_partner} onChange={(v) => set("reason_to_be_partner", v)} error={errors.reason_to_be_partner} />
              <LongField min={MIN_CHARS.reason_to_be_approved} label="Por que a Wiize deveria aprovar sua candidatura?" value={form.reason_to_be_approved} onChange={(v) => set("reason_to_be_approved", v)} error={errors.reason_to_be_approved} />
              <LongField min={MIN_CHARS.how_would_sell} label="Como você venderia a Wiize?" value={form.how_would_sell} onChange={(v) => set("how_would_sell", v)} error={errors.how_would_sell} />
              <LongField min={MIN_CHARS.differential} label="O que diferencia você de outros parceiros?" value={form.differential} onChange={(v) => set("differential", v)} error={errors.differential} />
              <LongField min={MIN_CHARS.results_90_days} label="Quais resultados acredita conseguir nos próximos 90 dias?" value={form.results_90_days} onChange={(v) => set("results_90_days", v)} error={errors.results_90_days} />

            </div>
          )}

          {/* STEP 6 — DOCUMENTOS */}
          {step === 6 && (
            <div className="space-y-5">
              <Header
                title="Documentos"
                subtitle="Para garantir a segurança do programa, precisamos validar sua identidade. Aceitamos PDF, JPG, PNG ou WebP até 10 MB."
              />
              {docTypes.map((dt) => {
                const existing = form.documents.find((d) => d.type === dt.key);
                const isRequired = dt.required || (dt.requiredIfCnpj && !!form.cnpj && onlyDigits(form.cnpj).length === 14);
                const err = errors[dt.key];
                return (
                  <div
                    key={dt.key}
                    className={`border rounded-xl p-4 transition-colors ${
                      err ? "border-destructive/60 bg-destructive/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                          {dt.label}
                          {isRequired && <span className="text-destructive">*</span>}
                          {existing && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        </div>
                        {dt.hint && !existing && (
                          <div className="text-xs text-muted-foreground mt-0.5">{dt.hint}</div>
                        )}
                        {existing && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 truncate">
                            <FileText className="h-3 w-3 shrink-0" />
                            <span className="truncate">{existing.filename}</span>
                          </div>
                        )}
                      </div>
                      {existing ? (
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => removeDoc(dt.key)}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button" variant="outline" size="sm"
                          className="gap-1.5 shrink-0"
                          disabled={uploadingDoc === dt.key}
                          onClick={() => setDocDialog({ key: dt.key, label: dt.label })}
                        >
                          {uploadingDoc === dt.key
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando…</>
                            : <><Upload className="h-3.5 w-3.5" /> Enviar</>}
                        </Button>
                      )}
                    </div>
                    {err && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-destructive font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {err}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload source dialog (Câmera vs Galeria) */}
          <Dialog open={!!docDialog} onOpenChange={(o) => !o && setDocDialog(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Enviar {docDialog?.label}</DialogTitle>
                <DialogDescription>Escolha como deseja enviar o arquivo.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      const key = docDialog?.key;
                      setDocDialog(null);
                      if (f && key) handleFileUpload(f, key);
                    }}
                  />
                  <div className="border border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium">Tirar foto</div>
                    <div className="text-[11px] text-muted-foreground text-center">Câmera do dispositivo</div>
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      const key = docDialog?.key;
                      setDocDialog(null);
                      if (f && key) handleFileUpload(f, key);
                    }}
                  />
                  <div className="border border-border rounded-xl p-5 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5 transition-all">
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-medium">Galeria</div>
                    <div className="text-[11px] text-muted-foreground text-center">PDF, JPG, PNG, WebP</div>
                  </div>
                </label>
              </div>
            </DialogContent>
          </Dialog>

          {/* STEP 7 — TERMOS */}
          {step === 7 && (
            <div className="space-y-6">
              <Header title="Termos e finalização" subtitle="Última etapa — confirme as informações abaixo." />
              <ReviewSummary form={form} />
              <div className="space-y-3 pt-2">
                <CheckLine
                  checked={form.terms_accepted} onChange={(v) => set("terms_accepted", v)}
                  error={errors.terms_accepted}
                  label={<>Li e aceito os <Link to="/partners/terms" target="_blank" className="text-primary underline">Termos do Programa de Parceiros Wiize</Link></>}
                />
                <CheckLine
                  checked={form.info_accuracy_confirmed} onChange={(v) => set("info_accuracy_confirmed", v)}
                  error={errors.info_accuracy_confirmed}
                  label="Confirmo que todas as informações fornecidas são verdadeiras"
                />
                <CheckLine
                  checked={form.contact_authorized} onChange={(v) => set("contact_authorized", v)}
                  error={errors.contact_authorized}
                  label="Autorizo a equipe Wiize a entrar em contato comigo por e-mail e WhatsApp"
                />
              </div>
            </div>
          )}

          {/* NAV */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            {step > 0 ? (
              <Button variant="outline" onClick={prev} disabled={submitting} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
            ) : <div />}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="gap-2 ml-auto">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} size="lg" className="gap-2 ml-auto">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <>Enviar candidatura <Check className="h-4 w-4" /></>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ HELPERS ============================
function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function Field({
  label, children, error, required,
}: { label: string; children: React.ReactNode; error?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function LongField({
  label, value, onChange, error, min,
}: { label: string; value: string; onChange: (v: string) => void; error?: string; min: number }) {
  const len = value.trim().length;
  const remaining = Math.max(0, min - len);
  const ok = len >= min;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label} <span className="text-destructive">*</span>
      </Label>
      <Textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sua resposta…"
        className={error ? "border-destructive focus-visible:ring-destructive/40" : ""}
      />
      <div className="flex items-center justify-between text-[11px]">
        <span className={ok ? "text-emerald-600 font-medium flex items-center gap-1" : "text-muted-foreground"}>
          {ok ? <><CheckCircle2 className="h-3 w-3" /> Mínimo atingido</> : `Faltam ${remaining} de ${min} caracteres`}
        </span>
        <span className="text-muted-foreground">{len} caracteres</span>
      </div>
      {error && (
        <div className="mt-1 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium flex items-start gap-1.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

function CheckLine({
  checked, onChange, label, error,
}: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
        <span className="text-sm leading-relaxed">{label}</span>
      </label>
      {error && <p className="text-xs text-destructive ml-7 mt-1">{error}</p>}
    </div>
  );
}

function ReviewSummary({ form }: { form: FormState }) {
  return (
    <div className="bg-muted/40 rounded-2xl p-5 text-sm space-y-2">
      <div className="font-semibold text-foreground mb-2">Resumo</div>
      <Row label="Nome" value={form.full_name} />
      <Row label="E-mail" value={form.email} />
      <Row label="WhatsApp" value={form.phone} />
      <Row label="Cidade/UF" value={`${form.city}${form.state ? "/" + form.state : ""}`} />
      <Row label="Perfil" value={profileOptions.find((p) => p.id === form.profile)?.label || "—"} />
      <Row label="Canais" value={form.promotion_channels.length ? `${form.promotion_channels.length} selecionados` : "—"} />
      <Row label="Documentos" value={`${form.documents.length} enviados`} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}
