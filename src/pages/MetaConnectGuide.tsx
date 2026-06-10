import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  Smartphone,
  KeyRound,
  Phone,
  Hash,
  UserPlus,
  Building2,
  ChevronRight,
  Copy,
  ArrowLeft,
  Sparkles,
  FileVideo,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

/**
 * Página de tutorial completa para conectar um número via Meta Cloud API.
 * Abrir SEMPRE em nova guia — o usuário acompanha em uma aba enquanto faz
 * o cadastro em outra. Sem sidebar/header para foco total.
 */

// ⚠️ Quando o vídeo estiver pronto, basta colar a URL do YouTube/Vimeo aqui.
const TUTORIAL_VIDEO_URL: string | null = null;

const PHASES = [
  {
    id: "app",
    badge: "Fase 1",
    title: "Criar e publicar seu App na Meta",
    description:
      "O App é o que conecta sua conta WhatsApp Business à Wiize. Sem ele, nada funciona — mas é só configurar uma vez.",
    icon: Building2,
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-500",
    duration: "~10 min",
  },
  {
    id: "numero",
    badge: "Fase 2",
    title: "Cadastrar e verificar seu número",
    description:
      "Adicione o número que vai disparar mensagens. Pode ser um número novo ou migrar um existente do WhatsApp comum.",
    icon: Smartphone,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-500",
    duration: "~5 min",
  },
  {
    id: "usuario",
    badge: "Fase 3",
    title: "Criar System User e gerar Token",
    description:
      "O System User é a 'identidade técnica' que a Wiize vai usar para enviar mensagens no seu nome. O token nunca expira.",
    icon: UserPlus,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-500",
    duration: "~8 min",
  },
];

