export function PageShell({ children, maxWidth = "1280px", className = "" }) {
  return (
    <div className={`page-shell ${className}`} style={{ maxWidth }}>
      {children}
    </div>
  );
}
