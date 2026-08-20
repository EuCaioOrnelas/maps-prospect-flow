import React from 'react';
import { isRuntimeAssetError, recoverFromRuntimeAssetError } from '@/lib/runtimeRecovery';
import wiizeLogoLight from '@/assets/logos/wiize-logo.png';
import wiizeLogoDark from '@/assets/logos/wiize-logo-white.png';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    if (isRuntimeAssetError(error)) {
      void recoverFromRuntimeAssetError('error-boundary', error);
      return;
    }

    // Sessão antiga / estado obsoleto: tenta um reload automático (uma única vez
    // por sessão) em vez de exigir que o usuário clique em "Recarregar página".
    try {
      const key = 'wiize:auto-reload-after-error';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (!last || Date.now() - last > 60_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
      }
    } catch {
      /* noop */
    }
  }

  render() {
    if (this.state.hasError) {
      // Tema claro por padrão; escuro apenas se o usuário salvou "dark".
      let isDark = false;
      try {
        isDark = localStorage.getItem('dashboard-theme') === 'dark';
      } catch {
        isDark = false;
      }

      return (
        <div
          className={`${isDark ? 'dark' : 'landing-light'} min-h-screen flex items-center justify-center p-8 bg-background text-foreground font-sans`}
        >
          <div className="max-w-[460px] w-full text-center bg-card border border-border rounded-2xl p-10 shadow-lg">
            <img
              src={wiizeLogoLight}
              alt="Wiize"
              className={`w-24 h-auto mx-auto mb-5 ${isDark ? 'hidden' : 'block'}`}
            />
            <img
              src={wiizeLogoDark}
              alt="Wiize"
              className={`w-24 h-auto mx-auto mb-5 ${isDark ? 'block' : 'hidden'}`}
            />
            <h1 className="text-2xl font-semibold mb-3 tracking-tight text-foreground">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground mb-7 text-[0.95rem] leading-relaxed">
              Encontramos um erro inesperado na aplicação. Por favor, recarregue a página para continuar. Se o problema persistir, entre em contato com nosso suporte.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity px-6 py-3 rounded-full font-semibold text-[0.95rem] shadow-md"
              >
                Recarregar página
              </button>
              <a
                href="/contact"
                className="bg-transparent text-foreground border border-border hover:bg-accent transition-colors px-6 py-3 rounded-full font-medium text-sm no-underline inline-block"
              >
                Entrar em contato com o suporte
              </a>
            </div>
            {this.state.error?.message && (
              <p className="text-muted-foreground/70 mt-6 text-[0.72rem] font-mono break-words">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
