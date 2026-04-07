import { Suspense, lazy } from "react";
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

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import Upgrade from "./pages/Upgrade";

// Lazy load all other pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MainDashboard = lazy(() => import("./pages/MainDashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLandingPages = lazy(() => import("./pages/AdminLandingPages"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Reports = lazy(() => import("./pages/Reports"));
const CRMComingSoon = lazy(() => import("./pages/CRMComingSoon"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
const WhatsAppCampaign = lazy(() => import("./pages/WhatsAppCampaign"));
const MetaCampaigns = lazy(() => import("./pages/MetaCampaigns"));
const UserInsights = lazy(() => import("./pages/UserInsights"));
const WhatsAppReports = lazy(() => import("./pages/WhatsAppReports"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const SecurityFAQ = lazy(() => import("./pages/SecurityFAQ"));
const SendingGuidelines = lazy(() => import("./pages/SendingGuidelines"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const HelpCenterFAQ = lazy(() => import("./pages/HelpCenterFAQ"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutFailed = lazy(() => import("./pages/CheckoutFailed"));
const CheckoutPix = lazy(() => import("./pages/CheckoutPix"));
const RenewalSuccess = lazy(() => import("./pages/RenewalSuccess"));
const Contact = lazy(() => import("./pages/Contact"));
const Profile = lazy(() => import("./pages/Profile"));
const CRM = lazy(() => import("./pages/CRM"));
const CRMScore = lazy(() => import("./pages/CRMScore"));
const Warming = lazy(() => import("./pages/Warming"));
const WarmingReports = lazy(() => import("./pages/WarmingReports"));
const AIAgents = lazy(() => import("./pages/AIAgents"));
const AgentReports = lazy(() => import("./pages/AgentReports"));
const Consultoria = lazy(() => import("./pages/Consultoria"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const ProductionTests = lazy(() => import("./pages/ProductionTests"));
const UpgradePromo = lazy(() => import("./pages/UpgradePromo"));
const AdminEmailTests = lazy(() => import("./pages/AdminEmailTests"));
const AdminTrialAutomation = lazy(() => import("./pages/AdminTrialAutomation"));
const AdminUserScoring = lazy(() => import("./pages/AdminUserScoring"));
const AdminEmailFlows = lazy(() => import("./pages/AdminEmailFlows"));
const AdminEmailFlowEditor = lazy(() => import("./pages/AdminEmailFlowEditor"));
const AdminPixBilling = lazy(() => import("./pages/AdminPixBilling"));
const CancellationFeedback = lazy(() => import("./pages/CancellationFeedback"));
const MetaAppDocumentation = lazy(() => import("./pages/MetaAppDocumentation"));
const MetaApiGuide = lazy(() => import("./pages/MetaApiGuide"));
const OpportunitiesManagement = lazy(() => import("./pages/OpportunitiesManagement"));
const Chat = lazy(() => import("./pages/Chat"));
const WhatsAppAutomations = lazy(() => import("./pages/WhatsAppAutomations"));
const WhatsAppFlowEditor = lazy(() => import("./pages/WhatsAppFlowEditor"));

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
