import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, X, Upload, Info, MessageSquare, Image, FileAudio, Video, FileText, FileUp, AlertTriangle, CheckCircle2, Loader2, ExternalLink, ChevronUp, KeyRound, BotMessageSquare } from "lucide-react";
import { toast } from "sonner";
import { MessageContentBuilder } from "./MessageContentBuilder";
import type { Node } from "@xyflow/react";
import { cn } from "@/lib/utils";


function GoogleConnectionBlock({ isConnected, googleToken, isConnecting, handleConnect, handleDisconnect, label }: {
  isConnected: boolean; googleToken: any; isConnecting: boolean; handleConnect: () => void; handleDisconnect: () => void; label: string;
}) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
      {isConnected ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 size={14} className="text-green-500" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{label} conectado</p>
                <p className="text-[10px] text-muted-foreground">{googleToken?.google_email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive hover:text-destructive px-2" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Conecte sua conta Google para usar este recurso.</p>
          <Button onClick={handleConnect} disabled={isConnecting} className="w-full h-9 text-sm gap-2">
            {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
            {isConnecting ? "Conectando..." : `Conectar ${label}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function useGoogleAuth(queryKeySuffix: string, scopes: string[]) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: googleToken, refetch: refetchToken } = useQuery({
    queryKey: [`google-token-${queryKeySuffix}`, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_google_tokens" as any)
        .select("google_email, scopes, token_expires_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const isConnected = !!googleToken;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        body: { scopes },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "google-oauth", "width=600,height=700,left=200,top=100");
    } catch (err) {
      console.error("Failed to start OAuth:", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await supabase.from("user_google_tokens" as any).delete().eq("user_id", user!.id);
    refetchToken();
  };

  return { user, googleToken, isConnected, isConnecting, handleConnect, handleDisconnect, refetchToken };
}

const BASE_VARIABLES = [
  { key: "{nome}", label: "Nome do contato" },
  { key: "{telefone}", label: "Telefone" },
];

function useFlowVariables(nodes?: any[]) {
  const customVars: { key: string; label: string }[] = [];
  if (nodes) {
    for (const n of nodes) {
      if (n.type === "data_collect" && n.data?.config?.fields) {
        for (const f of n.data.config.fields) {
          if (f.variable_name) {
            const k = `{${f.variable_name}}`;
            if (!BASE_VARIABLES.some(v => v.key === k) && !customVars.some(v => v.key === k)) {
              customVars.push({ key: k, label: f.label || f.variable_name });
            }
          }
        }
      }
    }
  }
  return [...BASE_VARIABLES, ...customVars];
}

function VariablesHelper({ variables }: { variables?: { key: string; label: string }[] }) {
  const vars = variables || BASE_VARIABLES;
  return (
    <div className="p-2 rounded-lg border border-border/30 bg-muted/10">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">📌 Variáveis disponíveis:</p>
      <div className="flex flex-wrap gap-1">
        {vars.map((v) => (
          <Badge key={v.key} variant="secondary" className="text-[9px] px-1.5 py-0 h-5 font-mono cursor-pointer hover:bg-primary/20"
            onClick={() => navigator.clipboard.writeText(v.key)}
            title={`Clique para copiar: ${v.key}`}
          >
            {v.key}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function GoogleSheetsConfig({ config, updateConfig, renderInfoBanner, allNodes }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element; allNodes?: any[] }) {
  const { user, googleToken, isConnected, isConnecting, handleConnect, handleDisconnect } = useGoogleAuth("sheets", [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [newTabName, setNewTabName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const flowVars = useFlowVariables(allNodes);

  useEffect(() => {
    if (googleToken) {
      updateConfig("google_connected", true);
      updateConfig("google_email", (googleToken as any).google_email);
    }
  }, [(googleToken as any)?.google_email]);

  const { data: spreadsheets = [], isLoading: loadingSheets, refetch: refetchSheets } = useQuery({
    queryKey: ["google-spreadsheets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-list-spreadsheets", {
        body: { user_id: user!.id },
      });
      if (error) throw error;
      return data?.spreadsheets || [];
    },
    enabled: !!user && isConnected,
  });

  const { data: sheetTabs = [], refetch: refetchTabs } = useQuery({
    queryKey: ["google-sheet-tabs", user?.id, config.spreadsheet_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-list-spreadsheets", {
        body: { user_id: user!.id, action: "get_sheets", spreadsheet_id: config.spreadsheet_id },
      });
      if (error) throw error;
      return data?.sheets || [];
    },
    enabled: !!user && isConnected && !!config.spreadsheet_id,
  });

  const handleCreateSpreadsheet = async () => {
    if (!newSheetName.trim()) {
      toast.error("Digite um nome para a planilha");
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-list-spreadsheets", {
        body: { user_id: user!.id, action: "create", title: newSheetName.trim(), tab_name: newTabName.trim() || "Dados" },
      });
      if (error) throw error;
      if (data?.spreadsheet) {
        updateConfig("spreadsheet_id", data.spreadsheet.id);
        updateConfig("spreadsheet_name", data.spreadsheet.name);
        updateConfig("sheet_name", newTabName.trim() || "Dados");
        setShowCreate(false);
        setNewSheetName("");
        setNewTabName("");
        refetchSheets();
        toast.success("Planilha criada com sucesso!");
      }
    } catch (err) {
      console.error("Failed to create spreadsheet:", err);
      toast.error("Erro ao criar planilha");
    } finally {
      setIsCreating(false);
    }
  };

  const columns = config.columns || [
    { key: "nome", label: "Nome", variable: "{nome}" },
    { key: "telefone", label: "Telefone", variable: "{telefone}" },
  ];

  const addColumn = () => {
    const updated = [...columns, { key: `col_${columns.length}`, label: "", variable: "" }];
    updateConfig("columns", updated);
  };

  const removeColumn = (index: number) => {
    const updated = columns.filter((_: any, i: number) => i !== index);
    updateConfig("columns", updated);
  };

  const updateColumn = (index: number, field: string, value: string) => {
    const updated = columns.map((col: any, i: number) => i === index ? { ...col, [field]: value } : col);
    updateConfig("columns", updated);
  };

  return (
    <div className="space-y-4">
      {renderInfoBanner("Salve os dados do lead automaticamente em uma planilha do Google Sheets. Os dados são adicionados em novas linhas, sem sobrescrever dados existentes.")}

      <GoogleConnectionBlock
        isConnected={isConnected}
        googleToken={googleToken}
        isConnecting={isConnecting}
        handleConnect={handleConnect}
        handleDisconnect={() => { handleDisconnect(); updateConfig("google_connected", false); updateConfig("google_email", ""); }}
        label="Google"
      />

      {isConnected && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Planilha</Label>
            {loadingSheets ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" /> Carregando planilhas...
              </div>
            ) : spreadsheets.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhuma planilha encontrada. Crie uma nova abaixo.</p>
            ) : (
              <Select
                value={config.spreadsheet_id || ""}
                onValueChange={(v) => {
                  const selected = spreadsheets.find((s: any) => s.id === v);
                  updateConfig("spreadsheet_id", v);
                  updateConfig("spreadsheet_name", selected?.name || "");
                  updateConfig("sheet_name", "");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar planilha..." />
                </SelectTrigger>
                <SelectContent>
                  {spreadsheets.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="truncate">{s.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setShowCreate(!showCreate)}>
                <Plus size={12} /> Nova planilha
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => refetchSheets()}>
                Atualizar lista
              </Button>
            </div>

            {showCreate && (
              <div className="space-y-2 mt-1 p-3 rounded-lg border border-border/50 bg-muted/10">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nome da planilha *</Label>
                  <Input
                    value={newSheetName}
                    onChange={(e) => setNewSheetName(e.target.value)}
                    placeholder="Ex: Leads da campanha"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Nome da aba (página)</Label>
                  <Input
                    value={newTabName}
                    onChange={(e) => setNewTabName(e.target.value)}
                    placeholder="Ex: Janeiro (padrão: Dados)"
                    className="h-8 text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground">A aba é a página dentro da planilha onde os dados serão inseridos.</p>
                </div>
                <Button size="sm" className="h-8 text-xs w-full" onClick={handleCreateSpreadsheet} disabled={isCreating || !newSheetName.trim()}>
                  {isCreating ? <Loader2 size={12} className="animate-spin" /> : "Criar planilha"}
                </Button>
              </div>
            )}
          </div>

          {config.spreadsheet_id && sheetTabs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Aba (página da planilha)</Label>
              <p className="text-[10px] text-muted-foreground">Selecione em qual aba os dados serão adicionados.</p>
              <Select
                value={config.sheet_name || ""}
                onValueChange={(v) => updateConfig("sheet_name", v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar aba..." />
                </SelectTrigger>
                <SelectContent>
                  {sheetTabs.map((tab: any) => (
                    <SelectItem key={String(tab.id)} value={tab.title}>{tab.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Mapeamento de colunas</Label>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={addColumn}>
                <Plus size={10} /> Coluna
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((col: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground shrink-0">
                    {index + 1}
                  </div>
                  <Input
                    value={col.label}
                    onChange={(e) => updateColumn(index, "label", e.target.value)}
                    placeholder="Nome da coluna"
                    className="h-8 text-xs flex-1"
                  />
                  <Select value={col.variable || ""} onValueChange={(v) => updateColumn(index, "variable", v)}>
                    <SelectTrigger className="h-8 text-xs w-32">
                      <SelectValue placeholder="Variável" />
                    </SelectTrigger>
                    <SelectContent>
                      {flowVars.map((v) => (
                        <SelectItem key={v.key} value={v.key}>{v.key} - {v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeColumn(index)}>
                    <X size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <VariablesHelper variables={flowVars} />
        </>
      )}
    </div>
  );
}

function GoogleCalendarConfig({ config, updateConfig, renderInfoBanner }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element }) {
  const { user, googleToken, isConnected, isConnecting, handleConnect, handleDisconnect } = useGoogleAuth("calendar", [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ]);

  useEffect(() => {
    if (googleToken) {
      updateConfig("google_connected", true);
      updateConfig("google_email", (googleToken as any).google_email);
    }
  }, [(googleToken as any)?.google_email]);

  const { data: calendars = [], isLoading: loadingCalendars } = useQuery({
    queryKey: ["google-calendars", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-list-calendars", {
        body: { user_id: user!.id },
      });
      if (error) throw error;
      return data?.calendars || [];
    },
    enabled: !!user && isConnected,
  });

  return (
    <div className="space-y-4">
      {renderInfoBanner("Crie eventos automáticos no Google Agenda quando o lead chegar neste ponto do fluxo.")}

      <GoogleConnectionBlock
        isConnected={isConnected}
        googleToken={googleToken}
        isConnecting={isConnecting}
        handleConnect={handleConnect}
        handleDisconnect={() => { handleDisconnect(); updateConfig("google_connected", false); updateConfig("google_email", ""); }}
        label="Google"
      />

      {isConnected && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Agenda</Label>
            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin" /> Carregando agendas...
              </div>
            ) : (
              <Select
                value={config.calendar_id || "primary"}
                onValueChange={(v) => {
                  const cal = calendars.find((c: any) => c.id === v);
                  updateConfig("calendar_id", v);
                  updateConfig("calendar_name", cal?.summary || "Principal");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar agenda..." />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        {c.backgroundColor && (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.backgroundColor }} />
                        )}
                        <span className="truncate">{c.summary}{c.primary ? " (Principal)" : ""}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Título do evento</Label>
            <Input
              value={config.event_title || ""}
              onChange={(e) => updateConfig("event_title", e.target.value)}
              placeholder="Reunião com {nome}"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Duração (minutos)</Label>
            <Select
              value={String(config.event_duration || "30")}
              onValueChange={(v) => updateConfig("event_duration", parseInt(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Descrição do evento</Label>
            <Textarea
              value={config.event_description || ""}
              onChange={(e) => updateConfig("event_description", e.target.value)}
              placeholder={"Lead: {nome}\nTelefone: {telefone}\nEmpresa: {empresa}"}
              className="text-sm min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Convidar participante (email)</Label>
            <Input
              value={config.attendee_email || ""}
              onChange={(e) => updateConfig("attendee_email", e.target.value)}
              placeholder="{email} ou vendas@empresa.com"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Use {"{email}"} para enviar convite para o lead ou um email fixo.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Lembrete (minutos antes)</Label>
            <Select
              value={String(config.reminder_minutes || "30")}
              onValueChange={(v) => updateConfig("reminder_minutes", parseInt(v))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 30, 60, 120, 1440].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m < 60 ? `${m} min` : m === 60 ? "1 hora" : m === 120 ? "2 horas" : "1 dia"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <VariablesHelper />

          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-[11px] text-primary font-medium mb-1">📅 Como funciona</p>
            <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Selecione a agenda onde o evento será criado</li>
              <li>Configure o título, duração e descrição</li>
              <li>Quando o lead passar por aqui, o evento será criado automaticamente</li>
              <li>O participante receberá um convite por email</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

function GmailConfig({ config, updateConfig, renderInfoBanner }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element }) {
  const { user, googleToken, isConnected, isConnecting, handleConnect, handleDisconnect } = useGoogleAuth("gmail", [
    "https://www.googleapis.com/auth/gmail.send",
  ]);

  useEffect(() => {
    if (googleToken) {
      updateConfig("google_connected", true);
      updateConfig("google_email", (googleToken as any).google_email);
    }
  }, [(googleToken as any)?.google_email]);

  return (
    <div className="space-y-4">
      {renderInfoBanner("Envie emails automáticos pelo Gmail quando o lead chegar neste ponto do fluxo.")}

      <GoogleConnectionBlock
        isConnected={isConnected}
        googleToken={googleToken}
        isConnecting={isConnecting}
        handleConnect={handleConnect}
        handleDisconnect={() => { handleDisconnect(); updateConfig("google_connected", false); updateConfig("google_email", ""); }}
        label="Gmail"
      />

      {isConnected && (
        <>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Destinatário (Para)</Label>
            <Input
              value={config.email_to || ""}
              onChange={(e) => updateConfig("email_to", e.target.value)}
              placeholder="{email} ou vendas@suaempresa.com"
              className="h-9 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Use {"{email}"} para enviar ao lead ou um email fixo. Separe vários com vírgula.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Cópia (CC)</Label>
            <Input
              value={config.email_cc || ""}
              onChange={(e) => updateConfig("email_cc", e.target.value)}
              placeholder="gerente@empresa.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Cópia oculta (CCO)</Label>
            <Input
              value={config.email_bcc || ""}
              onChange={(e) => updateConfig("email_bcc", e.target.value)}
              placeholder="registro@empresa.com"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Assunto do email</Label>
            <Input
              value={config.email_subject || ""}
              onChange={(e) => updateConfig("email_subject", e.target.value)}
              placeholder="Novo lead: {nome} - {empresa}"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Corpo do email</Label>
            <Textarea
              value={config.email_body || ""}
              onChange={(e) => updateConfig("email_body", e.target.value)}
              placeholder={"Olá!\n\nNovo lead capturado:\n\n📋 Nome: {nome}\n📱 Tel: {telefone}\n📧 Email: {email}\n🏢 Empresa: {empresa}\n📍 Cidade: {cidade}\n\nAtt,\nWiize"}
              className="text-sm min-h-[120px]"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <Label className="text-xs">Enviar como HTML</Label>
            <Switch
              checked={config.email_html || false}
              onCheckedChange={(v) => updateConfig("email_html", v)}
            />
          </div>

          <VariablesHelper />

          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <p className="text-[11px] text-primary font-medium mb-1">✉️ Como funciona</p>
            <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Conecte sua conta Gmail acima</li>
              <li>Configure destinatário, assunto e corpo</li>
              <li>Use variáveis para personalizar cada email</li>
              <li>O email será enviado pela sua conta e aparecerá nos "Enviados"</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

function EntryNodeConfig({ config, updateConfig, renderInfoBanner }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element }) {
  const { user } = useAuth();
  const [templateSearch, setTemplateSearch] = useState("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [reopenTemplates, setReopenTemplates] = useState<any[]>([]);
  const [tokenExpired, setTokenExpired] = useState(false);

  // Build available numbers list from two sources:
  // - Evolution: whatsapp_numbers connected
  // - Meta oficial: active WABA connections only
  const { data: numbers = [] } = useQuery({
    queryKey: ["wa-numbers-for-flow", user?.id],
    queryFn: async () => {
      const [{ data: evoNumbers }, { data: wabaConns }] = await Promise.all([
        supabase
          .from("whatsapp_numbers")
          .select("id, phone_number, name, api_tier, is_connected")
          .eq("user_id", user!.id)
          .eq("is_connected", true),
        supabase
          .from("user_waba_connections")
          .select("id, waba_id, access_token, phone_number_id, display_phone_number, status, nickname")
          .eq("user_id", user!.id)
          .eq("status", "active"),
      ]);

      const evolutionOptions = (evoNumbers || [])
        .filter((n: any) => n.api_tier !== "paid" && n.api_tier !== "meta")
        .map((n: any) => ({
          id: n.id,
          phone_number: n.phone_number,
          name: n.name,
          api_tier: n.api_tier,
          api_type: "evolution" as const,
          source_id: n.id,
          phone_number_id: null,
          waba_connection_id: null,
          display_phone_number: null,
          access_token: null,
          waba_id: null,
        }));

      const metaOptions = (wabaConns || []).map((conn: any) => ({
        id: `meta:${conn.id}`,
        phone_number: conn.display_phone_number,
        name: conn.nickname || conn.display_phone_number || conn.phone_number_id,
        api_tier: "meta",
        api_type: "meta" as const,
        source_id: conn.id,
        phone_number_id: conn.phone_number_id,
        waba_connection_id: conn.id,
        display_phone_number: conn.display_phone_number,
        access_token: conn.access_token,
        waba_id: conn.waba_id,
      }));

      return [...metaOptions, ...evolutionOptions];
    },
    enabled: !!user,
  });

  const selectedNumber = numbers.find((n: any) => n.id === config.whatsapp_number_id);
  const isMeta = selectedNumber?.api_type === "meta";
  const isEvolution = selectedNumber?.api_type === "evolution";

  const wabaConn = isMeta && selectedNumber
    ? {
        id: selectedNumber.waba_connection_id,
        waba_id: selectedNumber.waba_id,
        access_token: selectedNumber.access_token,
        phone_number_id: selectedNumber.phone_number_id,
        display_phone_number: selectedNumber.display_phone_number,
      }
    : null;

  // Fetch templates when Meta number selected
  useEffect(() => {
    if (!wabaConn || !isMeta) {
      setReopenTemplates([]);
      setTokenExpired(false);
      return;
    }
    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      setTokenExpired(false);
      try {
        const { data, error } = await supabase.functions.invoke("meta-fetch-templates", {
          body: { waba_id: wabaConn.waba_id, access_token: wabaConn.access_token },
        });
        if (error) {
          const errStr = typeof error === 'object' && error.message ? error.message : String(error);
          if (errStr.includes("Session has expired") || errStr.includes("OAuthException") || errStr.includes("access token")) {
            setTokenExpired(true);
            return;
          }
        }
        if (data?.error) {
          const details = data?.details?.error;
          if (details?.code === 190 || details?.error_subcode === 463) {
            setTokenExpired(true);
            return;
          }
        }
        if (data?.templates) {
          setReopenTemplates(data.templates.filter((t: any) => t.status === "APPROVED"));
        }
      } catch (e) {
        console.error("Failed to fetch reopen templates:", e);
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [wabaConn?.id, isMeta]);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["wa-campaigns-for-trigger", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_campaigns")
        .select("id, name, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user && config.trigger_type === "campaign_reply",
  });

  const filteredReopenTemplates = reopenTemplates.filter((t: any) =>
    t.name?.toLowerCase().includes(templateSearch.toLowerCase())
  );


  return (
    <div className="space-y-4">
      {renderInfoBanner("Defina como o lead entra neste fluxo e qual número será utilizado.")}

      {/* Number selection - only connected */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Número do WhatsApp</Label>
        <Select
          value={config.whatsapp_number_id || ""}
          onValueChange={(v) => {
            const num = numbers.find((n: any) => n.id === v);
            const numIsMeta = num?.api_type === "meta";
            updateConfig("whatsapp_number_id", v);
            updateConfig("whatsapp_number_name", num?.name || num?.display_phone_number || num?.phone_number || "");
            updateConfig("api_type", numIsMeta ? "meta" : "evolution");
            updateConfig("waba_connection_id", num?.waba_connection_id || null);
            updateConfig("phone_number_id", num?.phone_number_id || null);
            updateConfig("source_id", num?.source_id || null);
            updateConfig("reopen_template_name", "");
          }}
        >
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar número..." /></SelectTrigger>
          <SelectContent>
            {numbers.length === 0 && (
              <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum número conectado</div>
            )}
            {numbers.map((n: any) => {
              const nIsMeta = n.api_type === "meta";
              return (
                <SelectItem key={n.id} value={n.id}>
                  <div className="flex items-center gap-2">
                    <span>{n.name || n.display_phone_number || n.phone_number}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${nIsMeta ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"}`}>
                      {nIsMeta ? "API Inbound" : "API Outbound"}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Evolution warning */}
      {selectedNumber && isEvolution && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-500 leading-relaxed">
            <span className="font-semibold">API Outbound (Evolution)</span> — Recomendada para prospecção fria. Risco de bloqueio por spam.
          </p>
        </div>
      )}

      {/* Meta API info */}
      {selectedNumber && isMeta && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
          <Info size={14} className="text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-primary leading-relaxed">
            <span className="font-semibold">API Inbound (Oficial Meta)</span> — Requer template HSM para reabrir conversas após 24h.
          </p>
        </div>
      )}

      {/* Reopen template - fetch from Meta API */}
      {selectedNumber && isMeta && (
        <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
          <Label className="text-xs font-medium text-primary">Template de reabertura (24h)</Label>
          <p className="text-[10px] text-muted-foreground">
            Selecione o template aprovado que será usado para reabrir a conversa após 24h de inatividade.
          </p>
          {tokenExpired ? (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] text-destructive font-medium">Token da Meta expirado</p>
                <p className="text-[10px] text-muted-foreground">
                  Reconecte seu número na seção <span className="font-semibold">Números → API Oficial</span> para renovar o acesso e carregar os templates.
                </p>
              </div>
            </div>
          ) : loadingTemplates ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin" /> Carregando templates...
            </div>
          ) : (
            <>
              <Input
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="Buscar template..."
                className="h-8 text-xs"
              />
              <div className="max-h-[180px] overflow-y-auto space-y-1 mt-1">
                {filteredReopenTemplates.length === 0 && (
                  <p className="text-[10px] text-muted-foreground py-2 text-center">
                    {templateSearch ? "Nenhum template encontrado" : "Nenhum template aprovado disponível"}
                  </p>
                )}
                {filteredReopenTemplates.map((t: any) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      updateConfig("reopen_template_name", t.name);
                      updateConfig("reopen_template_language", t.language);
                      updateConfig("reopen_template_category", t.category);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors",
                      config.reopen_template_name === t.name
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border/40 bg-card hover:border-primary/30 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{t.name}</span>
                      <Badge variant="secondary" className="text-[8px] h-4">{t.category}</Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{t.language}</p>
                  </button>
                ))}
              </div>
              {config.reopen_template_name && (
                <div className="flex items-center gap-2 mt-1 p-2 rounded bg-primary/10 border border-primary/20">
                  <CheckCircle2 size={12} className="text-primary shrink-0" />
                  <span className="text-[10px] text-foreground font-medium truncate">{config.reopen_template_name}</span>
                  <button onClick={() => { updateConfig("reopen_template_name", ""); updateConfig("reopen_template_language", ""); }} className="ml-auto">
                    <X size={12} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Trigger type */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Tipo de gatilho</Label>
        <Select value={config.trigger_type || ""} onValueChange={(v) => updateConfig("trigger_type", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="keyword">Palavra-chave</SelectItem>
            <SelectItem value="campaign_reply">Resposta de campanha</SelectItem>
            <SelectItem value="first_message">1ª mensagem recebida</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Keyword config */}
      {config.trigger_type === "keyword" && (
        <div className="space-y-2">
          <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
          <Input
            value={config.keywords || ""}
            onChange={(e) => updateConfig("keywords", e.target.value)}
            placeholder="preço, comprar, orçamento, quero"
            className="h-9 text-sm"
          />
          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/30 space-y-1">
            <p className="text-[10px] font-medium text-foreground">Como funciona a busca parcial:</p>
            <p className="text-[10px] text-muted-foreground">Se a palavra-chave for <span className="font-mono bg-muted px-1 rounded">preço</span>, a busca encontra em qualquer posição da mensagem:</p>
            <div className="space-y-0.5 text-[9px] text-muted-foreground">
              <p>✅ "qual o <strong>preço</strong>?" — contém a palavra</p>
              <p>✅ "me passa o <strong>PREÇO</strong> por favor" — maiúsculas</p>
              <p>✅ "quero saber o <strong>preco</strong>" — sem acento</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Switch
              checked={config.exact_match || false}
              onCheckedChange={(v) => updateConfig("exact_match", v)}
            />
            <Label className="text-[11px] text-muted-foreground">Correspondência exata (mensagem deve ser apenas a palavra-chave)</Label>
          </div>
        </div>
      )}

      {/* Campaign reply config */}
      {config.trigger_type === "campaign_reply" && (
        <div className="space-y-2">
          <Label className="text-xs">Campanha {isMeta ? "(API Oficial)" : "(API Outbound)"}</Label>
          <Select
            value={config.campaign_id || "any"}
            onValueChange={(v) => {
              updateConfig("campaign_id", v === "any" ? "" : v);
              const camp = campaigns.find((c: any) => c.id === v);
              updateConfig("campaign_filter", camp?.name || "");
            }}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Qualquer campanha" /></SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground">
              <SelectItem value="any">Qualquer campanha</SelectItem>
              {campaigns.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <span className="truncate">{c.name}</span>
                    <Badge variant="secondary" className="text-[8px] h-4">{c.status}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            O sistema identifica automaticamente se algum lead respondeu à campanha selecionada e entra no fluxo.
          </p>
        </div>
      )}

      {/* First message config */}
      {config.trigger_type === "first_message" && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
            <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              O fluxo será acionado apenas na <span className="font-semibold text-foreground">primeira mensagem</span> que o lead enviar para este número. Mensagens subsequentes não reativam o fluxo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import openaiIcon from "@/assets/logos/openai-icon.png";
import geminiIcon from "@/assets/logos/gemini-icon.png";
import deepseekIcon from "@/assets/logos/deepseek-icon.png";
import { Eye, EyeOff, ChevronDown, Save, Pencil } from "lucide-react";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI", icon: openaiIcon },
  { value: "gemini", label: "Google Gemini", icon: geminiIcon },
  { value: "deepseek", label: "DeepSeek", icon: deepseekIcon },
];

const AI_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini (rápido e barato)" },
    { value: "gpt-4o", label: "GPT-4o (avançado)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (econômico)" },
  ],
  gemini: [
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido)" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (avançado)" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (econômico)" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
  deepseek: [
    { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
  ],
};

const PROVIDER_DOCS: Record<string, { url: string; steps: string[] }> = {
  openai: {
    url: "https://platform.openai.com/api-keys",
    steps: [
      "Acesse platform.openai.com e faça login",
      "Vá em API Keys no menu lateral",
      'Clique em "Create new secret key"',
      "Copie a chave gerada (começa com sk-...)",
      "Cole aqui e salve",
    ],
  },
  gemini: {
    url: "https://aistudio.google.com/app/apikey",
    steps: [
      "Acesse aistudio.google.com",
      "Faça login com sua conta Google",
      'Clique em "Get API Key" no menu',
      "Crie uma nova chave ou copie uma existente",
      "Cole aqui e salve",
    ],
  },
  deepseek: {
    url: "https://platform.deepseek.com/api_keys",
    steps: [
      "Acesse platform.deepseek.com",
      "Crie uma conta ou faça login",
      "Vá em API Keys",
      'Clique em "Create new API key"',
      "Copie a chave e cole aqui",
    ],
  },
};

function ActionNodeConfig({ config, updateConfig, renderInfoBanner }: {
  config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element;
}) {
  const { user } = useAuth();
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages-action", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stages").select("id, name, color, position").eq("user_id", user!.id).order("position");
      return data || [];
    },
    enabled: !!user,
  });

  const actions: any[] = config.actions || [];

  const addAction = () => {
    updateConfig("actions", [...actions, { type: "", id: `act_${Date.now()}` }]);
  };

  const updateAction = (index: number, key: string, value: any) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [key]: value };
    updateConfig("actions", updated);
  };

  const removeAction = (index: number) => {
    updateConfig("actions", actions.filter((_: any, i: number) => i !== index));
  };

  const actionTypes = [
    { value: "add_tag", label: "Adicionar tag" },
    { value: "remove_tag", label: "Remover tag" },
    { value: "move_pipeline", label: "Mover no Kanban (CRM)" },
    { value: "send_to_crm", label: "Criar/atualizar lead no CRM" },
  ];

  return (
    <div className="space-y-4">
      {renderInfoBanner("Execute uma ou mais ações no CRM: tags, mover no Kanban, criar/atualizar lead.")}

      {actions.map((action: any, idx: number) => (
        <div key={action.id || idx} className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Ação {idx + 1}</Label>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAction(idx)}>
              <X size={12} />
            </Button>
          </div>

          <Select value={action.type || ""} onValueChange={(v) => updateAction(idx, "type", v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar tipo..." /></SelectTrigger>
            <SelectContent>
              {actionTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(action.type === "add_tag" || action.type === "remove_tag") && (
            <div className="space-y-1">
              <Label className="text-[10px]">Nome da tag</Label>
              <Input
                value={action.tag_value || ""}
                onChange={(e) => updateAction(idx, "tag_value", e.target.value)}
                placeholder="qualificado, interessado..."
                className="h-8 text-xs"
              />
            </div>
          )}

          {action.type === "move_pipeline" && (
            <div className="space-y-1">
              <Label className="text-[10px]">Coluna do Kanban</Label>
              <Select value={action.pipeline_stage_id || ""} onValueChange={(v) => updateAction(idx, "pipeline_stage_id", v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar coluna..." /></SelectTrigger>
                <SelectContent>
                  {stages.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action.type === "send_to_crm" && (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground">Configure os dados para criar ou atualizar o lead no CRM.</p>
              <div className="space-y-1">
                <Label className="text-[10px]">Nome do lead (variável)</Label>
                <Input
                  value={action.crm_name || ""}
                  onChange={(e) => updateAction(idx, "crm_name", e.target.value)}
                  placeholder="{nome} ou nome fixo"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Coluna do CRM</Label>
                <Select value={action.crm_stage_id || ""} onValueChange={(v) => updateAction(idx, "crm_stage_id", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar coluna..." /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Valor em negociação (opcional)</Label>
                <Input
                  value={action.crm_value || ""}
                  onChange={(e) => updateAction(idx, "crm_value", e.target.value)}
                  placeholder="{valor} ou 1500"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addAction}>
        <Plus size={12} className="mr-1" /> Adicionar ação
      </Button>
    </div>
  );
}

function HandoffNodeConfig({ config, updateConfig, renderInfoBanner, renderApiIndicator }: {
  config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element; renderApiIndicator: () => JSX.Element | null;
}) {
  const { user } = useAuth();
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages-handoff", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stages").select("id, name, color, position").eq("user_id", user!.id).order("position");
      return data || [];
    },
    enabled: !!user,
  });

  const ccEmails: string[] = config.cc_emails || [];

  return (
    <div className="space-y-4">
      {renderApiIndicator()}
      {renderInfoBanner("Transfere a conversa para atendimento humano e encerra a automação neste lead.")}

      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <Switch checked={config.stop_automation !== false} onCheckedChange={(v) => updateConfig("stop_automation", v)} />
          <Label className="text-xs font-medium">Encerrar automação neste lead</Label>
        </div>
        <p className="text-[10px] text-muted-foreground">Se o lead disparar novamente, ele entra no início do fluxo.</p>
      </div>

      {/* Move no CRM */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mover lead no Kanban (CRM)</Label>
        <Select value={config.crm_stage_id || ""} onValueChange={(v) => updateConfig("crm_stage_id", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar coluna..." /></SelectTrigger>
          <SelectContent>
            {stages.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notify team */}
      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <Switch checked={config.notify_team || false} onCheckedChange={(v) => updateConfig("notify_team", v)} />
          <Label className="text-xs font-medium">Notificar equipe por email</Label>
        </div>
        {config.notify_team && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground">Um email será enviado de no-reply@wiize.com.br.</p>
            <div className="space-y-1">
              <Label className="text-[10px]">Título do email</Label>
              <Input
                value={config.email_subject || ""}
                onChange={(e) => updateConfig("email_subject", e.target.value)}
                placeholder="Lead {nome} aguardando atendimento"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Conteúdo do email</Label>
              <Textarea
                value={config.email_body || ""}
                onChange={(e) => updateConfig("email_body", e.target.value)}
                placeholder="O lead {nome} ({telefone}) foi transferido para atendimento humano."
                className="text-xs min-h-[60px]"
              />
              <p className="text-[9px] text-muted-foreground">Use variáveis: {"{nome}"}, {"{telefone}"}, {"{email}"}, {"{empresa}"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Emails em cópia (opcional)</Label>
              <div className="space-y-1">
                {ccEmails.map((email: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1">
                    <Input
                      value={email}
                      onChange={(e) => {
                        const updated = [...ccEmails];
                        updated[idx] = e.target.value;
                        updateConfig("cc_emails", updated);
                      }}
                      placeholder="email@empresa.com"
                      className="h-7 text-[10px] flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => updateConfig("cc_emails", ccEmails.filter((_: any, i: number) => i !== idx))}>
                      <X size={10} />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full" onClick={() => updateConfig("cc_emails", [...ccEmails, ""])}>
                  <Plus size={10} className="mr-1" /> Adicionar email
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message to lead - required */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mensagem ao lead <span className="text-destructive">*</span></Label>
        <Textarea
          value={config.handoff_message || ""}
          onChange={(e) => updateConfig("handoff_message", e.target.value)}
          placeholder="Um de nossos especialistas vai te atender em breve!"
          className="text-sm min-h-[60px]"
        />
        <p className="text-[10px] text-muted-foreground">O lead receberá esta mensagem ao ser transferido para atendimento humano.</p>
      </div>
    </div>
  );
}

function EndNodeConfig({ config, updateConfig, renderInfoBanner, renderApiIndicator }: {
  config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element; renderApiIndicator: () => JSX.Element | null;
}) {
  const { user } = useAuth();
  const { data: stages = [] } = useQuery({
    queryKey: ["pipeline-stages-end", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pipeline_stages").select("id, name, color, position").eq("user_id", user!.id).order("position");
      return data || [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-4">
      {renderApiIndicator()}
      {renderInfoBanner("Encerra o fluxo para este lead. Ao entrar no fluxo o lead recebe a tag 'Em atendimento'. Ao encerrar, pode receber 'Atendido'.")}

      <div className="space-y-2">
        <Label className="text-xs">Mensagem de encerramento (opcional)</Label>
        <Textarea
          value={config.end_message || ""}
          onChange={(e) => updateConfig("end_message", e.target.value)}
          placeholder="Obrigado pelo contato! Até a próxima."
          className="text-sm min-h-[60px]"
        />
      </div>

      <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <Switch checked={config.mark_completed || false} onCheckedChange={(v) => updateConfig("mark_completed", v)} />
          <Label className="text-xs font-medium">Marcar como "Atendido" no CRM</Label>
        </div>
        <p className="text-[10px] text-muted-foreground">Adiciona a tag "Atendido" ao lead no CRM ao encerrar o fluxo.</p>
      </div>

      {/* Move no CRM */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mover lead no Kanban (CRM)</Label>
        <Select value={config.crm_stage_id || ""} onValueChange={(v) => updateConfig("crm_stage_id", v)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar coluna (opcional)..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não mover</SelectItem>
            {stages.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function AIAgentConfig({ config, updateConfig, renderInfoBanner, renderApiIndicator }: {
  config: any;
  updateConfig: (k: string, v: any) => void;
  renderInfoBanner: (t: string) => JSX.Element;
  renderApiIndicator: () => JSX.Element | null;
}) {
  const { user } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [newCredName, setNewCredName] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showContextInfo, setShowContextInfo] = useState(false);
  const [creatingCred, setCreatingCred] = useState(false);
  const [showCredSection, setShowCredSection] = useState(false);
  const [showAgentSection, setShowAgentSection] = useState(false);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [agentForm, setAgentForm] = useState<any>({});
  const [savingAgent, setSavingAgent] = useState(false);

  const { data: credentials = [], refetch: refetchCreds } = useQuery({
    queryKey: ["ai-credentials-all", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_ai_credentials" as any)
        .select("id, provider, is_active, created_at, name")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const { data: savedAgents = [], refetch: refetchAgents } = useQuery({
    queryKey: ["ai-agents-saved", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_ai_agents" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const selectedCredId = config.credential_id || "";
  const selectedAgentId = config.saved_agent_id || "";
  const selectedCred = credentials.find((c: any) => c.id === selectedCredId);

  const handleSaveKey = async () => {
    if (!newApiKey.trim() || !user || !newCredName.trim()) return;
    setSavingKey(true);
    try {
      const providerForCred = config.new_cred_provider || "openai";
      const { error } = await supabase
        .from("user_ai_credentials" as any)
        .insert({
          user_id: user.id,
          provider: providerForCred,
          api_key: newApiKey.trim(),
          name: newCredName.trim(),
          is_active: true,
        } as any);
      if (error) throw error;
      toast.success("Credencial salva com segurança!");
      setNewApiKey("");
      setNewCredName("");
      setCreatingCred(false);
      refetchCreds();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar credencial");
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteCred = async (credId: string) => {
    try {
      await supabase.from("user_ai_credentials" as any).delete().eq("id", credId);
      if (config.credential_id === credId) updateConfig("credential_id", "");
      toast.success("Credencial removida");
      refetchCreds();
    } catch { toast.error("Erro ao remover"); }
  };

  const handleSaveAgent = async () => {
    if (!agentForm.name?.trim() || !user) return;
    setSavingAgent(true);
    try {
      const payload = {
        user_id: user.id,
        name: agentForm.name,
        ai_provider: agentForm.ai_provider || "openai",
        ai_model: agentForm.ai_model || "gpt-4o-mini",
        system_prompt: agentForm.system_prompt || "",
        ai_routes: agentForm.ai_routes || "",
        ai_output_type: agentForm.ai_output_type || "message_and_route",
        max_chars: agentForm.max_chars || 500,
        credential_id: agentForm.credential_id || null,
        updated_at: new Date().toISOString(),
      };
      if (editingAgent) {
        await supabase.from("user_ai_agents" as any).update(payload as any).eq("id", editingAgent.id);
        toast.success("Agente atualizado!");
      } else {
        await supabase.from("user_ai_agents" as any).insert(payload as any);
        toast.success("Agente criado!");
      }
      setCreatingAgent(false);
      setEditingAgent(null);
      setAgentForm({});
      refetchAgents();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar agente");
    } finally {
      setSavingAgent(false);
    }
  };

  const handleSelectAgent = (agentId: string) => {
    const agent = savedAgents.find((a: any) => a.id === agentId);
    if (!agent) return;
    updateConfig("saved_agent_id", agent.id);
    updateConfig("ai_provider", agent.ai_provider);
    updateConfig("ai_model", agent.ai_model);
    updateConfig("system_prompt", agent.system_prompt);
    updateConfig("ai_routes", agent.ai_routes);
    updateConfig("ai_output_type", agent.ai_output_type);
    updateConfig("max_chars", agent.max_chars);
    updateConfig("credential_id", agent.credential_id);
  };

  const handleEditAgent = (agent: any) => {
    setAgentForm({
      name: agent.name,
      ai_provider: agent.ai_provider,
      ai_model: agent.ai_model,
      system_prompt: agent.system_prompt,
      ai_routes: agent.ai_routes,
      ai_output_type: agent.ai_output_type,
      max_chars: agent.max_chars,
      credential_id: agent.credential_id,
    });
    setEditingAgent(agent);
    setCreatingAgent(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await supabase.from("user_ai_agents" as any).delete().eq("id", agentId);
      if (config.saved_agent_id === agentId) updateConfig("saved_agent_id", "");
      toast.success("Agente removido");
      refetchAgents();
    } catch { toast.error("Erro ao remover"); }
  };

  const agentFormModels = AI_MODELS[agentForm.ai_provider || "openai"] || [];

  return (
    <div className="space-y-4">

      {/* CREDENTIALS SECTION - collapsible */}
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <button onClick={() => setShowCredSection(!showCredSection)} className="flex items-center justify-between w-full">
          <Label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <KeyRound size={14} className="text-muted-foreground" /> Credenciais de IA
          </Label>
          <div className="flex items-center gap-2">
            {selectedCred ? (
              <span className="text-[9px] text-emerald-500 font-medium">{selectedCred.name}</span>
            ) : (
              <span className="text-[9px] text-muted-foreground font-medium">Selecionar</span>
            )}
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", showCredSection && "rotate-180")} />
          </div>
        </button>

        {showCredSection && (
          <div className="space-y-3 mt-3">
            <div className="flex justify-end">
              <button onClick={() => setShowDocs(!showDocs)} className="text-[10px] text-primary hover:underline flex items-center gap-1">
                <ExternalLink size={10} /> Como obter?
              </button>
            </div>

            {showDocs && (
              <div className="space-y-2">
                {AI_PROVIDERS.map(p => {
                  const docs = PROVIDER_DOCS[p.value];
                  return (
                    <div key={p.value} className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                      <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
                        <img src={p.icon} alt={p.label} className="w-4 h-4 rounded-sm" /> {p.label}
                      </p>
                      <ol className="text-[10px] text-muted-foreground space-y-0.5 list-decimal list-inside">
                        {docs.steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                      <a href={docs.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium">
                        <ExternalLink size={10} /> Abrir painel
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {credentials.length > 0 && !creatingCred && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">Credenciais salvas</Label>
                {credentials.map((cred: any) => {
                  const prov = AI_PROVIDERS.find(p => p.value === cred.provider);
                  const isSelected = selectedCredId === cred.id;
                  return (
                    <div key={cred.id} onClick={() => updateConfig("credential_id", cred.id)} className={cn("flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors", isSelected ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40 bg-card hover:border-border")}>
                      <div className="flex items-center gap-2">
                        {prov && <img src={prov.icon} alt={prov.label} className="w-5 h-5 rounded-sm" />}
                        <div>
                          <p className="text-[11px] font-medium text-foreground">{cred.name || prov?.label}</p>
                          <p className="text-[9px] text-muted-foreground">{prov?.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && <CheckCircle2 size={12} className="text-emerald-500" />}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCred(cred.id); }}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {creatingCred ? (
              <div className="space-y-2">
                <Label className="text-[11px] font-medium">Nova credencial</Label>
                <Input value={newCredName} onChange={(e) => setNewCredName(e.target.value)} placeholder="Nome da credencial (ex: Minha OpenAI)" className="h-8 text-xs" />
                <div className="grid grid-cols-3 gap-1.5">
                  {AI_PROVIDERS.map((p) => (
                    <button key={p.value} onClick={() => updateConfig("new_cred_provider", p.value)} className={cn("p-1.5 rounded-lg border text-center transition-colors", (config.new_cred_provider || "openai") === p.value ? "border-primary/40 bg-primary/10" : "border-border/40 bg-card hover:border-border")}>
                      <img src={p.icon} alt={p.label} className="w-5 h-5 mx-auto rounded-sm" />
                      <p className="text-[9px] font-medium text-foreground mt-0.5">{p.label}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input type={showApiKey ? "text" : "password"} value={newApiKey} onChange={(e) => setNewApiKey(e.target.value)} placeholder="Cole sua API Key aqui..." className="h-8 text-xs flex-1" />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff size={14} className="text-muted-foreground" /> : <Eye size={14} className="text-muted-foreground" />}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveKey} disabled={!newApiKey.trim() || !newCredName.trim() || savingKey} className="flex-1 h-8 text-xs">
                    {savingKey ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={() => { setCreatingCred(false); setNewApiKey(""); setNewCredName(""); }} className="h-8 text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { setCreatingCred(true); updateConfig("new_cred_provider", "openai"); }}>
                <Plus size={12} className="mr-1" /> Adicionar credencial
              </Button>
            )}
          </div>
        )}
      </div>

      {/* AGENTS SECTION - collapsible */}
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <button onClick={() => setShowAgentSection(!showAgentSection)} className="flex items-center justify-between w-full">
          <Label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <BotMessageSquare size={14} className="text-muted-foreground" /> Agente de IA
          </Label>
          <div className="flex items-center gap-2">
            {selectedAgentId && savedAgents.find((a: any) => a.id === selectedAgentId) ? (
              <span className="text-[9px] text-emerald-500 font-medium">{savedAgents.find((a: any) => a.id === selectedAgentId)?.name}</span>
            ) : (
              <span className="text-[9px] text-muted-foreground font-medium">Selecionar</span>
            )}
            <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", showAgentSection && "rotate-180")} />
          </div>
        </button>

        {showAgentSection && (
          <div className="space-y-3 mt-3">
            {!creatingAgent && (
              <>
                {savedAgents.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Selecionar agente salvo</Label>
                    {savedAgents.map((agent: any) => {
                      const prov = AI_PROVIDERS.find(p => p.value === agent.ai_provider);
                      const isSelected = selectedAgentId === agent.id;
                      return (
                        <div key={agent.id} onClick={() => handleSelectAgent(agent.id)} className={cn("flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors", isSelected ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40 bg-card hover:border-border")}>
                          <div className="flex items-center gap-2">
                            {prov && <img src={prov.icon} alt={prov.label} className="w-5 h-5 rounded-sm" />}
                            <div>
                              <p className="text-[11px] font-medium text-foreground">{agent.name}</p>
                              <p className="text-[9px] text-muted-foreground">{agent.ai_model} · {agent.max_chars}c</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && <CheckCircle2 size={12} className="text-emerald-500" />}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); handleEditAgent(agent); }}>
                              <Pencil size={12} className="text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.id); }}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground">Nenhum agente criado. Crie um agente com prompt, modelo e direcionamentos para reutilizar em diferentes blocos.</p>
                  </div>
                )}

                <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => { setCreatingAgent(true); setEditingAgent(null); setAgentForm({ ai_provider: "openai", ai_model: "gpt-4o-mini", ai_output_type: "message_and_route", max_chars: 500 }); }}>
                  <Plus size={12} className="mr-1" /> Criar novo agente
                </Button>
              </>
            )}

            {creatingAgent && (
              <div className="space-y-3">
                <Label className="text-[11px] font-semibold">{editingAgent ? "Editar agente" : "Novo agente"}</Label>
                <Input value={agentForm.name || ""} onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })} placeholder="Nome do agente (ex: Vendedor IA)" className="h-8 text-xs" />

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Credencial vinculada</Label>
                  <Select value={agentForm.credential_id || ""} onValueChange={(v) => {
                    const cred = credentials.find((c: any) => c.id === v);
                    if (cred) {
                      const models = AI_MODELS[cred.provider] || [];
                      setAgentForm((prev: any) => ({ ...prev, credential_id: v, ai_provider: cred.provider, ai_model: models[0]?.value || "" }));
                    }
                  }}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar credencial" /></SelectTrigger>
                    <SelectContent>
                      {credentials.map((c: any) => {
                        const prov = AI_PROVIDERS.find(p => p.value === c.provider);
                        return <SelectItem key={c.id} value={c.id}>{c.name || prov?.label} ({prov?.label})</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {agentForm.credential_id && (
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Modelo de IA</Label>
                    <Select value={agentForm.ai_model || agentFormModels[0]?.value || ""} onValueChange={(v) => setAgentForm({ ...agentForm, ai_model: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{agentFormModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">O que a IA deve retornar?</Label>
                  <Select value={agentForm.ai_output_type || "message_and_route"} onValueChange={(v) => setAgentForm({ ...agentForm, ai_output_type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="message_only">Apenas responder ao lead</SelectItem>
                      <SelectItem value="route_only">Apenas direcionar (sem resposta)</SelectItem>
                      <SelectItem value="message_and_route">Responder e direcionar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Prompt completo (instrução para a IA)</Label>
                  <Textarea value={agentForm.system_prompt || ""} onChange={(e) => setAgentForm({ ...agentForm, system_prompt: e.target.value })} placeholder={"Você é um assistente de vendas...\n\nRegras:\n- Seja cordial e objetivo\n- Classifique como: INTERESSADO, INDECISO ou NÃO_INTERESSADO"} className="text-xs min-h-[120px]" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Direcionamentos possíveis (um por linha)</Label>
                  <Textarea value={agentForm.ai_routes || ""} onChange={(e) => setAgentForm({ ...agentForm, ai_routes: e.target.value })} placeholder={"INTERESSADO\nINDECISO\nNÃO_INTERESSADO"} className="text-xs min-h-[60px] font-mono" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Máx. caracteres por resposta</Label>
                  <Select value={String(agentForm.max_chars || 500)} onValueChange={(v) => setAgentForm({ ...agentForm, max_chars: parseInt(v) })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100 caracteres</SelectItem>
                      <SelectItem value="200">200 caracteres</SelectItem>
                      <SelectItem value="300">300 caracteres</SelectItem>
                      <SelectItem value="400">400 caracteres</SelectItem>
                      <SelectItem value="500">500 caracteres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveAgent} disabled={!agentForm.name?.trim() || savingAgent} className="flex-1 h-8 text-xs">
                    {savingAgent ? <Loader2 size={12} className="animate-spin mr-1" /> : <Save size={12} className="mr-1" />}
                    {editingAgent ? "Salvar alterações" : "Criar agente"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setCreatingAgent(false); setEditingAgent(null); setAgentForm({}); }} className="h-8 text-xs">Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Per-block context */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Contexto extra deste bloco (opcional)</Label>
        <Textarea value={config.ai_context || ""} onChange={(e) => updateConfig("ai_context", e.target.value)} placeholder="Informações específicas para este ponto do fluxo..." className="text-sm min-h-[60px]" />
        <p className="text-[10px] text-muted-foreground">Contexto adicional enviado junto com o prompt do agente apenas neste bloco.</p>
      </div>

      {/* Memory toggle */}
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className={config.memory_enabled === false ? "text-muted-foreground" : "text-emerald-500"} />
            <Label className="text-xs font-medium">Memória de conversa</Label>
          </div>
          <Switch checked={config.memory_enabled !== false} onCheckedChange={(v) => updateConfig("memory_enabled", v)} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">A IA recebe o histórico da conversa para manter contexto.</p>
      </div>

      {/* Context info - discreet */}
      <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
        <button onClick={() => setShowContextInfo(!showContextInfo)} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span className="text-xs font-medium text-foreground">Mensagem anterior do lead</span>
          </div>
          <ChevronDown size={14} className={cn("text-muted-foreground transition-transform", showContextInfo && "rotate-180")} />
        </button>
        {showContextInfo && (
          <p className="text-[10px] text-muted-foreground mt-2">A IA recebe automaticamente a última mensagem enviada pelo lead na conexão. Isso permite que o agente analise e responda com base no que o lead disse, considerando também o histórico anterior.</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node;
  onUpdate: (nodeId: string, config: any, label?: string) => void;
  onDelete: (nodeId: string) => void;
  entryApiType?: string;
  entryConfig?: any;
  allNodes?: Node[];
}

export function WANodeConfigDrawer({ open, onOpenChange, node, onUpdate, onDelete, entryApiType = "evolution", entryConfig = {}, allNodes }: Props) {
  const [config, setConfig] = useState<any>({});
  const [label, setLabel] = useState("");

  useEffect(() => {
    setConfig((node.data as any).config || {});
    setLabel(String((node.data as any).label || ""));
  }, [node]);

  const handleSave = () => {
    // Validate A/B test sum
    if (node.type === "ab_test") {
      const total = (config.variants || []).reduce((s: number, v: any) => s + (parseFloat(v.weight) || 0), 0);
      if (Math.abs(total - 100) >= 0.1) {
        toast.error("A soma dos pesos deve ser 100%");
        return;
      }
    }
    // Validate handoff requires message
    if (node.type === "handoff") {
      if (!config.handoff_message?.trim()) {
        toast.error("A mensagem ao lead é obrigatória");
        return;
      }
      if (config.notify_team && !config.email_subject?.trim()) {
        toast.error("Preencha o título do email de notificação");
        return;
      }
    }
    onUpdate(node.id, config, label);
    onOpenChange(false);
  };

  const updateConfig = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const getNextInteractiveId = (items: any[], prefix: "btn" | "item") => {
    const highestIndex = items.reduce((max: number, item: any) => {
      const rawId = typeof item === "string" ? "" : String(item?.id || "");
      const match = rawId.match(new RegExp(`^${prefix}[_-](\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, -1);

    return `${prefix}_${highestIndex + 1}`;
  };

  const renderInfoBanner = (text: string) => (
    <div className="flex gap-2 items-start p-2.5 rounded-lg bg-muted/60 border border-border/40">
      <Info size={13} className="text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );

  const isMeta = entryApiType === "meta";
  const isEvolution = entryApiType === "evolution";
  const noEntryConfigured = !entryConfig.whatsapp_number_id;

  const renderApiIndicator = () => {
    return null;
  };

  return (
    <>
      {/* Backdrop - click to close, no blur */}
      {open && (
        <div
          className="absolute inset-0 z-40"
          onClick={() => onOpenChange(false)}
        />
      )}
      <div
        className={cn(
          "absolute top-0 left-0 z-50 h-full w-[400px] sm:w-[440px] bg-card border-r border-border flex flex-col transition-all duration-300 ease-out",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full pointer-events-none"
        )}
        style={!open ? { boxShadow: 'none' } : undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => {
                if (e.target.value.length <= 30) setLabel(e.target.value);
              }}
              maxLength={30}
              className="h-8 text-base font-semibold border-transparent bg-transparent px-1 hover:border-border focus:border-border transition-colors peer flex-1 min-w-0"
              placeholder="Nome do bloco"
            />
            <span className="text-[10px] text-muted-foreground/40 shrink-0 opacity-0 peer-focus:opacity-100 transition-opacity">{label.length}/30</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors shrink-0 z-10"
          >
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pr-3 space-y-5">

          {/* ===== ENTRY NODE ===== */}
          {node.type === "entry" && (
            <EntryNodeConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== MESSAGE NODE ===== */}
          {node.type === "message" && (
            <div className="space-y-4">
              {renderApiIndicator()}
              {renderInfoBanner("Configure o conteúdo da mensagem: texto, imagem, áudio, vídeo ou documento.")}
              <MessageContentBuilder config={config} updateConfig={updateConfig} />
            </div>
          )}

          {/* ===== BUTTONS NODE ===== */}
          {node.type === "buttons" && (
            <div className="space-y-4">
              {isEvolution && (
                <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-500" />
                    <p className="text-sm font-semibold text-amber-500">Funcionalidade indisponível</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Botões interativos são exclusivos da <span className="font-semibold text-foreground">API Inbound (Oficial)</span>. A API Outbound não suporta mensagens interativas com botões ou listas. Altere o número na Entrada do fluxo para um número conectado à API Oficial.
                  </p>
                </div>
              )}
              {!isEvolution && (
                <>
                  {renderApiIndicator()}
                  {renderInfoBanner("Botões interativos da WhatsApp API. Até 3 botões de resposta rápida ou 1 lista com até 10 opções.")}

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Tipo de interação</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: "reply_buttons", label: "Botões rápidos", desc: "Até 3 botões" },
                        { value: "list", label: "Menu de seleção", desc: "Até 10 opções" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateConfig("interaction_type", opt.value)}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors",
                            (config.interaction_type || "reply_buttons") === opt.value
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/40 bg-muted/20 hover:border-border"
                          )}
                        >
                          <p className="text-xs font-medium text-foreground">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Mensagem do corpo</Label>
                    <Textarea
                      value={config.body_text || ""}
                      onChange={(e) => updateConfig("body_text", e.target.value)}
                      placeholder="Escolha uma opção abaixo:"
                      className="text-sm min-h-[60px]"
                    />
                    <p className="text-[10px] text-muted-foreground">Texto enviado antes dos botões. Obrigatório.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Cabeçalho (opcional)</Label>
                    <Input
                      value={config.header_text || ""}
                      onChange={(e) => updateConfig("header_text", e.target.value)}
                      placeholder="Menu de opções"
                      className="h-9 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">Título exibido acima dos botões/menu no WhatsApp. Aparece em destaque.</p>
                  </div>

              {/* Reply buttons */}
              {(config.interaction_type || "reply_buttons") === "reply_buttons" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Botões (máx. 3)</Label>
                  <div className="space-y-2">
                    {(config.buttons || []).map((btn: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{i + 1}</div>
                        <Input
                          value={typeof btn === "string" ? btn : btn.title || ""}
                          onChange={(e) => {
                            const updated = [...(config.buttons || [])];
                              const currentButton = updated[i];
                              updated[i] = {
                                id: typeof currentButton === "string" ? `btn_${i}` : currentButton?.id || `btn_${i}`,
                                title: e.target.value,
                              };
                            updateConfig("buttons", updated);
                          }}
                          placeholder={`Botão ${i + 1}`}
                          className="h-8 text-sm flex-1"
                          maxLength={20}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const updated = (config.buttons || []).filter((_: any, j: number) => j !== i);
                            updateConfig("buttons", updated);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ))}
                    {(config.buttons || []).length < 3 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() =>
                          updateConfig("buttons", [
                            ...(config.buttons || []),
                            { id: getNextInteractiveId(config.buttons || [], "btn"), title: "" },
                          ])
                        }
                      >
                        <Plus size={12} className="mr-1" /> Adicionar botão
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Máx. 20 caracteres por botão. Cada botão gera uma saída no fluxo.</p>
                </div>
              )}

              {/* List */}
              {config.interaction_type === "list" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Texto do botão de menu</Label>
                  <Input
                    value={config.list_button_text || ""}
                    onChange={(e) => updateConfig("list_button_text", e.target.value)}
                    placeholder="Ver opções"
                    className="h-9 text-sm"
                    maxLength={20}
                  />
                  <Label className="text-xs font-medium mt-3">Itens da lista (máx. 10)</Label>
                  <div className="space-y-2">
                    {(config.list_items || []).map((item: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg border border-border/50 bg-muted/20 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Input
                            value={item.title || ""}
                            onChange={(e) => {
                              const updated = [...(config.list_items || [])];
                              updated[i] = {
                                ...updated[i],
                                id: updated[i]?.id || `item_${i}`,
                                title: e.target.value,
                              };
                              updateConfig("list_items", updated);
                            }}
                            placeholder="Título"
                            className="h-7 text-xs flex-1"
                            maxLength={24}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              const updated = (config.list_items || []).filter((_: any, j: number) => j !== i);
                              updateConfig("list_items", updated);
                            }}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                        <Input
                          value={item.description || ""}
                          onChange={(e) => {
                            const updated = [...(config.list_items || [])];
                            updated[i] = { ...updated[i], description: e.target.value };
                            updateConfig("list_items", updated);
                          }}
                          placeholder="Descrição (opcional)"
                          className="h-7 text-xs"
                          maxLength={72}
                        />
                      </div>
                    ))}
                    {(config.list_items || []).length < 10 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() =>
                          updateConfig("list_items", [
                            ...(config.list_items || []),
                            { id: getNextInteractiveId(config.list_items || [], "item"), title: "", description: "" },
                          ])
                        }
                      >
                        <Plus size={12} className="mr-1" /> Adicionar item
                      </Button>
                    )}
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* ===== CONDITION NODE ===== */}
          {node.type === "condition" && (
            <div className="space-y-4">
              {renderInfoBanner("Crie bifurcações no fluxo. Se a condição for verdadeira → Sim. Se falsa → Não.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de condição</Label>
                <Select value={config.condition_type || ""} onValueChange={(v) => updateConfig("condition_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="button_clicked">Clicou no botão</SelectItem>
                    <SelectItem value="keyword_match">Respondeu com palavra-chave</SelectItem>
                    <SelectItem value="responded">Respondeu qualquer coisa</SelectItem>
                    <SelectItem value="no_response">Não respondeu em X tempo</SelectItem>
                    <SelectItem value="has_tag">Possui tag (CRM)</SelectItem>
                    <SelectItem value="score_above">Score acima de</SelectItem>
                    <SelectItem value="is_customer">É cliente (vendas fechadas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.condition_type === "button_clicked" && (
                <div className="space-y-2">
                  <Label className="text-xs">ID ou texto do botão</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="btn_0 ou texto do botão"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.condition_type === "keyword_match" && (
                <div className="space-y-2">
                  <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="sim, quero, comprar"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Busca parcial, sem distinção de maiúsculas/acentos.</p>
                </div>
              )}
              {config.condition_type === "has_tag" && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome da tag no CRM</Label>
                  <Input
                    value={config.condition_value || ""}
                    onChange={(e) => updateConfig("condition_value", e.target.value)}
                    placeholder="qualificado, VIP, etc."
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Verifica se o lead possui esta tag no CRM.</p>
                </div>
              )}
              {config.condition_type === "score_above" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de verificação</Label>
                    <Select value={config.score_check_type || "number"} onValueChange={(v) => updateConfig("score_check_type", v)}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">Por número (score mínimo)</SelectItem>
                        <SelectItem value="category">Por categoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(config.score_check_type || "number") === "number" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Score mínimo</Label>
                      <Input
                        type="number"
                        value={config.condition_value || ""}
                        onChange={(e) => updateConfig("condition_value", e.target.value)}
                        placeholder="500"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {config.score_check_type === "category" && (
                    <div className="space-y-2">
                      <Label className="text-xs">Categoria mínima</Label>
                      <Select value={config.score_category || ""} onValueChange={(v) => updateConfig("score_category", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hot">🔥 Quente</SelectItem>
                          <SelectItem value="warm">🟡 Morno</SelectItem>
                          <SelectItem value="cold">❄️ Frio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
              {config.condition_type === "is_customer" && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Verifica se o lead possui <span className="font-semibold text-foreground">vendas fechadas</span> no CRM. Se sim → <span className="text-primary font-semibold">Sim</span>, senão → <span className="text-destructive font-semibold">Não</span>.
                    </p>
                  </div>
                </div>
              )}
              {config.condition_type === "no_response" && (
                <div className="space-y-2">
                  <Label className="text-xs">Timeout (minutos)</Label>
                  <Input
                    type="number"
                    value={config.timeout_minutes || ""}
                    onChange={(e) => updateConfig("timeout_minutes", parseInt(e.target.value) || 0)}
                    placeholder="60"
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Se o lead não responder dentro deste tempo, segue pelo caminho "Não".</p>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">Saída <span className="text-primary font-semibold">Sim</span> = condição verdadeira · <span className="text-destructive font-semibold">Não</span> = falsa</p>
            </div>
          )}

          {/* ===== WAIT NODE ===== */}
          {node.type === "wait" && (
            <div className="space-y-4">
              {renderInfoBanner("Pause o fluxo por um período antes de continuar para o próximo bloco.")}
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Tempo de espera</Label>
                  <Input
                    type="number"
                    value={config.delay_value || ""}
                    onChange={(e) => updateConfig("delay_value", parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="h-9 text-sm"
                    min={1}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-xs font-medium">Unidade</Label>
                  <Select value={config.delay_unit || "minutes"} onValueChange={(v) => updateConfig("delay_unit", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minutes">Minutos</SelectItem>
                      <SelectItem value="hours">Horas</SelectItem>
                      <SelectItem value="days">Dias</SelectItem>
                      <SelectItem value="weeks">Semanas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.smart !== false}
                    onCheckedChange={(v) => updateConfig("smart", v)}
                  />
                  <Label className="text-xs font-medium">Espera inteligente</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {config.smart !== false
                    ? "Se o lead responder antes do tempo, o fluxo avança imediatamente. Se não responder, segue após o timeout."
                    : "A espera será fixa, independente de o lead responder."}
                </p>
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.business_hours_only || false}
                    onCheckedChange={(v) => updateConfig("business_hours_only", v)}
                  />
                  <Label className="text-xs font-medium">Apenas horário comercial</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {config.business_hours_only
                    ? "O timer só conta durante o horário comercial. Ex: delay de 2h = 2h úteis (fora do horário o timer pausa)."
                    : "O delay conta normalmente, incluindo fora do horário comercial."}
                </p>
                {config.business_hours_only && (
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Início</Label>
                      <Input
                        type="time"
                        value={config.bh_start || "09:00"}
                        onChange={(e) => updateConfig("bh_start", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Fim</Label>
                      <Input
                        type="time"
                        value={config.bh_end || "18:00"}
                        onChange={(e) => updateConfig("bh_end", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== ACTION NODE ===== */}
          {node.type === "action" && (
            <ActionNodeConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== HANDOFF NODE ===== */}
          {node.type === "handoff" && (
            <HandoffNodeConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} renderApiIndicator={renderApiIndicator} />
          )}

          {/* ===== END NODE ===== */}
          {node.type === "end" && (
            <EndNodeConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} renderApiIndicator={renderApiIndicator} />
          )}

          {/* ===== AI AGENT NODE ===== */}
          {node.type === "ai_agent" && (
            <AIAgentConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} renderApiIndicator={renderApiIndicator} />
          )}

          {/* ===== A/B TEST NODE ===== */}
          {node.type === "ab_test" && (
            <div className="space-y-4">
              {renderInfoBanner("Divide os leads entre variantes e metrifica qual performa melhor. A medição é feita nos blocos conectados após cada variante.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Descrição do teste</Label>
                <Textarea
                  value={config.test_description || ""}
                  onChange={(e) => updateConfig("test_description", e.target.value)}
                  placeholder="Teste de abertura: mensagem formal vs informal"
                  className="text-sm min-h-[50px]"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Medições ({(config.objectives || [config.objective].filter(Boolean)).length}/4)</Label>
                  {(config.objectives || [config.objective].filter(Boolean)).length < 4 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => {
                        const current = config.objectives || (config.objective ? [config.objective] : []);
                        updateConfig("objectives", [...current, ""]);
                      }}
                    >
                      <Plus size={10} /> Adicionar medição
                    </Button>
                  )}
                </div>
                {(config.objectives || (config.objective ? [config.objective] : [""])).map((obj: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={obj || ""} onValueChange={(v) => {
                      const objs = [...(config.objectives || (config.objective ? [config.objective] : [""]))];
                      objs[idx] = v;
                      updateConfig("objectives", objs);
                      if (idx === 0) updateConfig("objective", v);
                    }}>
                      <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="response_rate">Taxa de resposta (TR)</SelectItem>
                        <SelectItem value="click_rate">Taxa de clique (CTR)</SelectItem>
                        <SelectItem value="conversion">Conversão (TC)</SelectItem>
                        <SelectItem value="handoff_rate">Transferência humano (TH)</SelectItem>
                      </SelectContent>
                    </Select>
                    {(config.objectives || []).length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                        const objs = (config.objectives || []).filter((_: any, j: number) => j !== idx);
                        updateConfig("objectives", objs);
                      }}>
                        <X size={12} />
                      </Button>
                    )}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground">A medição analisa os blocos conectados após cada variante.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Variantes</Label>
                <div className="space-y-2">
                  {(config.variants || []).map((v: any, i: number) => {
                    const isProtected = i < 2;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                          {String.fromCharCode(65 + i)}
                        </div>
                        <Input
                          value={v.name || ""}
                          onChange={(e) => {
                            const updated = [...(config.variants || [])];
                            updated[i] = { ...updated[i], name: e.target.value };
                            updateConfig("variants", updated);
                          }}
                          placeholder={`Variante ${String.fromCharCode(65 + i)}`}
                          className="h-8 text-sm flex-1"
                        />
                        <Input
                          type="number"
                          value={v.weight ?? 0}
                          onChange={(e) => {
                            const updated = [...(config.variants || [])];
                            updated[i] = { ...updated[i], weight: parseFloat(e.target.value) || 0 };
                            updateConfig("variants", updated);
                          }}
                          className="h-8 text-sm w-[72px] text-center"
                          min={0.01}
                          max={100}
                          step={0.01}
                        />
                        <span className="text-[10px] text-muted-foreground">%</span>
                        {!isProtected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => {
                              const updated = (config.variants || []).filter((_: any, j: number) => j !== i);
                              updateConfig("variants", updated);
                            }}
                          >
                            <X size={14} />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {(config.variants || []).length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const current = config.variants || [];
                        const letter = String.fromCharCode(65 + current.length);
                        const equalWeight = parseFloat((100 / (current.length + 1)).toFixed(2));
                        const updated = current.map((v: any) => ({ ...v, weight: equalWeight }));
                        updated.push({ id: `var_${letter.toLowerCase()}`, name: `Variante ${letter}`, weight: parseFloat((100 - equalWeight * current.length).toFixed(2)) });
                        updateConfig("variants", updated);
                      }}
                    >
                      <Plus size={12} className="mr-1" /> Adicionar variante
                    </Button>
                  )}
                </div>
                {(() => {
                  const total = (config.variants || []).reduce((s: number, v: any) => s + (parseFloat(v.weight) || 0), 0);
                  const isValid = Math.abs(total - 100) < 0.1;
                  return (
                    <p className={cn("text-[10px] font-medium", isValid ? "text-primary" : "text-destructive")}>
                      Soma: {total.toFixed(2)}% {isValid ? "✓" : "— deve ser 100%"}
                    </p>
                  );
                })()}
                <p className="text-[10px] text-muted-foreground">Números quebrados são permitidos (ex: 33.33%). A variante A e B não podem ser excluídas.</p>
              </div>
            </div>
          )}

          {/* ===== RANDOM SPLIT NODE ===== */}
          {node.type === "random_split" && (
            <div className="space-y-4">
              {renderInfoBanner("Distribui os leads aleatoriamente entre as saídas configuradas. Ideal para dividir fluxo sem critério específico.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Saídas ({(config.outputs || []).length})</Label>
                <div className="space-y-2">
                  {(config.outputs || []).map((o: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-sky-500/10 flex items-center justify-center text-[10px] font-bold text-sky-400 shrink-0">
                        {i + 1}
                      </div>
                      <Input
                        value={o.name || ""}
                        onChange={(e) => {
                          const updated = [...(config.outputs || [])];
                          updated[i] = { ...updated[i], name: e.target.value };
                          updateConfig("outputs", updated);
                        }}
                        placeholder={`Saída ${i + 1}`}
                        className="h-8 text-sm flex-1"
                      />
                      {(config.outputs || []).length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => {
                            const updated = (config.outputs || []).filter((_: any, j: number) => j !== i);
                            updateConfig("outputs", updated);
                          }}
                        >
                          <X size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(config.outputs || []).length < 5 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs"
                      onClick={() => {
                        const current = config.outputs || [];
                        updateConfig("outputs", [
                          ...current,
                          { id: `out_${current.length}`, name: `Saída ${current.length + 1}` },
                        ]);
                      }}
                    >
                      <Plus size={12} className="mr-1" /> Adicionar saída
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Cada lead é direcionado aleatoriamente para uma das saídas. Máximo de 5 saídas.</p>
              </div>
            </div>
          )}

          {/* ===== GOOGLE SHEETS NODE ===== */}
          {node.type === "google_sheets" && (
            <GoogleSheetsConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} allNodes={allNodes} />
          )}

          {/* ===== GOOGLE CALENDAR NODE ===== */}
          {node.type === "google_calendar" && (
            <GoogleCalendarConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== GMAIL NODE ===== */}
          {node.type === "gmail" && (
            <GmailConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
          )}

          {/* ===== DATA COLLECT NODE ===== */}
          {node.type === "data_collect" && (
            <div className="space-y-4">
              {renderApiIndicator()}
              {renderInfoBanner("Envie uma pergunta ao lead e colete a resposta usando IA. O dado extraído é armazenado em uma variável para uso no restante do fluxo.")}

              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de dado a coletar</Label>
                <Select value={config.collect_type || ""} onValueChange={(v) => updateConfig("collect_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="address">Endereço</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.collect_type === "custom" && (
                <div className="space-y-2">
                  <Label className="text-xs">Descrição do dado</Label>
                  <Input
                    value={config.custom_description || ""}
                    onChange={(e) => updateConfig("custom_description", e.target.value)}
                    placeholder="Ex: data de nascimento, cidade de interesse..."
                    className="h-9 text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">Descreva o que a IA deve extrair da resposta do lead.</p>
                </div>
              )}

              {/* AI Explanation - collapsible */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 overflow-hidden">
                <button
                  onClick={() => updateConfig("_ai_info_open", !config._ai_info_open)}
                  className="flex items-center justify-between w-full p-2.5 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-primary shrink-0" />
                    <p className="text-[11px] text-primary font-medium">🤖 Como a IA funciona aqui</p>
                  </div>
                  <ChevronUp size={12} className={cn("text-primary transition-transform", config._ai_info_open ? "rotate-0" : "rotate-180")} />
                </button>
                {config._ai_info_open && (
                  <div className="px-2.5 pb-2.5">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Com base no <span className="font-semibold text-foreground">tipo de informação</span> selecionado acima, a IA vai analisar a resposta do lead, identificar o dado correspondente e armazená-lo na variável configurada. A IA não responde nada ao lead — apenas extrai a informação silenciosamente.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-muted-foreground" />
                  <Label className="text-xs font-medium">Conteúdo da pergunta</Label>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "text", label: "Mensagem de texto" },
                      { value: "audio", label: "Áudio" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateConfig("question_type", opt.value)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs font-medium text-center transition-colors",
                          (config.question_type || "text") === opt.value
                            ? "border-teal-500/40 bg-teal-500/10 text-foreground"
                            : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {(config.question_type || "text") === "text" && (
                    <Textarea
                      value={config.question_text || ""}
                      onChange={(e) => updateConfig("question_text", e.target.value)}
                      placeholder="Qual é o seu nome completo?"
                      className="text-sm min-h-[60px]"
                    />
                  )}

                  {config.question_type === "audio" && (
                    <div className="p-3 rounded-lg border border-border/40 bg-muted/20">
                      <p className="text-[10px] text-muted-foreground">Configure o áudio na seção de mídia do construtor de mensagens ao salvar.</p>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Você pode usar variáveis como {"{nome}"}, {"{empresa}"}, {"{telefone}"} e também as criadas por você em outros blocos de coleta.
                </p>
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Delay inteligente</Label>
                  <Switch
                    checked={config.use_delay || false}
                    onCheckedChange={(v) => updateConfig("use_delay", v)}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Aguarda um tempo aleatório entre o mínimo e máximo antes de enviar a pergunta, simulando digitação humana para parecer mais natural.
                </p>
                {config.use_delay && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Mínimo (seg)</Label>
                      <Input
                        type="number"
                        value={config.delay_min || 5}
                        onChange={(e) => updateConfig("delay_min", Math.max(5, parseInt(e.target.value) || 5))}
                        className="h-8 text-xs"
                        min={5}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Máximo (seg)</Label>
                      <Input
                        type="number"
                        value={config.delay_max || 15}
                        onChange={(e) => updateConfig("delay_max", Math.max(5, parseInt(e.target.value) || 15))}
                        className="h-8 text-xs"
                        min={5}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Tentativas de coleta</Label>
                <Select value={String(config.max_retries || 2)} onValueChange={(v) => updateConfig("max_retries", parseInt(v))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 tentativa</SelectItem>
                    <SelectItem value="2">2 tentativas</SelectItem>
                    <SelectItem value="3">3 tentativas</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Se a IA não conseguir extrair o dado, reenvia a pergunta até o limite de tentativas.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Mensagem de erro (se não conseguir coletar)</Label>
                <Input
                  value={config.error_message || ""}
                  onChange={(e) => updateConfig("error_message", e.target.value)}
                  placeholder="Desculpe, não entendi. Poderia repetir?"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Nome da variável</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">{"{"}</span>
                  <Input
                    value={config.variable_name || ""}
                    onChange={(e) => updateConfig("variable_name", e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                    placeholder="nome_do_lead"
                    className="h-9 text-sm font-mono flex-1"
                    maxLength={30}
                  />
                  <span className="text-sm text-muted-foreground">{"}"}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Use essa variável nos próximos blocos. Ex: {"{nome_do_lead}"}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-border">
            <Button onClick={handleSave} className="flex-1 h-9 text-sm">
              Salvar configuração
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
