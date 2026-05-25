import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LevelBadge, LEVEL_META, type PartnerLevel } from "@/components/partners/LevelBadge";
import { ShieldCheck, ShieldAlert, Search, BadgeCheck, Building2, Calendar, Globe2, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

type Result =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "not_found"; code: string }
  | {
      state: "found";
      data: {
        full_name: string;
        company: string | null;
        level: PartnerLevel;
        status: "active" | "inactive" | "blocked";
        partner_since: string;
        country: string | null;
        verification_code: string;
      };
    };

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const STATUS_LABEL: Record<string, string> = {
  active: "Parceiro Ativo",
  inactive: "Parceiro Inativo",
  blocked: "Parceiro Bloqueado",
};

export default function PartnerVerification() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("code") || "";
  const [input, setInput] = useState(initial);
  const [result, setResult] = useState<Result>({ state: "idle" });

  const lookup = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setResult({ state: "loading" });
    setParams({ code });
    const { data, error } = await supabase.rpc("verify_partner_public", { p_code: code });
    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      setResult({ state: "not_found", code });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setResult({ state: "found", data: row });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="Verificar Parceiro Oficial Wiize"
        description="Confirme se um parceiro é oficial da Wiize. Digite o código de verificação para ver o status, tier e data de credenciamento."
      />

      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center mb-5">
            <BadgeCheck size={28} className="text-primary" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            Verificação de Parceiros Wiize
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Digite o código de verificação do parceiro para confirmar se ele é oficial e ver os dados públicos da parceria.
          </p>
        </div>

        <Card className="border-border/60">
          <CardContent className="p-5 lg:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                lookup(input);
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="WZP-XXXXXXXX"
                className="font-mono tracking-wider uppercase text-center sm:text-left"
                maxLength={20}
              />
              <Button type="submit" className="gap-2 shrink-0" disabled={result.state === "loading"}>
                {result.state === "loading" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Verificar
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              O código de verificação é fornecido pelo próprio parceiro e tem o formato <code className="px-1.5 py-0.5 bg-muted rounded">WZP-XXXXXXXX</code>.
            </p>
          </CardContent>
        </Card>

        {/* Result */}
        {result.state === "not_found" && (
          <Card className="border-rose-500/30 mt-6">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <ShieldAlert size={20} className="text-rose-500" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Código não encontrado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O código <strong className="font-mono">{result.code}</strong> não corresponde a nenhum parceiro
                  oficial Wiize. Confirme com a pessoa se o código foi digitado corretamente.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {result.state === "found" && (
          <Card
            className={`mt-6 border ${
              result.data.status === "active"
                ? "border-emerald-500/30"
                : result.data.status === "blocked"
                ? "border-rose-500/30"
                : "border-border/60"
            }`}
          >
            <CardContent className="p-6 lg:p-7 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    result.data.status === "active"
                      ? "bg-emerald-500/10"
                      : result.data.status === "blocked"
                      ? "bg-rose-500/10"
                      : "bg-muted"
                  }`}
                >
                  {result.data.status === "active" ? (
                    <ShieldCheck size={24} className="text-emerald-500" />
                  ) : (
                    <ShieldAlert
                      size={24}
                      className={result.data.status === "blocked" ? "text-rose-500" : "text-muted-foreground"}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {STATUS_LABEL[result.data.status]}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight mt-0.5 truncate">
                    {result.data.full_name}
                  </h2>
                  {result.data.company && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Building2 size={13} />
                      <span className="truncate">{result.data.company}</span>
                    </div>
                  )}
                </div>
                <LevelBadge level={result.data.level} size="md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InfoBox
                  icon={BadgeCheck}
                  label="Tier de parceria"
                  value={LEVEL_META[result.data.level]?.label || result.data.level}
                />
                <InfoBox
                  icon={Calendar}
                  label="Parceiro desde"
                  value={fmtDate(result.data.partner_since)}
                />
                <InfoBox
                  icon={Globe2}
                  label="País"
                  value={result.data.country || "BR"}
                />
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Código verificado
                  </div>
                  <div className="font-mono text-base font-semibold mt-0.5">
                    {result.data.verification_code}
                  </div>
                </div>
                {result.data.status === "active" && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/30">
                    <ShieldCheck size={13} /> Parceiro Oficial Wiize
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground mt-10">
          Esta página não exibe dados financeiros, comissões ou informações de contato — apenas confirma se um parceiro é oficial.
        </p>
      </div>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon size={12} /> {label}
      </div>
      <div className="text-sm font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}
