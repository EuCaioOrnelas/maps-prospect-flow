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
                className="h-full bg-gradient-to-r from-[hsl(158 72% 32%)] to-[hsl(158 72% 52%)] transition-all duration-500"
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[hsl(158 72% 32%)]/10 text-[hsl(158 72% 28%)] text-[11px] font-medium border border-[hsl(158 72% 32%)]/20">
            <Sparkles size={11} /> Calma, é mais simples do que parece
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1]">
            Conecte seu WhatsApp <br className="hidden sm:block" />
            <span
              className="bg-clip-text text-transparent inline-block"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, hsl(158 72% 32%) 0%, hsl(158 72% 42%) 25%, hsl(158 72% 52%) 50%, hsl(158 72% 42%) 75%, hsl(158 72% 32%) 100%)",
                backgroundSize: "200% 100%",
                animation: "wiize-shine 3.5s linear infinite",
              }}
            >
              em 3 passos
            </span>
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
            <div className="w-9 h-9 rounded-xl bg-[hsl(158 72% 32%)]/10 flex items-center justify-center shrink-0">
              <HelpCircle size={16} className="text-[hsl(158 72% 28%)]" />
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
                    ? "border-zinc-900 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
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
                        ? "bg-emerald-500 text-white"
                        : isOpen
                        ? "bg-zinc-900 text-white"
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
                          className="flex-1 bg-zinc-900 text-white hover:bg-zinc-800 gap-2"
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
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-sm">
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
              className="bg-zinc-900 text-white hover:bg-zinc-800 gap-2"
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
      Pense no aplicativo como um <strong>"cadastro oficial"</strong> que a Meta exige para
      qualquer empresa enviar mensagens. Você só faz isso uma vez na vida.
    </Intro>

    <Step number={1} title="Abra a página de desenvolvedores da Meta">
      <p>
        Clique no botão abaixo. Vai abrir o site oficial. Faça login com a sua conta do Facebook (a mesma
        que cuida da página da empresa).
      </p>
      <BigLink href="https://developers.facebook.com/apps">
        Abrir o site da Meta
      </BigLink>
    </Step>

    <Step number={2} title="Clique no botão verde 'Criar aplicativo'">
      <p>Fica no canto superior direito da tela. A Meta vai te fazer algumas perguntas, responda assim:</p>
      <AnswerCard>
        <Answer q="Qual é o seu caso de uso?" a="Marque a opção 'Outro' e clique em Avançar." />
        <Answer q="Tipo de aplicativo?" a="Selecione 'Negócios' e clique em Avançar." />
        <Answer q="Nome do aplicativo" a="Pode ser qualquer nome, ex: 'Wiize Minha Empresa'. Só você vai ver." />
        <Answer q="Email de contato" a="Coloque o seu email." />
        <Answer q="Conta do Business" a="Selecione a conta da sua empresa. Se não tiver, a Meta cria na hora." />
      </AnswerCard>
    </Step>

    <Step number={3} title="Adicione o produto WhatsApp">
      <p>
        Depois de criar, você cai numa página com vários cards. Encontre o card escrito{" "}
        <strong>"WhatsApp"</strong> e clique no botão <strong>"Configurar"</strong> dentro dele.
        Se já fechou a aba, abra direto pelo link abaixo:
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir meus aplicativos Meta
      </BigLink>
      <Hint>
        Se aparecer alguma pergunta sobre a conta do WhatsApp Business, é só clicar em continuar.
        A Meta cuida da ligação automaticamente.
      </Hint>
    </Step>

    <Step number={4} title="Coloque o aplicativo no ar (modo Ativo)">
      <p>
        No menu lateral esquerdo, vá em <strong>Configurações → Básico</strong>. Lá em cima, na parte
        superior, tem um botão que muda de <strong>"Em desenvolvimento"</strong> para{" "}
        <strong>"Ativo"</strong>. Clique nele.
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir Configurações do meu app
      </BigLink>
      <p>A Meta vai te pedir 2 endereços. Já preparamos eles prontos pra você copiar:</p>
      <CopyRow
        label="Endereço da política de privacidade"
        value="https://wiize.com.br/privacidade"
        onCopy={copy}
      />
      <CopyRow label="Endereço do site" value="https://wiize.com.br" onCopy={copy} />
    </Step>

    <FinishBox>Pronto! Aplicativo criado e ativo. Pode passar para a etapa 2.</FinishBox>
  </>
);

