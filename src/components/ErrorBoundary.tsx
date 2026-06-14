import React from 'react';
import { isRuntimeAssetError, recoverFromRuntimeAssetError } from '@/lib/runtimeRecovery';
import wiizeLogo from '@/assets/logos/wiize-logo-white.png';


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
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at top, #0f1a14 0%, #050807 60%, #000 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
        }}>
          <div style={{
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            background: 'rgba(20, 28, 24, 0.6)',
            border: '1px solid rgba(34, 197, 94, 0.18)',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(34,197,94,0.08)',
          }}>
            <img
              src="/favicon.svg"
              alt="Wiize"
              style={{ width: '64px', height: '64px', margin: '0 auto 1.25rem', filter: 'drop-shadow(0 0 18px rgba(34,197,94,0.45))' }}
            />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff', letterSpacing: '-0.02em' }}>
              Algo deu errado
            </h1>
            <p style={{ color: '#a1a1aa', marginBottom: '1.75rem', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Encontramos um erro inesperado na aplicação. Por favor, recarregue a página para continuar. Se o problema persistir, entre em contato com nosso suporte.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '0.85rem 1.5rem',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
              >
                Recarregar página
              </button>
              <a
                href="/contact"
                style={{
                  background: 'transparent',
                  color: '#e4e4e7',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '0.8rem 1.5rem',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Entrar em contato com o suporte
              </a>
            </div>
            {this.state.error?.message && (
              <p style={{ color: '#52525b', marginTop: '1.5rem', fontSize: '0.72rem', fontFamily: 'monospace', wordBreak: 'break-word' }}>
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
