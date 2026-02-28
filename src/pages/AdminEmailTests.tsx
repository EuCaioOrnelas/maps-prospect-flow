import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, FlaskConical, Loader2, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";

const TARGET_EMAIL = "caiowiize@gmail.com";

const EMAIL_TYPES = [
  {
    type: "CAMPAIGN_SCHEDULED_STARTED",
    label: "Campanha Iniciada",
    payload: { campaign_name: "Campanha Teste", total_leads: 150, scheduled_time: "09:00" },
  },
  {
    type: "NUMBER_DISCONNECTED",
    label: "Número Desconectado",
    payload: { phone_number: "+55 11 99999-9999", instance_name: "teste-instance" },
  },
  {
    type: "CAMPAIGN_FAILED_TO_START",
    label: "Campanha Falhou",
    payload: { campaign_name: "Campanha Teste", reason: "Número não conectado ao WhatsApp" },
  },
  {
    type: "WEEKLY_SUMMARY",
    label: "Resumo Semanal",
    payload: { period: "17 fev — 24 fev", messages_sent: 342, responses: 89, response_rate: 26, new_leads: 45 },
  },
  {
    type: "CAMPAIGN_COMPLETED",
    label: "Campanha Concluída",
    payload: { campaign_name: "Campanha Teste", total_sent: 200, total_responses: 52 },
  },
  {
    type: "ADMIN_BROADCAST",
    label: "Broadcast Admin",
    payload: { subject: "Teste de Broadcast", title: "Novidades da Wiize", content: "<p>Este é um <strong>teste</strong> do sistema de broadcast.</p><p>Tudo funcionando corretamente! 🎉</p>" },
  },
];

function TestTab() {
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, "idle" | "sending" | "success" | "error">>({});

  const sendTest = async (emailType: string, payload: Record<string, unknown>) => {
    setTestResults((prev) => ({ ...prev, [emailType]: "sending" }));

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          user_id: user.id,
          email_type: emailType,
          payload,
          idempotency_key: `test_${emailType}_${Date.now()}`,
          override_email: TARGET_EMAIL,
        },
      });

      if (error) throw error;

      setTestResults((prev) => ({ ...prev, [emailType]: "success" }));
      toast({ title: `✅ Email "${emailType}" enviado para ${TARGET_EMAIL}` });
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [emailType]: "error" }));
      toast({ title: "Erro ao enviar teste", description: err.message, variant: "destructive" });
    }
  };

  const sendAll = async () => {
    for (const et of EMAIL_TYPES) {
      await sendTest(et.type, et.payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Todos os testes serão enviados para <strong>{TARGET_EMAIL}</strong>
        </p>
        <Button variant="outline" size="sm" onClick={sendAll} className="gap-2">
          <FlaskConical size={14} />
          Testar Todos
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EMAIL_TYPES.map((et) => {
          const status = testResults[et.type] || "idle";
          return (
            <div
              key={et.type}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{et.label}</p>
                <p className="text-xs text-muted-foreground font-mono">{et.type}</p>
              </div>
              <div className="flex items-center gap-2">
                {status === "success" && <CheckCircle2 size={16} className="text-primary" />}
                {status === "error" && <XCircle size={16} className="text-destructive" />}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sendTest(et.type, et.payload)}
                  disabled={status === "sending"}
                >
                  {status === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Últimos 50 emails enviados</p>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : "Carregar logs"}
        </Button>
      </div>

      {logs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-foreground">Tipo</th>
                <th className="text-left p-2 font-medium text-foreground">Para</th>
                <th className="text-left p-2 font-medium text-foreground">Status</th>
                <th className="text-left p-2 font-medium text-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="p-2 font-mono text-xs">{log.email_type}</td>
                  <td className="p-2 text-muted-foreground">{log.to_email}</td>
                  <td className="p-2">
                    <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                      {log.status}
                    </Badge>
                  </td>
                  <td className="p-2 text-muted-foreground text-xs">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const AdminEmailTests = () => {
  return (
    <div className="min-h-screen bg-background relative">
      <BackgroundGlow />
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail size={24} />
              Teste de E-mails
            </h1>
            <p className="text-sm text-muted-foreground">
              Enviar testes para {TARGET_EMAIL} e verificar logs
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="test" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="test" className="gap-1">
                  <FlaskConical size={14} /> Testar
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-1">
                  <AlertTriangle size={14} /> Logs
                </TabsTrigger>
              </TabsList>
              <TabsContent value="test" className="mt-4">
                <TestTab />
              </TabsContent>
              <TabsContent value="logs" className="mt-4">
                <LogsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEmailTests;
