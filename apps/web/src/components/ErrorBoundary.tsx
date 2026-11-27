import React from "react";

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || "Unexpected rendering error" };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="veil-panel" style={{ margin: 24, borderColor: "var(--veil-error)" }}>
          <h2 style={{ color: "var(--veil-error)" }}>Application Error</h2>
          <p style={{ color: "var(--veil-muted)" }}>{this.state.message}</p>
          <button className="veil-btn veil-btn-secondary" onClick={() => window.location.reload()}>
            Reload Studio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
