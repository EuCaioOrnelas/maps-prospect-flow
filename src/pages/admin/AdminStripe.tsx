import { CreditCard, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminStripe() {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Stripe</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerenciamento de pagamentos via Stripe</p>
        </div>
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">MRR Stripe</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
            <p className="text-xs text-muted-foreground mt-1">Dados via API Stripe</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assinaturas Ativas</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/80">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita 30d</p>
            <p className="text-2xl font-bold text-foreground mt-1">—</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Eventos de Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            Log de eventos Stripe será exibido aqui
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
