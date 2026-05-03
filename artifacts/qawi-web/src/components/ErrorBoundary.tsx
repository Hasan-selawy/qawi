import React from 'react';
import { useLanguage } from '@/hooks/use-language';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultFallback onRetry={() => { this.setState({ hasError: false }); window.location.reload(); }} />;
    }
    return this.props.children;
  }
}

function DefaultFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-12 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-2" dir="rtl">حدث خطأ ما</p>
      <button
        onClick={onRetry}
        className="mt-6 px-6 py-2 bg-primary text-black rounded-lg font-semibold hover:bg-primary/80 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

export function withErrorBoundary<T extends object>(Component: React.ComponentType<T>) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
