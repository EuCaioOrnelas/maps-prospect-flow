import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import { GuidedTourProvider } from "@/hooks/useGuidedTour";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { DashboardThemeProvider } from "@/contexts/ThemeContext";
import { lazyWithRetry } from "@/lib/runtimeRecovery";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PartnerTrackingProvider } from "@/components/partners/PartnerTrackingProvider";
import { PageVisitTracker } from "@/components/tracking/PageVisitTracker";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
const SignupChoosePlan = lazyWithRetry(() => import("./pages/SignupChoosePlan"), "SignupChoosePlan");
const SignupWithCard = lazyWithRetry(() => import("./pages/SignupWithCard"), "SignupWithCard");
import NotFound from "./pages/NotFound";
import Upgrade from "./pages/Upgrade";

// Lazy load all other pages
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"), "Dashboard");
const MainDashboard = lazyWithRetry(() => import("./pages/MainDashboard"), "MainDashboard");
const Admin = lazyWithRetry(() => import("./pages/Admin"), "Admin");
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"), "AdminDashboard");
const AdminLandingPages = lazyWithRetry(() => import("./pages/AdminLandingPages"), "AdminLandingPages");
const AdminAnnouncements = lazyWithRetry(() => import("./pages/AdminAnnouncements"), "AdminAnnouncements");
const LandingPage = lazyWithRetry(() => import("./pages/LandingPage"), "LandingPage");
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"), "ForgotPassword");
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"), "ResetPassword");
const Reports = lazyWithRetry(() => import("./pages/Reports"), "Reports");
const CRMComingSoon = lazyWithRetry(() => import("./pages/CRMComingSoon"), "CRMComingSoon");
const SharedReport = lazyWithRetry(() => import("./pages/SharedReport"), "SharedReport");
const WhatsAppCampaign = lazyWithRetry(() => import("./pages/WhatsAppCampaign"), "WhatsAppCampaign");
const MetaCampaigns = lazyWithRetry(() => import("./pages/MetaCampaigns"), "MetaCampaigns");
const UserInsights = lazyWithRetry(() => import("./pages/UserInsights"), "UserInsights");
const WhatsAppReports = lazyWithRetry(() => import("./pages/WhatsAppReports"), "WhatsAppReports");
const Terms = lazyWithRetry(() => import("./pages/Terms"), "Terms");
const Privacy = lazyWithRetry(() => import("./pages/Privacy"), "Privacy");
const RefundPolicy = lazyWithRetry(() => import("./pages/RefundPolicy"), "RefundPolicy");
const SecurityFAQ = lazyWithRetry(() => import("./pages/SecurityFAQ"), "SecurityFAQ");
const SendingGuidelines = lazyWithRetry(() => import("./pages/SendingGuidelines"), "SendingGuidelines");
const HelpCenter = lazyWithRetry(() => import("./pages/HelpCenter"), "HelpCenter");
const HelpCenterFAQ = lazyWithRetry(() => import("./pages/HelpCenterFAQ"), "HelpCenterFAQ");
const TourCompleto = lazyWithRetry(() => import("./pages/TourCompleto"), "TourCompleto");
const CheckoutSuccess = lazyWithRetry(() => import("./pages/CheckoutSuccess"), "CheckoutSuccess");
const CheckoutFailed = lazyWithRetry(() => import("./pages/CheckoutFailed"), "CheckoutFailed");
const CheckoutPix = lazyWithRetry(() => import("./pages/CheckoutPix"), "CheckoutPix");
const CheckoutCard = lazyWithRetry(() => import("./pages/CheckoutCard"), "CheckoutCard");
const RenewalSuccess = lazyWithRetry(() => import("./pages/RenewalSuccess"), "RenewalSuccess");
const Contact = lazyWithRetry(() => import("./pages/Contact"), "Contact");
const Profile = lazyWithRetry(() => import("./pages/Profile"), "Profile");
const CRM = lazyWithRetry(() => import("./pages/CRM"), "CRM");
const CRMScore = lazyWithRetry(() => import("./pages/CRMScore"), "CRMScore");
const Warming = lazyWithRetry(() => import("./pages/Warming"), "Warming");
const WarmingReports = lazyWithRetry(() => import("./pages/WarmingReports"), "WarmingReports");
const AIAgents = lazyWithRetry(() => import("./pages/AIAgents"), "AIAgents");
const AgentReports = lazyWithRetry(() => import("./pages/AgentReports"), "AgentReports");
const Consultoria = lazyWithRetry(() => import("./pages/Consultoria"), "Consultoria");
const ThankYou = lazyWithRetry(() => import("./pages/ThankYou"), "ThankYou");
const ProductionTests = lazyWithRetry(() => import("./pages/ProductionTests"), "ProductionTests");
const UpgradePromo = lazyWithRetry(() => import("./pages/UpgradePromo"), "UpgradePromo");
const AdminEmailTests = lazyWithRetry(() => import("./pages/AdminEmailTests"), "AdminEmailTests");
const AdminTrialAutomation = lazyWithRetry(() => import("./pages/AdminTrialAutomation"), "AdminTrialAutomation");
const AdminUserScoring = lazyWithRetry(() => import("./pages/AdminUserScoring"), "AdminUserScoring");
const AdminEmailFlows = lazyWithRetry(() => import("./pages/AdminEmailFlows"), "AdminEmailFlows");
const AdminEmailFlowEditor = lazyWithRetry(() => import("./pages/AdminEmailFlowEditor"), "AdminEmailFlowEditor");
const AdminPixBilling = lazyWithRetry(() => import("./pages/AdminPixBilling"), "AdminPixBilling");
const CancellationFeedback = lazyWithRetry(() => import("./pages/CancellationFeedback"), "CancellationFeedback");
const MetaAppDocumentation = lazyWithRetry(() => import("./pages/MetaAppDocumentation"), "MetaAppDocumentation");
const MetaApiGuide = lazyWithRetry(() => import("./pages/MetaApiGuide"), "MetaApiGuide");
const OpportunitiesManagement = lazyWithRetry(() => import("./pages/OpportunitiesManagement"), "OpportunitiesManagement");
const Chat = lazyWithRetry(() => import("./pages/Chat"), "Chat");
import { ChatComingSoonGate } from "./components/chat/ChatComingSoonGate";
const WhatsAppAutomations = lazyWithRetry(() => import("./pages/WhatsAppAutomations"), "WhatsAppAutomations");
const WhatsAppFlowEditor = lazyWithRetry(() => import("./pages/WhatsAppFlowEditor"), "WhatsAppFlowEditor");
const CreateFlowAI = lazyWithRetry(() => import("./pages/CreateFlowAI"), "CreateFlowAI");

