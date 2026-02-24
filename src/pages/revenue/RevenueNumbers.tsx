import { Link } from "react-router-dom";
import { Smartphone, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useWhatsAppNumbers } from "@/hooks/useWhatsAppNumbers";
import { cn } from "@/lib/utils";

const RevenueNumbers = () => {
  const { numbers, loading } = useWhatsAppNumbers();

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Números Conectados</h1>
        <p className="text-sm text-muted-foreground">
          Instâncias de WhatsApp vinculadas ao Revenue
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : numbers.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <Smartphone className="mx-auto text-muted-foreground mb-3" size={32} />
            <p className="text-muted-foreground">
              Nenhum número conectado. Conecte números na seção de{" "}
              <Link to="/whatsapp" className="text-primary hover:underline">
                Campanhas WhatsApp
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {numbers.map((num) => (
            <Card key={num.id} className="bg-card border-border">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        num.is_connected
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {num.is_connected ? (
                        <Wifi size={18} />
                      ) : (
                        <WifiOff size={18} />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{num.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {num.phone_number || num.instance_name || "Sem número"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      num.is_connected
                        ? "border-primary/30 text-primary"
                        : "border-destructive/30 text-destructive"
                    )}
                  >
                    {num.is_connected ? "Online" : "Offline"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Disparos hoje: {num.daily_sent_count}</span>
                  <Link
                    to={`/revenue/leads?number=${num.id}`}
                    className="text-primary hover:underline"
                  >
                    Ver leads →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevenueNumbers;
