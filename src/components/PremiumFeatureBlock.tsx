import { useNavigate } from "react-router-dom";
import { Lock, Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface PremiumFeatureBlockProps {
  featureName: string;
  description: string;
  icon?: React.ReactNode;
}

export const PremiumFeatureBlock = ({ 
  featureName, 
  description,
  icon 
}: PremiumFeatureBlockProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 relative">
            <div className="w-20 h-20 rounded-[22px] bg-primary/10 flex items-center justify-center">
              {icon || <Lock className="h-10 w-10 text-primary" />}
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-[9px] bg-amber-500/20 flex items-center justify-center border-2 border-background">
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            Funcionalidade Premium
          </CardTitle>
          
          <CardDescription className="text-base mt-2">
            <span className="font-semibold text-foreground">{featureName}</span> não está disponível no plano gratuito
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground text-sm">
            {description}
          </p>
          
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              Disponível nos planos:
            </p>
            <div className="flex justify-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                Start
              </span>
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm font-medium border border-primary/30">
                Growth
              </span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                Scale
              </span>
            </div>
          </div>
          
          <Button 
            variant="hero" 
            size="lg" 
            className="w-full gap-2"
            onClick={() => navigate("/upgrade")}
          >
            <Sparkles className="h-4 w-4" />
            Ver Planos e Preços
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Faça upgrade para desbloquear todas as funcionalidades
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
