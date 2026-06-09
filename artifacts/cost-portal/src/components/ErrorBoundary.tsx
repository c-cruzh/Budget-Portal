import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide render guard. A single uncaught render error in any page used to
 * unmount the whole tree and leave a blank white screen (there was no boundary
 * anywhere). This catches it, surfaces a readable message, and offers recovery
 * so the rest of the portal stays usable instead of going blank.
 *
 * The fallback intentionally does NOT hide the failure — it shows the error so
 * a broken page is visible rather than silently empty.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Render error caught by ErrorBoundary:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) return this.props.fallback(error, this.reset);
      return (
        <div className="max-w-xl mx-auto mt-10 rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-red-500">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Algo salió mal al mostrar esta página</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ocurrió un error al renderizar el contenido. El resto del portal sigue
            funcionando — puedes cambiar de pestaña o reintentar.
          </p>
          <pre className="text-left text-[11px] text-red-600/80 bg-red-500/5 border border-red-500/20 rounded-md p-3 overflow-auto max-h-40 whitespace-pre-wrap">
            {error.message || String(error)}
          </pre>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={this.reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm font-medium hover:bg-muted"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RowContent({ render }: { render: () => React.ReactNode }) {
  // The render closure runs inside this child component so that any throw is
  // caught by the parent RowErrorBoundary (a boundary cannot catch errors
  // thrown in its own render, only in its children).
  return <>{render()}</>;
}

interface RowProps {
  /** Deferred row renderer — only invoked inside a child so throws are caught. */
  render: () => React.ReactNode;
  /** Fallback element (must be a <tr>) shown when this row throws. */
  fallback: React.ReactNode;
}

interface RowState {
  hasError: boolean;
}

/**
 * Per-row guard for the budget table. If a single row's data hits an unexpected
 * shape and throws during render, only that row falls back to an inline error
 * <tr> — the rest of the table still renders, instead of the whole tab going
 * blank.
 */
export class RowErrorBoundary extends React.Component<RowProps, RowState> {
  state: RowState = { hasError: false };

  static getDerivedStateFromError(): RowState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Budget row failed to render:", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return <RowContent render={this.props.render} />;
  }
}
