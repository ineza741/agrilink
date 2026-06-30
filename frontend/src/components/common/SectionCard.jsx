export function SectionCard({ title, subtitle, icon: Icon, children, action, className = "" }) {
  return (
    <article className={`section-card ${className}`}>
      <div className="section-card-head">
        <div className="section-card-head-left">
          {Icon && <Icon size={20} className="section-card-icon" />}
          <div>
            <h2 className="section-card-title">{title}</h2>
            {subtitle && <p className="section-card-sub">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="section-card-action">{action}</div>}
      </div>
      <div className="section-card-body">{children}</div>
    </article>
  );
}
