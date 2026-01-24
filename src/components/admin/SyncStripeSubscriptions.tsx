/**
 * =============================================================================
 * SyncStripeSubscriptions - Ferramenta para sincronizar assinaturas Stripe
 * =============================================================================
 * 
 * Permite sincronizar manualmente usuários criados após migração de banco
 * de dados com suas assinaturas existentes no Stripe.
 * 
 * Uso: Apenas para admins
 * =============================================================================
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface SyncResult {
  email: string;
  status: 'synced' | 'no_subscription' | 'already_correct' | 'error';
  previousPlan?: string;
  newPlan?: string;
  message?: string;
}

interface SyncSummary {
  total: number;
  synced: number;
  alreadyCorrect: number;
  noSubscription: number;
  errors: number;
}

export const SyncStripeSubscriptions = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [emailFilter, setEmailFilter] = useState("");
  const [results, setResults] = useState<SyncResult[] | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    setResults(null);
    setSummary(null);

    try {
      const emails = emailFilter
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const { data, error } = await supabase.functions.invoke('sync-stripe-subscriptions', {
        body: emails.length > 0 ? { emails } : {},
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results);
      setSummary(data.summary);

      toast({
        title: "Sincronização concluída",
        description: `${data.summary.synced} usuários sincronizados, ${data.summary.alreadyCorrect} já corretos`,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Não foi possível sincronizar com o Stripe",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 size={14} className="text-success" />;
      case 'already_correct':
        return <CheckCircle2 size={14} className="text-muted-foreground" />;
      case 'error':
        return <XCircle size={14} className="text-destructive" />;
      default:
        return <AlertTriangle size={14} className="text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-success/20 text-success border-success/30">Sincronizado</Badge>;
      case 'already_correct':
        return <Badge variant="outline">Já correto</Badge>;
      case 'no_subscription':
        return <Badge variant="secondary">Sem assinatura</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard size={20} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Sincronizar Assinaturas Stripe</h3>
          <p className="text-sm text-muted-foreground">
            Vincular usuários às suas assinaturas existentes no Stripe
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-filter">
            Emails (opcional - separados por vírgula)
          </Label>
          <Input
            id="email-filter"
            placeholder="usuario@email.com, outro@email.com"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            disabled={isSyncing}
          />
          <p className="text-xs text-muted-foreground">
            Deixe vazio para sincronizar todos os usuários
          </p>
        </div>

        <Button
          onClick={handleSync}
          disabled={isSyncing}
          className="gap-2"
        >
          {isSyncing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw size={16} />
              Sincronizar com Stripe
            </>
          )}
        </Button>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-border">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-success/10">
              <div className="text-2xl font-bold text-success">{summary.synced}</div>
              <div className="text-xs text-muted-foreground">Sincronizados</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{summary.alreadyCorrect}</div>
              <div className="text-xs text-muted-foreground">Já corretos</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-warning/10">
              <div className="text-2xl font-bold text-warning">{summary.noSubscription}</div>
              <div className="text-xs text-muted-foreground">Sem assinatura</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive">{summary.errors}</div>
              <div className="text-xs text-muted-foreground">Erros</div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <Accordion type="single" collapsible className="pt-2">
            <AccordionItem value="results" className="border-0">
              <AccordionTrigger className="text-sm hover:no-underline">
                Ver detalhes ({results.length} usuários)
              </AccordionTrigger>
              <AccordionContent>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusIcon(result.status)}
                        <span className="truncate">{result.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {result.previousPlan && result.newPlan && result.previousPlan !== result.newPlan && (
                          <span className="text-xs text-muted-foreground">
                            {result.previousPlan} → {result.newPlan}
                          </span>
                        )}
                        {getStatusBadge(result.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </div>
    </div>
  );
};
