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
import { Trash2, Plus, X, Upload, Info, MessageSquare, Image, FileAudio, Video, FileText, FileUp, AlertTriangle, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
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
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" />
            <span className="text-xs font-medium text-foreground">{label} conectado</span>
          </div>
          <p className="text-[10px] text-muted-foreground">📧 {googleToken?.google_email}</p>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-destructive hover:text-destructive" onClick={handleDisconnect}>
            Desconectar conta
          </Button>
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

const AVAILABLE_VARIABLES = [
  { key: "{nome}", label: "Nome do contato" },
  { key: "{telefone}", label: "Telefone" },
  { key: "{email}", label: "Email" },
  { key: "{empresa}", label: "Empresa" },
  { key: "{cidade}", label: "Cidade" },
  { key: "{origem}", label: "Origem" },
  { key: "{data}", label: "Data atual" },
  { key: "{hora}", label: "Hora atual" },
];

function VariablesHelper() {
  return (
    <div className="p-2 rounded-lg border border-border/30 bg-muted/10">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">📌 Variáveis disponíveis:</p>
      <div className="flex flex-wrap gap-1">
        {AVAILABLE_VARIABLES.map((v) => (
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

function GoogleSheetsConfig({ config, updateConfig, renderInfoBanner }: { config: any; updateConfig: (k: string, v: any) => void; renderInfoBanner: (t: string) => JSX.Element }) {
  const { user, googleToken, isConnected, isConnecting, handleConnect, handleDisconnect } = useGoogleAuth("sheets", [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

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

  const { data: sheetTabs = [] } = useQuery({
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
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-list-spreadsheets", {
        body: { user_id: user!.id, action: "create", title: newSheetName || "Wiize - Leads" },
      });
      if (error) throw error;
      if (data?.spreadsheet) {
        updateConfig("spreadsheet_id", data.spreadsheet.id);
        updateConfig("spreadsheet_name", data.spreadsheet.name);
        setShowCreate(false);
        setNewSheetName("");
        refetchSheets();
      }
    } catch (err) {
      console.error("Failed to create spreadsheet:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const columns = config.columns || [
    { key: "nome", label: "Nome", variable: "{nome}" },
    { key: "email", label: "Email", variable: "{email}" },
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
      {renderInfoBanner("Salve os dados do lead automaticamente em uma planilha do Google Sheets.")}

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
              <div className="flex gap-2 mt-1">
                <Input
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="Nome da nova planilha"
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" className="h-8 text-xs" onClick={handleCreateSpreadsheet} disabled={isCreating}>
                  {isCreating ? <Loader2 size={12} className="animate-spin" /> : "Criar"}
                </Button>
              </div>
            )}
          </div>

          {config.spreadsheet_id && sheetTabs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Aba da planilha</Label>
              <Select
                value={config.sheet_name || sheetTabs[0]?.title || ""}
                onValueChange={(v) => updateConfig("sheet_name", v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
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
                      {AVAILABLE_VARIABLES.map((v) => (
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

          <VariablesHelper />
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: Node;
  onUpdate: (nodeId: string, config: any, label?: string) => void;
  onDelete: (nodeId: string) => void;
  entryApiType?: string;
  entryConfig?: any;
}

export function WANodeConfigDrawer({ open, onOpenChange, node, onUpdate, onDelete, entryApiType = "evolution", entryConfig = {} }: Props) {
  const [config, setConfig] = useState<any>({});
  const [label, setLabel] = useState("");

  useEffect(() => {
    setConfig((node.data as any).config || {});
    setLabel(String((node.data as any).label || ""));
  }, [node]);

  const handleSave = () => {
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
    if (node.type === "entry") return null;
    if (noEntryConfigured) {
      return (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-500 leading-relaxed">
            <span className="font-semibold">Nenhum número configurado.</span> Configure o bloco de Entrada para definir qual API será usada.
          </p>
        </div>
      );
    }
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
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full pointer-events-none shadow-none"
        )}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

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
            <div className="space-y-4">
              {renderInfoBanner("Execute ações no sistema: CRM, tags, pipeline, webhooks.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tipo de ação</Label>
                <Select value={config.action_type || ""} onValueChange={(v) => updateConfig("action_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add_tag">Adicionar tag</SelectItem>
                    <SelectItem value="remove_tag">Remover tag</SelectItem>
                    <SelectItem value="update_field">Atualizar campo do lead</SelectItem>
                    <SelectItem value="move_pipeline">Mover para etapa do pipeline</SelectItem>
                    <SelectItem value="send_to_crm">Criar/atualizar lead no CRM</SelectItem>
                    <SelectItem value="webhook">Disparar webhook externo</SelectItem>
                    <SelectItem value="mark_hot">Marcar como quente 🔥</SelectItem>
                    <SelectItem value="mark_cold">Marcar como frio ❄️</SelectItem>
                    <SelectItem value="mark_converted">Marcar como convertido ✅</SelectItem>
                    <SelectItem value="update_score">Atualizar score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(config.action_type === "add_tag" || config.action_type === "remove_tag") && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome da tag</Label>
                  <Input
                    value={config.tag_value || ""}
                    onChange={(e) => updateConfig("tag_value", e.target.value)}
                    placeholder="qualificado, interessado, etc."
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "update_field" && (
                <div className="space-y-2">
                  <Label className="text-xs">Campo</Label>
                  <Select value={config.field_name || ""} onValueChange={(v) => updateConfig("field_name", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact_name">Nome</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="company_name">Empresa</SelectItem>
                      <SelectItem value="city">Cidade</SelectItem>
                      <SelectItem value="origin">Origem</SelectItem>
                      <SelectItem value="category">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">Novo valor</Label>
                  <Input
                    value={config.field_value || ""}
                    onChange={(e) => updateConfig("field_value", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "move_pipeline" && (
                <div className="space-y-2">
                  <Label className="text-xs">Nome da etapa de destino</Label>
                  <Input
                    value={config.pipeline_stage || ""}
                    onChange={(e) => updateConfig("pipeline_stage", e.target.value)}
                    placeholder="Em negociação"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {config.action_type === "webhook" && (
                <div className="space-y-2">
                  <Label className="text-xs">URL do Webhook</Label>
                  <Input
                    value={config.webhook_url || ""}
                    onChange={(e) => updateConfig("webhook_url", e.target.value)}
                    placeholder="https://seu-webhook.com/endpoint"
                    className="h-9 text-sm"
                  />
                  <Label className="text-xs">Método</Label>
                  <Select value={config.webhook_method || "POST"} onValueChange={(v) => updateConfig("webhook_method", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs">Headers extras (JSON, opcional)</Label>
                  <Textarea
                    value={config.webhook_headers || ""}
                    onChange={(e) => updateConfig("webhook_headers", e.target.value)}
                    placeholder='{"Authorization": "Bearer ..."}'
                    className="text-xs min-h-[50px] font-mono"
                  />
                </div>
              )}
              {config.action_type === "update_score" && (
                <div className="space-y-2">
                  <Label className="text-xs">Pontos a adicionar (+) ou remover (-)</Label>
                  <Input
                    type="number"
                    value={config.score_delta || ""}
                    onChange={(e) => updateConfig("score_delta", parseInt(e.target.value) || 0)}
                    placeholder="50"
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* ===== HANDOFF NODE ===== */}
          {node.type === "handoff" && (
            <div className="space-y-4">
              {renderApiIndicator()}
              {renderInfoBanner("Transfere a conversa para atendimento humano e pausa a automação neste lead.")}
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.stop_automation !== false}
                    onCheckedChange={(v) => updateConfig("stop_automation", v)}
                  />
                  <Label className="text-xs font-medium">Parar automação neste lead</Label>
                </div>
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.notify_team || false}
                    onCheckedChange={(v) => updateConfig("notify_team", v)}
                  />
                  <Label className="text-xs font-medium">Notificar equipe</Label>
                </div>
                {config.notify_team && (
                  <div className="space-y-2">
                    <Label className="text-[10px]">Mensagem de notificação</Label>
                    <Input
                      value={config.notification_message || ""}
                      onChange={(e) => updateConfig("notification_message", e.target.value)}
                      placeholder="Lead qualificado aguardando atendimento"
                      className="h-8 text-xs"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mensagem ao lead (opcional)</Label>
                <Textarea
                  value={config.handoff_message || ""}
                  onChange={(e) => updateConfig("handoff_message", e.target.value)}
                  placeholder="Um de nossos especialistas vai te atender em breve!"
                  className="text-sm min-h-[60px]"
                />
              </div>
            </div>
          )}

          {/* ===== END NODE ===== */}
          {node.type === "end" && (
            <div className="space-y-4">
              {renderApiIndicator()}
              {renderInfoBanner("Encerra o fluxo para este lead. Opcionalmente envie uma mensagem final.")}
              <div className="space-y-2">
                <Label className="text-xs">Mensagem de encerramento (opcional)</Label>
                <Textarea
                  value={config.end_message || ""}
                  onChange={(e) => updateConfig("end_message", e.target.value)}
                  placeholder="Obrigado pelo contato! Até a próxima."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.mark_completed || false}
                  onCheckedChange={(v) => updateConfig("mark_completed", v)}
                />
                <Label className="text-xs">Marcar lead como "atendido" no CRM</Label>
              </div>
            </div>
          )}

          {/* ===== AI AGENT NODE ===== */}
          {node.type === "ai_agent" && (
            <div className="space-y-4">
              {renderApiIndicator()}
              {renderInfoBanner("Configure um agente de IA que analisa a resposta do lead e decide o próximo passo automaticamente.")}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Prompt do sistema (instrução para a IA)</Label>
                <Textarea
                  value={config.system_prompt || ""}
                  onChange={(e) => updateConfig("system_prompt", e.target.value)}
                  placeholder="Você é um assistente de vendas. Analise a resposta do lead e classifique como: INTERESSADO, INDECISO ou NÃO_INTERESSADO. Responda de forma natural e direcione para o fechamento."
                  className="text-sm min-h-[120px]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Modelo de IA</Label>
                <Select value={config.ai_model || "gpt-4o-mini"} onValueChange={(v) => updateConfig("ai_model", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (rápido)</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o (avançado)</SelectItem>
                    <SelectItem value="gemini-2.5-flash">Gemini Flash (rápido)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">O que a IA deve retornar?</Label>
                <Select value={config.ai_output_type || "message_and_route"} onValueChange={(v) => updateConfig("ai_output_type", v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message_only">Apenas responder ao lead</SelectItem>
                    <SelectItem value="route_only">Apenas direcionar (sem resposta)</SelectItem>
                    <SelectItem value="message_and_route">Responder e direcionar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Direcionamentos possíveis (um por linha)</Label>
                <Textarea
                  value={config.ai_routes || ""}
                  onChange={(e) => updateConfig("ai_routes", e.target.value)}
                  placeholder={"INTERESSADO → seguir para proposta\nINDECISO → enviar mais informações\nNÃO_INTERESSADO → encerrar fluxo"}
                  className="text-sm min-h-[80px] font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Cada direcionamento gera uma saída no nó. Conecte ao próximo bloco no canvas.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Contexto extra (opcional)</Label>
                <Textarea
                  value={config.ai_context || ""}
                  onChange={(e) => updateConfig("ai_context", e.target.value)}
                  placeholder="Informações sobre a empresa, produtos, preços, etc."
                  className="text-sm min-h-[60px]"
                />
              </div>
              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.ai_memory || false}
                    onCheckedChange={(v) => updateConfig("ai_memory", v)}
                  />
                  <Label className="text-xs font-medium">Memória de conversa</Label>
                </div>
                <p className="text-[10px] text-muted-foreground">A IA recebe todo o histórico da conversa para contexto.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Máx. caracteres na resposta</Label>
                <Input
                  type="number"
                  value={config.max_chars || "500"}
                  onChange={(e) => updateConfig("max_chars", parseInt(e.target.value) || 500)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
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
                          className="h-8 text-sm w-20 text-center"
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
            <GoogleSheetsConfig config={config} updateConfig={updateConfig} renderInfoBanner={renderInfoBanner} />
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

              <div className="space-y-2">
                <Label className="text-xs font-medium">Conteúdo da pergunta</Label>
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
              </div>

              <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Smart Delay</Label>
                  <Switch
                    checked={config.use_delay || false}
                    onCheckedChange={(v) => updateConfig("use_delay", v)}
                  />
                </div>
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