export default function MetaConnectGuide() {
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<string>("app");

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado!` });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Guia completo: Conectar WhatsApp Business à Wiize"
        description="Passo a passo definitivo para conectar seu número WhatsApp via Meta Cloud API. App, número e System User explicados em detalhes."
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare size={14} className="text-primary" />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold">Guia de Conexão</p>
              <p className="text-[10px] text-muted-foreground">Wiize × Meta Cloud API</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.close()}
            className="text-xs gap-1.5"
          >
            <ArrowLeft size={12} /> Voltar à Wiize
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
            <Sparkles size={11} /> Mais fácil do que parece — siga as 3 fases
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Conecte seu WhatsApp Business <br className="hidden sm:block" />
            <span className="text-primary">em ~20 minutos</span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Este guia leva você do zero até o número conectado e disparando.
            Mantenha esta aba aberta enquanto faz o cadastro em outra — é assim que fica mais rápido.
          </p>
        </section>

        {/* Video */}
        <section className="rounded-3xl overflow-hidden border border-border bg-gradient-to-br from-primary/5 via-background to-background shadow-sm">
          {TUTORIAL_VIDEO_URL ? (
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={TUTORIAL_VIDEO_URL}
                title="Tutorial: Conectar WhatsApp Business"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-center px-6 bg-muted/20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FileVideo size={28} className="text-primary" />
              </div>
              <p className="font-semibold text-lg">Vídeo tutorial em produção</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                Em breve um vídeo passo a passo mostrando exatamente cada tela.
                Por enquanto, siga o guia escrito abaixo — está completo.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <PlayCircle size={12} /> Volte aqui em breve
              </div>
            </div>
          )}
        </section>

        {/* Phase nav */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            const isActive = activePhase === phase.id;
            return (
              <button
                key={phase.id}
                onClick={() => {
                  setActivePhase(phase.id);
                  document
                    .getElementById(`fase-${phase.id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`text-left rounded-2xl border p-5 transition-all ${
                  isActive
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/20 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center`}>
                    <Icon size={18} className={phase.iconColor} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {phase.badge}
                  </span>
                </div>
                <p className="font-semibold text-sm mb-1">{phase.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {phase.description}
                </p>
                <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                  <span className="px-1.5 py-0.5 rounded-md bg-muted">{phase.duration}</span>
                </div>
              </button>
            );
          })}
        </section>

        {/* FASE 1 — APP */}
        <Phase
          id="app"
          badge="Fase 1"
          title="Criar e publicar seu App na Meta"
          subtitle="O App é o intermediário entre sua conta WhatsApp e a Wiize. Você cria uma vez e usa para sempre."
          color="blue"
        >
          <Step number={1} title="Acesse o Meta for Developers">
            <p>
              Entre em{" "}
              <Ext href="https://developers.facebook.com/apps">
                developers.facebook.com/apps
              </Ext>{" "}
              com a mesma conta Facebook que administra sua empresa.
            </p>
            <Hint>
              ⚠️ Use uma conta pessoal que seja <strong>administradora</strong> da sua página/Business Manager.
              Se não for, transfira a permissão antes.
            </Hint>
          </Step>

          <Step number={2} title="Clique em 'Criar App'">
            <p>
              Botão verde no canto superior direito. Você verá um wizard com perguntas.
            </p>
            <ChoiceList>
              <li>
                <strong>Caso de uso:</strong> escolha <em>"Outro"</em> (mais flexível) e clique em Avançar.
              </li>
              <li>
                <strong>Tipo do App:</strong> selecione <em>"Negócios"</em>.
              </li>
              <li>
                <strong>Nome do App:</strong> qualquer nome interno (ex: <em>"Wiize - Minha Empresa"</em>). Não aparece para clientes.
              </li>
              <li>
                <strong>Email de contato:</strong> seu email.
              </li>
              <li>
                <strong>Conta do Business:</strong> selecione a Business Manager da sua empresa.
              </li>
            </ChoiceList>
          </Step>

          <Step number={3} title="Adicione o produto 'WhatsApp'">
            <p>
              No painel do App, role até <strong>"Adicionar produtos ao seu app"</strong> e clique em{" "}
              <strong>Configurar</strong> dentro do card do <strong>WhatsApp</strong>.
            </p>
            <Hint>
              Se já existir uma WABA (Conta WhatsApp Business) na sua Business Manager, a Meta vincula automaticamente.
              Caso contrário, ela vai pedir para você criar uma nova agora.
            </Hint>
          </Step>

          <Step number={4} title="Publique o App (modo Live)">
            <p>
              No menu lateral, vá em <strong>Configurações → Básico</strong>. No topo da página há um toggle{" "}
              <strong>"Modo do App: Em desenvolvimento → Ativo"</strong>. Ative.
            </p>
            <p>
              A Meta vai pedir uma <strong>Política de Privacidade</strong> e uma{" "}
              <strong>URL do app</strong>:
            </p>
            <CopyRow
              label="URL da Política de Privacidade"
              value="https://wiize.com.br/privacidade"
              onCopy={copy}
            />
            <CopyRow
              label="URL do App / Site"
              value="https://wiize.com.br"
              onCopy={copy}
            />
            <Hint>
              ✅ Não é necessário App Review da Meta para enviar templates aprovados pelos seus próprios números.
              O modo "Ativo" libera tudo que a Wiize precisa.
            </Hint>
          </Step>

          <Step number={5} title="Conclusão da Fase 1">
            <CheckList>
              <li>App criado no Meta for Developers</li>
              <li>Produto WhatsApp adicionado</li>
              <li>App publicado em modo Ativo</li>
            </CheckList>
            <p className="mt-3 text-sm">
              Você está pronto para a Fase 2 — cadastrar o número. ⬇️
            </p>
          </Step>
        </Phase>

        {/* FASE 2 — NÚMERO */}
        <Phase
          id="numero"
          badge="Fase 2"
          title="Cadastrar e verificar seu número de WhatsApp"
          subtitle="Aqui você adiciona o número físico que vai disparar mensagens. Importante: ele deixa de funcionar no WhatsApp comum."
          color="emerald"
        >
          <Step number={1} title="Acesse o painel do WhatsApp dentro do App">
            <p>
              No App que você criou, menu lateral: <strong>WhatsApp → Configuração da API</strong>. Você vai ver:
            </p>
            <ChoiceList>
              <li>📞 <strong>Números de telefone</strong> cadastrados (provavelmente um número de teste da Meta)</li>
              <li>🏢 Sua <strong>WABA (Conta do WhatsApp Business)</strong></li>
              <li>🔑 Um <strong>token temporário de 24h</strong> — não use, vamos criar um permanente na Fase 3</li>
            </ChoiceList>
          </Step>

          <Step number={2} title="Adicione seu número real">
            <p>
              Ainda em <strong>WhatsApp → Configuração da API</strong>, clique em{" "}
              <strong>"Adicionar número de telefone"</strong>.
            </p>
            <p>
              Você será redirecionado ao <Ext href="https://business.facebook.com/wa/manage/phone-numbers">
                Gerenciador WhatsApp Business
              </Ext>. Lá:
            </p>
            <ChoiceList>
              <li>Clique em <strong>"Adicionar número de telefone"</strong></li>
              <li>Informe <strong>nome de exibição</strong> (aparece para o cliente — ex: <em>"Minha Empresa"</em>)</li>
              <li>Selecione a <strong>categoria de negócio</strong></li>
              <li>Insira o <strong>número completo com DDI 55</strong> (ex: +55 11 98765-4321)</li>
              <li>Escolha receber o código de verificação por <strong>SMS ou ligação</strong></li>
            </ChoiceList>
            <Hint type="warning">
              🚨 <strong>Atenção crítica:</strong> ao migrar um número que já tem WhatsApp comum/Business, esse
              app é <strong>desinstalado automaticamente</strong>. Faça <strong>backup das conversas</strong> antes.
              Recomendamos usar um <strong>chip novo</strong>.
            </Hint>
          </Step>

          <Step number={3} title="Verifique o número">
            <p>
              Digite o código que você recebeu. Pronto — o número agora está vinculado à sua WABA e visível no Meta
              Business Suite.
            </p>
          </Step>

          <Step number={4} title="Anote os 2 IDs essenciais">
            <p>
              No card do número recém-criado, clique nele. Você vai ver dois identificadores que a Wiize precisa:
            </p>
            <IdBlock
              label="📱 Phone Number ID"
              hint="Aparece logo abaixo do nome de exibição. ~15 dígitos."
              example="123456789012345"
            />
            <IdBlock
              label="🏢 WABA ID (Conta do WhatsApp Business)"
              hint="Topo da página, em 'Informações da conta'. ~15-16 dígitos."
              example="987654321098765"
            />
            <Hint>
              💡 Deixe esta aba aberta — você vai colar esses 2 IDs no formulário da Wiize ao final.
            </Hint>
          </Step>

          <Step number={5} title="Conclusão da Fase 2">
            <CheckList>
              <li>Número adicionado e verificado</li>
              <li>Phone Number ID copiado</li>
              <li>WABA ID copiado</li>
            </CheckList>
            <p className="mt-3 text-sm">
              Última fase! Agora vamos criar o <strong>Token permanente</strong> que liga tudo. ⬇️
            </p>
          </Step>
        </Phase>

        {/* FASE 3 — USUÁRIO + TOKEN */}
        <Phase
          id="usuario"
          badge="Fase 3"
          title="Criar System User e gerar o Token permanente"
          subtitle="O System User é uma 'conta técnica' que nunca expira. Sem ele, seu token venceria a cada 24h."
          color="violet"
        >
          <Step number={1} title="Acesse os Usuários do Sistema">
            <p>
              Entre em{" "}
              <Ext href="https://business.facebook.com/settings/system-users">
                business.facebook.com/settings/system-users
              </Ext>
              .
            </p>
            <p>
              Se aparecer uma seleção, escolha a <strong>Business Manager</strong> que está vinculada ao seu App.
            </p>
          </Step>

          <Step number={2} title="Crie um novo System User">
            <p>Clique em <strong>"Adicionar"</strong> ou <strong>"Criar usuário do sistema"</strong>:</p>
            <ChoiceList>
              <li>
                <strong>Nome:</strong> <em>"Wiize Integration"</em> (ou qualquer nome)
              </li>
              <li>
                <strong>Função do sistema:</strong> escolha <strong>Administrador</strong>{" "}
                <em>(obrigatório para gerar tokens com permissões de WhatsApp)</em>
              </li>
            </ChoiceList>
            <p>Clique em <strong>Criar usuário do sistema</strong>.</p>
          </Step>

          <Step number={3} title="Atribua os ativos (App + WABA)">
            <p>
              Com o System User criado, clique em <strong>"Atribuir ativos"</strong> ou{" "}
              <strong>"Adicionar ativos"</strong>. Você vai atribuir <strong>dois</strong> ativos:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <AssetCard
                icon="🧱"
                title="Apps"
                hint="Selecione o App da Fase 1. Marque controle total."
              />
              <AssetCard
                icon="💬"
                title="Contas do WhatsApp"
                hint="Selecione a WABA da Fase 2. Marque controle total."
              />
            </div>
            <Hint type="warning">
              Se você pular esta etapa, o token gerado <strong>não vai funcionar</strong> — vai dar erro "object not found".
            </Hint>
          </Step>

          <Step number={4} title="Gere o Token permanente">
            <p>
              De volta à tela do System User, clique em <strong>"Gerar novo token"</strong>:
            </p>
            <ChoiceList>
              <li>
                <strong>App:</strong> selecione o App da Fase 1
              </li>
              <li>
                <strong>Expiração:</strong> <span className="text-primary font-semibold">"Nunca"</span> ⚠️ crítico
              </li>
              <li>
                <strong>Permissões obrigatórias:</strong>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <PermBadge>whatsapp_business_messaging</PermBadge>
                  <PermBadge>whatsapp_business_management</PermBadge>
                  <PermBadge>business_management</PermBadge>
                </div>
              </li>
            </ChoiceList>
            <p>Clique em <strong>Gerar token</strong>.</p>
          </Step>

          <Step number={5} title="Copie o Token AGORA">
            <Hint type="warning">
              🚨 <strong>O token só aparece UMA vez.</strong> Se você fechar essa tela sem copiar,
              terá que gerar outro. Copie e cole em um lugar seguro (ou direto no formulário da Wiize).
            </Hint>
            <p className="text-sm mt-3">
              É uma string longa começando com <code className="text-xs bg-muted px-1.5 py-0.5 rounded">EAAN...</code>{" "}
              ou similar.
            </p>
          </Step>

          <Step number={6} title="Conclusão da Fase 3">
            <CheckList>
              <li>System User criado como Admin</li>
              <li>App e WABA atribuídos ao System User</li>
              <li>Token permanente gerado e copiado</li>
            </CheckList>
          </Step>
        </Phase>

        {/* Final CTA */}
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 sm:p-10 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold">Pronto! Você tem os 3 dados.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Volte à aba da Wiize e cole no formulário <strong>"Adicionar número"</strong>:
            </p>
          </div>
          <div className="max-w-md mx-auto space-y-2 text-left">
            <FinalItem icon={<KeyRound size={14} />} label="Access Token" hint="Da Fase 3, passo 5" />
            <FinalItem icon={<Hash size={14} />} label="WABA ID" hint="Da Fase 2, passo 4" />
            <FinalItem icon={<Phone size={14} />} label="Phone Number ID" hint="Da Fase 2, passo 4" />
          </div>
          <Button
            size="lg"
            onClick={() => window.close()}
            className="gap-2 mt-2"
          >
            Voltar à Wiize e conectar <ChevronRight size={16} />
          </Button>
        </section>

        {/* Troubleshooting */}
        <section className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <h3 className="font-semibold">Travou em alguma etapa?</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Trouble
              q="Não vejo a opção 'Sistema → Usuários'"
              a="Você não é admin da Business Manager. Peça ao administrador para te promover, ou crie uma Business Manager nova."
            />
            <Trouble
              q="O código de verificação não chega"
              a="Tente por ligação em vez de SMS. Se o número for de operadora pequena, use voz."
            />
            <Trouble
              q="Token gerado mas dá erro na Wiize"
              a="Verifique se atribuiu App + WABA ao System User (Fase 3, passo 3). Sem isso o token não funciona."
            />
            <Trouble
              q="Não consigo migrar meu número antigo"
              a="O WhatsApp comum/Business deve estar instalado e logado no celular. Faça backup antes — ele será desinstalado."
            />
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <p>Ainda travou? Fale com nosso suporte.</p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Falar com suporte <ExternalLink size={10} />
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground py-6 flex items-center justify-center gap-2">
          <Shield size={12} /> Suas credenciais são criptografadas e usadas apenas para enviar mensagens em seu nome.
        </footer>
      </main>
    </div>
  );
}

