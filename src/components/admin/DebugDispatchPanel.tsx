import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Play, ChevronDown, ChevronRight, Download, Copy, Clock, CheckCircle, XCircle,
  AlertTriangle, Loader2, Bug, Zap, Shield, Server, Settings, Send, ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DebugStep {
  id: string;
  name: string;
  status: 'success' | 'error' | 'warning' | 'skipped' | 'running';
  duration_ms: number;
  category?: string;
  error_code?: string | number;
  error_message?: string;
  suggestion?: string;
  stack_trace?: string;
  error_file?: string;
  error_line?: number;
  error_column?: number;
  details?: Record<string, unknown>;
  payload_sent?: unknown;
  payload_received?: unknown;
  headers_sent?: Record<string, string>;
  headers_received?: Record<string, string>;
}

interface DebugResult {
  trace_id: string;
  overall_status: 'success' | 'partial' | 'error';
  overall_category: string;
  total_duration_ms: number;
  dry_run: boolean;
  deep_debug: boolean;
  timestamp: string;
  steps: DebugStep[];
  global_error?: {
    category: string;
    error_message: string;
    suggestion: string;
  };
  summary: {
    total_steps: number;
    success: number;
    warnings: number;
    errors: number;
    skipped: number;
  };
}

interface WhatsAppNumber {
  id: string;
  name: string;
  instance_name: string | null;
  phone_number: string | null;
  is_connected: boolean;
}

interface DebugDispatchPanelProps {
  numbers: WhatsAppNumber[];
}

const statusConfig = {
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'OK' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Erro' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Warning' },
  skipped: { icon: ArrowRight, color: 'text-muted-foreground', bg: 'bg-muted/30 border-border', label: 'Pulado' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Executando' },
};

const categoryBadge: Record<string, { color: string; label: string }> = {
  ok: { color: 'bg-emerald-500/20 text-emerald-300', label: '🟢 OK' },
  warning: { color: 'bg-yellow-500/20 text-yellow-300', label: '🟡 Warning' },
  internal_error: { color: 'bg-red-500/20 text-red-300', label: '🔴 Erro Interno' },
  edge_error: { color: 'bg-red-500/20 text-red-300', label: '🔴 Erro Edge' },
  external_error: { color: 'bg-blue-500/20 text-blue-300', label: '🔵 Erro Externo' },
  infra_error: { color: 'bg-purple-500/20 text-purple-300', label: '🟣 Infraestrutura' },
  config_error: { color: 'bg-zinc-500/20 text-zinc-300', label: '⚫ Configuração' },
};

