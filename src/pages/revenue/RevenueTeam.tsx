import { useState } from "react";
import { Users, Clock, Flame, AlertTriangle, Trophy, UserPlus, Copy, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ── Team Performance Hook ──────────────────────────────────────────
interface OperatorStats {
  userId: string;
  name: string;
  email: string;
  totalLeads: number;
  hotLeads: number;
  atRiskLeads: number;
  avgScore: number;
  avgResponseMinutes: number;
  hotResponseRate: number;
  performanceScore: number;
}

const useTeamPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-team-performance", user?.id],
    queryFn: async () => {
      const { data: leads, error: leadsErr } = await supabase
        .from("revenue_leads")
        .select("id, assigned_to_user_id, status_bucket, risk_state, score_total");
      if (leadsErr) throw leadsErr;

      const { data: convs, error: convsErr } = await supabase
        .from("revenue_conversations")
        .select("lead_id, avg_response_time_seconds, unreplied_inbound_count");
      if (convsErr) throw convsErr;

      const convMap = new Map<string, { avgResponse: number; unreplied: number }>();
      for (const c of convs || []) {
        convMap.set(c.lead_id, {
          avgResponse: c.avg_response_time_seconds || 0,
          unreplied: c.unreplied_inbound_count || 0,
        });
      }

      const operatorMap = new Map<string, {
        totalLeads: number;
        hotLeads: number;
        atRiskLeads: number;
        scores: number[];
        responseTimes: number[];
        hotOk: number;
        hotTotal: number;
      }>();

      for (const lead of (leads || []) as any[]) {
        const opId = lead.assigned_to_user_id || "unassigned";
        if (!operatorMap.has(opId)) {
          operatorMap.set(opId, { totalLeads: 0, hotLeads: 0, atRiskLeads: 0, scores: [], responseTimes: [], hotOk: 0, hotTotal: 0 });
        }
        const op = operatorMap.get(opId)!;
        op.totalLeads++;
        op.scores.push(lead.score_total);
        if (lead.status_bucket === "HOT" || lead.status_bucket === "VERY_HOT") {
          op.hotLeads++;
          op.hotTotal++;
          if (lead.risk_state === "OK") op.hotOk++;
        }
        if (lead.risk_state !== "OK") op.atRiskLeads++;

        const conv = convMap.get(lead.id);
        if (conv && conv.avgResponse > 0) {
          op.responseTimes.push(conv.avgResponse);
        }
      }

      const opIds = Array.from(operatorMap.keys()).filter((id) => id !== "unassigned");
      const profilesMap = new Map<string, { name: string; email: string }>();
      if (opIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", opIds);
        for (const p of profiles || []) {
          profilesMap.set(p.id, { name: p.name || p.email, email: p.email });
        }
      }

      const results: OperatorStats[] = [];
      for (const [opId, data] of operatorMap) {
        const avgScore = data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0;
        const avgResponseSec = data.responseTimes.length > 0
          ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
          : 0;
        const hotResponseRate = data.hotTotal > 0 ? Math.round((data.hotOk / data.hotTotal) * 100) : 0;

        const responseScore = data.responseTimes.length === 0 ? 0 : Math.max(0, Math.min(100, 100 - (avgResponseSec - 300) / 30));
        const performanceScore = Math.round(responseScore * 0.3 + hotResponseRate * 0.4 + Math.max(0, 100 - (data.atRiskLeads / Math.max(data.totalLeads, 1)) * 100) * 0.3);

        const profile = profilesMap.get(opId);
        results.push({
          userId: opId,
          name: opId === "unassigned" ? "Não atribuído" : (profile?.name || opId.slice(0, 8)),
          email: profile?.email || "",
          totalLeads: data.totalLeads,
          hotLeads: data.hotLeads,
          atRiskLeads: data.atRiskLeads,
          avgScore,
          avgResponseMinutes: Math.round(avgResponseSec / 60),
          hotResponseRate,
          performanceScore: Math.max(0, Math.min(100, performanceScore)),
        });
      }

      results.sort((a, b) => b.performanceScore - a.performanceScore);
      return results;
    },
    enabled: !!user,
  });
};

