/**
 * Rola até uma seção pelo id, mesmo quando ela ainda não foi montada
 * (seções lazy/deferred da landing só montam ao se aproximarem da viewport).
 * Enquanto o elemento não existe, avançamos a página aos poucos para
 * disparar a montagem e então rolamos suavemente até ele.
 */
export function scrollToSection(id: string, timeoutMs = 6000) {
  const start = Date.now();

  const step = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Ajuste final: seções vizinhas podem montar e deslocar o layout.
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 450);
      return;
    }

    if (Date.now() - start > timeoutMs) return;

    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    if (window.scrollY < max) {
      window.scrollTo({ top: Math.min(window.scrollY + window.innerHeight * 0.9, max) });
    }
    window.setTimeout(step, 120);
  };

  step();
}