const PhaseNumeroContent = () => (
  <>
    <Intro>
      Agora você vai dizer pra Meta qual <strong>número de telefone</strong> vai enviar as mensagens.
      No final, vamos pegar dois códigos importantes (vou te avisar quando).
    </Intro>

    <Step number={1} title="Entre no painel do WhatsApp">
      <p>
        Continue na mesma página do aplicativo que você criou. No menu lateral, clique em{" "}
        <strong>WhatsApp → Configuração da API</strong>. Se já fechou a aba, abra a lista de apps
        abaixo e clique no app que você criou na etapa 1:
      </p>
      <BigLink href="https://developers.facebook.com/apps/">
        Abrir meus aplicativos Meta
      </BigLink>
      <p className="text-xs text-zinc-500">
        Também é possível gerenciar pelo{" "}
        <a
          href="https://business.facebook.com/wa/manage/home"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[hsl(158 72% 28%)] font-medium hover:underline inline-flex items-center gap-0.5"
        >
          WhatsApp Manager <ExternalLink size={10} />
        </a>
        .
      </p>
    </Step>

    <Step number={2} title="Clique em 'Adicionar número de telefone'">
      <p>O botão fica no topo, ao lado dos números de exemplo. A Meta vai te pedir:</p>
      <AnswerCard>
        <Answer q="Nome de exibição" a="O nome que seu cliente vai ver no WhatsApp. Ex: 'Minha Empresa'." />
        <Answer q="Categoria" a="Escolha o que mais combina com o seu negócio." />
        <Answer q="Número de telefone" a="Coloque com DDI 55 e DDD. Exemplo: +55 11 98765-4321" />
        <Answer q="Receber código por" a="Escolha SMS ou ligação. Ligação costuma ser mais rápida." />
      </AnswerCard>
      <Hint type="warning">
        <strong>Atenção:</strong> esse número não vai mais funcionar no WhatsApp comum do celular.
        Se for um número que você usa, faça <strong>backup das conversas</strong> antes.
      </Hint>
    </Step>

    <Step number={3} title="Digite o código que chegou">
      <p>A Meta manda um código de 6 dígitos. Cole na tela e pronto, seu número está cadastrado.</p>
    </Step>

    <Step number={4} title="Anote os dois códigos que a Wiize vai pedir">
      <p>Esta é a parte mais importante. Não pule.</p>
      <p>
        Logo após cadastrar o número, você vai ver uma tela com <strong>dois números longos</strong>.
        Eles parecem iguais mas são diferentes. Copie os dois e guarde:
      </p>
      <IdBlock
        emoji="📱"
        label="ID do número de telefone"
        hint="Aparece logo abaixo do nome de exibição. Tem cerca de 15 dígitos."
        example="123456789012345"
      />
      <IdBlock
        emoji="🏢"
        label="ID da conta WhatsApp (WABA)"
        hint="Aparece no topo da página, em 'Informações da conta'. Também tem cerca de 15 dígitos."
        example="987654321098765"
      />
      <Hint>
        Dica: cole os dois num bloco de notas ou já vai colando no formulário da Wiize em outra aba.
      </Hint>
    </Step>

    <FinishBox>Número cadastrado, códigos no bolso. Vamos para a última etapa.</FinishBox>
  </>
);

