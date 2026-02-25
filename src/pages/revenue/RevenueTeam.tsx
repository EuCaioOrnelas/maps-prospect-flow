import { useState } from "react";
import {
  Users,
  Clock,
  Flame,
  AlertTriangle,
  Trophy,
  UserPlus,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

interface TeamMember {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

const useTeamPerformance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["revenue-team-performance", user?.id],
    queryFn: async () => {
      const { data: leads, error: leadsErr } = await supabase
        .from("revenue_leads")
        .select("assigned_to_user_id, status_bucket, risk_state, score_total, id");
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
      let profilesMap = new Map<string, { name: string; email: string }>();
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

const performanceColor = (score: number) => {
  if (score >= 80) return "text-primary";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-destructive";
};

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const CreateMemberDialog = ({ onCreated }: { onCreated: (member: TeamMember) => void }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(false);
  const [shareableText, setShareableText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }

    const text = `🔐 Dados de Acesso — Wiize Revenue\n\n👤 Nome: ${name}\n📧 E-mail: ${email}\n🔑 Senha: ${password}\n\n🌐 Acesse: ${window.location.origin}/login\n\n⚠️ Altere sua senha no primeiro acesso.`;
    setShareableText(text);

    const member: TeamMember = {
      id: crypto.randomUUID(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    onCreated(member);
    toast.info("⚠️ Sistema de login ainda não implementado. O usuário foi salvo localmente.");
  };

  const handleCopy = async () => {
    if (!shareableText) return;
    await navigator.clipboard.writeText(shareableText);
    setCopied(true);
    toast.success("Texto copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setName("");
    setEmail("");
    setPassword(generatePassword());
    setShowPassword(false);
    setShareableText(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => v ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus size={16} />
          Adicionar Membro
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Membro da Equipe</DialogTitle>
          <DialogDescription>
            Crie credenciais de acesso para um novo operador.
          </DialogDescription>
        </DialogHeader>

        {!shareableText ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome</Label>
              <Input
                id="member-name"
                placeholder="Ex: João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-email">E-mail</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="joao@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-password">Senha gerada</Label>
              <div className="flex gap-2">
                <Input
                  id="member-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPassword(generatePassword())}
                  title="Gerar nova senha"
                >
                  🔄
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} className="w-full gap-2">
                <UserPlus size={16} />
                Criar Membro
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                {shareableText}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copiado!" : "Copiar Texto"}
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Fechar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ O sistema de login para sub-usuários ainda não está ativo. Esta funcionalidade será habilitada em breve.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const RevenueTeam = () => {
  const { data: team, isLoading } = useTeamPerformance();
  const [members, setMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem("revenue-team-members");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleMemberCreated = (member: TeamMember) => {
    const updated = [...members, member];
    setMembers(updated);
    localStorage.setItem("revenue-team-members", JSON.stringify(updated));
  };

  const handleRemoveMember = (id: string) => {
    const updated = members.filter((m) => m.id !== id);
    setMembers(updated);
    localStorage.setItem("revenue-team-members", JSON.stringify(updated));
    toast.success("Membro removido");
  };

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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} /> Equipe
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie membros e acompanhe a performance individual
          </p>
        </div>
        <CreateMemberDialog onCreated={handleMemberCreated} />
      </div>

      {/* Team Members */}
      {members.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus size={16} />
              Membros Cadastrados
              <Badge variant="secondary" className="ml-2">{members.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      Pendente
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Ranking */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Trophy size={18} />
          Ranking de Performance
        </h2>

        {operators.length === 0 ? (
          <Card className="bg-card border-border/50">
            <CardContent className="py-12 text-center">
              <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum operador com leads atribuídos.</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                O campo assigned_to_user_id nos leads precisa estar preenchido para esta análise.
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
      </div>

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
