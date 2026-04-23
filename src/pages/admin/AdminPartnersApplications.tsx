import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Check, X, Mail, Phone, Calendar, Users } from "lucide-react";
import { fmtDateTime } from "@/lib/partnerFormat";

interface Application {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  profile: string | null;
  audience_size: string | null;
  motivation: string | null;
  status: string;
  source: string | null;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const profileLabels: Record<string, string> = {
  agency: "Agência", consultant: "Consultor", creator: "Criador", sales_pro: "Vendas B2B", other: "Outro",
};

export default function AdminPartnersApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = apps.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search && !`${a.full_name} ${a.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const approve = async (a: Application) => {
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.functions.invoke("admin-create-partner", {
      body: {
        full_name: a.full_name,
        email: a.email,
        phone: a.phone,
        level: "bronze",
        application_id: a.id,
      },
    });
    if (error) {
      toast({ title: "Erro ao aprovar", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    await supabase.from("partner_applications").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by_admin_id: user?.id,
    }).eq("id", a.id);
    toast({ title: "Parceiro aprovado", description: "Conta criada e e-mail de boas-vindas enviado." });
    setReviewing(null);
    setSubmitting(false);
    load();
  };

  const reject = async (a: Application) => {
    if (!rejectReason.trim()) {
      toast({ title: "Informe o motivo da recusa", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("partner_applications").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by_admin_id: user?.id,
      rejection_reason: rejectReason,
    }).eq("id", a.id);
    toast({ title: "Candidatura recusada" });
    setReviewing(null);
    setRejectReason("");
    setSubmitting(false);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Candidaturas de parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">Aprovações de candidaturas vindas da landing pública.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={setFilter} className="flex-1">
          <TabsList>
            <TabsTrigger value="pending">Pendentes <Badge variant="secondary" className="ml-2">{counts.pending}</Badge></TabsTrigger>
            <TabsTrigger value="approved">Aprovadas <Badge variant="secondary" className="ml-2">{counts.approved}</Badge></TabsTrigger>
            <TabsTrigger value="rejected">Recusadas <Badge variant="secondary" className="ml-2">{counts.rejected}</Badge></TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center"><div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhuma candidatura encontrada.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="hover:border-primary/30 transition cursor-pointer" onClick={() => setReviewing(a)}>
              <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold">{a.full_name}</h3>
                    <Badge variant={a.status === "pending" ? "default" : a.status === "approved" ? "secondary" : "destructive"}>
                      {a.status === "pending" ? "Pendente" : a.status === "approved" ? "Aprovada" : "Recusada"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Mail size={12} />{a.email}</div>
                    {a.phone && <div className="flex items-center gap-1.5"><Phone size={12} />{a.phone}</div>}
                    {a.profile && <div className="flex items-center gap-1.5"><Users size={12} />{profileLabels[a.profile] || a.profile}</div>}
                    <div className="flex items-center gap-1.5"><Calendar size={12} />{fmtDateTime(a.created_at)}</div>
                  </div>
                </div>
                {a.status === "pending" && (
                  <Button size="sm" variant="outline">Revisar</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* REVIEW DIALOG */}
      <Dialog open={!!reviewing} onOpenChange={(o) => { if (!o) { setReviewing(null); setRejectReason(""); } }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Candidatura — {reviewing?.full_name}</DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail" value={reviewing.email} />
                <Field label="WhatsApp" value={reviewing.phone || "—"} />
                <Field label="Perfil" value={profileLabels[reviewing.profile || ""] || "—"} />
                <Field label="Audiência" value={reviewing.audience_size || "—"} />
                <Field label="Origem" value={reviewing.source || "—"} />
                <Field label="Recebida em" value={fmtDateTime(reviewing.created_at)} />
              </div>
              {reviewing.motivation && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Motivação</div>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap">{reviewing.motivation}</div>
                </div>
              )}
              {reviewing.status === "pending" && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Motivo da recusa (se for recusar)</div>
                  <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Opcional — apenas se recusar." />
                </div>
              )}
              {reviewing.rejection_reason && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Motivo da recusa</div>
                  <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{reviewing.rejection_reason}</div>
                </div>
              )}
            </div>
          )}
          {reviewing?.status === "pending" && (
            <DialogFooter>
              <Button variant="outline" onClick={() => reject(reviewing)} disabled={submitting} className="gap-2">
                <X size={14} /> Recusar
              </Button>
              <Button onClick={() => approve(reviewing)} disabled={submitting} className="gap-2">
                <Check size={14} /> Aprovar e criar parceiro
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  );
}
