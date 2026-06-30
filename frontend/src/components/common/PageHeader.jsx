export function PageHeader({ title, description, children }) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="page-header-title">{title}</h1>
        {description && <p className="page-header-desc">{description}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}