// Meta Platforms module
const MetaDashboard = lazyWithRetry(() => import("./pages/meta/MetaDashboard"), "MetaDashboard");
const MetaCampanhas = lazyWithRetry(() => import("./pages/meta/MetaCampanhas"), "MetaCampanhas");
const MetaTemplates = lazyWithRetry(() => import("./pages/meta/MetaTemplates"), "MetaTemplates");
const MetaNumeros = lazyWithRetry(() => import("./pages/meta/MetaNumeros"), "MetaNumeros");

const MetaConfiguracoes = lazyWithRetry(() => import("./pages/meta/MetaConfiguracoes"), "MetaConfiguracoes");

const EnterpriseContact = lazyWithRetry(() => import("./pages/EnterpriseContact"), "EnterpriseContact");
const TrialExpired = lazyWithRetry(() => import("./pages/TrialExpired"), "TrialExpired");
const ManageSubscription = lazyWithRetry(() => import("./pages/ManageSubscription"), "ManageSubscription");
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"), "Onboarding");

// Admin sub-pages (lazy loaded)
const AdminKPIs = lazyWithRetry(() => import("./pages/admin/AdminKPIs"), "AdminKPIs");
const AdminAlertas = lazyWithRetry(() => import("./pages/admin/AdminAlertas"), "AdminAlertas");
const AdminOportunidadesUpgrade = lazyWithRetry(() => import("./pages/admin/AdminOportunidadesUpgrade"), "AdminOportunidadesUpgrade");
const AdminRelatorios = lazyWithRetry(() => import("./pages/admin/AdminRelatorios"), "AdminRelatorios");

