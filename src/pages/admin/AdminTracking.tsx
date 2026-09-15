import { useEffect, useState } from "react";
import { Loader2, Save, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Settings = {
  gtm_id: string;
  ga4_id: string;
  meta_pixel_id: string;
  enabled: boolean;
};

const EMPTY: Settings = {
  gtm_id: "",
  ga4_id: "",
  meta_pixel_id: "",
  enabled: true,
};

const FIELDS: { key: keyof Settings; label: string; placeholder: string; hint: string }[] = [
  {
    key: "gtm_id",
    label: "Google Tag Manager",
    placeholder: "GTM-XXXXXXX",
    hint: "Opcional. Use se você tiver um contêiner do Tag Manager. Google Ads e Analytics podem ser configurados dentro dele.",
  },
  {
    key: "ga4_id",
    label: "Google Analytics (GA4)",
    placeholder: "G-XXXXXXXXXX",
    hint: "Use este campo se o seu código começa com G-. Carrega quando o visitante aceita analíticos.",
  },
  {
    key: "meta_pixel_id",
    label: "Pixel do Meta (Facebook)",
    placeholder: "1234567890",
    hint: "Carrega apenas com consentimento de marketing.",
  },
];

export default function AdminTracking() {
  const { toast } = useToast();
  const [values, setValues] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("tracking_settings").select("*").maybeSingle();
      if (data) {
        setValues({
          gtm_id: (data as any).gtm_id || "",
          ga4_id: (data as any).ga4_id || "",
          meta_pixel_id: (data as any).meta_pixel_id || "",
          enabled: (data as any).enabled ?? true,
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("tracking_settings")
      .update({
        gtm_id: values.gtm_id.trim() || null,
        meta_pixel_id: values.meta_pixel_id.trim() || null,
        enabled: values.enabled,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tags atualizadas", description: "As alterações valem para novos acessos." });
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Tags & Rastreamento</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cole aqui os identificadores das ferramentas de anúncios. Nada é carregado sem o
          consentimento do visitante no aviso de cookies.
        </p>
      </div>

      <Card className="border-border/50 shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Tags className="h-4 w-4 text-primary" />
            Identificadores
          </CardTitle>
          <CardDescription className="text-xs">
            Deixe em branco o que ainda não usar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">Rastreamento ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Desligue para pausar todas as tags de uma vez.
                  </p>
                </div>
                <Switch
                  checked={values.enabled}
                  onCheckedChange={(v) => setValues((s) => ({ ...s, enabled: v }))}
                />
              </div>

              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key} className="text-xs">
                    {f.label}
                  </Label>
                  <Input
                    id={f.key}
                    value={values[f.key] as string}
                    placeholder={f.placeholder}
                    onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                  <p className="text-[11px] text-muted-foreground">{f.hint}</p>
                </div>
              ))}

              <Button onClick={save} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