// ── Create Team Member Dialog ──────────────────────────────────────
const CreateTeamMemberDialog = ({ onCreated }: { onCreated?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareableText, setShareableText] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const { toast } = useToast();

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
    let pw = "";
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData((prev) => ({ ...prev, password: pw }));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (formData.password.length < 8) {
      toast({ title: "Senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          name: formData.name.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const text = [
        `🔑 Dados de acesso — Wiize Revenue`,
        ``,
        `Nome: ${formData.name.trim()}`,
        `Email: ${formData.email.trim().toLowerCase()}`,
        `Senha: ${formData.password}`,
        ``,
        `Acesse: ${window.location.origin}/login`,
        ``,
        `⚠️ Altere sua senha no primeiro acesso.`,
      ].join("\n");

      setShareableText(text);

      toast({ title: "Membro criado com sucesso!" });
      onCreated?.();
    } catch (err) {
      console.error("Error creating team member:", err);
      toast({
        title: "Erro ao criar membro",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareableText) return;
    try {
      await navigator.clipboard.writeText(shareableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Texto copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setFormData({ name: "", email: "", password: "" });
      setShareableText(null);
      setCopied(false);
      setShowPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <UserPlus size={16} />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        {shareableText ? (
          <>
            <DialogHeader>
              <DialogTitle>Membro criado com sucesso ✅</DialogTitle>
              <DialogDescription>
                Copie o texto abaixo e envie para o novo membro da equipe.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-secondary/40 border border-border rounded-lg p-4 my-2">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {shareableText}
              </pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Fechar
              </Button>
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copiado!" : "Copiar Texto"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Adicionar Membro à Equipe</DialogTitle>
              <DialogDescription>
                Crie credenciais de acesso para um novo operador. O acesso ao painel Revenue será liberado após configuração de permissões.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Nome</Label>
                  <Input
                    id="team-name"
                    placeholder="Nome do operador"
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-email">Email</Label>
                  <Input
                    id="team-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="team-password">Senha</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={generatePassword} disabled={isLoading} className="text-xs h-6">
                      Gerar senha
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="team-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      disabled={isLoading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Criando...
                    </>
                  ) : (
                    "Criar Membro"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Performance Helpers ────────────────────────────────────────────
const performanceColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-destructive";
};

// ── Page ───────────────────────────────────────────────────────────
const RevenueTeam = () => {
  const { data: team, isLoading, refetch } = useTeamPerformance();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const operators = (team || []).filter((t) => t.userId !== "unassigned");
  const unassigned = (team || []).find((t) => t.userId === "unassigned");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} /> Equipe
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie operadores e acompanhe a performance de cada membro
          </p>
        </div>
        <CreateTeamMemberDialog onCreated={() => refetch()} />
      </div>

      {/* Banner: login ainda não disponível */}
      <Card className="bg-yellow-500/10 border-yellow-500/30">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-yellow-300">
            ⚠️ <strong>Em breve:</strong> O login dos sub-usuários ainda não está implementado. Os membros criados terão acesso quando o sistema de permissões for ativado.
          </p>
        </CardContent>
      </Card>

      {operators.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-12 text-center">
            <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nenhum operador com leads atribuídos.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Crie membros e atribua leads para ver métricas de performance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {operators.map((op, idx) => (
            <Card key={op.userId} className="bg-card border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                      idx === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      idx === 1 ? "bg-gray-400/20 text-gray-400" :
                      idx === 2 ? "bg-orange-600/20 text-orange-500" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {idx < 3 ? <Trophy size={18} /> : idx + 1}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">{op.name}</p>
                      {op.email && <p className="text-xs text-muted-foreground">{op.email}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-2xl font-bold", performanceColor(op.performanceScore))}>
                      {op.performanceScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Performance</p>
                  </div>
                </div>

                <Progress value={op.performanceScore} className="h-2 mb-4" />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Total Leads</p>
                    <p className="text-lg font-bold text-foreground">{op.totalLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Flame size={12} /> Quentes</p>
                    <p className="text-lg font-bold text-foreground">{op.hotLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><AlertTriangle size={12} /> Em Risco</p>
                    <p className="text-lg font-bold text-destructive">{op.atRiskLeads}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock size={12} /> Resp. Média</p>
                    <p className="text-lg font-bold text-foreground">{op.avgResponseMinutes}min</p>
                  </div>
                  <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Score Médio</p>
                    <p className="text-lg font-bold text-foreground">{op.avgScore}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {unassigned && unassigned.totalLeads > 0 && (
        <Card className="bg-card border-border/50 opacity-60">
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              ⚠️ {unassigned.totalLeads} lead(s) sem operador atribuído (score médio: {unassigned.avgScore})
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RevenueTeam;
