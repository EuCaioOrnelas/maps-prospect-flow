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
  Lock,
  Settings,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CompanyProfileOnboarding } from "@/components/opportunities/CompanyProfileOnboarding";
import { IdealAudienceMismatchBanner } from "@/components/opportunities/IdealAudienceMismatchBanner";
import { hasSDRAccess } from "@/lib/planAccess";
import { clearAutoApproachPrefs } from "@/lib/autoApproachPrefs";

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
  const { user, profile, refreshProfile, accountOwnerId } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");

  const [phase, setPhase] = useState<Phase>("idle");
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
      .or(`owner_user_id.eq.${accountOwnerId || user.id},user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCompanyProfile(data));
  }, [user, accountOwnerId]);

  const canSubmit = useMemo(
    () => query.trim().length >= 2 && !isBusy,
    [query, isBusy],
  );

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
    setPhase("searching");
    clearAutoApproachPrefs();

    try {
      const { data, error } = await supabase.functions.invoke("search-leads-web", {
        body: {
          query: query.trim(),
          location: location.trim() || undefined,
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
      await refreshProfile();

      const saved = payload?.summary?.saved || 0;
      setSummary(payload.summary);
      setPhase("done");

      toast({
        title: "Busca concluída!",
        description: `${saved} empresas encontradas. Abrindo a Gestão de Oportunidades...`,
      });

      if (saved > 0) {
        const params = new URLSearchParams({ source: "web" });
        if (payload.searchQuery) params.set("q", payload.searchQuery);
        navigate(`/oportunidades/gestao?${params.toString()}`, { state: { justSearched: true } });
      }
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
                <div className="text-center mb-8 sm:mb-12 relative">
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
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                    <Globe size={18} className="text-primary" />
                    <span className="text-sm font-medium text-primary">Oportunidades Web com IA</span>
                  </div>
                  <h1 className="mb-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                    <span className="text-foreground">Encontre oportunidades pela </span>
                     <span className="text-shimmer-highlight">Web</span>
                  </h1>
                  <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
                    Encontramos o máximo de sites empresariais válidos e extraímos os contatos públicos disponíveis
                  </p>
                  {companyProfile && (
                    <div className="mt-3 sm:hidden">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCompanyOnboarding(true)}>
                        <Settings size={14} />
                        Editar Perfil
                      </Button>
                    </div>
                  )}
                </div>

                {companyProfile && (
                  <div className="mb-6">
                    <IdealAudienceMismatchBanner
                      accountOwnerId={accountOwnerId}
                      onEditProfile={() => setShowCompanyOnboarding(true)}
                    />
                  </div>
                )}

                <div className="relative mb-10 w-full min-w-0">
                  <div className="pointer-events-none absolute inset-x-8 -inset-y-3 -z-10 rounded-panel bg-primary/5 blur-3xl" />
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleSearch();
                    }}
                    className="w-full min-w-0 overflow-hidden rounded-panel border border-border/80 bg-card p-5 shadow-card sm:p-8"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mb-6 pb-6 border-b border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Target size={16} className="text-primary" />
                        </div>
                        <span>Sites empresariais</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Sparkles size={16} className="text-primary" />
                        </div>
                        <span>Contatos verificados</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Globe size={16} className="text-primary" />
                        </div>
                         <span>Busca via Search</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 mb-6 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Globe size={18} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Prospecção por sites no Google</p>
                        <p className="text-xs text-muted-foreground">
                          Buscamos o máximo de sites próprios e removemos redes sociais, marketplaces, diretórios e duplicidades.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="query" className="flex items-center gap-2 text-sm font-medium">
                        <Search size={14} className="text-primary" />
                        O que você quer buscar
                      </Label>
                      <Input
                        id="query"
                        placeholder='Ex: clínicas odontológicas em Maringá PR'
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isBusy}
                        className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground/70">
                        Escreva como pesquisaria no Google. É o único campo obrigatório.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2 text-sm font-medium">
                        <MapPin size={14} className="text-primary" />
                        Localização{" "}
                        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id="location"
                        placeholder="Ex: Maringa, State of Parana, Brazil"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={isBusy}
                        className="h-12 sm:h-14 bg-secondary/50 border-border/50 text-base placeholder:text-muted-foreground/60 focus:border-primary/50 transition-colors"
                      />
                      <p className="text-xs text-muted-foreground/70">
                        Usada para simular a busca a partir dessa região. Se não for reconhecida, buscamos sem ela.
                      </p>
                    </div>
                    </div>


                    <Button
                    type="submit"
                    className="w-full h-14 text-base font-semibold"
                    size="lg"
                    variant="hero"
                    disabled={!canSubmit}
                  >
                    {isBusy ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Analisando sites e contatos...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Buscar Oportunidades
                      </>
                    )}
                    </Button>

                    {errorText && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>{errorText}</span>
                    </div>
                    )}
                  </form>
                </div>

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

                {phase === "idle" && !summary && (
                  <div className="text-center py-12 sm:py-20">
                    <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/10">
                      <Globe size={40} className="text-primary" />
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold mb-3">Pronto para prospectar pela web?</h3>
                    <p className="text-muted-foreground max-w-md mx-auto text-base">
                      Informe o nicho, a localização e, se quiser, uma especialidade para encontrarmos o máximo de sites empresariais válidos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {user && (
        <CompanyProfileOnboarding
          open={showCompanyOnboarding}
          userId={user.id}
          initialData={companyProfile}
          onClose={() => setShowCompanyOnboarding(false)}
          onComplete={(p: any) => {
            setCompanyProfile(p);
            setShowCompanyOnboarding(false);
          }}
        />
      )}
    </SidebarProvider>
  );
};

export default ProspeccaoWeb;
