import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { BackgroundGlow } from "@/components/layout/BackgroundGlow";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Eye, Loader2, MousePointerClick, Users } from "lucide-react";

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function FormAnalytics() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [views, setViews] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: f }, { data: v }, { data: s }] = await Promise.all([
        supabase.from("forms").select("*").eq("id", id).maybeSingle(),
        supabase.from("form_views").select("*").eq("form_id", id),
        supabase.from("form_submissions").select("*").eq("form_id", id).order("created_at", { ascending: false }),
      ]);
      setForm(f);
      setViews((v as any) || []);
      setSubs((s as any) || []);
      setLoading(false);
    })();
  }, [id]);

  const sources = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subs) {
      const key = s.utm_source || (s.referrer ? new URL(s.referrer).hostname : "Direto");
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [subs]);

  const devices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of subs) map[s.device || "desconhecido"] = (map[s.device || "desconhecido"] || 0) + 1;
    return Object.entries(map);
  }, [subs]);

  const exportCsv = () => {
    const keys = Array.from(new Set(subs.flatMap((s) => Object.keys(s.data || {}))));
    const header = ["data", ...keys, "utm_source", "utm_medium", "utm_campaign", "device"];
    const rows = subs.map((s) => [
      fmtDateTime(s.created_at),
      ...keys.map((k) => (s.data?.[k] ?? "").toString().replace(/"/g, "'")),
      s.utm_source || "", s.utm_medium || "", s.utm_campaign || "", s.device || "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${form?.slug || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const conversion = views.length ? ((subs.length / views.length) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Analytics do formulário" description="Desempenho do formulário" />
      <BackgroundGlow />
      <AppSidebar profile={profile} />
      <MobileNav profile={profile} />

      <main className="lg:pl-[72px] pt-[42px] lg:pt-0 min-h-screen">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <button onClick={() => navigate("/forms")} className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar para Forms
          </button>

          {loading ? (
            <Card className="flex items-center justify-center border-border/60 p-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Card>
          ) : !form ? (
            <Card className="border-border/60 p-12 text-center">Formulário não encontrado.</Card>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{form.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">/form/{form.slug}</p>
                </div>
                <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!subs.length}>
                  <Download className="h-4 w-4" /> Exportar CSV
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: "Visualizações", value: views.length, icon: Eye },
                  { label: "Leads", value: subs.length, icon: Users },
                  { label: "Conversão", value: `${conversion}%`, icon: MousePointerClick },
                  { label: "Último lead", value: subs[0] ? fmtDateTime(subs[0].created_at) : "—", icon: Users },
                ].map((k) => (
                  <Card key={k.label} className="border-border/60 p-4">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <k.icon className="h-3.5 w-3.5" /> {k.label}
                    </div>
                    <p className="mt-2 text-xl font-semibold">{k.value}</p>
                  </Card>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card className="border-border/60 p-5">
                  <p className="text-sm font-medium">Origens dos leads</p>
                  <div className="mt-3 space-y-2">
                    {sources.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
                    {sources.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="truncate">{label}</span>
                        <Badge variant="secondary">{value}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border-border/60 p-5">
                  <p className="text-sm font-medium">Dispositivos</p>
                  <div className="mt-3 space-y-2">
                    {devices.length === 0 && <p className="text-sm text-muted-foreground">Sem dados ainda.</p>}
                    {devices.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{label}</span>
                        <Badge variant="secondary">{value}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="mt-4 border-border/60 p-5">
                <p className="text-sm font-medium">Últimos envios</p>
                <div className="mt-3 space-y-2">
                  {subs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum envio recebido ainda.</p>}
                  {subs.slice(0, 30).map((s) => (
                    <div key={s.id} className="rounded-xl border border-border/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {s.data?.nome_completo || s.data?.nome || s.data?.email || "Lead"}
                        </p>
                        <span className="text-xs text-muted-foreground">{fmtDateTime(s.created_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Object.entries(s.data || {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[s.utm_source, s.utm_medium, s.utm_campaign, s.device].filter(Boolean).map((t: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-[11px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
