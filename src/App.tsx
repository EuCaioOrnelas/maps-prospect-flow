import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminLandingPages from "./pages/AdminLandingPages";
import LandingPage from "./pages/LandingPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Upgrade from "./pages/Upgrade";
import Reports from "./pages/Reports";
import SharedReport from "./pages/SharedReport";
import WhatsAppCampaign from "./pages/WhatsAppCampaign";
import UserInsights from "./pages/UserInsights";
import WhatsAppReports from "./pages/WhatsAppReports";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import CheckoutFailed from "./pages/CheckoutFailed";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
import ChatSettings from "./pages/ChatSettings";
import CRMComingSoon from "./pages/CRMComingSoon";
import Warming from "./pages/Warming";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
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
                    <CRMComingSoon />
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
              <Route path="/shared-report/:reportId" element={<SharedReport />} />
              {/* Explicit 404 route */}
              <Route path="/404" element={<NotFound />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
