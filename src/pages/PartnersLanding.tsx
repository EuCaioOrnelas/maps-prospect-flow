import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Award, TrendingUp, Users, Wallet, Sparkles, Check, ArrowRight,
  Megaphone, Target, Rocket, Crown, ShieldCheck,
} from "lucide-react";

const tiers = [
  { name: "Bronze", percent: "20%", from: "0", to: "R$ 5k", color: "from-amber-700/15 to-amber-700/5", iconColor: "text-amber-700", icon: ShieldCheck },
  { name: "Silver", percent: "25%", from: "R$ 5k", to: "R$ 25k", color: "from-slate-400/15 to-slate-400/5", iconColor: "text-slate-500", icon: Award },
  { name: "Gold", percent: "30%", from: "R$ 25k", to: "R$ 100k", color: "from-yellow-500/15 to-yellow-500/5", iconColor: "text-yellow-600", icon: Rocket },
  { name: "Platinum", percent: "40%", from: "R$ 100k+", to: "Ilimitado", color: "from-purple-500/15 to-purple-500/5", iconColor: "text-purple-600", icon: Crown },
];

const benefits = [
  { icon: Wallet, title: "Comissão recorrente por 2 anos", desc: "Você ganha comissão sobre toda renovação do cliente indicado, mês após mês, durante 2 anos." },
  { icon: TrendingUp, title: "Níveis progressivos até 40%", desc: "Quanto mais clientes você indica, maior a sua porcentagem de comissão sobre cada venda." },
  { icon: Megaphone, title: "Materiais prontos", desc: "Banners, copies, posts e roteiros já validados — você só compartilha o seu link." },
  { icon: Target, title: "Atribuição last-click 2 anos", desc: "Mesmo que o lead leve meses para fechar, a venda continua vinculada a você." },
  { icon: Users, title: "Painel completo", desc: "Veja em tempo real cliques, leads, conversões, comissões pendentes e disponíveis para saque." },
  { icon: Sparkles, title: "Saque a partir de R$ 100", desc: "Pix em até 5 dias úteis após aprovação. Sem burocracia, sem letra miúda." },
];

const profiles = [
  { id: "agency", label: "Agência de marketing / vendas" },
  { id: "consultant", label: "Consultor comercial" },
  { id: "creator", label: "Criador de conteúdo" },
  { id: "sales_pro", label: "Profissional de vendas B2B" },
  { id: "other", label: "Outro" },
];

