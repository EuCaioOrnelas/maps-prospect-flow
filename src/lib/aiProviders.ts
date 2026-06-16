import openaiLogo from "@/assets/ai-providers/openai.png.asset.json";
import claudeLogo from "@/assets/ai-providers/claude.png.asset.json";
import geminiLogo from "@/assets/ai-providers/gemini.png.asset.json";
import deepseekLogo from "@/assets/ai-providers/deepseek.png.asset.json";
import metaLogo from "@/assets/ai-providers/meta.png.asset.json";

export type ProviderId = "openai" | "claude" | "gemini" | "deepseek" | "meta";

export type ProviderInfo = {
  id: ProviderId;
  name: string;
  shortName: string;
  logo: string;
  placeholder: string;
  helper: string;
  url: string;
  steps: string[];
};

export const AI_PROVIDERS: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    shortName: "OpenAI",
    logo: openaiLogo.url,
    placeholder: "sk-...",
    helper: "Acesse a OpenAI Platform e gere uma chave de API.",
    url: "https://platform.openai.com/api-keys",
    steps: [
      "Acesse platform.openai.com/api-keys",
      "Faça login e clique em \"Create new secret key\"",
      "Copie a chave (começa com sk-) e cole abaixo",
    ],
  },
  {
    id: "claude",
    name: "Claude",
    shortName: "Claude",
    logo: claudeLogo.url,
    placeholder: "sk-ant-...",
    helper: "Crie uma chave no console da Anthropic.",
    url: "https://console.anthropic.com/settings/keys",
    steps: [
      "Acesse console.anthropic.com/settings/keys",
      "Clique em \"Create Key\" e dê um nome",
      "Copie a chave (sk-ant-...) e cole abaixo",
    ],
  },
  {
    id: "gemini",
    name: "Gemini",
    shortName: "Gemini",
    logo: geminiLogo.url,
    placeholder: "AIza...",
    helper: "Gere a chave no Google AI Studio.",
    url: "https://aistudio.google.com/app/apikey",
    steps: [
      "Acesse aistudio.google.com/app/apikey",
      "Faça login com sua conta Google",
      "Clique em \"Create API key\" e cole abaixo",
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    shortName: "DeepSeek",
    logo: deepseekLogo.url,
    placeholder: "sk-...",
    helper: "Crie a chave na plataforma da DeepSeek.",
    url: "https://platform.deepseek.com/api_keys",
    steps: [
      "Acesse platform.deepseek.com/api_keys",
      "Clique em \"Create new API key\"",
      "Copie e cole a chave abaixo",
    ],
  },
  {
    id: "meta",
    name: "Meta Llama",
    shortName: "Meta",
    logo: metaLogo.url,
    placeholder: "Token...",
    helper: "Token de acesso à Llama API da Meta.",
    url: "https://llama.developer.meta.com/",
    steps: [
      "Acesse llama.developer.meta.com",
      "Solicite acesso à Llama API e gere um token",
      "Cole o token de acesso abaixo",
    ],
  },
];

export const PROVIDER_BY_ID: Record<ProviderId, ProviderInfo> = AI_PROVIDERS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p }),
  {} as Record<ProviderId, ProviderInfo>,
);
