import { useNavigate } from "react-router-dom";
import { MetaLayout } from "@/components/meta/MetaLayout";
import { MetaPageHeader } from "@/components/meta/MetaPageHeader";
import { Button } from "@/components/ui/button";
import {
  Headset, Megaphone, Check, X, Minus, ArrowLeft, QrCode, CloudCog, ShieldCheck, AlertTriangle, ArrowRight, CircleHelp,
} from "lucide-react";

type Cell = "yes" | "no" | "partial";

const ROWS: { label: string; atendimento: Cell | string; marketing: Cell | string; note?: string }[] = [
  { label: "Como conecta", atendimento: "QR code (WhatsApp Web)", marketing: "Meta Cloud API (oficial)" },
  { label: "Tempo para começar", atendimento: "Segundos", marketing: "Minutos a horas (verificação da Meta)" },
  { label: "Custo por mensagem", atendimento: "Nenhum", marketing: "Tarifa da Meta por conversa (24h)" },
  { label: "Risco de bloqueio", atendimento: "Existe, se usado para marketing", marketing: "Nenhum" },
  { label: "Chat e atendimento", atendimento: "yes", marketing: "yes" },
  { label: "CRM e histórico de leads", atendimento: "yes", marketing: "yes" },
  { label: "IA de análise e engajamento", atendimento: "yes", marketing: "yes" },
  { label: "Falar com contatos novos", atendimento: "partial", marketing: "yes", note: "No Atendimento, só com quem já conversou com você" },
  { label: "Campanhas de mensagem", atendimento: "no", marketing: "yes" },
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
        titleBadge={<span className="flex h-9 w-9 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/20"><CircleHelp size={17} /></span>}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/numeros")}>
            <ArrowLeft size={14} /> Voltar para Números
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/20"><Headset size={22} /></div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Número de Atendimento</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><QrCode size={11} /> Conecta por QR code</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Usa o seu próprio WhatsApp, como o WhatsApp Web. Ideal para responder clientes que já falam com você, organizar tudo no CRM e deixar a IA analisar e engajar as conversas.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-hover border border-warning/30 bg-warning/10 px-3 py-2.5">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs leading-relaxed text-foreground/80">
              Pelas regras da Meta, este número não pode enviar mensagens para desconhecidos nem ser usado para marketing. Por isso ele não faz campanhas de mensagem.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-card border border-border bg-card p-6 shadow-sm">
          <span className="absolute right-4 top-4 rounded-hover bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary ring-1 ring-primary/25">Recomendado</span>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-hover bg-primary/10 text-primary ring-1 ring-primary/20"><Megaphone size={22} /></div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Número de Marketing</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><CloudCog size={11} /> Conecta via Meta Cloud API</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            É o WhatsApp Business oficial. Serve tanto para atendimento quanto para marketing: campanhas de mensagem, templates aprovados e fluxos automáticos, tudo sem risco de bloqueio.
          </p>
          <div className="mt-4 flex items-start gap-2 rounded-hover border border-primary/35 bg-primary/10 px-3 py-2.5">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs font-medium leading-relaxed text-foreground">
              Funciona para atendimento e para marketing, sem bloqueios. A Meta cobra por conversa iniciada, direto na sua conta de anúncios, fora da assinatura Wiize.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-card border border-border bg-card shadow-sm">
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
              <tr key={r.label} className="border-t border-border transition-colors hover:bg-muted/30">
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

      <div className="mt-6 relative overflow-hidden rounded-card border border-primary/30 bg-primary/5 p-6">
        <p className="text-sm font-semibold text-foreground">Resumo rápido</p>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          Quer só atender quem já fala com você, sem custo? <strong className="text-foreground">Número de Atendimento</strong>.
          Quer prospectar, fazer campanhas de mensagem e automações com segurança? <strong className="text-foreground">Número de Marketing</strong>.
          Você pode ter os dois: cada um ocupa uma vaga no limite de números do seu plano.
        </p>
        <Button className="mt-4 gap-1.5" size="sm" onClick={() => navigate("/numeros")}>
          Conectar um número <ArrowRight size={14} />
        </Button>
      </div>
    </MetaLayout>
  );
}
