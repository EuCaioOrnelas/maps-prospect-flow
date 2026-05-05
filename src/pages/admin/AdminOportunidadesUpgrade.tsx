import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Mail, MessageSquare, Loader2, Sparkles, Send, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

interface FreeUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  searches_used: number;
  searches_limit: number;
}

const MIN_USAGE = 80;

export default function AdminOportunidadesUpgrade() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<FreeUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const [waOpen, setWaOpen] = useState(false);
  const [waPreview, setWaPreview] = useState<{ id: string; phone: string; name: string; message: string }[]>([]);
  const [waGenerating, setWaGenerating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, name, phone, searches_used, searches_limit")
      .eq("plan", "free")
      .eq("is_blocked", false)
      .gte("searches_used", MIN_USAGE)
      .order("searches_used", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar usuários", description: error.message, variant: "destructive" });
    } else {
      setUsers((data || []) as FreeUser[]);
      setSelected(new Set((data || []).map(u => u.id)));
    }
    setLoading(false);
  };

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectedUsers = useMemo(() => users.filter(u => selected.has(u.id)), [users, selected]);
  const selectedWithPhone = useMemo(() => selectedUsers.filter(u => !!u.phone), [selectedUsers]);

  const openEmail = async () => {
    if (selectedUsers.length === 0) {
      toast({ title: "Selecione pelo menos um usuário", variant: "destructive" });
      return;
    }
    setEmailOpen(true);
    if (!emailSubject || !emailContent) {
      await generateEmail();
    }
  };

  const generateEmail = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-generate-upgrade-message", {
        body: { channel: "email", generic: true, user: {} },
      });
      if (error) throw error;
      if ((data as any)?.subject) setEmailSubject((data as any).subject);
      if ((data as any)?.content) setEmailContent((data as any).content);
    } catch (e: any) {
      toast({ title: "Erro ao gerar com IA", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const sendEmails = async () => {
    if (!emailSubject.trim() || !emailContent.trim()) {
      toast({ title: "Preencha assunto e conteúdo", variant: "destructive" });
      return;
    }
    setSending(true);
    let sent = 0, failed = 0;
    const ts = Date.now();
    for (let i = 0; i < selectedUsers.length; i++) {
      const u = selectedUsers[i];
      if (i > 0) await new Promise(r => setTimeout(r, 600));
      try {
        const { error } = await supabase.functions.invoke("send-email", {
          body: {
            user_id: u.id,
            email_type: "ADMIN_BROADCAST",
            payload: { subject: emailSubject, title: emailSubject, content: emailContent },
            idempotency_key: `upgrade_camp_${ts}_${u.id}`,
          },
        });
        if (error) failed++; else sent++;
      } catch {
        failed++;
      }
    }
    setSending(false);
    setEmailOpen(false);
    toast({ title: `Campanha enviada`, description: `${sent} enviados, ${failed} falharam.` });
  };

  const openWhatsApp = async () => {
    if (selectedWithPhone.length === 0) {
      toast({ title: "Nenhum usuário com telefone", description: "Os selecionados não têm WhatsApp cadastrado.", variant: "destructive" });
      return;
    }
    setWaOpen(true);
    setWaGenerating(true);
    const previews: typeof waPreview = [];
    for (const u of selectedWithPhone) {
      try {
        const { data } = await supabase.functions.invoke("ai-generate-upgrade-message", {
          body: { channel: "whatsapp", user: { id: u.id, name: u.name, email: u.email, searches_used: u.searches_used, searches_limit: u.searches_limit } },
        });
        previews.push({
          id: u.id,
          phone: u.phone!,
          name: u.name || u.email,
          message: (data as any)?.content || "",
        });
      } catch {
        previews.push({ id: u.id, phone: u.phone!, name: u.name || u.email, message: "" });
      }
      setWaPreview([...previews]);
    }
    setWaGenerating(false);
  };

  const launchWhatsAppCampaign = () => {
    const leads = waPreview
      .filter(p => p.message.trim())
      .map(p => ({
        name: p.name,
        category: "Usuário Free",
        address: "",
        city: "",
        phone: p.phone,
        website: "",
        rating: 0,
        reviewCount: 0,
        mapsLink: "",
        aiMessage: p.message,
      }));
    sessionStorage.setItem("wa_campaign_preset", JSON.stringify({
      campaignName: `Upgrade Free → Pago — ${new Date().toLocaleDateString("pt-BR")}`,
      leads,
    }));
    navigate("/whatsapp");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <div className="relative z-10 container mx-auto p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
          <h1 className="text-2xl font-bold">Oportunidades de Upgrade</h1>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Usuários Free com uso ≥ {MIN_USAGE} oportunidades</span>
              </div>
              <p className="text-3xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground mt-1">{selected.size} selecionado(s) • {selectedWithPhone.length} com WhatsApp</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openEmail} disabled={selected.size === 0}>
                <Mail className="w-4 h-4 mr-2" /> Campanha de Email
              </Button>
              <Button onClick={openWhatsApp} disabled={selectedWithPhone.length === 0} variant="secondary">
                <MessageSquare className="w-4 h-4 mr-2" /> Campanha WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />Carregando…
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">Nenhum usuário Free com uso alto no momento.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-3 w-10">
                        <Checkbox checked={selected.size === users.length} onCheckedChange={toggleAll} />
                      </th>
                      <th className="p-3">Nome</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">WhatsApp</th>
                      <th className="p-3">Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const pct = Math.round((u.searches_used / u.searches_limit) * 100);
                      return (
                        <tr key={u.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleOne(u.id)} /></td>
                          <td className="p-3">{u.name || "—"}</td>
                          <td className="p-3 text-muted-foreground">{u.email}</td>
                          <td className="p-3">{u.phone ? <Badge variant="secondary">{u.phone}</Badge> : <span className="text-muted-foreground">—</span>}</td>
                          <td className="p-3"><Badge variant={pct >= 95 ? "destructive" : "default"}>{u.searches_used}/{u.searches_limit} ({pct}%)</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-2xl bg-background">
          <DialogHeader>
            <DialogTitle>Campanha de Email — {selectedUsers.length} destinatário(s)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={generateEmail} disabled={generating}>
                {generating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                Gerar com IA
              </Button>
            </div>
            <div>
              <Label>Assunto</Label>
              <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Assunto do email" />
            </div>
            <div>
              <Label>Conteúdo (HTML)</Label>
              <Textarea value={emailContent} onChange={e => setEmailContent(e.target.value)} rows={10} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEmailOpen(false)}>Cancelar</Button>
            <Button onClick={sendEmails} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar para {selectedUsers.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-3xl bg-background">
          <DialogHeader>
            <DialogTitle>Campanha WhatsApp — {selectedWithPhone.length} destinatário(s)</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-3">
            {waGenerating && waPreview.length < selectedWithPhone.length && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Gerando mensagens personalizadas ({waPreview.length}/{selectedWithPhone.length})…
              </div>
            )}
            {waPreview.map((p, i) => (
              <div key={p.id} className="border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  <Badge variant="outline">{p.phone}</Badge>
                </div>
                <Textarea
                  value={p.message}
                  onChange={e => {
                    const next = [...waPreview];
                    next[i] = { ...p, message: e.target.value };
                    setWaPreview(next);
                  }}
                  rows={3}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaOpen(false)}>Cancelar</Button>
            <Button onClick={launchWhatsAppCampaign} disabled={waGenerating || waPreview.filter(p => p.message.trim()).length === 0}>
              <MessageSquare className="w-4 h-4 mr-2" /> Abrir no WhatsApp Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
