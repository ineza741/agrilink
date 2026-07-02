import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

function getErrorMessage(error) {
  if (!error) return "This screen could not render correctly.";
  return error.message || "This screen could not render correctly.";
}

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    const componentName = this.props.componentName || "Unknown Page/Component";
    const componentStack = errorInfo?.componentStack || "No stack trace available";
    this.setState({ componentStack });
    console.error("AppErrorBoundary caught an error:", error);
    console.error("Location:", componentName);
    console.error("Component stack:", componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="app-runtime-fallback">
        <article className="app-runtime-fallback-card">
          <div className="app-runtime-fallback-icon">
            <AlertTriangle size={20} />
          </div>
          <div className="app-runtime-fallback-copy">
            <strong>Something interrupted this screen.</strong>
            <p>
              AgriSupport is still running in frontend demo mode. Reload the page or return to the
              dashboard to continue the demonstration.
            </p>
            <small>{getErrorMessage(this.state.error)}</small>
            <small style={{ color: "#d97706", marginTop: "4px", display: "block" }}>
              Location: {this.props.componentName || "Unknown page"}
            </small>
          </div>
          <div className="app-runtime-fallback-actions">
            <button type="button" className="header-sync-button" onClick={this.handleReload}>
              <RefreshCw size={14} />
              <span>Reload screen</span>
            </button>
            <a className="prototype-cta secondary" href="/dashboard">
              Go to dashboard
            </a>
          </div>
        </article>
      </section>
    );
  }
}
