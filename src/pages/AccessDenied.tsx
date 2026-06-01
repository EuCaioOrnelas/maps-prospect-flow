import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <ShieldAlert size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-foreground">Acesso negado</h1>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar esta área. Fale com o administrador da sua conta caso acredite que isso é um erro.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
          <Button asChild>
            <Link to="/dashboard">Ir para o Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
