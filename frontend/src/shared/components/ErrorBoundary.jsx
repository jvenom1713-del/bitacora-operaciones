import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-slate-900 border border-red-500/40 rounded-xl text-white shadow-xl max-w-md mx-auto my-4 text-center space-y-3 relative z-50">
          <div className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{this.props.title || "Ocurrió un error en el componente"}</span>
          </div>
          <p className="text-xs text-slate-400">
            {this.state.error?.message || "No se pudo cargar este elemento correctamente."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cerrar / Reintentar</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
