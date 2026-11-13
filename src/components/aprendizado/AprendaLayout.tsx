import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/landing/Footer";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";

interface AprendaLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

/** Moldura publica da central Domine a Wiize (sem exigir login). */
export function AprendaLayout({ children, title, description }: AprendaLayoutProps) {
  return (
    <>
      <SEO title={title} description={description} keywords="domine a wiize, tutoriais wiize, aulas wiize, aprender wiize" />
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3 sm:py-4 max-w-6xl flex items-center justify-between gap-3">
            <Link to="/aprenda" aria-label="Domine a Wiize - inicio" className="shrink-0">
              <Logo size="md" />
            </Link>
            <nav className="flex items-center gap-2">
              <Button variant="ghost" asChild className="gap-2 px-3 text-sm">
                <Link to="/ajuda">
                  <LifeBuoy size={16} />
                  <span className="hidden sm:inline">Central de Ajuda</span>
                  <span className="sm:hidden">Ajuda</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2 px-3 text-sm">
                <Link to="/">
                  <ArrowLeft size={16} />
                  Voltar ao site
                </Link>
              </Button>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-10 sm:py-14 max-w-6xl flex-1 w-full">{children}</main>
        <Footer />
      </div>
    </>
  );
}
