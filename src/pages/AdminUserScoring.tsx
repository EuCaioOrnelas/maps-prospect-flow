import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, BarChart3, Users, Trophy, Settings, RefreshCw, Loader2, 
  Crown, Menu, Mail, FlaskConical, Bell, LayoutDashboard, Zap, LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreDashboardTab } from "@/components/scoring/ScoreDashboardTab";
import { ScoreUsersTab } from "@/components/scoring/ScoreUsersTab";
import { ScoreRankingTab } from "@/components/scoring/ScoreRankingTab";
import { ScoreRulesTab } from "@/components/scoring/ScoreRulesTab";

const AdminUserScoring = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculateAll = async () => {
    setRecalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke("score-processor", {
        body: { action: "recalculate_all" },
      });
      if (error) throw error;
      toast.success(`Score recalculado para ${data?.processed || 0} usuários`);
    } catch (err: any) {
      toast.error("Erro ao recalcular scores: " + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header - same pattern as Admin page */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Admin
              </span>
              <span className="text-muted-foreground text-sm hidden md:inline">/ Score de Usuários</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRecalculateAll}
                disabled={recalculating}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span className="hidden sm:inline">Recalcular Todos</span>
              </Button>

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
                      <Users size={14} /> Painel Admin
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/trial-automation" className="flex items-center gap-2 cursor-pointer">
                      <Zap size={14} /> Trial Automação
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <ArrowLeft size={14} /> Voltar ao Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut size={14} /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold">Score de Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Análise completa de engajamento, ativação e intenção de compra dos usuários
          </p>
        </div>

        {/* Score Level Legend */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Frio", range: "0-20", color: "bg-red-500/20 text-red-400 border-red-500/30" },
            { label: "Baixo engajamento", range: "21-40", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
            { label: "Engajado", range: "41-60", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
            { label: "Alto valor", range: "61-80", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
            { label: "Pronto para upgrade", range: "81-100", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
          ].map((level) => (
            <div key={level.label} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${level.color}`}>
              <span>{level.label}</span>
              <span className="opacity-60">({level.range})</span>
            </div>
          ))}
        </div>


        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="ranking" className="gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-2">
              <Settings className="h-4 w-4" />
              Regras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <ScoreDashboardTab />
          </TabsContent>
          <TabsContent value="users">
            <ScoreUsersTab />
          </TabsContent>
          <TabsContent value="ranking">
            <ScoreRankingTab />
          </TabsContent>
          <TabsContent value="rules">
            <ScoreRulesTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminUserScoring;
