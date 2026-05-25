import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LevelBadge, LEVEL_META, type PartnerLevel } from "@/components/partners/LevelBadge";
import { Logo } from "@/components/Logo";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  BadgeCheck,
  Building2,
  Calendar,
  Globe2,
  Loader2,
  Lock,
} from "lucide-react";
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

  // Auto-lookup if URL has ?code=
  useEffect(() => {
    if (initial) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <SEO
        title="Verificar Parceiro Oficial Wiize"
        description="Confirme se um parceiro é oficial da Wiize. Digite o código de verificação para ver o status, tier e data de credenciamento."
      />

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <Lock size={13} />
            <span>Verificação oficial</span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-14 lg:py-20">
          {/* Title */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full mb-5">
              <ShieldCheck size={13} />
              Programa de Parceiros Wiize
            </div>
            <h1 className="text-3xl lg:text-[40px] leading-tight font-bold tracking-tight text-slate-900">
              Verificação de Parceiros
            </h1>
            <p className="text-slate-600 mt-4 max-w-xl text-[15px] leading-relaxed">
              Confirme se uma pessoa ou empresa é parceira oficial da Wiize. Digite o código
              de verificação fornecido pelo parceiro para visualizar os dados públicos da parceria.
            </p>
          </div>

          {/* Search form */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 lg:p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  lookup(input);
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="flex-1 relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value.toUpperCase())}
                    placeholder="WZP-XXXXXXXX"
                    className="pl-9 h-11 font-mono tracking-wider uppercase bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-600/30 focus-visible:border-emerald-600"
                    maxLength={20}
                  />
                </div>
                <Button
                  type="submit"
                  className="h-11 px-6 gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white"
                  disabled={result.state === "loading"}
                >
                  {result.state === "loading" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  Verificar
                </Button>
              </form>
              <p className="text-xs text-slate-500 mt-3">
                Formato:{" "}
                <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">
                  WZP-XXXXXXXX
                </code>
              </p>
            </CardContent>
          </Card>

          {/* Result: not found */}
          {result.state === "not_found" && (
            <Card className="border-red-200 bg-red-50/40 mt-6 shadow-sm">
              <CardContent className="p-6 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Código não encontrado
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    O código{" "}
                    <strong className="font-mono text-slate-900">{result.code}</strong> não
                    corresponde a nenhum parceiro oficial Wiize. Confirme com a pessoa se o
                    código foi digitado corretamente.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Result: found */}
          {result.state === "found" && (
            <Card
              className={`mt-6 border shadow-sm bg-white ${
                result.data.status === "active"
                  ? "border-emerald-200"
                  : result.data.status === "blocked"
                  ? "border-red-200"
                  : "border-slate-200"
              }`}
            >
              <CardContent className="p-6 lg:p-7 space-y-6">
                {/* Header row */}
                <div className="flex items-start gap-4">
                  <div
                    className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      result.data.status === "active"
                        ? "bg-emerald-100"
                        : result.data.status === "blocked"
                        ? "bg-red-100"
                        : "bg-slate-100"
                    }`}
                  >
                    {result.data.status === "active" ? (
                      <ShieldCheck size={24} className="text-emerald-600" />
                    ) : (
                      <ShieldAlert
                        size={24}
                        className={
                          result.data.status === "blocked" ? "text-red-600" : "text-slate-500"
                        }
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      {STATUS_LABEL[result.data.status]}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5 truncate">
                      {result.data.full_name}
                    </h2>
                    {result.data.company && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                        <Building2 size={13} />
                        <span className="truncate">{result.data.company}</span>
                      </div>
                    )}
                  </div>
                  <LevelBadge level={result.data.level} size="md" />
                </div>

                {/* Info grid */}
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

                {/* Verified code strip */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                      Código verificado
                    </div>
                    <div className="font-mono text-base font-semibold mt-0.5 text-slate-900">
                      {result.data.verification_code}
                    </div>
                  </div>
                  {result.data.status === "active" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-600 text-white">
                      <ShieldCheck size={13} /> Parceiro Oficial Wiize
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Disclaimer */}
          <p className="text-center text-xs text-slate-500 mt-10 max-w-lg mx-auto leading-relaxed">
            Esta página exibe apenas dados públicos da parceria. Não são exibidas informações
            financeiras, comissões, e-mail ou telefone do parceiro.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Logo size="sm" showText={false} />
            <span>© {new Date().getFullYear()} Wiize · Todos os direitos reservados</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/parceiros" className="hover:text-slate-900 transition-colors">
              Programa de Parceiros
            </a>
            <a href="/parceiros/termos" className="hover:text-slate-900 transition-colors">
              Termos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
        <Icon size={12} /> {label}
      </div>
      <div className="text-sm font-semibold mt-1 text-slate-900 truncate">{value}</div>
    </div>
  );
}
