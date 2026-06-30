export function AppCard({ children, className = "", padding = true, hover = false }) {
  return (
    <article className={`app-card ${padding ? "app-card-padded" : ""} ${hover ? "app-card-hover" : ""} ${className}`}>
      {children}
    </article>
  );
}
