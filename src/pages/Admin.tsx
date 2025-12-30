import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  BarChart3,
  LogOut,
  ArrowLeft,
  Loader2,
  Crown,
  TrendingUp,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  searches_used: number;
  searches_limit: number;
  plan: string;
  created_at: string;
}

interface Stats {
  totalUsers: number;
  totalSearches: number;
  activeUsers: number;
  planDistribution: { plan: string; count: number }[];
}

const Admin = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, [user]);

  const checkAdminAndLoad = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    try {
      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Role check error:', roleError);
      }

      if (!roleData) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error('Error:', error);
      navigate("/dashboard");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Calculate stats
      const totalUsers = usersData?.length || 0;
      const totalSearches = usersData?.reduce((acc, u) => acc + u.searches_used, 0) || 0;
      const activeUsers = usersData?.filter(u => u.searches_used > 0).length || 0;
      
      const planCounts: { [key: string]: number } = {};
      usersData?.forEach(u => {
        planCounts[u.plan] = (planCounts[u.plan] || 0) + 1;
      });
      const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({ plan, count }));

      setStats({
        totalUsers,
        totalSearches,
        activeUsers,
        planDistribution,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do painel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdating(userId);
    try {
      const limits: { [key: string]: number } = {
        free: 10,
        start: 200,
        growth: 600,
        scale: 1200,
      };

      const { error } = await supabase
        .from('profiles')
        .update({ 
          plan: newPlan,
          searches_limit: limits[newPlan] || 10,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Plano atualizado",
        description: `Plano alterado para ${newPlan.toUpperCase()}`,
      });

      await loadData();
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o plano.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const resetUserSearches = async (userId: string) => {
    setUpdating(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ searches_used: 0 })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Buscas resetadas",
        description: "Contador de buscas zerado com sucesso.",
      });

      await loadData();
    } catch (error) {
      console.error('Error resetting searches:', error);
      toast({
        title: "Erro ao resetar",
        description: "Não foi possível resetar as buscas.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'scale': return 'bg-purple-500/20 text-purple-400';
      case 'growth': return 'bg-primary/20 text-primary';
      case 'start': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={40} className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Crown size={14} />
                Admin
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie usuários, planos e acompanhe métricas</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.totalUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Search size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.totalSearches || 0}</p>
                <p className="text-sm text-muted-foreground">Buscas Realizadas</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Activity size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">{stats?.activeUsers || 0}</p>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>

              <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-primary" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold">
                  {stats?.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Ativação</p>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="glass rounded-xl p-4 sm:p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={20} className="text-primary" />
                <h2 className="font-display font-semibold">Distribuição de Planos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats?.planDistribution.map((item, index) => (
                  <div key={item.plan} className="text-center p-4 bg-secondary/50 rounded-lg">
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-sm text-muted-foreground capitalize">{item.plan}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl p-4 sm:p-6 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Users size={20} className="text-primary" />
                  <h2 className="font-display font-semibold">Usuários</h2>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-secondary"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={loadData}>
                    <RefreshCw size={16} />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[800px] px-4 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Buscas</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.name || '-'}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.plan}
                              onValueChange={(value) => updateUserPlan(user.id, value)}
                              disabled={updating === user.id}
                            >
                              <SelectTrigger className={`w-28 ${getPlanBadgeColor(user.plan)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="start">Start</SelectItem>
                                <SelectItem value="growth">Growth</SelectItem>
                                <SelectItem value="scale">Scale</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.searches_used}</span>
                              <span className="text-muted-foreground">/ {user.searches_limit}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetUserSearches(user.id)}
                              disabled={updating === user.id}
                            >
                              {updating === user.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                'Resetar'
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