/* ---------- Sub-components ---------- */

const Phase = ({
  id,
  badge,
  title,
  subtitle,
  color,
  children,
}: {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  color: "blue" | "emerald" | "violet";
  children: React.ReactNode;
}) => {
  const ring =
    color === "blue"
      ? "ring-blue-500/20 from-blue-500/10"
      : color === "emerald"
      ? "ring-emerald-500/20 from-emerald-500/10"
      : "ring-violet-500/20 from-violet-500/10";
  const text =
    color === "blue" ? "text-blue-500" : color === "emerald" ? "text-emerald-500" : "text-violet-500";

  return (
    <section id={`fase-${id}`} className="scroll-mt-20">
      <div className={`rounded-3xl border border-border bg-gradient-to-b ${ring} via-background to-background p-6 sm:p-10`}>
        <div className="mb-8">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${text}`}>{badge}</span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-1">{title}</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>
        </div>
        <div className="space-y-6">{children}</div>
      </div>
    </section>
  );
};

const Step = ({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
        {number}
      </div>
      <div className="w-px flex-1 bg-border mt-2" />
    </div>
    <div className="flex-1 pb-4 space-y-3">
      <h3 className="font-semibold text-base">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </div>
  </div>
);

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-primary hover:underline font-medium inline-flex items-center gap-1"
  >
    {children}
    <ExternalLink size={10} />
  </a>
);

const Hint = ({
  children,
  type = "info",
}: {
  children: React.ReactNode;
  type?: "info" | "warning";
}) => (
  <div
    className={`flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed ${
      type === "warning"
        ? "bg-amber-500/10 border border-amber-500/30 text-foreground"
        : "bg-primary/5 border border-primary/20 text-foreground"
    }`}
  >
    <Info size={13} className={`mt-0.5 shrink-0 ${type === "warning" ? "text-amber-500" : "text-primary"}`} />
    <div>{children}</div>
  </div>
);

const ChoiceList = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-1.5 text-sm pl-1">
    {Array.isArray(children)
      ? children.map((c, i) => (
          <li key={i} className="flex gap-2">
            <ChevronRight size={14} className="text-primary mt-0.5 shrink-0" />
            <div className="text-muted-foreground [&_strong]:text-foreground">{c}</div>
          </li>
        ))
      : children}
  </ul>
);

const CheckList = ({ children }: { children: React.ReactNode }) => (
  <ul className="space-y-1.5">
    {Array.isArray(children)
      ? children.map((c, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
            <span>{c}</span>
          </li>
        ))
      : children}
  </ul>
);

const CopyRow = ({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string, l: string) => void;
}) => (
  <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-xs font-mono truncate text-foreground">{value}</p>
    </div>
    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => onCopy(value, label)}>
      <Copy size={11} /> Copiar
    </Button>
  </div>
);

const IdBlock = ({
  label,
  hint,
  example,
}: {
  label: string;
  hint: string;
  example: string;
}) => (
  <div className="rounded-lg border border-border bg-card p-3 space-y-1">
    <p className="text-sm font-semibold">{label}</p>
    <p className="text-xs text-muted-foreground">{hint}</p>
    <code className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block mt-1">
      Exemplo: {example}
    </code>
  </div>
);

const AssetCard = ({ icon, title, hint }: { icon: string; title: string; hint: string }) => (
  <div className="rounded-lg border border-border bg-card p-4">
    <div className="text-2xl mb-2">{icon}</div>
    <p className="font-semibold text-sm">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</p>
  </div>
);

const PermBadge = ({ children }: { children: React.ReactNode }) => (
  <code className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20">
    {children}
  </code>
);

const FinalItem = ({
  icon,
  label,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
}) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
  </div>
);

const Trouble = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <p className="font-medium text-foreground">{q}</p>
    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{a}</p>
  </div>
);
