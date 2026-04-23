import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Handshake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PartnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setLoading(false);
      toast({ title: "Falha no login", description: error?.message || "Credenciais inválidas", variant: "destructive" });
      return;
    }
    // Validate user is a partner
    const { data: partner } = await supabase.from("partners").select("id").eq("user_id", data.user.id).maybeSingle();
    if (!partner) {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Acesso negado", description: "Esta conta não é um parceiro.", variant: "destructive" });
      return;
    }
    navigate("/partners", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2"><Handshake className="text-primary" /></div>
          <CardTitle>Portal do Parceiro</CardTitle>
          <CardDescription>Acesse para acompanhar seus leads, comissões e saques</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="animate-spin mr-2" size={16} />Entrando...</> : "Entrar"}
            </Button>
            <p className="text-xs text-center text-muted-foreground pt-2">
              Esqueceu a senha? Entre em contato com o admin.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