const PhaseUsuarioContent = () => (
  <>
    <Intro>
      Agora vamos criar uma <strong>chave que nunca vence</strong>. Sem isso, sua conexão pararia de
      funcionar a cada 24 horas, e ninguém merece isso.
    </Intro>

    <Step number={1} title="Abra a página de usuários do sistema">
      <p>Clique no botão e faça login se pedir:</p>
      <BigLink href="https://business.facebook.com/settings/system-users">
        Abrir página de usuários
      </BigLink>
    </Step>

    <Step number={2} title="Crie um novo usuário do sistema">
      <p>Clique no botão azul <strong>"Adicionar"</strong> e preencha:</p>
      <AnswerCard>
        <Answer q="Nome" a="Coloque 'Wiize'. Esse nome só você vê." />
        <Answer q="Função do sistema" a="Escolha 'Administrador'. É obrigatório, sem isso a chave não funciona." />
      </AnswerCard>
      <p>Clique em <strong>"Criar usuário do sistema"</strong>.</p>
    </Step>

    <Step number={3} title="Dê acesso ao aplicativo e ao WhatsApp">
      <p>
        Selecione o usuário Wiize que você acabou de criar e clique em{" "}
        <strong>"Atribuir ativos"</strong>. Você vai fazer isso <strong>duas vezes</strong>:
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <AssetCard emoji="🧱" title="Aplicativos" hint="Selecione o aplicativo da etapa 1. Marque controle total." />
        <AssetCard emoji="💬" title="Contas do WhatsApp" hint="Selecione a conta da etapa 2. Marque controle total." />
      </div>
      <Hint type="warning">
        Se pular isso, a chave que vamos gerar não vai funcionar.
      </Hint>
    </Step>

    <Step number={4} title="Gere a chave de acesso">
      <p>Ainda no usuário Wiize, clique em <strong>"Gerar novo token"</strong> e responda:</p>
      <AnswerCard>
        <Answer q="Aplicativo" a="Selecione o aplicativo da etapa 1." />
        <Answer q="Validade" a="Escolha 'Nunca'. Esse é o pulo do gato." />
        <Answer
          q="Permissões"
          a="Marque as três: whatsapp_business_messaging, whatsapp_business_management e business_management."
        />
      </AnswerCard>
      <p>Clique em <strong>"Gerar token"</strong>.</p>
    </Step>

    <Step number={5} title="Copie a chave agora">
      <Hint type="warning">
        <strong>Cuidado:</strong> essa chave só aparece <strong>uma vez na tela</strong>. Se você fechar
        sem copiar, vai precisar gerar outra. Clique em <strong>"Copiar"</strong> agora mesmo.
      </Hint>
      <p className="text-sm mt-3">
        É um texto bem longo que começa com algumas letras tipo <code className="text-xs bg-zinc-100 px-1.5 py-0.5 rounded font-mono">EAAN...</code>
      </p>
    </Step>

    <FinishBox>É isso. Você tem as 3 informações que a Wiize precisa. Volte para a aba dela.</FinishBox>
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
      <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
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
    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors no-underline"
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
    <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
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
  emoji,
  label,
  hint,
  example,
}: {
  emoji: string;
  label: string;
  hint: string;
  example: string;
}) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-1.5">
    <p className="text-sm font-semibold flex items-center gap-2">
      <span className="text-base">{emoji}</span> {label}
    </p>
    <p className="text-xs text-zinc-500">{hint}</p>
    <code className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-1 rounded inline-block mt-1">
      Exemplo: {example}
    </code>
  </div>
);

const AssetCard = ({ emoji, title, hint }: { emoji: string; title: string; hint: string }) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-4">
    <div className="text-2xl mb-2">{emoji}</div>
    <p className="font-semibold text-sm">{title}</p>
    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{hint}</p>
  </div>
);

const FinishBox = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2.5">
    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
    <p className="text-sm text-emerald-900 leading-relaxed">{children}</p>
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
    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
  </div>
);

const Trouble = ({ q, a }: { q: string; a: string }) => (
  <div className="rounded-xl border border-zinc-200 bg-white p-3">
    <p className="font-medium text-sm text-zinc-900">{q}</p>
    <p className="text-zinc-500 mt-1 text-xs leading-relaxed">{a}</p>
  </div>
);
