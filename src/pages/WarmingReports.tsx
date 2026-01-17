import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WarmingStatsPanel } from "@/components/warming/WarmingStatsPanel";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { Flame, RefreshCw, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { formatPhoneNumber } from '@/lib/phoneUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WhatsAppNumber {
  id: string;
  name: string;
  phone_number: string | null;
  is_connected: boolean;
}

export default function WarmingReports() {
  const { user, profile } = useAuth();
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNumbers();
    }
  }, [user]);

  const fetchNumbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_numbers')
        .select('id, name, phone_number, is_connected')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNumbers(data || []);
    } catch (error) {
      console.error('Error fetching numbers:', error);
      toast.error('Erro ao carregar números');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Use centralized phone formatting
  const formatPhoneForDisplay = (phone: string | null) => {
    if (!phone) return '';
    return formatPhoneNumber(phone);
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background Glows */}
      <BackgroundGlow />
      
      <SEO 
        title="Relatórios de Aquecimento | Wiize"
        description="Estatísticas e relatórios do sistema de aquecimento de números"
      />
      
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-14 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                  Relatórios de Aquecimento
                </h1>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30 text-xs font-semibold">
                  BETA
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Acompanhe as estatísticas e evolução do aquecimento dos seus números
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter by number */}
              <Select
                value={selectedNumberId || "all"}
                onValueChange={(value) => setSelectedNumberId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[220px] bg-card border-border">
                  <SelectValue placeholder="Todos os números" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-primary" />
                      <span>Todos os números</span>
                    </div>
                  </SelectItem>
                  {numbers.map((number) => (
                    <SelectItem key={number.id} value={number.id}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${number.is_connected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span>{number.name}</span>
                        {number.phone_number && (
                          <span className="text-muted-foreground text-xs">
                            {formatPhoneForDisplay(number.phone_number)}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Stats Panel */}
          {user && (
            <WarmingStatsPanel 
              key={refreshKey}
              userId={user.id} 
              selectedNumberId={selectedNumberId}
            />
          )}
        </div>
      </main>
    </div>
  );
}