const AdminAssinaturas = lazyWithRetry(() => import("./pages/admin/AdminAssinaturas"), "AdminAssinaturas");
const AdminMrrAudit = lazyWithRetry(() => import("./pages/admin/AdminMrrAudit"), "AdminMrrAudit");
const AdminChurn = lazyWithRetry(() => import("./pages/admin/AdminChurn"), "AdminChurn");
const AdminForecast = lazyWithRetry(() => import("./pages/admin/AdminForecast"), "AdminForecast");
const AdminUsuarios = lazyWithRetry(() => import("./pages/admin/AdminUsuarios"), "AdminUsuarios");
const AdminAtivacao = lazyWithRetry(() => import("./pages/admin/AdminAtivacao"), "AdminAtivacao");
const AdminRetencao = lazyWithRetry(() => import("./pages/admin/AdminRetencao"), "AdminRetencao");
const AdminIAAgentes = lazyWithRetry(() => import("./pages/admin/AdminIAAgentes"), "AdminIAAgentes");
const AdminIAPerformance = lazyWithRetry(() => import("./pages/admin/AdminIAPerformance"), "AdminIAPerformance");
const AdminIACustos = lazyWithRetry(() => import("./pages/admin/AdminIACustos"), "AdminIACustos");
const AdminAPIs = lazyWithRetry(() => import("./pages/admin/AdminAPIs"), "AdminAPIs");
const AdminProxies = lazyWithRetry(() => import("./pages/admin/AdminProxies"), "AdminProxies");
const AdminWebhooks = lazyWithRetry(() => import("./pages/admin/AdminWebhooks"), "AdminWebhooks");
const AdminTermos = lazyWithRetry(() => import("./pages/admin/AdminTermos"), "AdminTermos");
const AdminAuditoria = lazyWithRetry(() => import("./pages/admin/AdminAuditoria"), "AdminAuditoria");

const AdminGrowthIntelligence = lazyWithRetry(() => import("./pages/admin/AdminGrowthIntelligence"), "AdminGrowthIntelligence");
const AdminOnboarding = lazyWithRetry(() => import("./pages/admin/AdminOnboarding"), "AdminOnboarding");
const AdminSupportTickets = lazyWithRetry(() => import("./pages/admin/AdminSupportTickets"), "AdminSupportTickets");
const AdminSupportMindIA = lazyWithRetry(() => import("./pages/admin/AdminSupportMindIA"), "AdminSupportMindIA");
const AdminSupportFAQs = lazyWithRetry(() => import("./pages/admin/AdminSupportFAQs"), "AdminSupportFAQs");
const AdminSupportIntelligence = lazyWithRetry(() => import("./pages/admin/AdminSupportIntelligence"), "AdminSupportIntelligence");

// Partners - Admin (Programa de Parceiros)
const AdminPartnersDashboard = lazyWithRetry(() => import("./pages/admin/AdminPartnersDashboard"), "AdminPartnersDashboard");
const AdminPartnersList = lazyWithRetry(() => import("./pages/admin/AdminPartnersList"), "AdminPartnersList");
const AdminPartnersLeads = lazyWithRetry(() => import("./pages/admin/AdminPartnersLeads"), "AdminPartnersLeads");
const AdminPartnersSales = lazyWithRetry(() => import("./pages/admin/AdminPartnersSales"), "AdminPartnersSales");
const AdminPartnersWithdrawals = lazyWithRetry(() => import("./pages/admin/AdminPartnersWithdrawals"), "AdminPartnersWithdrawals");
const AdminPartnersPayouts = lazyWithRetry(() => import("./pages/admin/AdminPartnersPayouts"), "AdminPartnersPayouts");
const AdminPartnersSettings = lazyWithRetry(() => import("./pages/admin/AdminPartnersSettings"), "AdminPartnersSettings");
const AdminPartnersRankings = lazyWithRetry(() => import("./pages/admin/AdminPartnersRankings"), "AdminPartnersRankings");
const AdminPartnerDetail = lazyWithRetry(() => import("./pages/admin/AdminPartnerDetail"), "AdminPartnerDetail");

