import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivationChecklist } from "@/components/dashboard/ActivationChecklist";
import LightThemeWrapper from "@/components/LightThemeWrapper";
import { DashboardThemeProvider } from "@/contexts/ThemeContext";
import { lazyWithRetry } from "@/lib/runtimeRecovery";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
const WhatsAppAutomations = lazyWithRetry(() => import("./pages/WhatsAppAutomations"), "WhatsAppAutomations");
const WhatsAppFlowEditor = lazyWithRetry(() => import("./pages/WhatsAppFlowEditor"), "WhatsAppFlowEditor");
const CreateFlowAI = lazyWithRetry(() => import("./pages/CreateFlowAI"), "CreateFlowAI");
const SalesPage = lazyWithRetry(() => import("./pages/SalesPage"), "SalesPage");
const EnterpriseContact = lazyWithRetry(() => import("./pages/EnterpriseContact"), "EnterpriseContact");
const TrialExpired = lazyWithRetry(() => import("./pages/TrialExpired"), "TrialExpired");
const ManageSubscription = lazyWithRetry(() => import("./pages/ManageSubscription"), "ManageSubscription");

// Admin sub-pages (lazy loaded)
const AdminKPIs = lazyWithRetry(() => import("./pages/admin/AdminKPIs"), "AdminKPIs");
const AdminAlertas = lazyWithRetry(() => import("./pages/admin/AdminAlertas"), "AdminAlertas");
const AdminRelatorios = lazyWithRetry(() => import("./pages/admin/AdminRelatorios"), "AdminRelatorios");
const AdminStripe = lazyWithRetry(() => import("./pages/admin/AdminStripe"), "AdminStripe");
const AdminAssinaturas = lazyWithRetry(() => import("./pages/admin/AdminAssinaturas"), "AdminAssinaturas");
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

const App = () => (
  <ErrorBoundary>
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LightThemeWrapper><Index /></LightThemeWrapper>} />
                <Route path="/vendas" element={<LightThemeWrapper><SalesPage /></LightThemeWrapper>} />
                <Route path="/enterprise" element={<LightThemeWrapper><EnterpriseContact /></LightThemeWrapper>} />
                <Route path="/login" element={<LightThemeWrapper><Login /></LightThemeWrapper>} />
                <Route path="/signup" element={<LightThemeWrapper><Signup /></LightThemeWrapper>} />
                <Route path="/forgot-password" element={<LightThemeWrapper><ForgotPassword /></LightThemeWrapper>} />
                <Route path="/reset-password" element={<LightThemeWrapper><ResetPassword /></LightThemeWrapper>} />
                <Route path="/terms" element={<LightThemeWrapper><Terms /></LightThemeWrapper>} />
                <Route path="/privacy" element={<LightThemeWrapper><Privacy /></LightThemeWrapper>} />
                <Route path="/refund-policy" element={<LightThemeWrapper><RefundPolicy /></LightThemeWrapper>} />
                <Route path="/seguranca-faq" element={<LightThemeWrapper><SecurityFAQ /></LightThemeWrapper>} />
                <Route path="/diretrizes-de-envio" element={<LightThemeWrapper><SendingGuidelines /></LightThemeWrapper>} />
                <Route path="/ajuda" element={<LightThemeWrapper><HelpCenter /></LightThemeWrapper>} />
                <Route path="/ajuda/faq" element={<LightThemeWrapper><HelpCenterFAQ /></LightThemeWrapper>} />
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
                <Route path="/d7x9k2m4-meta-review" element={<LightThemeWrapper><MetaAppDocumentation /></LightThemeWrapper>} />
                <Route path="/dashboard" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
                <Route path="/reports/prospeccao" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/prospeccao" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/oportunidades" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/oportunidades/gestao" element={<ProtectedRoute><Suspense fallback={<PageLoader />}><OpportunitiesManagement /></Suspense></ProtectedRoute>} />

                {/* Admin Layout with nested routes */}
                <Route
                  path="/admin"
                  element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="legacy" element={<Admin />} />
                  {/* Painel Executivo */}
                  <Route path="kpis" element={<AdminKPIs />} />
                  <Route path="alertas" element={<AdminAlertas />} />
                  <Route path="relatorios" element={<AdminRelatorios />} />
                  {/* Receita */}
                  <Route path="pix-billing" element={<AdminPixBilling />} />
                  <Route path="stripe" element={<AdminStripe />} />
                  <Route path="assinaturas" element={<AdminAssinaturas />} />
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
                </Route>

                <Route path="/404" element={<LightThemeWrapper><NotFound /></LightThemeWrapper>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<LightThemeWrapper><NotFound /></LightThemeWrapper>} />
              </Routes>
            </Suspense>
            <ActivationChecklist />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  </ErrorBoundary>
);

export default App;
