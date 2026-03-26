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
const UserInsights = lazy(() => import("./pages/UserInsights"));
const WhatsAppReports = lazy(() => import("./pages/WhatsAppReports"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const SecurityFAQ = lazy(() => import("./pages/SecurityFAQ"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutFailed = lazy(() => import("./pages/CheckoutFailed"));
const CheckoutPix = lazy(() => import("./pages/CheckoutPix"));
const RenewalSuccess = lazy(() => import("./pages/RenewalSuccess"));
const Contact = lazy(() => import("./pages/Contact"));
const Profile = lazy(() => import("./pages/Profile"));
const CRM = lazy(() => import("./pages/CRM"));
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

// Revenue pages
const RevenueLayout = lazy(() => import("./components/revenue/RevenueLayout").then(m => ({ default: m.RevenueLayout })));
const RevenueDashboard = lazy(() => import("./pages/revenue/RevenueDashboard"));
const RevenueLeads = lazy(() => import("./pages/revenue/RevenueLeads"));
const RevenueLeadDetail = lazy(() => import("./pages/revenue/RevenueLeadDetail"));
const RevenueNumbers = lazy(() => import("./pages/revenue/RevenueNumbers"));
const RevenueInsights = lazy(() => import("./pages/revenue/RevenueInsights"));
const RevenueSettings = lazy(() => import("./pages/revenue/RevenueSettings"));
const RevenueSimulator = lazy(() => import("./pages/revenue/RevenueSimulator"));
const RevenueTeam = lazy(() => import("./pages/revenue/RevenueTeam"));
const RevenueTrends = lazy(() => import("./pages/revenue/RevenueTrends"));
const RevenueReport = lazy(() => import("./pages/revenue/RevenueReport"));

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

// Simple loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="space-y-4 w-full max-w-md px-4">
      <Skeleton className="h-8 w-3/4 mx-auto" />
      <Skeleton className="h-4 w-1/2 mx-auto" />
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
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/seguranca-faq" element={<SecurityFAQ />} />
                <Route path="/upgrade" element={<Upgrade />} />
                <Route path="/upgrade-promo" element={<UpgradePromo />} />
                <Route path="/checkout-success" element={<CheckoutSuccess />} />
                <Route path="/checkout-failed" element={<CheckoutFailed />} />
                <Route path="/checkout-pix" element={<CheckoutPix />} />
                <Route path="/renewal-success" element={<RenewalSuccess />} />
                <Route path="/contato" element={<Contact />} />
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
                <Route path="/lp/:slug" element={<LandingPage />} />
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
                <Route path="/shared-report/:reportId" element={<SharedReport />} />
                <Route path="/obrigado" element={<ThankYou />} />
                <Route path="/cancelamento" element={<CancellationFeedback />} />
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
                {/* Wiize Revenue (admin only, separate layout) */}
                <Route
                  path="/revenue"
                  element={
                    <ProtectedRoute>
                      <RevenueLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<RevenueDashboard />} />
                  <Route path="leads" element={<RevenueLeads />} />
                  <Route path="leads/:id" element={<RevenueLeadDetail />} />
                  <Route path="numbers" element={<RevenueNumbers />} />
                  <Route path="insights" element={<RevenueInsights />} />
                  <Route path="simulator" element={<RevenueSimulator />} />
                  <Route path="trends" element={<RevenueTrends />} />
                  <Route path="team" element={<RevenueTeam />} />
                  <Route path="report" element={<RevenueReport />} />
                  <Route path="settings" element={<RevenueSettings />} />
                </Route>
                {/* Explicit 404 route */}
                <Route path="/404" element={<NotFound />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
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
