import { toast } from "sonner";

/**
 * Flag temporária — quando true, todos os botões de "Teste Grátis"
 * da landing page ficam desabilitados e exibem aviso de indisponibilidade.
 * Defina como false para reativar o cadastro de teste.
 */
export const TRIAL_DISABLED = false;

export const TRIAL_DISABLED_MESSAGE = "Teste grátis indisponível no momento";
export const TRIAL_DISABLED_DESCRIPTION =
  "Estamos aprimorando a experiência. O teste gratuito será liberado em breve.";

export const notifyTrialDisabled = () => {
  toast.info(TRIAL_DISABLED_MESSAGE, {
    description: TRIAL_DISABLED_DESCRIPTION,
    duration: 4500,
  });
};
