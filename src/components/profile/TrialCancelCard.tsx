import { useState } from "react";
import { Calendar, ShieldCheck, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Card no Perfil para o usuário em trial com cartão cadastrado.
 * Permite cancelar a ativação automática antes do 7º dia.
 * Tratamento da copy: o cartão é uma garantia de compromisso, não uma cobrança.
 */
export const TrialCancelCard = () => {
  const { profile } = useAuth();
  const p = profile as unknown as Record<string, unknown> | null;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const willCharge = p?.trial_will_charge_at as string | undefined;
  const cancelled = p?.trial_auto_charge_cancelled as boolean | undefined;
  const last4 = p?.trial_card_last4 as string | undefined;
  const planChosen = p?.trial_plan_chosen as string | undefined;
  const subId = p?.trial_asaas_subscription_id as string | undefined;

  // Exibe enquanto houver uma assinatura de trial agendada (independente do plan,
  // pois agora o trial já ativa o plano escolhido — Start/Growth/Scale)
  if (!subId || !willCharge) return null;
  // Se a cobrança já passou, não é mais trial
  if (new Date(willCharge).getTime() < Date.now()) return null;

  const planLabel =
    planChosen === "growth" ? "Wiize Growth" : planChosen === "scale" ? "Wiize Enterprise" : "Wiize Start";
  const planValue =
    planChosen === "growth" ? "R$ 696" : planChosen === "scale" ? "Personalizado" : "R$ 296";
  const chargeDate = willCharge ? new Date(willCharge) : null;

  const handleCancel = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-trial-subscription");
      if (error || (data as { error?: string })?.error) {
        throw new Error((data as { error?: string })?.error || error?.message || "Erro ao cancelar");
      }
      toast({
        title: "Ativação automática cancelada",
        description:
          "Você não será cobrado. Continue usando até o fim do teste de 7 dias sem nenhum compromisso.",
      });
      // Recarrega para sincronizar o profile
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast({
        title: "Erro ao cancelar",
        description: e instanceof Error ? e.message : "Tente novamente em instantes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Ativação automática após o teste
        </CardTitle>
        <CardDescription>
          Seu cartão foi cadastrado como garantia de compromisso — não como cobrança imediata.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {cancelled ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-semibold text-foreground">Ativação automática cancelada</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Você não será cobrado. Pode continuar usando o Wiize normalmente até o fim do
                período de teste. Depois disso, a conta volta para o plano gratuito limitado.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/50">
              <Calendar className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-foreground">
                  {chargeDate
                    ? `Plano ${planLabel} ativa em ${format(chargeDate, "dd 'de' MMMM", { locale: ptBR })}`
                    : `Plano ${planLabel} ativa após o teste`}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  No fim do seu teste de 7 dias, ativamos automaticamente o plano{" "}
                  <strong>{planLabel}</strong> ({planValue}/mês) no cartão final{" "}
                  <strong>**** {last4 || "----"}</strong>. Se você não quer continuar, cancele
                  abaixo e nada será cobrado.
                </p>
                <div className="flex items-center gap-2 mt-3 text-[11px] text-muted-foreground">
                  <CreditCard size={12} /> O cartão serve para separar quem testa por curiosidade
                  de quem realmente quer transformar a prospecção. Sem ele, a plataforma vira um
                  parquinho de testes infinitos.
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...
                    </>
                  ) : (
                    "Cancelar ativação automática"
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar ativação automática?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao confirmar, <strong>nenhuma cobrança será feita</strong> no seu cartão. Você
                    continua usando o Wiize normalmente até o fim do período de teste. Depois
                    disso, a conta volta para o plano gratuito limitado e você pode reativar
                    quando quiser.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>
                    Sim, cancelar ativação
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
};
