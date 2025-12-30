import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { 
  Search, 
  MapPin, 
  Download, 
  LogOut, 
  Loader2,
  Building2,
  Phone,
  Globe,
  Star,
  ExternalLink,
  Crown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";

interface Lead {
  name: string;
  category: string;
  address: string;
  city: string;
  phone: string;
  website: string;
  rating: number;
  reviewCount: number;
  mapsLink: string;
}

const Dashboard = () => {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Mock user data - will be replaced with actual auth
  const user = {
    name: "Usuário",
    searchesRemaining: 8,
    searchesTotal: 10,
    plan: "Gratuito",
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!keyword.trim() || !location.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha a palavra-chave e a localização",
        variant: "destructive",
      });
      return;
    }

    if (user.searchesRemaining <= 0) {
      toast({
        title: "Limite de buscas atingido",
        description: "Faça upgrade do seu plano para continuar prospectando",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    // Simulate API call - will be replaced with actual SERP API integration
    setTimeout(() => {
      const mockLeads: Lead[] = [
        {
          name: "Restaurante Bella Italia",
          category: "Restaurante Italiano",
          address: "Rua Augusta, 1234",
          city: "São Paulo, SP",
          phone: "(11) 3456-7890",
          website: "www.bellaitalia.com.br",
          rating: 4.5,
          reviewCount: 342,
          mapsLink: "https://maps.google.com",
        },
        {
          name: "Pizzaria Napoli",
          category: "Pizzaria",
          address: "Av. Paulista, 567",
          city: "São Paulo, SP",
          phone: "(11) 2345-6789",
          website: "www.pizzarianapoli.com.br",
          rating: 4.8,
          reviewCount: 521,
          mapsLink: "https://maps.google.com",
        },
        {
          name: "Trattoria da Nonna",
          category: "Restaurante Italiano",
          address: "Rua Oscar Freire, 890",
          city: "São Paulo, SP",
          phone: "(11) 4567-8901",
          website: "www.trattoriadanonna.com.br",
          rating: 4.3,
          reviewCount: 189,
          mapsLink: "https://maps.google.com",
        },
        {
          name: "La Pasta Fresca",
          category: "Restaurante Italiano",
          address: "Rua Haddock Lobo, 432",
          city: "São Paulo, SP",
          phone: "(11) 5678-9012",
          website: "www.lapastafresca.com.br",
          rating: 4.6,
          reviewCount: 267,
          mapsLink: "https://maps.google.com",
        },
        {
          name: "Cantina Toscana",
          category: "Restaurante Italiano",
          address: "Alameda Santos, 1500",
          city: "São Paulo, SP",
          phone: "(11) 6789-0123",
          website: "-",
          rating: 4.2,
          reviewCount: 145,
          mapsLink: "https://maps.google.com",
        },
      ];

      setLeads(mockLeads);
      setIsSearching(false);
      toast({
        title: "Busca concluída!",
        description: `${mockLeads.length} leads encontrados para "${keyword}" em ${location}`,
      });
    }, 2000);
  };

  const handleExport = () => {
    if (leads.length === 0) return;

    // Create CSV content
    const headers = ["Nome", "Categoria", "Endereço", "Cidade", "Telefone", "Site", "Avaliação", "Nº Avaliações", "Link Maps"];
    const csvContent = [
      headers.join(","),
      ...leads.map(lead => 
        [
          `"${lead.name}"`,
          `"${lead.category}"`,
          `"${lead.address}"`,
          `"${lead.city}"`,
          `"${lead.phone}"`,
          `"${lead.website}"`,
          lead.rating,
          lead.reviewCount,
          `"${lead.mapsLink}"`,
        ].join(",")
      ),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${keyword}-${location}.csv`;
    link.click();

    toast({
      title: "Download iniciado!",
      description: "Sua planilha de leads está sendo baixada",
    });
  };

  const handleLogout = () => {
    navigate("/");
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Logo size="md" />
            
            <div className="flex items-center gap-6">
              {/* Usage indicator */}
              <div className="hidden md:flex items-center gap-3 bg-secondary rounded-lg px-4 py-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Buscas restantes: </span>
                  <span className="font-semibold text-primary">{user.searchesRemaining}/{user.searchesTotal}</span>
                </div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(user.searchesRemaining / user.searchesTotal) * 100}%` }}
                  />
                </div>
              </div>

              <Link to="/pricing">
                <Button variant="outline" size="sm" className="gap-2">
                  <Crown size={16} />
                  Upgrade
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
        {/* Search Form */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">
              Encontre seus próximos clientes
            </h1>
            <p className="text-muted-foreground">
              Busque empresas e profissionais no Google Maps
            </p>
          </div>

          <form onSubmit={handleSearch} className="glass rounded-2xl p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="keyword" className="flex items-center gap-2">
                  <Search size={16} className="text-primary" />
                  Palavra-chave
                </Label>
                <Input
                  id="keyword"
                  placeholder="Ex: restaurantes italianos, dentistas, advogados..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="h-12 bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin size={16} className="text-primary" />
                  Cidade ou Região
                </Label>
                <Input
                  id="location"
                  placeholder="Ex: São Paulo, SP"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 bg-secondary border-border"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={isSearching}
            >
              {isSearching ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Buscando leads...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Buscar Leads
                </>
              )}
            </Button>
          </form>

          {/* Results */}
          {hasSearched && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl font-semibold">
                  {leads.length > 0 
                    ? `${leads.length} leads encontrados`
                    : "Nenhum lead encontrado"
                  }
                </h2>
                {leads.length > 0 && (
                  <Button variant="outline" onClick={handleExport} className="gap-2">
                    <Download size={18} />
                    Exportar Excel
                  </Button>
                )}
              </div>

              {leads.length > 0 && (
                <div className="space-y-4">
                  {leads.map((lead, index) => (
                    <div
                      key={index}
                      className="glass rounded-xl p-5 hover:bg-card/90 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Building2 size={20} className="text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{lead.name}</h3>
                              <p className="text-sm text-muted-foreground">{lead.category}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {lead.address} • {lead.city}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone size={16} />
                            <span>{lead.phone}</span>
                          </div>
                          {lead.website !== "-" && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe size={16} />
                              <span>{lead.website}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-warning">
                            <Star size={16} fill="currentColor" />
                            <span className="font-medium">{lead.rating}</span>
                            <span className="text-muted-foreground">({lead.reviewCount})</span>
                          </div>
                          <a
                            href={lead.mapsLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink size={16} />
                            Ver no Maps
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!hasSearched && (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Search size={40} className="text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                Faça sua primeira busca
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Digite uma palavra-chave e localização para encontrar empresas e profissionais no Google Maps
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