// Partners - Portal do Parceiro
const PartnerLogin = lazyWithRetry(() => import("./pages/partners/PartnerLogin"), "PartnerLogin");
const PartnerLayout = lazyWithRetry(() => import("./pages/partners/PartnerLayout"), "PartnerLayout");
const PartnerDashboard = lazyWithRetry(() => import("./pages/partners/PartnerDashboard"), "PartnerDashboard");
const PartnerLeads = lazyWithRetry(() => import("./pages/partners/PartnerLeads"), "PartnerLeads");
const PartnerCommissions = lazyWithRetry(() => import("./pages/partners/PartnerCommissions"), "PartnerCommissions");
const PartnerWithdrawals = lazyWithRetry(() => import("./pages/partners/PartnerWithdrawals"), "PartnerWithdrawals");
const PartnerBankAccount = lazyWithRetry(() => import("./pages/partners/PartnerBankAccount"), "PartnerBankAccount");
const PartnerMaterials = lazyWithRetry(() => import("./pages/partners/PartnerMaterials"), "PartnerMaterials");
const PartnerRanking = lazyWithRetry(() => import("./pages/partners/PartnerRanking"), "PartnerRanking");
const PartnerGoals = lazyWithRetry(() => import("./pages/partners/PartnerGoals"), "PartnerGoals");
const PartnerLevels = lazyWithRetry(() => import("./pages/partners/PartnerLevels"), "PartnerLevels");
const AdminPartnersGoals = lazyWithRetry(() => import("./pages/admin/AdminPartnersGoals"), "AdminPartnersGoals");
const AdminPartnersLinks = lazyWithRetry(() => import("./pages/admin/AdminPartnersLinks"), "AdminPartnersLinks");
const PartnerSlugRedirect = lazyWithRetry(() => import("./pages/PartnerSlugRedirect"), "PartnerSlugRedirect");
const PartnersLanding = lazyWithRetry(() => import("./pages/PartnersLanding"), "PartnersLanding");
const PartnerVerification = lazyWithRetry(() => import("./pages/PartnerVerification"), "PartnerVerification");
const PartnersApply = lazyWithRetry(() => import("./pages/partners/PartnersApply"), "PartnersApply");
const PartnersTerms = lazyWithRetry(() => import("./pages/partners/PartnersTerms"), "PartnersTerms");
const AdminPartnersApplications = lazyWithRetry(() => import("./pages/admin/AdminPartnersApplications"), "AdminPartnersApplications");
const AdminPartnersMaterials = lazyWithRetry(() => import("./pages/admin/AdminPartnersMaterials"), "AdminPartnersMaterials");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div className="h-10 w-10 rounded-full border-[3px] border-[hsl(158,72%,38%)]/20 border-t-[hsl(158,72%,38%)] animate-spin" />
      <p className="text-sm text-[hsl(220,12%,46%)] font-medium">Carregando...</p>
    </div>
  </div>
);

const PasswordRecoveryRedirect = () => {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const hashType = hash.get("type");
    const queryType = query.get("type");

    // Apenas redireciona para reset-password se for EXPLICITAMENTE link de recovery.
    // Links de confirmação de signup também trazem access_token no hash,
    // por isso não devemos redirecionar baseado apenas na presença de access_token.
    const isRecoveryLink =
      hashType === "recovery" ||
      queryType === "recovery" ||
      hash.get("error_code") === "otp_expired";

    if (window.location.pathname === "/" && isRecoveryLink) {
      window.location.replace(`/reset-password${window.location.search}${window.location.hash}`);
      return;
    }

    const isSignupConfirmation = hashType === "signup" || queryType === "signup";
    if (window.location.pathname === "/" && isSignupConfirmation) {
      window.location.replace(`/login?email_confirmed=true${window.location.hash}`);
    }
  }, []);

  return null;
};

