import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Users, Trophy, Settings, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScoreDashboardTab } from "@/components/scoring/ScoreDashboardTab";
import { ScoreUsersTab } from "@/components/scoring/ScoreUsersTab";
import { ScoreRankingTab } from "@/components/scoring/ScoreRankingTab";
import { ScoreRulesTab } from "@/components/scoring/ScoreRulesTab";

const AdminUserScoring = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar profile={profile} />
      <AppHeader profile={profile} />
      
      <main className="lg:pl-[72px] pt-[58px]">
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Score de Usuários</h1>
                <p className="text-sm text-muted-foreground">
                  Análise completa de engajamento e intenção de compra
                </p>
              </div>
            </div>
            <Button
              onClick={handleRecalculateAll}
              disabled={recalculating}
              variant="outline"
              className="gap-2"
            >
              {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recalcular Todos
            </Button>
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
        </div>
      </main>
    </div>
  );
};

export default AdminUserScoring;
