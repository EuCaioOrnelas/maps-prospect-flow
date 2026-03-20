import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  BarChart3, FileText, Mail, FlaskConical, ArrowLeft, Menu, Crown,
  Receipt, Bell, LayoutDashboard, Zap, LogOut
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { PixDashboardTab } from "@/components/admin/pix-billing/PixDashboardTab";
import { PixInvoicesTab } from "@/components/admin/pix-billing/PixInvoicesTab";
import { PixEmailTemplatesTab } from "@/components/admin/pix-billing/PixEmailTemplatesTab";
import { PixTestsTrackingTab } from "@/components/admin/pix-billing/PixTestsTrackingTab";

const AdminPixBilling = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - same pattern as Admin page */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Billing PIX
              </span>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Menu size={16} />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 size={14} /> Painel Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/email-tests" className="flex items-center gap-2 cursor-pointer">
                      <Mail size={14} /> Emails
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/announcements" className="flex items-center gap-2 cursor-pointer">
                      <Bell size={14} /> Avisos
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/landing-pages" className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard size={14} /> Landing Pages
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/trial-automation" className="flex items-center gap-2 cursor-pointer">
                      <Zap size={14} /> Trial Automação
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/user-scoring" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 size={14} /> Score de Usuários
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/email-flows" className="flex items-center gap-2 cursor-pointer">
                      <Zap size={14} /> Fluxos de Email
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/insights" className="flex items-center gap-2 cursor-pointer">
                      <BarChart3 size={14} /> Insights
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <ArrowLeft size={14} /> Voltar ao Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut size={14} /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing PIX / Renovação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão completa de cobranças PIX, renovações e emails
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 size={14} /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
              <FileText size={14} /> Faturas
            </TabsTrigger>
            <TabsTrigger value="emails" className="gap-1.5 text-xs sm:text-sm">
              <Mail size={14} /> Emails
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-1.5 text-xs sm:text-sm">
              <FlaskConical size={14} /> Testes / Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <PixDashboardTab />
          </TabsContent>
          <TabsContent value="invoices" className="mt-6">
            <PixInvoicesTab />
          </TabsContent>
          <TabsContent value="emails" className="mt-6">
            <PixEmailTemplatesTab />
          </TabsContent>
          <TabsContent value="tests" className="mt-6">
            <PixTestsTrackingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPixBilling;
