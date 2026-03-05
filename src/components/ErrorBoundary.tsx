import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-rose-900/20 border border-rose-500/50 rounded-xl text-center max-w-md mx-auto mt-10">
            <h3 className="text-xl text-rose-400 font-bold mb-2">Что-то пошло не так 😢</h3>
            <p className="text-slate-400 text-sm mb-6">
                Произошла ошибка. Попробуйте обновить страницу или нажать кнопку ниже.
            </p>
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                    Обновить страницу
                </button>
                <button 
                    onClick={() => this.setState({ hasError: false })}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold transition-colors"
                >
                    Попробовать снова
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