export default function PartnersLanding() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", profile: "agency",
    audience_size: "1k-10k", motivation: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email) {
      toast({ title: "Preencha nome e e-mail", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("partner_applications").insert({
      ...form, source: "landing",
      user_agent: navigator.userAgent,
    });
    if (error) {
      toast({ title: "Erro ao enviar candidatura", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    // Fire-and-forget confirmation email
    supabase.functions.invoke("send-partner-email", {
      body: {
        type: "partner_application_received",
        to: form.email,
        data: { first_name: form.full_name.split(" ")[0] },
      },
    }).catch(() => {});

    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Programa Wiize Parceiros — Ganhe comissão recorrente indicando clientes</title>
        <meta name="description" content="Indique a Wiize, receba até 40% de comissão recorrente por 2 anos. Atribuição last-click, materiais prontos e saque via Pix. Candidate-se ao Programa Wiize Parceiros." />
        <link rel="canonical" href="https://wiize.com.br/parceiros" />
      </Helmet>

      {/* NAV */}
      <nav className="px-6 py-4 border-b border-border/50 backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold">Wiize</Link>
          <div className="flex items-center gap-3">
            <Link to="/partners/login" className="text-sm text-muted-foreground hover:text-foreground transition">Já sou parceiro</Link>
            <a href="#candidatura"><Button size="sm">Quero ser parceiro</Button></a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-6 pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles size={14} /> Programa oficial Wiize Parceiros
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6">
            Indique a Wiize.<br />
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              Receba até 40% por 2 anos.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Comissão recorrente sobre toda venda gerada pelo seu link.
            Atribuição last-click. Materiais prontos. Saque via Pix.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a href="#candidatura"><Button size="lg" className="gap-2 px-8">Candidatar-me agora <ArrowRight size={18} /></Button></a>
            <a href="#como-funciona"><Button size="lg" variant="outline">Como funciona</Button></a>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { v: "40%", l: "comissão máxima" },
              { v: "2 anos", l: "recorrência" },
              { v: "R$ 100", l: "saque mínimo" },
              { v: "5 dias", l: "para receber" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl md:text-3xl font-bold">{s.v}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="px-6 py-20 bg-card/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Como funciona</h2>
          <p className="text-center text-muted-foreground mb-12">Três passos. Sem burocracia. Comissão automática.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Cadastre-se", d: "Preencha o formulário no fim desta página. Aprovação em até 48h." },
              { n: "02", t: "Compartilhe seu link", d: "Receba um link único. Toda venda gerada nos próximos 2 anos é sua." },
              { n: "03", t: "Receba comissão", d: "Quando o cliente paga, a comissão entra no seu painel. Saque via Pix." },
            ].map((s) => (
              <Card key={s.n} className="border-border/60">
                <CardContent className="p-6">
                  <div className="text-5xl font-bold text-primary/20 mb-2">{s.n}</div>
                  <h3 className="font-semibold text-lg mb-2">{s.t}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.d}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TIERS */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">Quanto mais você indica, mais você ganha</h2>
          <p className="text-center text-muted-foreground mb-12">Níveis progressivos baseados em receita gerada acumulada.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tiers.map((t) => (
              <Card key={t.name} className={`border-border/60 bg-gradient-to-br ${t.color} relative overflow-hidden`}>
                <CardContent className="p-6 text-center">
                  <t.icon size={32} className={`${t.iconColor} mx-auto mb-3`} />
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t.name}</div>
                  <div className="text-4xl font-bold mb-2">{t.percent}</div>
                  <div className="text-xs text-muted-foreground">de comissão</div>
                  <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
                    Receita gerada<br /><strong className="text-foreground">{t.from} – {t.to}</strong>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Todos os parceiros começam em <strong>Bronze (20%)</strong>. A progressão é automática conforme a receita acumulada cresce.
          </p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="px-6 py-20 bg-card/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Por que ser parceiro Wiize</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="flex gap-4">
                <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <b.icon size={18} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Como funciona a atribuição last-click?", a: "Quando alguém clica no seu link, gravamos um cookie por 2 anos. Toda venda dessa pessoa nesse período é sua, mesmo que ela leve meses para fechar." },
              { q: "Quando recebo a comissão?", a: "Cada venda gera uma comissão pendente liberada após 30 dias (período de proteção contra estorno). Após liberada, você solicita saque via Pix com saldo mínimo de R$ 100." },
              { q: "A comissão é recorrente?", a: "Sim. Você recebe sobre cada renovação do cliente indicado durante 2 anos." },
              { q: "Preciso pagar para participar?", a: "Não. O programa é 100% gratuito." },
              { q: "Posso indicar a mim mesmo?", a: "Não. O sistema bloqueia auto-indicação automaticamente." },
            ].map((f, i) => (
              <details key={i} className="group border border-border/60 rounded-lg p-5">
                <summary className="cursor-pointer font-medium flex items-center justify-between">
                  {f.q} <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* APPLICATION FORM */}
      <section id="candidatura" className="px-6 py-20 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-t border-border/50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Candidate-se agora</h2>
            <p className="text-muted-foreground">Análise em até 48 horas úteis. Sem custo, sem compromisso.</p>
          </div>

          {submitted ? (
            <Card className="border-primary/30 bg-card">
              <CardContent className="p-10 text-center">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Candidatura recebida!</h3>
                <p className="text-muted-foreground mb-6">Enviamos uma confirmação para o seu e-mail. Nosso time analisa em até 48 horas úteis.</p>
                <Link to="/"><Button variant="outline">Voltar para o site</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/60">
              <CardContent className="p-8">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Nome completo *</Label>
                      <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input id="phone" placeholder="(11) 90000-0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1.5" />
                  </div>

                  <div>
                    <Label>Qual seu perfil?</Label>
                    <RadioGroup value={form.profile} onValueChange={(v) => setForm({ ...form, profile: v })} className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {profiles.map((p) => (
                        <label key={p.id} htmlFor={`p-${p.id}`} className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition">
                          <RadioGroupItem id={`p-${p.id}`} value={p.id} />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="audience">Tamanho da sua rede / audiência</Label>
                    <Select value={form.audience_size} onValueChange={(v) => setForm({ ...form, audience_size: v })}>
                      <SelectTrigger id="audience" className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="<1k">Menos de 1.000 contatos</SelectItem>
                        <SelectItem value="1k-10k">1.000 a 10.000 contatos</SelectItem>
                        <SelectItem value="10k-50k">10.000 a 50.000 contatos</SelectItem>
                        <SelectItem value="50k+">Mais de 50.000 contatos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="motivation">Por que quer ser parceiro Wiize? (opcional)</Label>
                    <Textarea id="motivation" rows={4} placeholder="Conte um pouco sobre como pretende divulgar a Wiize." value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} className="mt-1.5" />
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                    {submitting ? "Enviando..." : <>Enviar candidatura <ArrowRight size={18} /></>}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Ao enviar, você concorda com os <Link to="/terms" className="underline">termos do programa</Link>.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-border/50 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wiize. Programa de Parceiros.
      </footer>
    </div>
  );
}