export function DebugDispatchPanel({ numbers }: DebugDispatchPanelProps) {
  const [selectedNumberId, setSelectedNumberId] = useState(numbers[0]?.id || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá! Mensagem de teste do sistema de debug. 🔍');
  const [deepDebug, setDeepDebug] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const resultRef = useRef<HTMLDivElement>(null);

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (result) setExpandedSteps(new Set(result.steps.map(s => s.id)));
  };

  const collapseAll = () => setExpandedSteps(new Set());

  const runDebug = async () => {
    if (!selectedNumberId) {
      toast.error('Selecione um número');
      return;
    }
    if (!phone) {
      toast.error('Informe o telefone de destino');
      return;
    }

    setIsRunning(true);
    setResult(null);
    setExpandedSteps(new Set());

    try {
      console.log('[DebugDispatch] Chamando via supabase.functions.invoke...');

      const { data, error: invokeError } = await supabase.functions.invoke('debug-dispatch-test', {
        body: { numberId: selectedNumberId, phone, message, deepDebug, dryRun },
      });

      console.log('[DebugDispatch] Response:', { data, error: invokeError });

      if (invokeError) {
        console.error('[DebugDispatch] Invoke error:', invokeError);
        toast.error(`Erro ao executar debug: ${invokeError.message}`);
        return;
      }

      setResult(data as DebugResult);

      // Auto-expand error steps
      const errorSteps = (data as DebugResult).steps.filter(s => s.status === 'error').map(s => s.id);
      setExpandedSteps(new Set(errorSteps));

      if ((data as DebugResult).overall_status === 'success') {
        toast.success('Debug concluído com sucesso!');
      } else if ((data as DebugResult).overall_status === 'partial') {
        toast.warning('Debug concluído com warnings');
      } else {
        toast.error('Debug encontrou erros');
      }

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-dispatch-${result.trace_id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Log exportado!');
  };

  const copyTraceId = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.trace_id);
    toast.success('Trace ID copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Config Panel */}
      <Card className="border-border/50 bg-card/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bug className="h-5 w-5 text-primary" />
            Debug de Disparo Avançado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número WhatsApp</Label>
              <Select value={selectedNumberId} onValueChange={setSelectedNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o número" />
                </SelectTrigger>
                <SelectContent>
                  {numbers.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name} {n.is_connected ? '🟢' : '🔴'} {n.phone_number || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Telefone Destino</Label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="5511999999999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Mensagem de Teste</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={dryRun} onCheckedChange={setDryRun} id="dry-run" />
              <Label htmlFor="dry-run" className="cursor-pointer text-sm">
                Dry-Run <span className="text-muted-foreground">(não envia de verdade)</span>
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={deepDebug} onCheckedChange={setDeepDebug} id="deep-debug" />
              <Label htmlFor="deep-debug" className="cursor-pointer text-sm">
                <Bug className="inline h-3.5 w-3.5 mr-1" />
                Deep Debug <span className="text-muted-foreground">(logs verbosos)</span>
              </Label>
            </div>
          </div>

          <Button onClick={runDebug} disabled={isRunning} className="w-full md:w-auto" size="lg">
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executando debug...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Executar Debug
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div ref={resultRef} className="space-y-4">
          {/* Summary */}
          <Card className={`border ${
            result.overall_status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
            result.overall_status === 'partial' ? 'border-yellow-500/30 bg-yellow-500/5' :
            'border-red-500/30 bg-red-500/5'
          }`}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">{result.overall_category}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.summary.success}/{result.summary.total_steps} etapas OK
                    {result.summary.warnings > 0 && ` • ${result.summary.warnings} warnings`}
                    {result.summary.errors > 0 && ` • ${result.summary.errors} erros`}
                    {' • '}
                    {(result.total_duration_ms / 1000).toFixed(2)}s total
                    {result.dry_run && ' • DRY-RUN'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={copyTraceId}>
                    <Copy className="h-3 w-3" />
                    Trace: {result.trace_id}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportJSON}>
                    <Download className="h-3 w-3" />
                    Export JSON
                  </Button>
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expandir Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Recolher
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Global Error */}
          {result.global_error && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-300">Erro Fatal</h4>
                    <p className="text-sm mt-1">{result.global_error.error_message}</p>
                    {result.global_error.suggestion && (
                      <p className="text-sm text-yellow-300 mt-2">💡 {result.global_error.suggestion}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Timeline de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {result.steps.map((step, idx) => {
                  const config = statusConfig[step.status];
                  const Icon = config.icon;
                  const isExpanded = expandedSteps.has(step.id);
                  const catBadge = step.category ? categoryBadge[step.category] : null;

                  return (
                    <Collapsible key={step.id} open={isExpanded} onOpenChange={() => toggleStep(step.id)}>
                      <CollapsibleTrigger className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/10 ${config.bg}`}>
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center shrink-0">
                          <Icon className={`h-5 w-5 ${config.color} ${step.status === 'running' ? 'animate-spin' : ''}`} />
                          {idx < result.steps.length - 1 && (
                            <div className="w-px h-4 bg-border/50 mt-1" />
                          )}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <span className="text-sm font-medium">{step.name}</span>
                          {step.error_message && (
                            <p className="text-xs text-red-400 truncate mt-0.5">{step.error_message}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {catBadge && step.category !== 'ok' && (
                            <Badge variant="outline" className={`text-[10px] ${catBadge.color} border-0`}>
                              {catBadge.label}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            {step.duration_ms}ms
                          </span>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="ml-10 mt-1 mb-2">
                        <div className="rounded-lg border border-border/30 bg-background/50 p-4 space-y-3 text-sm">
                          {/* Suggestion */}
                          {step.suggestion && (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
                              <Zap className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                              <span className="text-yellow-300">{step.suggestion}</span>
                            </div>
                          )}

                          {/* Error location */}
                          {step.error_file && (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/5 border border-red-500/20">
                              <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                              <div className="space-y-1">
                                <span className="text-red-300 text-xs font-semibold uppercase">Local do Erro</span>
                                <p className="text-sm font-mono text-red-200">
                                  📄 {step.error_file}
                                  {step.error_line && <> — <span className="text-red-400 font-bold">Linha {step.error_line}</span></>}
                                  {step.error_column && <>, Coluna {step.error_column}</>}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Stack trace */}
                          {step.stack_trace && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Stack Trace</h5>
                              <pre className="text-xs bg-zinc-900/50 rounded p-3 overflow-x-auto max-h-36 border border-red-500/20 text-red-300 whitespace-pre-wrap">
                                {step.stack_trace}
                              </pre>
                            </div>
                          )}

                          {/* Error details */}
                          {step.error_code && (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">HTTP Status:</span>
                              <Badge variant="destructive">{step.error_code}</Badge>
                            </div>
                          )}

                          {/* Details */}
                          {step.details && Object.keys(step.details).length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Detalhes</h5>
                              <pre className="text-xs bg-zinc-900/50 rounded p-3 overflow-x-auto max-h-48 border border-border/20">
                                {JSON.stringify(step.details, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Payload sent */}
                          {step.payload_sent && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Payload Enviado</h5>
                              <pre className="text-xs bg-zinc-900/50 rounded p-3 overflow-x-auto max-h-36 border border-border/20">
                                {JSON.stringify(step.payload_sent, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Payload received */}
                          {step.payload_received && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Payload Recebido</h5>
                              <pre className="text-xs bg-zinc-900/50 rounded p-3 overflow-x-auto max-h-36 border border-border/20">
                                {JSON.stringify(step.payload_received, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* Headers */}
                          {step.headers_received && Object.keys(step.headers_received).length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-muted-foreground uppercase mb-1">Headers da Resposta</h5>
                              <pre className="text-xs bg-zinc-900/50 rounded p-3 overflow-x-auto max-h-36 border border-border/20">
                                {JSON.stringify(step.headers_received, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
