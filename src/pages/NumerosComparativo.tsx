import { useNavigate } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Button } from "@/components/ui/button";
import {
  Headset, Megaphone, Check, X, Minus, ArrowLeft, QrCode, KeyRound, ShieldCheck, AlertTriangle,
} from "lucide-react";

type Cell = "yes" | "no" | "partial";

const ROWS: { label: string; atendimento: Cell | string; marketing: Cell | string; note?: string }[] = [
  { label: "Como conecta", atendimento: "QR code (WhatsApp Web)", marketing: "API oficial da Meta (credenciais)" },
  { label: "Tempo para começar", atendimento: "Segundos", marketing: "Minutos a horas (verificação da Meta)" },
  { label: "Custo por mensagem", atendimento: "Nenhum", marketing: "Tarifa da Meta por conversa (24h)" },
  { label: "Risco de bloqueio", atendimento: "Existe, se usado para marketing", marketing: "Nenhum" },
  { label: "Chat e atendimento", atendimento: "yes", marketing: "yes" },
  { label: "CRM e histórico de leads", atendimento: "yes", marketing: "yes" },
  { label: "IA de análise e engajamento", atendimento: "yes", marketing: "yes" },
  { label: "Falar com contatos novos", atendimento: "partial", marketing: "yes", note: "Só com quem já conversou com você" },
  { label: "Campanhas e disparos em massa", atendimento: "no", marketing: "yes" },
  { label: "Templates aprovados pela Meta", atendimento: "no", marketing: "yes" },
  { label: "Fluxos automáticos (automações)", atendimento: "no", marketing: "yes" },
  { label: "Conta no limite de números do plano", atendimento: "yes", marketing: "yes" },
];

const CellIcon = ({ v }: { v: Cell }) =>
  v === "yes" ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600"><Check size={14} /></span>
  ) : v === "no" ? (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-destructive"><X size={14} /></span>
  ) : (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 text-amber-600"><Minus size={14} /></span>
  );

const renderCell = (v: Cell | string) =>
  v === "yes" || v === "no" || v === "partial" ? <CellIcon v={v} /> : <span className="text-sm text-foreground">{v}</span>;

export default function NumerosComparativo() {
  const navigate = useNavigate();
  return (
    <MetaLayout title="Atendimento vs Marketing" description="Entenda a diferença entre o Número de Atendimento e o Número de Marketing.">
      <MetaPageHeader
        title="Qual número usar?"
        description="Os dois tipos funcionam no chat, CRM e IA. A diferença está em risco, custo e no que cada um pode fazer."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/numeros")}>
            <ArrowLeft size={14} /> Voltar para Números
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Headset size={20} /></div>
            <div>
              <h2 className="text-lg font-semibold">Número de Atendimento</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><QrCode size={11} /> Conecta por QR code</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Usa o seu próprio WhatsApp, como o WhatsApp Web. Ideal para responder clientes que já falam com você, organizar tudo no CRM e deixar a IA analisar e engajar as conversas.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              O WhatsApp pode bloquear números que enviam muitas mensagens para desconhecidos. Por isso este tipo não faz disparos nem campanhas.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Megaphone size={20} /></div>
            <div>
              <h2 className="text-lg font-semibold">Número de Marketing</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><KeyRound size={11} /> API oficial da Meta</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            É o WhatsApp Business oficial. Faz tudo que o de Atendimento faz e também campanhas, disparos em massa, templates aprovados e fluxos automáticos.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Sem risco de bloqueio. A Meta cobra por conversa iniciada, direto na sua conta de anúncios — fora da assinatura Wiize.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-left">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recurso</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atendimento</th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketing</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.label} className="border-t border-border">
                <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                  {r.label}
                  {r.note && <p className="text-[11px] font-normal text-muted-foreground">{r.note}</p>}
                </td>
                <td className="px-5 py-3.5">{renderCell(r.atendimento)}</td>
                <td className="px-5 py-3.5">{renderCell(r.marketing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-sm font-semibold text-foreground">Resumo rápido</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quer só atender quem já fala com você, sem custo? <strong className="text-foreground">Número de Atendimento</strong>.
          Quer prospectar, fazer campanhas e automações com segurança? <strong className="text-foreground">Número de Marketing</strong>.
          Você pode ter os dois — cada um ocupa uma vaga no limite de números do seu plano.
        </p>
        <Button className="mt-4" size="sm" onClick={() => navigate("/numeros")}>Conectar um número</Button>
      </div>
    </MetaLayout>
  );
}
