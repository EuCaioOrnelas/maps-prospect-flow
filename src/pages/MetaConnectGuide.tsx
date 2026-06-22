import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    badge: "Etapa 1 de 4",
    title: "Criar o aplicativo na Meta",
    subtitle: "É como abrir uma conta na Meta para sua empresa poder enviar mensagens. Só precisa fazer uma vez.",
  },
  {
    id: "numero",
    badge: "Etapa 2 de 4",
    title: "Cadastrar o número de WhatsApp",
    subtitle: "Aqui você diz qual número vai disparar as mensagens. Pode ser um número novo.",
  },
  {
    id: "usuario",
    badge: "Etapa 3 de 4",
    title: "Gerar a chave de acesso (token)",
    subtitle: "É a senha que a Wiize vai usar para enviar mensagens no seu lugar. Criamos uma que nunca vence.",
  },
  {
    id: "webhook",
    badge: "Etapa 4 de 4",
    title: "Ligar o webhook (receber mensagens)",
    subtitle: "É o que faz as respostas dos seus clientes caírem dentro da Wiize. Sem isso, você só envia — não recebe.",
  },
];

export default function MetaConnectGuide() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-white text-zinc-900 landing-light">
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
            onClick={() => navigate("/meta/numeros")}
            className="text-xs gap-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          >
            <ArrowLeft size={12} /> Voltar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-5 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(158_72%_32%)]/[0.06] text-primary text-[11px] font-medium border border-[#b8decf]">
            <Sparkles size={11} /> Calma, é mais simples do que parece
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Conecte seu WhatsApp <br className="hidden sm:block" />
            <span className="text-shimmer-highlight font-extrabold">em 4 passos</span>
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
                      {phase.id === "webhook" && <PhaseWebhookContent navigate={navigate} />}

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
              onClick={() => navigate("/meta/numeros")}
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

const PhaseAppContent = ({ copy: _copy }: { copy: (v: string, l: string) => void }) => (
  <>
    <Intro>
      Vamos criar um "aplicativo" na Meta. É só um cadastro que ela exige. Você faz uma vez e nunca mais mexe.
    </Intro>

    <Step number={1} title="Abra a página de aplicativos da Meta">
      <p>Clique no botão abaixo. A página vai abrir em uma nova aba. Faça login com a sua conta do Facebook que é administradora da empresa.</p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir Meta for Developers
      </BigLink>
      <p className="text-xs text-zinc-500">
        Dica: se você já estiver logado no Facebook no mesmo navegador, a Meta reconhece automaticamente.
      </p>
    </Step>

    <Step number={2} title='Clique no botão verde "Criar aplicativo"'>
      <p>
        Na página que abrir, olhe para o <strong>canto superior direito</strong> da tela. 
        Você vai ver um botão verde escrito <strong>"Criar aplicativo"</strong>. Clique nele.
      </p>
      <p>
        Se você já tiver aplicativos criados, o botão continua no mesmo lugar, à direita do título "Meus apps".
      </p>
    </Step>

    <Step number={3} title='Escolha "Outro" no tipo de caso de uso'>
      <p>
        A Meta vai abrir um assistente com a pergunta: <em>"Qual é o seu caso de uso?"</em>
      </p>
      <p>
        Role a lista até encontrar a opção <strong>"Outro"</strong>. Clique nela — ela costuma ficar no final da lista.
        Depois clique no botão <strong>"Avançar"</strong> que aparece no canto inferior direito da janela.
      </p>
    </Step>

    <Step number={4} title='Selecione "Negócios" como tipo de aplicativo'>
      <p>
        Na próxima tela, a Meta pergunta: <em>"Que tipo de aplicativo você está criando?"</em>
      </p>
      <p>
        Clique na opção <strong>"Negócios"</strong> — é a que tem um ícone de maletinha. 
        Depois clique em <strong>"Avançar"</strong> novamente.
      </p>
    </Step>

    <Step number={5} title="Preencha os dados do aplicativo">
      <p>
        Agora você cai numa tela com um formulário. Preencha cada campo com cuidado:
      </p>
      <AnswerCard>
        <Answer
          q="Nome de exibição do aplicativo"
          a='Digite qualquer nome que você vá reconhecer depois. Sugestão: "Wiize Minha Empresa" ou "Bot WhatsApp [Nome da Empresa]". Só você vê esse nome.'
        />
        <Answer
          q="Email de contato do aplicativo"
          a="Use o mesmo email que você usa para administrar a página do Facebook / Instagram da empresa."
        />
        <Answer
          q="Conta comercial do Facebook"
          a='Selecione a conta da sua empresa no dropdown. Se não aparecer nenhuma, clique em "Criar conta comercial" — a Meta cria uma na hora, é rápido.'
        />
      </AnswerCard>
      <p>
        Depois de preencher tudo, clique no botão <strong>"Criar aplicativo"</strong> no canto inferior direito.
      </p>
    </Step>

    <Step number={6} title="Confirme a verificação de segurança (se aparecer)">
      <p>
        Às vezes a Meta pede que você confirme que não é um robô. Pode ser um captcha ou uma verificação por SMS no seu celular.
      </p>
      <p>
        Siga as instruções na tela e clique em <strong>"Continuar"</strong> ou <strong>"Enviar"</strong> quando terminar.
      </p>
    </Step>

    <Step number={7} title='Adicione o produto "WhatsApp" ao app'>
      <p>
        Depois de criar o app, a Meta te leva para uma página com vários cards de produtos (API de Anúncios, Messenger, WhatsApp, etc.).
      </p>
      <p>
        Role a página até encontrar o card escrito <strong>"WhatsApp"</strong> (tem o ícone verde do WhatsApp).
        Dentro desse card, clique no botão <strong>"Configurar"</strong>.
      </p>
      <p className="text-xs text-zinc-500">
        Se não encontrar o card, use a barra de busca no topo da página e digite "WhatsApp".
      </p>
    </Step>

    <Step number={8} title="Aguarde a Meta ativar o produto WhatsApp">
      <p>
        Depois de clicar em "Configurar", a Meta pode levar alguns segundos para ativar o produto no seu app.
        Você vai ver uma tela de carregamento — espere até aparecer a mensagem <em>"WhatsApp adicionado ao seu aplicativo"</em>.
      </p>
      <p>
        Pronto. O app está criado e o WhatsApp já está vinculado a ele.
      </p>
    </Step>

    <Hint type="info">
      Pode deixar o app em <strong>"Em desenvolvimento"</strong>. Não precisa publicar, nem
      preencher política de privacidade — para uso interno via Cloud API funciona normal assim.
    </Hint>

    <FinishBox>App criado e WhatsApp configurado. Pode passar para a Etapa 2.</FinishBox>
  </>
);

const PhaseNumeroContent = () => (
  <>
    <Intro>
      Agora você vai cadastrar o número que vai virar o WhatsApp oficial Meta dentro da Wiize.
      No final desta etapa, você vai sair com <strong>2 códigos</strong> copiados num bloco de notas:
      o <strong>Phone Number ID</strong> e o <strong>WABA ID</strong>.
    </Intro>

    <Step number={1} title='Volte para o seu App e abra "WhatsApp → Configuração da API"'>
      <p>
        Clique no botão abaixo. Vai abrir a página <strong>"Meus Aplicativos"</strong> da Meta. Clique no
        card do app que você criou na Etapa 1 (o nome que você escolheu, ex: <em>"Wiize Conexão"</em>).
      </p>
      <p>
        Já dentro do app, olhe o <strong>menu lateral esquerdo</strong>. Procure pelo item{" "}
        <strong>WhatsApp</strong> (tem o ícone verde do WhatsApp). Clique nele para abrir o submenu e em
        seguida clique em <strong>"Configuração da API"</strong> (em alguns idiomas aparece como{" "}
        <em>"API Setup"</em>).
      </p>
      <Hint>
        Se o menu WhatsApp não aparecer, é porque o produto ainda não foi adicionado — volte na Etapa 1,
        passo 7, e adicione o produto WhatsApp primeiro.
      </Hint>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir Meus Aplicativos
      </BigLink>
    </Step>

    <Step number={2} title='Na tela "Configuração da API", clique em "Adicionar número de telefone"'>
      <p>
        A tela vai mostrar um <strong>número de teste</strong> que a Meta dá de presente (começa com{" "}
        <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">+1 555...</code>). Esse
        número <strong>não serve</strong> para o seu negócio — você vai usar o seu próprio.
      </p>
      <p>
        Logo acima dele, à direita, existe um botão azul ou um link escrito{" "}
        <strong>"Adicionar número de telefone"</strong> (em inglês:{" "}
        <em>"Add phone number"</em>). Clique nele.
      </p>
      <Hint type="warning">
        <strong>Atenção antes de continuar:</strong> o número que você cadastrar vai parar de funcionar no
        app WhatsApp comum do celular (some do iPhone/Android). Se for um número em uso, faça{" "}
        <strong>backup das conversas no celular antes</strong>. O ideal é usar um chip novo só para isso.
      </Hint>
    </Step>

    <Step number={3} title="Preencha o cadastro do número (4 campos)">
      <p>Vai abrir uma janelinha (modal) pedindo 4 informações. Preencha assim:</p>
      <AnswerCard>
        <Answer
          q="1. Nome de exibição"
          a='É o nome que seus clientes vão ver no WhatsApp. Use o nome da empresa, ex: "Wiize" ou "Padaria do João". Sem caracteres especiais.'
        />
        <Answer
          q="2. Categoria"
          a='Escolha a que mais combina com seu negócio (Varejo, Serviços, Educação, etc).'
        />
        <Answer
          q="3. Fuso horário"
          a='Selecione "America/Sao_Paulo" se você está no Brasil.'
        />
        <Answer
          q='4. "Avançar" → tela do telefone'
          a='Clique no botão "Avançar". Na tela seguinte, escolha o país (Brasil, +55), digite o número COMPLETO com DDD (ex: 11987654321) e escolha "Receber código por SMS" ou "Ligação". Ligação costuma chegar mais rápido.'
        />
      </AnswerCard>
      <p>Clique em <strong>"Avançar"</strong> para a Meta enviar o código de verificação.</p>
    </Step>

    <Step number={4} title="Digite o código de 6 dígitos que chegou no número">
      <p>
        Em até 1 minuto vai chegar um SMS ou ligação com um <strong>código de 6 dígitos</strong>. Digite
        no campo da tela e clique em <strong>"Avançar"</strong>. Pronto — o número está cadastrado.
      </p>
      <Hint>
        Se não chegar em 2 minutos, clique em <strong>"Reenviar código"</strong> e tente o outro método
        (SMS ou Ligação).
      </Hint>
    </Step>

    <Step number={5} title="Copie o Phone Number ID (1º código)">
      <p>
        Você voltou para a tela <strong>"Configuração da API"</strong>. Agora seu número aparece numa
        lista. Embaixo do nome de exibição (ex: "Wiize") vai aparecer um <strong>número longo</strong>{" "}
        com cerca de 15 dígitos — esse é o <strong>Phone Number ID</strong>.
      </p>
      <p>
        Passe o mouse em cima dele e clique no <strong>ícone de copiar</strong> (dois quadradinhos
        sobrepostos) que aparece ao lado. Cole num bloco de notas com a etiqueta{" "}
        <em>"Phone Number ID"</em>.
      </p>
      <IdBlock
        icon={<Phone size={16} className="text-[hsl(158_72%_32%)]" />}
        label="Phone Number ID"
        hint='Aparece logo abaixo do nome de exibição do número, na tela "Configuração da API".'
        example="123456789012345"
      />
    </Step>

    <Step number={6} title="Copie o WABA ID (2º código)">
      <p>
        Ainda na mesma tela <strong>"Configuração da API"</strong>, role um pouco para cima. Existe uma
        seção chamada <strong>"Conta do WhatsApp Business"</strong> (em inglês:{" "}
        <em>"WhatsApp Business Account"</em>). Logo abaixo desse título tem outro número longo — esse é
        o <strong>WABA ID</strong>.
      </p>
      <p>Copie do mesmo jeito (ícone de copiar) e cole no bloco de notas com etiqueta <em>"WABA ID"</em>.</p>
      <IdBlock
        icon={<Hash size={16} className="text-[hsl(158_72%_32%)]" />}
        label="WABA ID"
        hint='Está na seção "Conta do WhatsApp Business", logo no topo da Configuração da API.'
        example="987654321098765"
      />
      <BigLink href="https://business.facebook.com/latest/whatsapp_manager/phone_numbers/">
        (Opcional) Ver seus números no WhatsApp Manager
      </BigLink>
    </Step>

    <FinishBox>
      Número cadastrado e os 2 IDs guardados no bloco de notas. Pode partir para a Etapa 3.
    </FinishBox>
  </>
);

const PhaseUsuarioContent = () => (
  <>
    <Intro>
      Esta é a etapa mais importante: criar uma <strong>chave de acesso que nunca expira</strong>. Sem
      essa chave, a conexão pararia a cada 24h e você teria que ficar reconectando. Faça com calma — são
      8 passos.
    </Intro>

    <Step number={1} title="Abra a página de Usuários do Sistema do Meta Business">
      <p>
        Clique no botão abaixo. Vai abrir o <strong>Meta Business Suite → Configurações do Negócio</strong>,
        já na aba certa.
      </p>
      <p>
        Se pedir para escolher uma <strong>Conta de Negócios</strong>, escolha a mesma que você usou na
        Etapa 1 (passo 5). Se pedir login, faça login com a mesma conta Facebook usada até agora.
      </p>
      <BigLink href="https://business.facebook.com/latest/settings/system_users">
        Abrir Usuários do Sistema
      </BigLink>
    </Step>

    <Step number={2} title='Clique no botão azul "Adicionar" e crie o usuário "Wiize"'>
      <p>
        No topo da página (ou no meio da tela, se a lista estiver vazia) tem um botão azul escrito{" "}
        <strong>"Adicionar"</strong> (em inglês: <em>"Add"</em>). Clique nele.
      </p>
      <p>Vai abrir uma janelinha pedindo 2 informações:</p>
      <AnswerCard>
        <Answer q='Nome do usuário do sistema' a='Digite "Wiize" (sem aspas). Só você enxerga esse nome.' />
        <Answer q='Função do sistema' a='Abra o menu e escolha "Administrador". É obrigatório — sem isso, a chave não terá poder suficiente.' />
      </AnswerCard>
      <p>Clique em <strong>"Criar usuário do sistema"</strong>.</p>
    </Step>

    <Step number={3} title='Selecione o usuário "Wiize" na lista da esquerda'>
      <p>
        A tela ficou dividida em 2 colunas. Na coluna da esquerda aparece a lista de usuários do sistema —
        clique uma vez em cima do <strong>"Wiize"</strong> que você acabou de criar. A coluna da direita
        vai mostrar os detalhes dele (no momento, está vazia).
      </p>
    </Step>

    <Step number={4} title='Atribua o APLICATIVO ao usuário (1ª atribuição)'>
      <p>
        No painel da direita (com o Wiize selecionado), procure o botão{" "}
        <strong>"Atribuir ativos"</strong> (em inglês: <em>"Assign Assets"</em>). Clique nele.
      </p>
      <p>Vai abrir uma janela. Faça assim:</p>
      <AnswerCard>
        <Answer q='1. Tipo de ativo' a='Na coluna da esquerda da janela, escolha "Aplicativos".' />
        <Answer q='2. Qual aplicativo' a='No meio, marque o app que você criou na Etapa 1 (ex: "Wiize Conexão").' />
        <Answer q='3. Permissões' a='Na direita, ative o toggle "Gerenciar aplicativo" (CONTROLE TOTAL). Deixe ligado.' />
      </AnswerCard>
      <p>Clique em <strong>"Salvar alterações"</strong>.</p>
    </Step>

    <Step number={5} title='Atribua a CONTA DE WHATSAPP ao usuário (2ª atribuição)'>
      <p>
        Você está de novo no painel do Wiize. Clique <strong>outra vez</strong> em{" "}
        <strong>"Atribuir ativos"</strong>. Sim, é o mesmo botão — mas é um clique separado, para um
        ativo diferente.
      </p>
      <AnswerCard>
        <Answer q='1. Tipo de ativo' a='Na coluna da esquerda, escolha agora "Contas do WhatsApp".' />
        <Answer q='2. Qual conta' a='Marque a sua conta de WhatsApp (geralmente é a única que aparece).' />
        <Answer q='3. Permissões' a='Ative o toggle "Gerenciar conta do WhatsApp" (CONTROLE TOTAL).' />
      </AnswerCard>
      <p>Clique em <strong>"Salvar alterações"</strong>.</p>
      <Hint type="warning">
        Sem esses 2 ativos atribuídos (App + Conta de WhatsApp), a chave que vamos gerar no próximo passo{" "}
        <strong>não vai funcionar</strong>. Confira que aparecem os dois antes de continuar.
      </Hint>
    </Step>

    <Step number={6} title='Clique em "Gerar novo token"'>
      <p>
        Ainda no painel do usuário Wiize, procure o botão <strong>"Gerar novo token"</strong> (em inglês:{" "}
        <em>"Generate New Token"</em>). Clique. Vai abrir uma janela pedindo 3 coisas:
      </p>
      <AnswerCard>
        <Answer q='1. Aplicativo' a='Selecione o app da Etapa 1 (o mesmo que você atribuiu no passo 4).' />
        <Answer
          q='2. Validade do token'
          a='Abra o menu e escolha "Nunca". ESSE É O PULO DO GATO — se escolher 60 dias ou 90 dias, vai ter que refazer tudo depois.'
        />
        <Answer
          q='3. Permissões (role a lista e marque AS 3)'
          a='whatsapp_business_messaging, whatsapp_business_management, business_management. Use a barra de pesquisa da janela se ficar difícil de achar.'
        />
      </AnswerCard>
      <p>Clique no botão azul <strong>"Gerar token"</strong>.</p>
    </Step>

    <Step number={7} title='COPIE A CHAVE AGORA — ela só aparece uma vez'>
      <Hint type="warning">
        <strong>MUITO IMPORTANTE:</strong> essa chave aparece UMA ÚNICA VEZ na tela. Se você fechar a
        janela sem copiar, vai precisar voltar no passo 6 e gerar uma nova.
      </Hint>
      <p>
        Vai aparecer um <strong>texto bem longo</strong> (mais de 200 caracteres) começando com{" "}
        <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">EAAN...</code> ou{" "}
        <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">EAAB...</code>. Esse é o
        seu <strong>Access Token</strong>.
      </p>
      <p>
        Clique no botão <strong>"Copiar"</strong> ao lado e cole no bloco de notas com a etiqueta{" "}
        <em>"Access Token"</em>. Só depois feche a janela.
      </p>
    </Step>

    <Step number={8} title="Volte para a Wiize e cole os 3 dados">
      <p>
        Pronto, você tem tudo. Volte para a aba/janela da Wiize que abriu o formulário{" "}
        <strong>"Adicionar número"</strong> e preencha:
      </p>
      <div className="space-y-2.5">
        <DataPickup
          icon={<KeyRound size={16} className="text-[hsl(158_72%_32%)]" />}
          field="Access Token"
          where="O texto longo que começa com EAAN... (passo 7 desta etapa)."
        />
        <DataPickup
          icon={<Hash size={16} className="text-[hsl(158_72%_32%)]" />}
          field="WABA ID"
          where="O número longo que você copiou no passo 6 da Etapa 2."
        />
        <DataPickup
          icon={<Phone size={16} className="text-[hsl(158_72%_32%)]" />}
          field="Phone Number ID"
          where="O número longo que você copiou no passo 5 da Etapa 2."
        />
      </div>
      <p className="text-sm">
        Confira que colou o valor certo em cada campo (são parecidos só os WABA ID e Phone Number ID, não
        misture). Dê um apelido para o número (opcional, só para você se organizar) e clique em{" "}
        <strong>"Conectar número"</strong>. A Wiize valida tudo na hora e libera Chat e Campanhas.
      </p>
    </Step>

    <FinishBox>Conexão criada com sucesso. Falta só a última etapa: ligar o Webhook.</FinishBox>
  </>
);

const PhaseWebhookContent = ({ navigate }: { navigate: (path: string) => void }) => (
  <>
    <Intro>
      O webhook é o que faz as <strong>respostas dos seus clientes</strong> chegarem até a Wiize. Sem ele,
      o Chat fica vazio e as campanhas não medem leitura nem resposta. Leva 2 minutinhos — são 6 passos.
    </Intro>

    <Step number={1} title="Abra a tela de Webhook dentro da Wiize">
      <p>
        Antes de ir na Meta, abra a tela da Wiize que já tem a <strong>URL e o token prontos</strong>{" "}
        para copiar (você não precisa inventar nada). Clique no botão verde abaixo.
      </p>
      <button
        type="button"
        onClick={() => navigate("/meta/numeros?tab=webhook")}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(158_72%_32%)] text-white text-sm font-medium hover:bg-[hsl(158_72%_28%)] transition-colors"
      >
        Abrir configuração de Webhook
        <ChevronRight size={13} />
      </button>
      <Hint>
        Deixe essa aba aberta — você vai voltar nela várias vezes para copiar dados e, no final, para
        testar.
      </Hint>
    </Step>

    <Step number={2} title='Numa NOVA aba, volte para o seu App da Meta'>
      <p>
        Clique no botão abaixo (vai abrir em nova aba). Na página <strong>"Meus Aplicativos"</strong>,
        clique no card do app que você criou na Etapa 1.
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir Meus Aplicativos
      </BigLink>
    </Step>

    <Step number={3} title='Vá em "WhatsApp → Configuração" e abra a seção Webhook'>
      <p>
        Dentro do app, no <strong>menu lateral esquerdo</strong>, clique em <strong>WhatsApp</strong> e
        depois em <strong>"Configuração"</strong> (em inglês: <em>"Configuration"</em> — atenção: NÃO é
        a "Configuração da API" da Etapa 2, é um item diferente, geralmente um pouco mais abaixo).
      </p>
      <p>
        Role a página para baixo até achar a seção <strong>"Webhook"</strong>. Ao lado do título dela,
        clique no botão <strong>"Editar"</strong> (ou <em>"Edit"</em>).
      </p>
    </Step>

    <Step number={4} title="Cole a Callback URL e o Verify Token vindos da Wiize">
      <p>Vai abrir uma janelinha com 2 campos. Preencha assim:</p>
      <AnswerCard>
        <Answer
          q="1. URL de retorno de chamada (Callback URL)"
          a='Volte na aba da Wiize (passo 1), copie o valor do campo "Callback URL" e cole aqui.'
        />
        <Answer
          q="2. Token de verificação (Verify Token)"
          a='Na mesma tela da Wiize, copie o "Verify Token" e cole aqui.'
        />
      </AnswerCard>
      <p>Clique em <strong>"Verificar e salvar"</strong>.</p>
      <Hint type="warning">
        Se aparecer "<em>erro de validação</em>" ou "<em>URL de retorno de chamada não pôde ser validada</em>",
        confira que copiou os 2 valores <strong>inteiros</strong>, sem espaços no começo ou no fim. Tente
        copiar de novo direto da Wiize.
      </Hint>
    </Step>

    <Step number={5} title='Marque TODOS os eventos obrigatórios em "Webhook fields"'>
      <p>
        Voltou para a tela do Webhook. Agora, ao lado de <strong>"Campos do webhook"</strong> (em inglês:{" "}
        <em>"Webhook fields"</em>), clique em <strong>"Gerenciar"</strong>.
      </p>
      <p>
        Vai abrir uma lista grande de eventos. Volte na aba da Wiize (passo 1) — lá tem um card chamado{" "}
        <strong>"Eventos obrigatórios"</strong> com a lista exata do que marcar. Em cada evento listado,
        clique em <strong>"Inscrever-se"</strong> (em inglês: <em>"Subscribe"</em>) na Meta.
      </p>
      <Hint type="warning">
        Sem marcar TODOS os eventos da lista, o Chat fica sem mensagens, as campanhas não medem leitura
        nem resposta e o quality rating do número fica errado.
      </Hint>
    </Step>

    <Step number={6} title='Volte para a Wiize e clique em "Testar todos"'>
      <p>
        Volte na aba da Wiize. Role até a seção <strong>"Teste e validação por número"</strong> e clique
        no botão <strong>"Testar todos"</strong>. A Wiize vai disparar um teste em cada evento e
        mostrar um check verde quando estiver tudo certo.
      </p>
      <p>
        Quando <strong>todos ficarem verdes</strong>, a operação está 100% pronta — Chat liberado,
        Campanhas medindo certo.
      </p>
      <button
        type="button"
        onClick={() => navigate("/meta/numeros?tab=webhook")}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[hsl(158_72%_32%)] text-white text-sm font-medium hover:bg-[hsl(158_72%_28%)] transition-colors"
      >
        Ir para Testar todos
        <ChevronRight size={13} />
      </button>
    </Step>

    <FinishBox>Webhook ligado. Agora sim sua operação está 100% pronta.</FinishBox>
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
