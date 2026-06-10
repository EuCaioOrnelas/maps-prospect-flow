import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
  KeyRound,
  Phone,
  Hash,
  ChevronDown,
  Copy,
  ArrowLeft,
  Sparkles,
  FileVideo,
  Info,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";

/**
 * Página de tutorial completa para conectar um número via Meta Cloud API.
 * Sempre aberta em nova guia. Tema branco/limpo, sem sidebar, sem header da app.
 * Fases colapsáveis (accordion) para reduzir carga cognitiva.
 *
 * Quando o vídeo estiver pronto, basta colar a URL aqui:
 */
const TUTORIAL_VIDEO_URL: string | null = null;

const PHASES = [
  {
    id: "app",
    badge: "Etapa 1 de 3",
    title: "Criar o aplicativo na Meta",
    subtitle: "É como abrir uma conta na Meta para sua empresa poder enviar mensagens. Só precisa fazer uma vez.",
  },
  {
    id: "numero",
    badge: "Etapa 2 de 3",
    title: "Cadastrar o número de WhatsApp",
    subtitle: "Aqui você diz qual número vai disparar as mensagens. Pode ser um número novo.",
  },
  {
    id: "usuario",
    badge: "Etapa 3 de 3",
    title: "Gerar a chave de acesso (token)",
    subtitle: "É a senha que a Wiize vai usar para enviar mensagens no seu lugar. Criamos uma que nunca vence.",
  },
];

