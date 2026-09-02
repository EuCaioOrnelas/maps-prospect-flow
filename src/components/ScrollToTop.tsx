import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sempre que a rota muda (clique no navbar, menus, cards, etc.),
 * a página volta para o topo — mesmo que o usuário estivesse com scroll ativo.
 * Navegações com hash (#secao) são preservadas.
 */
export const ScrollToTop = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
