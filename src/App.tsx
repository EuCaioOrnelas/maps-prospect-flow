import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Skeleton } from "@/components/ui/skeleton";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

// Lazy load all other pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminLandingPages = lazy(() => import("./pages/AdminLandingPages"));
const AdminAnnouncements = lazy(() => import("./pages/AdminAnnouncements"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const Reports = lazy(() => import("./pages/Reports"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
const WhatsAppCampaign = lazy(() => import("./pages/WhatsAppCampaign"));
const UserInsights = lazy(() => import("./pages/UserInsights"));
const WhatsAppReports = lazy(() => import("./pages/WhatsAppReports"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const CheckoutFailed = lazy(() => import("./pages/CheckoutFailed"));
const Contact = lazy(() => import("./pages/Contact"));
const Profile = lazy(() => import("./pages/Profile"));
const Chat = lazy(() => import("./pages/Chat"));
const ChatSettings = lazy(() => import("./pages/ChatSettings"));
const CRM = lazy(() => import("./pages/CRM"));
const Warming = lazy(() => import("./pages/Warming"));
const WarmingReports = lazy(() => import("./pages/WarmingReports"));
const AIAgents = lazy(() => import("./pages/AIAgents"));
const AgentReports = lazy(() => import("./pages/AgentReports"));
const ThankYou = lazy(() => import("./pages/ThankYou"));

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
                <Route path="/upgrade" element={<Upgrade />} />
                <Route path="/checkout-success" element={<CheckoutSuccess />} />
                <Route path="/checkout-failed" element={<CheckoutFailed />} />
                <Route path="/contato" element={<Contact />} />
                <Route
                  path="/dashboard" 
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
                <Route 
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  } 
                />
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
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/chat/settings" 
                  element={
                    <ProtectedRoute>
                      <ChatSettings />
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
                <Route path="/shared-report/:reportId" element={<SharedReport />} />
                <Route path="/obrigado" element={<ThankYou />} />
                {/* Explicit 404 route */}
                <Route path="/404" element={<NotFound />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
