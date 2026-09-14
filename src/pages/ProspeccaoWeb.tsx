import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  MapPin,
  Search,
  Loader2,
  Sparkles,
  Building2,
  Phone,
  Mail,
  Share2,
  CheckCircle2,
  AlertCircle,
  ListFilter,
  Brain,
  Lock,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
import { hasSDRAccess } from "@/lib/planAccess";

const RESULT_OPTIONS = [10, 20, 30, 50];

type Phase = "idle" | "searching" | "diagnosing" | "done";

interface SearchSummary {
  found: number;
  saved: number;
  withPhone: number;
  withWhatsApp: number;
  withEmail: number;
  withSocial: number;
}

const ProspeccaoWeb = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [extraTerm, setExtraTerm] = useState("");
  const [count, setCount] = useState<number>(10);

  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<SearchSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [showCompanyOnboarding, setShowCompanyOnboarding] = useState(false);
  const inFlight = useRef(false);

  const isBusy = phase === "searching" || phase === "diagnosing";
  const hasAccess = hasSDRAccess(profile);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("company_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCompanyProfile(data));
  }, [user]);

  const canSubmit = useMemo(
    () => niche.trim().length >= 2 && location.trim().length >= 2 && !isBusy,
    [niche, location, isBusy],
  );

  const runDiagnosis = async (leadIds: string[]) => {
    setPhase("diagnosing");
    let done = 0;
    for (const id of leadIds) {
      setStatusText(`Analisando empresa ${done + 1} de ${leadIds.length} com IA...`);
      try {
        await supabase.functions.invoke("score-opportunity", { body: { lead_id: id } });
      } catch (e) {
        console.error("[prospeccao-web] diagnóstico falhou", id, e);
      }
      done++;
      setProgress(Math.round((done / leadIds.length) * 100));
    }
  };

  const handleSearch = async () => {
    if (!canSubmit || inFlight.current) return;

    if (!companyProfile) {
      setShowCompanyOnboarding(true);
      toast({
        title: "Configure seu Perfil da Empresa",
        description: "Precisamos dessas informações para a IA analisar suas oportunidades.",
      });
      return;
    }

    inFlight.current = true;
    setErrorText(null);
    setSummary(null);
    setProgress(0);
    setPhase("searching");
    setStatusText("Procurando empresas com site na web...");

    try {
      const { data, error } = await supabase.functions.invoke("search-leads-web", {
        body: {
          niche: niche.trim(),
          location: location.trim(),
          extra_term: extraTerm.trim() || undefined,
          count,
        },
      });

      let payload: any = data;
      if (error) {
        const ctx = (error as { context?: Response }).context;
        payload = ctx ? await ctx.clone().json().catch(() => null) : null;
        if (!payload) throw new Error(error.message || "Erro ao buscar empresas");
      }

      if (payload?.error) {
        setPhase("idle");
        setErrorText(payload.message || payload.error);
        toast({
          title: "Não foi possível concluir a busca",
          description: payload.message || payload.error,
          variant: "destructive",
        });
        return;
      }

      setSearchQuery(payload.searchQuery || "");
      setStatusText(`${payload.summary.saved} empresas registradas. Iniciando diagnóstico...`);
      await refreshProfile();

      const leadIds: string[] = payload.leadIds || [];
      if (leadIds.length > 0) await runDiagnosis(leadIds);

      setSummary(payload.summary);
      setPhase("done");
      setStatusText("");
    } catch (e: any) {
      console.error("[prospeccao-web]", e);
      setPhase("idle");
      setErrorText(e?.message || "Erro inesperado ao buscar empresas.");
      toast({
        title: "Erro na busca",
        description: e?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      inFlight.current = false;
    }
  };

  const goToManagement = () => {
    const params = new URLSearchParams({ source: "web" });
    if (searchQuery) params.set("q", searchQuery);
    navigate(`/oportunidades/gestao?${params.toString()}`);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full bg-background relative overflow-x-hidden">
        <BackgroundGlow />
        <AppSidebar profile={profile} />

        <div className="flex-1 flex flex-col min-w-0 lg:pl-[72px]">
          <AppHeader profile={profile} />

          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
            {!hasAccess ? (
              <div className="max-w-2xl mx-auto mt-12">
                <div className="rounded-2xl border border-primary/30 bg-card/60 backdrop-blur p-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-[16px] bg-primary/10 border border-primary/20 mb-5">
                    <Lock size={24} className="text-primary" />
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3">
                    Prospecção Web não está inclusa no seu plano
                  </h1>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    A prospecção com IA é exclusiva do plano{" "}
                    <strong className="text-foreground">Growth IA</strong>.
                  </p>
                  <Button size="lg" variant="hero" onClick={() => navigate("/perfil?upgrade=growth")}>
                    Fazer upgrade para Growth IA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl min-w-0">
                {/* Cabeçalho */}
                <div className="text-center mb-8 relative">
                  {companyProfile && (
                    <div className="absolute right-0 top-0 hidden sm:block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => setShowCompanyOnboarding(true)}
                      >
                        <Settings size={14} />
                        Editar Perfil
                      </Button>
                    </div>
                  )}
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
                    <Globe size={18} className="text-primary" />
                    <span className="text-sm font-medium text-primary">Prospecção Web</span>
                  </div>
                  <h1 className="mb-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
                    <span className="text-foreground">Encontre empresas pelo </span>
                    <span className="text-shimmer-highlight">site delas</span>
                  </h1>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Buscamos empresas com presença na web, extraímos os contatos disponíveis no
                    site e enviamos tudo para a Gestão de Oportunidades com diagnóstico da IA.
                  </p>
                </div>

                {/* Formulário */}
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="niche" className="flex items-center gap-2">
                        <Building2 size={14} className="text-primary" />
                        Nicho ou segmento
                      </Label>
                      <Input
                        id="niche"
                        placeholder="Ex.: clínicas odontológicas"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin size={14} className="text-primary" />
                        Localização
                      </Label>
                      <Input
                        id="location"
                        placeholder="Ex.: Maringá - PR"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="extra" className="flex items-center gap-2">
                        <ListFilter size={14} className="text-primary" />
                        Termo adicional{" "}
                        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="extra"
                        placeholder="Ex.: implante dentário"
                        value={extraTerm}
                        onChange={(e) => setExtraTerm(e.target.value)}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Search size={14} className="text-primary" />
                        Quantidade de resultados
                      </Label>
                      <Select
                        value={String(count)}
                        onValueChange={(v) => setCount(Number(v))}
                        disabled={isBusy}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULT_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} empresas
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    className="w-full mt-5"
                    size="lg"
                    variant="hero"
                    disabled={!canSubmit}
                    onClick={handleSearch}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Buscar empresas na web
                      </>
                    )}
                  </Button>

                  {errorText && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errorText}</span>
                    </div>
                  )}
                </div>

                {/* Progresso */}
                {isBusy && (
                  <div className="rounded-2xl border border-border bg-card p-5 mb-6">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium">
                      {phase === "diagnosing" ? (
                        <Brain size={16} className="text-primary" />
                      ) : (
                        <Loader2 size={16} className="animate-spin text-primary" />
                      )}
                      {statusText}
                    </div>
                    <Progress value={phase === "diagnosing" ? progress : undefined} />
                  </div>
                )}

                {/* Resumo */}
                {phase === "done" && summary && (
                  <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={20} className="text-primary" />
                      <h2 className="font-display text-lg font-bold">Busca concluída</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: Building2, label: "Empresas", value: summary.saved },
                        { icon: Phone, label: "Com telefone", value: summary.withPhone },
                        { icon: Mail, label: "Com e-mail", value: summary.withEmail },
                        { icon: Share2, label: "Com redes", value: summary.withSocial },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-border bg-background p-3">
                          <s.icon size={16} className="text-primary mb-2" />
                          <p className="text-2xl font-bold leading-none">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-5" variant="hero" onClick={goToManagement}>
                      <Sparkles size={16} />
                      Ver oportunidades
                    </Button>
                  </div>
                )}

                {/* Como funciona */}
                {phase === "idle" && !summary && (
                  <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <h2 className="font-display text-lg font-bold mb-4">Como funciona</h2>
                    <ol className="space-y-3">
                      {[
                        "Você informa o nicho e a localização das empresas que quer encontrar.",
                        "Buscamos sites reais de empresas e descartamos redes sociais, marketplaces e diretórios.",
                        "Extraímos os contatos publicados no site: telefone, WhatsApp, e-mail, redes e endereço.",
                        "A IA analisa cada empresa e gera o diagnóstico e o potencial de oportunidade.",
                        "Tudo aparece na Gestão de Oportunidades com a origem WEB.",
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-muted-foreground mt-4">
                      A mensagem de abordagem só é liberada para empresas com telefone ou WhatsApp
                      encontrado.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <CompanyProfileOnboarding
        open={showCompanyOnboarding}
        onOpenChange={setShowCompanyOnboarding}
        onComplete={(p: any) => {
          setCompanyProfile(p);
          setShowCompanyOnboarding(false);
        }}
      />
    </SidebarProvider>
  );
};

export default ProspeccaoWeb;