const App = () => (
  <ErrorBoundary>
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PasswordRecoveryRedirect />
          <AuthProvider>
            <GuidedTourProvider>
            <Suspense fallback={<PageLoader />}>
              <PartnerTrackingProvider>
              <PageVisitTracker />
              <Routes>
                <Route path="/" element={<LightThemeWrapper><Index /></LightThemeWrapper>} />
                
                <Route path="/enterprise" element={<LightThemeWrapper><EnterpriseContact /></LightThemeWrapper>} />
                <Route path="/login" element={<LightThemeWrapper><Login /></LightThemeWrapper>} />
                <Route path="/signup" element={<LightThemeWrapper><Signup /></LightThemeWrapper>} />
                <Route path="/signup/escolher-plano" element={<LightThemeWrapper><SignupChoosePlan /></LightThemeWrapper>} />
                <Route path="/signup/cartao-trial" element={<LightThemeWrapper><SignupWithCard /></LightThemeWrapper>} />
                <Route path="/forgot-password" element={<LightThemeWrapper><ForgotPassword /></LightThemeWrapper>} />
                <Route path="/reset-password" element={<LightThemeWrapper><ResetPassword /></LightThemeWrapper>} />
                <Route path="/terms" element={<LightThemeWrapper><Terms /></LightThemeWrapper>} />
                <Route path="/privacy" element={<LightThemeWrapper><Privacy /></LightThemeWrapper>} />
                <Route path="/refund-policy" element={<LightThemeWrapper><RefundPolicy /></LightThemeWrapper>} />
                <Route path="/seguranca-faq" element={<LightThemeWrapper><SecurityFAQ /></LightThemeWrapper>} />
                <Route path="/diretrizes-de-envio" element={<LightThemeWrapper><SendingGuidelines /></LightThemeWrapper>} />
                <Route path="/ajuda" element={<LightThemeWrapper><HelpCenter /></LightThemeWrapper>} />
                <Route path="/ajuda/faq" element={<LightThemeWrapper><HelpCenterFAQ /></LightThemeWrapper>} />
                <Route path="/tour-completo" element={<LightThemeWrapper><TourCompleto /></LightThemeWrapper>} />
                <Route path="/upgrade" element={<LightThemeWrapper><Upgrade /></LightThemeWrapper>} />
                <Route path="/upgrade-promo" element={<LightThemeWrapper><UpgradePromo /></LightThemeWrapper>} />
                <Route path="/trial-expired" element={<ProtectedRoute><TrialExpired /></ProtectedRoute>} />
                <Route path="/checkout-success" element={<LightThemeWrapper><CheckoutSuccess /></LightThemeWrapper>} />
                <Route path="/checkout-failed" element={<LightThemeWrapper><CheckoutFailed /></LightThemeWrapper>} />
                <Route path="/checkout-pix" element={<LightThemeWrapper><CheckoutPix /></LightThemeWrapper>} />
                <Route path="/checkout-card" element={<LightThemeWrapper><CheckoutCard /></LightThemeWrapper>} />
                <Route path="/renewal-success" element={<LightThemeWrapper><RenewalSuccess /></LightThemeWrapper>} />
                <Route path="/minha-assinatura" element={<DashboardThemeProvider><Suspense fallback={<PageLoader />}><ManageSubscription /></Suspense></DashboardThemeProvider>} />
                <Route path="/contato" element={<LightThemeWrapper><Contact /></LightThemeWrapper>} />
                <Route path="/profile" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedRoute>} />
                <Route path="/d7x9k2m4-meta-review" element={<LightThemeWrapper><MetaAppDocumentation /></LightThemeWrapper>} />
                <Route path="/onboarding" element={<LightThemeWrapper><Suspense fallback={<PageLoader />}><Onboarding /></Suspense></LightThemeWrapper>} />
                <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
                <Route path="/reports/prospeccao" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/prospeccao" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/oportunidades" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/oportunidades/gestao" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><OpportunitiesManagement /></Suspense></ProtectedRoute>} />
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppCampaign /></ProtectedRoute>} />
                <Route path="/whatsapp/reports" element={<ProtectedRoute><WhatsAppReports /></ProtectedRoute>} />
                <Route path="/meta-campaigns" element={<ProtectedRoute><MetaCampaigns /></ProtectedRoute>} />
                <Route path="/meta-api-guide" element={<ProtectedRoute><MetaApiGuide /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
                <Route path="/crm/score" element={<ProtectedRoute><CRMScore /></ProtectedRoute>} />
                <Route path="/crm-coming-soon" element={<ProtectedRoute><CRMComingSoon /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><ChatComingSoonGate><Chat /></ChatComingSoonGate></ProtectedRoute>} />
                <Route path="/agents" element={<ProtectedRoute><AIAgents /></ProtectedRoute>} />
                <Route path="/agents/reports" element={<ProtectedRoute><AgentReports /></ProtectedRoute>} />
                <Route path="/fluxos" element={<ProtectedRoute><WhatsAppAutomations /></ProtectedRoute>} />
                <Route path="/fluxos/novo" element={<ProtectedRoute><CreateFlowAI /></ProtectedRoute>} />
                <Route path="/fluxos/:id" element={<ProtectedRoute><WhatsAppFlowEditor /></ProtectedRoute>} />
                <Route path="/warming" element={<ProtectedRoute><Warming /></ProtectedRoute>} />
                <Route path="/warming/reports" element={<ProtectedRoute><WarmingReports /></ProtectedRoute>} />
                <Route path="/consultoria" element={<ProtectedRoute><Consultoria /></ProtectedRoute>} />
                {/* Meta Platforms */}
                <Route path="/meta" element={<ProtectedRoute><MetaDashboard /></ProtectedRoute>} />
                <Route path="/meta/campanhas" element={<ProtectedRoute><MetaCampanhas /></ProtectedRoute>} />
                <Route path="/meta/templates" element={<ProtectedRoute><MetaTemplates /></ProtectedRoute>} />
                <Route path="/meta/numeros" element={<ProtectedRoute><MetaNumeros /></ProtectedRoute>} />
                
                <Route path="/meta/configuracoes" element={<ProtectedRoute><MetaConfiguracoes /></ProtectedRoute>} />
                <Route path="/cancellation-feedback" element={<ProtectedRoute><CancellationFeedback /></ProtectedRoute>} />
                <Route path="/thank-you" element={<LightThemeWrapper><ThankYou /></LightThemeWrapper>} />
                <Route path="/shared-report/:token" element={<LightThemeWrapper><SharedReport /></LightThemeWrapper>} />

                {/* Admin Layout with nested routes */}
                <Route
                  path="/admin"
                  element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="legacy" element={<Admin />} />
                  {/* Painel Executivo - KPIs e Alertas integrados ao dashboard */}
                  <Route path="relatorios" element={<AdminRelatorios />} />
                  {/* Receita */}
                  <Route path="pix-billing" element={<AdminPixBilling />} />
                  
                  <Route path="assinaturas" element={<AdminAssinaturas />} />
                  <Route path="mrr-audit" element={<AdminMrrAudit />} />
                  <Route path="churn" element={<AdminChurn />} />
                  <Route path="forecast" element={<AdminForecast />} />
                  {/* Produto */}
                  <Route path="usuarios" element={<AdminUsuarios />} />
                  <Route path="ativacao" element={<AdminAtivacao />} />
                  <Route path="retencao" element={<AdminRetencao />} />
                  <Route path="landing-pages" element={<AdminLandingPages />} />
                  
                  {/* IA */}
                  <Route path="ia/agentes" element={<AdminIAAgentes />} />
                  <Route path="ia/performance" element={<AdminIAPerformance />} />
                  <Route path="ia/custos" element={<AdminIACustos />} />
                  {/* Operações */}
                  <Route path="operacoes/apis" element={<AdminAPIs />} />
                  <Route path="operacoes/proxies" element={<AdminProxies />} />
                  <Route path="operacoes/webhooks" element={<AdminWebhooks />} />
                  {/* Growth */}
                  <Route path="growth-intel" element={<AdminGrowthIntelligence />} />
                  <Route path="oportunidades-upgrade" element={<AdminOportunidadesUpgrade />} />
                  <Route path="email-tests" element={<AdminEmailTests />} />
                  <Route path="email-flows" element={<AdminEmailFlows />} />
                  <Route path="email-flows/:id" element={<AdminEmailFlowEditor />} />
                  <Route path="user-scoring" element={<AdminUserScoring />} />
                  <Route path="trial-automation" element={<AdminTrialAutomation />} />
                  <Route path="tests" element={<ProductionTests />} />
                  {/* Admin */}
                  <Route path="announcements" element={<AdminAnnouncements />} />
                  <Route path="termos" element={<AdminTermos />} />
                  <Route path="auditoria" element={<AdminAuditoria />} />
                  <Route path="insights" element={<UserInsights />} />
                  <Route path="onboarding" element={<AdminOnboarding />} />
                  {/* Suporte */}
                  <Route path="suporte/tickets" element={<AdminSupportTickets />} />
                  <Route path="suporte/mind-ia" element={<AdminSupportMindIA />} />
                  <Route path="suporte/faqs" element={<AdminSupportFAQs />} />
                  <Route path="suporte/inteligencia" element={<AdminSupportIntelligence />} />
                  {/* Partners */}
                  <Route path="partners" element={<AdminPartnersDashboard />} />
                  <Route path="partners/parceiros" element={<AdminPartnersList />} />
                  <Route path="partners/parceiros/:id" element={<AdminPartnerDetail />} />
                  <Route path="partners/leads" element={<AdminPartnersLeads />} />
                  <Route path="partners/vendas" element={<AdminPartnersSales />} />
                  <Route path="partners/saques" element={<AdminPartnersWithdrawals />} />
                  <Route path="partners/pagamentos" element={<AdminPartnersPayouts />} />
                  <Route path="partners/configuracoes" element={<AdminPartnersSettings />} />
                  <Route path="partners/rankings" element={<AdminPartnersRankings />} />
                  <Route path="partners/candidaturas" element={<AdminPartnersApplications />} />
                  <Route path="partners/materiais" element={<AdminPartnersMaterials />} />
                  <Route path="partners/metas" element={<AdminPartnersGoals />} />
                  <Route path="partners/links" element={<AdminPartnersLinks />} />
                </Route>

                {/* Portal do Parceiro */}
                <Route path="/parceiros" element={<LightThemeWrapper><PartnersLanding /></LightThemeWrapper>} />
                <Route path="/partners/apply" element={<LightThemeWrapper><PartnersApply /></LightThemeWrapper>} />
                <Route path="/wiize-partners/candidatura" element={<LightThemeWrapper><PartnersApply /></LightThemeWrapper>} />
                <Route path="/partners/terms" element={<LightThemeWrapper><PartnersTerms /></LightThemeWrapper>} />
                <Route path="/parceiros/termos" element={<LightThemeWrapper><PartnersTerms /></LightThemeWrapper>} />
                <Route path="/parceiros/verificar" element={<LightThemeWrapper><PartnerVerification /></LightThemeWrapper>} />
                <Route path="/partners/verify" element={<LightThemeWrapper><PartnerVerification /></LightThemeWrapper>} />
                <Route path="/partners/login" element={<LightThemeWrapper><PartnerLogin /></LightThemeWrapper>} />
                <Route path="/r/:slug" element={<LightThemeWrapper><PartnerSlugRedirect /></LightThemeWrapper>} />
                <Route path="/partners" element={<LightThemeWrapper><PartnerLayout /></LightThemeWrapper>}>
                  <Route index element={<PartnerDashboard />} />
                  <Route path="leads" element={<PartnerLeads />} />
                  <Route path="comissoes" element={<PartnerCommissions />} />
                  <Route path="saques" element={<PartnerWithdrawals />} />
                  <Route path="materiais" element={<PartnerMaterials />} />
                  <Route path="metas" element={<PartnerGoals />} />
                  <Route path="niveis" element={<PartnerLevels />} />
                  <Route path="ranking" element={<Navigate to="/partners/metas" replace />} />
                  <Route path="dados-bancarios" element={<PartnerBankAccount />} />
                  <Route path="banco" element={<PartnerBankAccount />} />
                </Route>

                <Route path="/404" element={<LightThemeWrapper><NotFound /></LightThemeWrapper>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<LightThemeWrapper><NotFound /></LightThemeWrapper>} />
              </Routes>
              </PartnerTrackingProvider>
            </Suspense>
            <ActivationChecklist />
            <GuidedTour />
            </GuidedTourProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