export default function MetaConnectGuide() {
  const { toast } = useToast();
  const [openPhase, setOpenPhase] = useState<string>("app");
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiado` });
  };

  const togglePhase = (id: string) => {
    setOpenPhase((prev) => (prev === id ? "" : id));
  };

  const markDone = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    const idx = PHASES.findIndex((p) => p.id === id);
    const nextPhase = PHASES[idx + 1];
    if (nextPhase) {
      setOpenPhase(nextPhase.id);
      setTimeout(() => {
        document
          .getElementById(`fase-${nextPhase.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  const progress = (completed.size / PHASES.length) * 100;

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <SEO
        title="Guia: como conectar seu WhatsApp na Wiize"
        description="Passo a passo simples e ilustrado para conectar seu número WhatsApp Business à Wiize."
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              <MessageSquare size={14} className="text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs font-semibold truncate">Guia de conexão</p>
              <p className="text-[10px] text-zinc-500 truncate">Wiize · WhatsApp Business</p>
            </div>
          </div>

          {/* Mini progress */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500">
            <span>{completed.size}/{PHASES.length}</span>
            <div className="w-32 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[hsl(158_72%_32%)] to-[hsl(158_72%_52%)] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.close()}
            className="text-xs gap-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <ArrowLeft size={12} /> Voltar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-5 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(158_72%_32%)]/[0.06] text-[hsl(158_72%_28%)] text-[11px] font-medium border border-[hsl(158_72%_32%)]/15">
            <Sparkles size={11} /> Calma, é mais simples do que parece
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Conecte seu WhatsApp <br className="hidden sm:block" />
            <span className="text-shimmer-highlight font-extrabold">em 3 passos</span>
          </h1>
          <style>{`@keyframes wiize-shine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          <p className="text-zinc-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Deixe esta aba aberta e siga junto. Cada passo abre quando o anterior fecha. Não tem mistério.
          </p>
        </section>

        {/* Video */}
        <section className="rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-50 shadow-sm animate-fade-in">
          {TUTORIAL_VIDEO_URL ? (
            <div className="aspect-video bg-black">
              <iframe
                className="w-full h-full"
                src={TUTORIAL_VIDEO_URL}
                title="Tutorial em vídeo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center mb-4 shadow-sm">
                <FileVideo size={24} className="text-zinc-400" />
              </div>
              <p className="font-semibold text-base">Vídeo tutorial em produção</p>
              <p className="text-sm text-zinc-500 mt-1.5 max-w-md">
                Em breve um vídeo mostrando cada tela. Por enquanto, o passo a passo escrito abaixo te leva até o fim.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
                <PlayCircle size={12} /> Aguarde
              </div>
            </div>
          )}
        </section>

        {/* Antes de começar */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(158_72%_32%)]/10 flex items-center justify-center shrink-0">
              <HelpCircle size={16} className="text-[hsl(158_72%_28%)]" />
            </div>
            <div className="flex-1 space-y-3">
              <p className="font-semibold text-sm">Antes de começar, tenha em mãos:</p>
              <ul className="space-y-2 text-sm text-zinc-600">
                <CheckLi>
                  Uma conta no <strong>Facebook pessoal</strong> que seja administradora da sua empresa no Meta Business.
                </CheckLi>
                <CheckLi>
                  Um <strong>celular com um número</strong> (de preferência um chip novo, exclusivo da empresa)
                  que vai virar o seu <strong>número oficial Meta</strong> dentro da Wiize — usado para
                  responder clientes, criar campanhas e automações.
                </CheckLi>
                <CheckLi>Cerca de 15 minutinhos sem interrupção.</CheckLi>
              </ul>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex gap-2 items-start">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <div className="space-y-1.5">
                  <p>
                    <strong>Importante — leia com atenção:</strong> assim que você conectar esse número à Meta,
                    ele <strong>deixa de funcionar no app WhatsApp do celular</strong> (não dá mais para abrir o
                    WhatsApp comum nele).
                  </p>
                  <p>
                    A partir daí, esse número passa a viver <strong>dentro da Wiize</strong>: somos nós que fazemos
                    a ponte entre o <strong>seu número</strong> e o <strong>WhatsApp dos seus clientes</strong>.
                    Toda conversa, campanha e automação acontece pelo painel da Wiize.
                  </p>
                  <p>
                    Por isso recomendamos fortemente usar um <strong>chip novo, dedicado à empresa</strong> —
                    nunca um número pessoal que você ainda usa no dia a dia.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fases (accordion) */}
        <section className="space-y-3">
          {PHASES.map((phase, idx) => {
            const isOpen = openPhase === phase.id;
            const isDone = completed.has(phase.id);
            return (
              <article
                key={phase.id}
                id={`fase-${phase.id}`}
                className={`scroll-mt-20 rounded-2xl border bg-white transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "border-[hsl(158_72%_32%)] shadow-[0_8px_30px_-12px_hsl(158_72%_32%/0.35)]"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                {/* Header (clickable) */}
                <button
                  type="button"
                  onClick={() => togglePhase(phase.id)}
                  className="w-full text-left p-5 sm:p-6 flex items-start gap-4 group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? "bg-[hsl(158_72%_32%)] text-white"
                        : isOpen
                        ? "bg-[hsl(158_72%_32%)] text-white"
                        : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {phase.badge}
                    </p>
                    <h2 className="text-lg sm:text-xl font-bold mt-0.5">{phase.title}</h2>
                    <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{phase.subtitle}</p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-zinc-400 mt-2 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Body */}
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-6 sm:pb-8 animate-accordion-down">
                    <div className="border-t border-zinc-100 pt-6 space-y-6">
                      {phase.id === "app" && <PhaseAppContent copy={copy} />}
                      {phase.id === "numero" && <PhaseNumeroContent />}
                      {phase.id === "usuario" && <PhaseUsuarioContent />}

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          onClick={() => markDone(phase.id)}
                          className="flex-1 bg-[hsl(158_72%_32%)] text-white hover:bg-[hsl(158_72%_28%)] gap-2"
                        >
                          <CheckCircle2 size={15} />
                          {idx === PHASES.length - 1 ? "Concluir tudo" : "Marcar como feito e abrir próximo"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setOpenPhase("")}
                          className="border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                          Recolher
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {/* Final CTA */}
        {completed.size === PHASES.length && (
          <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-8 sm:p-10 text-center space-y-5 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-[hsl(158_72%_32%)] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold">Tudo pronto.</h2>
              <p className="text-zinc-600 max-w-md mx-auto">
                Volte para a aba da Wiize e cole as 3 informações no formulário <strong>Adicionar número</strong>.
              </p>
            </div>
            <div className="max-w-md mx-auto space-y-2 text-left">
              <FinalItem icon={<KeyRound size={14} />} label="Token de acesso" hint="Da etapa 3" />
              <FinalItem icon={<Hash size={14} />} label="ID da conta WhatsApp (WABA)" hint="Da etapa 2" />
              <FinalItem icon={<Phone size={14} />} label="ID do número de telefone" hint="Da etapa 2" />
            </div>
            <Button
              size="lg"
              onClick={() => window.close()}
              className="bg-[hsl(158_72%_32%)] text-white hover:bg-[hsl(158_72%_28%)] gap-2"
            >
              Voltar para a Wiize <ChevronRight size={16} />
            </Button>
          </section>
        )}

        {/* Travou? */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center">
              <AlertTriangle size={14} className="text-zinc-600" />
            </div>
            <h3 className="font-semibold text-sm">Travou em algum ponto?</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Trouble
              q="Não encontro a opção de Usuários do Sistema"
              a="Você ainda não é administrador. Peça para quem criou a conta da empresa te dar acesso de admin."
            />
            <Trouble
              q="O código de verificação não chega no celular"
              a="Tente receber por ligação no lugar de SMS. Funciona quase sempre."
            />
            <Trouble
              q="Gerei o token mas a Wiize diz que é inválido"
              a="Volte na etapa 3 e confira se você atribuiu o aplicativo e a conta WhatsApp ao usuário do sistema."
            />
            <Trouble
              q="Posso usar meu WhatsApp pessoal?"
              a="Pode, mas ele para de funcionar no celular como app comum. Por isso recomendamos um chip novo."
            />
          </div>
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <p>Ainda assim travou? Chama nosso suporte.</p>
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 font-medium hover:underline inline-flex items-center gap-1"
            >
              Falar com suporte <ExternalLink size={10} />
            </a>
          </div>
        </section>

        <footer className="text-center text-xs text-zinc-400 py-6 flex items-center justify-center gap-2">
          <Shield size={12} /> Seus dados são criptografados e usados só para enviar mensagens em seu nome.
        </footer>
      </main>
    </div>
  );
}

/* ---------------- Conteúdo das fases ---------------- */

const PhaseAppContent = ({ copy }: { copy: (v: string, l: string) => void }) => (
  <>
    <Intro>
      Vamos criar um "aplicativo" na Meta. É só um cadastro que ela exige. Você faz uma vez e nunca mais mexe.
    </Intro>

    <Step number={1} title="Abra a página de aplicativos da Meta">
      <p>Clique no botão abaixo. Faça login com a sua conta do Facebook que cuida da empresa.</p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir Meta for Developers
      </BigLink>
    </Step>

    <Step number={2} title='Clique em "Criar aplicativo"'>
      <p>O botão verde fica no canto superior direito. A Meta vai te perguntar algumas coisas — responda assim:</p>
      <AnswerCard>
        <Answer q="Qual é o seu caso de uso?" a='Marque "Outro" e clique em Avançar.' />
        <Answer q="Tipo de aplicativo" a='Selecione "Negócios" e clique em Avançar.' />
        <Answer q="Nome do aplicativo" a='Qualquer nome, ex: "Wiize Minha Empresa". Só você vê.' />
        <Answer q="Email de contato" a="O seu email." />
        <Answer q="Conta do Business" a="A conta da sua empresa. Se não tiver, a Meta cria na hora." />
      </AnswerCard>
      <BigLink href="https://developers.facebook.com/apps/creation/">
        Ir direto para "Criar aplicativo"
      </BigLink>
    </Step>

    <Step number={3} title='Adicione o produto "WhatsApp" ao app'>
      <p>
        Depois de criar o app, você cai numa página com vários cards. Encontre o card{" "}
        <strong>"WhatsApp"</strong> e clique em <strong>"Configurar"</strong> dentro dele.
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir meu app (lista de apps)
      </BigLink>
    </Step>

    <Step number={4} title='Coloque o app no ar (modo "Ativo")'>
      <p>
        Dentro do seu app, no menu lateral esquerdo, vá em{" "}
        <strong>Configurações → Básico</strong>. No topo tem um botão{" "}
        <strong>"Em desenvolvimento"</strong>. Clique nele e mude para <strong>"Ativo"</strong>.
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir meu app
      </BigLink>
      <p className="text-sm">A Meta vai pedir 2 endereços. Use estes (já estão prontos):</p>
      <CopyRow
        label="Política de privacidade"
        value="https://wiize.com.br/privacidade"
        onCopy={copy}
      />
      <CopyRow label="Site" value="https://wiize.com.br" onCopy={copy} />
    </Step>

    <FinishBox>App criado e ativo. Pode passar para a Etapa 2.</FinishBox>
  </>
);

const PhaseNumeroContent = () => (
  <>
    <Intro>
      Agora você vai cadastrar o número que vai virar o WhatsApp oficial Meta dentro da Wiize.
      No final, vamos copiar 2 códigos importantes.
    </Intro>

    <Step number={1} title='Abra "WhatsApp → Configuração da API" dentro do seu app'>
      <p>
        Volte para o app que você criou na etapa anterior. No menu lateral esquerdo, clique em{" "}
        <strong>WhatsApp</strong> e depois em <strong>Configuração da API</strong>.
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir meu app
      </BigLink>
    </Step>

    <Step number={2} title='Clique em "Adicionar número de telefone"'>
      <p>O botão fica no topo da página, ao lado dos números de exemplo. A Meta vai pedir:</p>
      <AnswerCard>
        <Answer q="Nome de exibição" a='O nome que o cliente vê. Ex: "Minha Empresa".' />
        <Answer q="Categoria" a="O que mais combina com seu negócio." />
        <Answer q="Número de telefone" a="Com DDI 55 e DDD. Ex: +55 11 98765-4321" />
        <Answer q="Receber código por" a="SMS ou ligação. Ligação costuma ser mais rápida." />
      </AnswerCard>
      <Hint type="warning">
        <strong>Atenção:</strong> esse número deixa de funcionar no app WhatsApp comum do celular.
        Se for um número que você usa, faça <strong>backup das conversas antes</strong>.
      </Hint>
    </Step>

    <Step number={3} title="Digite o código de verificação que chegou">
      <p>A Meta envia um código de 6 dígitos. Cole na tela e o número fica cadastrado.</p>
    </Step>

    <Step number={4} title="Copie o ID do número de telefone">
      <p>
        Logo abaixo do nome de exibição, vai aparecer um número longo (cerca de 15 dígitos).
        Esse é o <strong>Phone Number ID</strong>. Copie e guarde em um bloco de notas.
      </p>
      <IdBlock
        icon={<Phone size={16} className="text-[hsl(158_72%_32%)]" />}
        label="Phone Number ID"
        hint="Fica logo abaixo do nome de exibição do número."
        example="123456789012345"
      />
      <BigLink href="https://business.facebook.com/wa/manage/phone-numbers/">
        Ver meus números no WhatsApp Manager
      </BigLink>
    </Step>

    <Step number={5} title="Copie o ID da conta WhatsApp (WABA ID)">
      <p>
        Ainda na mesma página, no topo (em "Informações da conta"), vai aparecer outro número longo.
        Esse é o <strong>WABA ID</strong>. Copie e guarde junto.
      </p>
      <IdBlock
        icon={<Hash size={16} className="text-[hsl(158_72%_32%)]" />}
        label="WABA ID"
        hint='Aparece no topo da página, em "Informações da conta".'
        example="987654321098765"
      />
      <BigLink href="https://business.facebook.com/wa/manage/home/">
        Abrir WhatsApp Manager
      </BigLink>
    </Step>

    <FinishBox>Número cadastrado e os 2 IDs guardados. Última etapa agora.</FinishBox>
  </>
);

const PhaseUsuarioContent = () => (
  <>
    <Intro>
      Agora vamos criar uma <strong>chave de acesso que nunca expira</strong>. Sem ela, a conexão
      pararia a cada 24h.
    </Intro>

    <Step number={1} title="Abra a página de Usuários do Sistema">
      <p>Clique no botão abaixo e faça login se pedir.</p>
      <BigLink href="https://business.facebook.com/settings/system-users">
        Abrir Usuários do Sistema
      </BigLink>
    </Step>

    <Step number={2} title='Crie um novo usuário chamado "Wiize"'>
      <p>Clique no botão azul <strong>"Adicionar"</strong> e preencha:</p>
      <AnswerCard>
        <Answer q="Nome" a='Coloque "Wiize". Só você vê.' />
        <Answer q="Função do sistema" a='Escolha "Administrador". É obrigatório.' />
      </AnswerCard>
      <p>Clique em <strong>"Criar usuário do sistema"</strong>.</p>
    </Step>

    <Step number={3} title="Vincule o aplicativo a esse usuário">
      <p>
        Selecione o usuário <strong>Wiize</strong> na lista. Clique em{" "}
        <strong>"Atribuir ativos"</strong> e escolha <strong>"Aplicativos"</strong>. Selecione o app
        que você criou na Etapa 1, marque <strong>CONTROLE TOTAL</strong> e salve.
      </p>
      <BigLink href="https://business.facebook.com/settings/system-users">
        Abrir Usuários do Sistema
      </BigLink>
    </Step>

    <Step number={4} title="Vincule a conta de WhatsApp a esse usuário">
      <p>
        Ainda no usuário Wiize, clique em <strong>"Atribuir ativos"</strong> de novo. Dessa vez escolha{" "}
        <strong>"Contas do WhatsApp"</strong>. Selecione a conta da Etapa 2, marque{" "}
        <strong>CONTROLE TOTAL</strong> e salve.
      </p>
      <Hint type="warning">
        Sem esse passo a chave não funciona. Os passos 3 e 4 são <strong>dois cliques separados</strong>{" "}
        em "Atribuir ativos" — um para o app, outro para a conta de WhatsApp.
      </Hint>
    </Step>

    <Step number={5} title='Gere a chave (clique em "Gerar novo token")'>
      <p>Ainda no usuário Wiize, clique em <strong>"Gerar novo token"</strong> e responda:</p>
      <AnswerCard>
        <Answer q="Aplicativo" a="Selecione o aplicativo da Etapa 1." />
        <Answer q="Validade do token" a='Escolha "Nunca". Esse é o pulo do gato.' />
        <Answer
          q="Permissões"
          a="Marque as três: whatsapp_business_messaging, whatsapp_business_management e business_management."
        />
      </AnswerCard>
      <p>Clique em <strong>"Gerar token"</strong>.</p>
    </Step>

    <Step number={6} title='Copie a chave AGORA (ela só aparece 1 vez)'>
      <Hint type="warning">
        <strong>Cuidado:</strong> essa chave só aparece <strong>uma vez na tela</strong>. Se fechar
        sem copiar, vai precisar gerar outra. Clique em <strong>"Copiar"</strong> agora.
      </Hint>
      <p className="text-sm">
        É um texto longo que começa com{" "}
        <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">EAAN...</code>
        Esse é o seu <strong>Access Token</strong>.
      </p>
    </Step>

    <Step number={7} title="Volte para a Wiize e cole os 3 dados">
      <p>Pronto. Você tem tudo. Volte para a aba da Wiize, no formulário "Adicionar número", e cole:</p>
      <div className="space-y-2.5">
        <DataPickup
          icon={<KeyRound size={16} className="text-[hsl(158_72%_32%)]" />}
          field="Access Token"
          where="O texto longo que começa com EAAN... (passo 6 desta etapa)."
        />
        <DataPickup
          icon={<Hash size={16} className="text-[hsl(158_72%_32%)]" />}
          field="WABA ID"
          where="O número longo que você copiou no passo 5 da Etapa 2."
        />
        <DataPickup
          icon={<Phone size={16} className="text-[hsl(158_72%_32%)]" />}
          field="Phone Number ID"
          where="O número longo que você copiou no passo 4 da Etapa 2."
        />
      </div>
      <p className="text-sm">
        Cole cada um no campo certo, dê um apelido para o número (opcional) e clique em{" "}
        <strong>"Conectar número"</strong>. A Wiize valida tudo na hora.
      </p>
    </Step>

    <FinishBox>Conexão criada com sucesso. Você já pode fechar essa aba.</FinishBox>
  </>
);

/* ---------------- Pequenos componentes ---------------- */

const Intro = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 text-sm text-zinc-700 leading-relaxed">
    {children}
  </div>
);

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
      <div className="w-7 h-7 rounded-full bg-[hsl(158_72%_32%)] text-white flex items-center justify-center text-xs font-bold shrink-0">
        {number}
      </div>
      <div className="w-px flex-1 bg-zinc-100 mt-2" />
    </div>
    <div className="flex-1 pb-2 space-y-3 min-w-0">
      <h3 className="font-semibold text-base text-zinc-900">{title}</h3>
      <div className="text-sm text-zinc-600 leading-relaxed space-y-3">{children}</div>
    </div>
  </div>
);

const BigLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(158_72%_32%)] text-white text-sm font-medium hover:bg-[hsl(158_72%_28%)] transition-colors no-underline"
  >
    {children}
    <ExternalLink size={13} />
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
        ? "bg-amber-50 border border-amber-200 text-amber-900"
        : "bg-zinc-50 border border-zinc-200 text-zinc-700"
    }`}
  >
    <Info
      size={13}
      className={`mt-0.5 shrink-0 ${type === "warning" ? "text-amber-600" : "text-zinc-500"}`}
    />
    <div>{children}</div>
  </div>
);

const AnswerCard = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100 overflow-hidden">
    {children}
  </div>
);

const Answer = ({ q, a }: { q: string; a: string }) => (
  <div className="p-3 sm:p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">{q}</p>
    <p className="text-sm text-zinc-900 leading-relaxed">{a}</p>
  </div>
);

const CheckLi = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-2 items-start">
    <CheckCircle2 size={15} className="text-[hsl(158_72%_32%)] mt-0.5 shrink-0" />
    <span>{children}</span>
  </li>
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
  <div className="flex items-center gap-2 p-3 rounded-lg bg-white border border-zinc-200">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{label}</p>
      <p className="text-xs font-mono truncate text-zinc-900 mt-0.5">{value}</p>
    </div>
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-[11px] gap-1 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
      onClick={() => onCopy(value, label)}
    >
      <Copy size={11} /> Copiar
    </Button>
  </div>
);

const IdBlock = ({
  icon,
  label,
  hint,
  example,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  example: string;
}) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-1.5">
    <p className="text-sm font-semibold flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-[hsl(158_72%_32%)]/10 flex items-center justify-center shrink-0">
        {icon}
      </span>
      {label}
    </p>
    <p className="text-xs text-zinc-500">{hint}</p>
    <code className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded inline-block mt-1">
      Exemplo: {example}
    </code>
  </div>
);

const AssetCard = ({
  step,
  icon,
  title,
  hint,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4 flex gap-3">
    <div className="w-10 h-10 rounded-xl bg-[hsl(158_72%_32%)]/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(158_72%_28%)]">
        Passo {step}
      </p>
      <p className="font-semibold text-sm mt-0.5">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{hint}</p>
    </div>
  </div>
);

const DataPickup = ({
  icon,
  field,
  where,
}: {
  icon: React.ReactNode;
  field: string;
  where: string;
}) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-3.5 flex gap-3 items-start">
    <div className="w-8 h-8 rounded-lg bg-[hsl(158_72%_32%)]/10 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold">{field}</p>
      <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{where}</p>
    </div>
  </div>
);

const FinishBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl bg-[hsl(158_72%_32%)]/8 border border-[hsl(158_72%_32%)]/25 p-4 flex items-start gap-2.5">
    <CheckCircle2 size={16} className="text-[hsl(158_72%_32%)] mt-0.5 shrink-0" />
    <p className="text-sm text-[hsl(158_72%_18%)] leading-relaxed">{children}</p>
  </div>
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
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-zinc-200">
    <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold truncate">{label}</p>
      <p className="text-[11px] text-zinc-500">{hint}</p>
    </div>
    <CheckCircle2 size={16} className="text-[hsl(158_72%_32%)] shrink-0" />
  </div>
);

const Trouble = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-3">
    <p className="font-medium text-sm text-zinc-900">{q}</p>
    <p className="text-zinc-500 mt-1 text-xs leading-relaxed">{a}</p>
  </div>
);
