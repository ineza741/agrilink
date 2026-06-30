import { isValidElement } from "react";

export function MetricCard({ icon, label, value, sub, trend, className = "" }) {
  let iconEl = null;
  if (icon) {
    if (isValidElement(icon)) {
      iconEl = icon;
    } else if (typeof icon === "function") {
      const Icon = icon;
      iconEl = <Icon size={20} />;
    }
  }
  return (
    <article className={`metric-card ${className}`}>
      {iconEl && <div className="metric-card-icon">{iconEl}</div>}
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <strong className="metric-card-value">{value}</strong>
        {sub && <span className="metric-card-sub">{sub}</span>}
      </div>
      {trend && <span className={`metric-card-trend ${trend >= 0 ? "up" : "down"}`}>{trend >= 0 ? "+" : ""}{trend}%</span>}
    </article>
  );
}
