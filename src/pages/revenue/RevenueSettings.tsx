import { useState, useEffect } from "react";
import { Save, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRevenueSettings } from "@/hooks/useRevenueData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const RevenueSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useRevenueSettings();
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [form, setForm] = useState({
    default_ticket_value: 3000,
    default_close_rate_cold: 0.05,
    default_close_rate_engaged: 0.15,
    default_close_rate_hot: 0.35,
    default_close_rate_very_hot: 0.55,
    sla_first_response_minutes: 5,
    risk_no_reply_hours: 24,
    cooldown_decay_per_day: 0.06,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        default_ticket_value: settings.default_ticket_value,
        default_close_rate_cold: settings.default_close_rate_cold,
        default_close_rate_engaged: settings.default_close_rate_engaged,
        default_close_rate_hot: settings.default_close_rate_hot,
        default_close_rate_very_hot: settings.default_close_rate_very_hot,
        sla_first_response_minutes: settings.sla_first_response_minutes,
        risk_no_reply_hours: settings.risk_no_reply_hours,
        cooldown_decay_per_day: settings.cooldown_decay_per_day,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (settings) {
        const { error } = await supabase
          .from("revenue_settings")
          .update(form as any)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("revenue_settings")
          .insert({ ...form, user_id: user.id } as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["revenue-settings"] });
      toast.success("Configurações salvas!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedRules = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const { error } = await supabase.rpc("seed_revenue_score_rules", {
        p_user_id: user.id,
      });
      if (error) throw error;
      toast.success("Regras de score criadas com sucesso!");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configurações do Wiize Revenue
        </p>
      </div>

      {/* Ticket & Close Rates */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Projeções Financeiras</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Ticket Médio (R$)</Label>
            <Input
              type="number"
              value={form.default_ticket_value}
              onChange={(e) =>
                setForm((f) => ({ ...f, default_ticket_value: Number(e.target.value) }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Taxa Cold (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_close_rate_cold * 100}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_close_rate_cold: Number(e.target.value) / 100 }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Taxa Engaged (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_close_rate_engaged * 100}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    default_close_rate_engaged: Number(e.target.value) / 100,
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Taxa Hot (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_close_rate_hot * 100}
                onChange={(e) =>
                  setForm((f) => ({ ...f, default_close_rate_hot: Number(e.target.value) / 100 }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Taxa Very Hot (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_close_rate_very_hot * 100}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    default_close_rate_very_hot: Number(e.target.value) / 100,
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SLA & Risk */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">SLA & Risco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                SLA 1ª Resposta (minutos)
              </Label>
              <Input
                type="number"
                value={form.sla_first_response_minutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sla_first_response_minutes: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Risco sem resposta (horas)
              </Label>
              <Input
                type="number"
                value={form.risk_no_reply_hours}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    risk_no_reply_hours: Number(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Decaimento diário (% do score)
            </Label>
            <Input
              type="number"
              step="0.01"
              value={form.cooldown_decay_per_day * 100}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  cooldown_decay_per_day: Number(e.target.value) / 100,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
        <Button variant="outline" onClick={handleSeedRules} disabled={seeding}>
          <RefreshCw size={16} className="mr-2" />
          {seeding ? "Criando..." : "Criar Regras de Score Padrão"}
        </Button>
      </div>
    </div>
  );
};

export default RevenueSettings;
