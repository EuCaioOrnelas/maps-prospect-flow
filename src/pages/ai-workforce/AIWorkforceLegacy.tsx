import { Link } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowRight, History } from "lucide-react";
import AIAgents from "@/pages/AIAgents";

export default function AIWorkforceLegacy() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <History className="size-4" />
          <AlertTitle>Versão Clássica</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Esta é a versão anterior dos Agentes IA. Conheça o novo AI Workforce — colaboradores digitais orientados a objetivos.</span>
            <Button asChild size="sm" variant="outline">
              <Link to="/ai-workforce">Ir para AI Workforce <ArrowRight className="size-3.5 ml-1" /></Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
      <AIAgents />
    </div>
  );
}
