import { ReactNode, useEffect, useRef, useState } from "react";

interface DeferredSectionProps {
  children: ReactNode;
  /** Altura reservada enquanto a seção não monta — evita layout shift. */
  minHeight?: string;
  /** Distância antes da viewport em que a seção começa a carregar. */
  rootMargin?: string;
}

/**
 * Monta a seção apenas quando ela se aproxima da viewport.
 * Reduz JS executado, DOM inicial e trabalho de animação no primeiro paint,
 * sem alterar o conteúdo nem o layout final da página.
 */
export const DeferredSection = ({
  children,
  minHeight = "40vh",
  rootMargin = "600px 0px",
}: DeferredSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return <div ref={ref}>{show ? children : <div style={{ minHeight }} aria-hidden="true" />}</div>;
};
