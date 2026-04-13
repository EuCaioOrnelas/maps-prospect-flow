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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading fallback with white background and spinner
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
                <Route path="/renewal-success" element={<LightThemeWrapper><RenewalSuccess /></LightThemeWrapper>} />
                <Route path="/contato" element={<LightThemeWrapper><Contact /></LightThemeWrapper>} />
                <Route path="/d7x9k2m4-meta-review" element={<LightThemeWrapper><MetaAppDocumentation /></LightThemeWrapper>} />
                <Route
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <MainDashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/reports/prospeccao" 
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/prospeccao" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/oportunidades" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/oportunidades/gestao" 
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoader />}>
                        <OpportunitiesManagement />
                      </Suspense>
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/insights" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <UserInsights />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/landing-pages" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminLandingPages />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/announcements" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminAnnouncements />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/lp/:slug" element={<LightThemeWrapper><LandingPage /></LightThemeWrapper>} />
                {/* /reports now redirects to /dashboard */}
                <Route 
                  path="/whatsapp" 
                  element={
                    <ProtectedRoute>
                      <WhatsAppCampaign />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/meta-campaigns" 
                  element={
                    <ProtectedRoute>
                      <MetaCampaigns />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/meta-api-guide" 
                  element={
                    <ProtectedRoute>
                      <MetaApiGuide />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/whatsapp/reports" 
                  element={
                    <ProtectedRoute>
                      <WhatsAppReports />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/profile" 
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/crm" 
                  element={
                    <ProtectedRoute>
                      <CRM />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/crm/score" 
                  element={
                    <ProtectedRoute>
                      <CRMScore />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                  <Chat />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/fluxos" 
                  element={
                    <ProtectedRoute>
                      <WhatsAppAutomations />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/fluxos/criar-ia" 
                  element={
                    <ProtectedRoute>
                      <CreateFlowAI />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/fluxos/:id" 
                  element={
                    <ProtectedRoute>
                      <WhatsAppFlowEditor />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/warming" 
                  element={
                    <ProtectedRoute>
                      <Warming />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/warming/reports" 
                  element={
                    <ProtectedRoute>
                      <WarmingReports />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/agents" 
                  element={
                    <ProtectedRoute>
                      <AIAgents />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/agents/reports" 
                  element={
                    <ProtectedRoute>
                      <AgentReports />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/consultoria" 
                  element={
                    <ProtectedRoute>
                      <Consultoria />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/shared-report/:reportId" element={<LightThemeWrapper><SharedReport /></LightThemeWrapper>} />
                <Route path="/obrigado" element={<LightThemeWrapper><ThankYou /></LightThemeWrapper>} />
                <Route path="/cancelamento" element={<LightThemeWrapper><CancellationFeedback /></LightThemeWrapper>} />
                <Route 
                  path="/admin/tests" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <ProductionTests />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/email-tests" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminEmailTests />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/trial-automation" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminTrialAutomation />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/user-scoring" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminUserScoring />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/email-flows" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminEmailFlows />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/email-flows/:id" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminEmailFlowEditor />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/pix-billing" 
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminPixBilling />
                    </ProtectedRoute>
                  } 
                />
                {/* Explicit 404 route */}
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
