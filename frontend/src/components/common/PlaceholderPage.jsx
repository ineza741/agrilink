export function PlaceholderPage({ title, description }) {
  return (
    <section className="page-shell">
      <div className="section-header">
        <div>
          <p className="eyebrow">Module</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="placeholder-card">
        <p>{description}</p>
      </div>
    </section>
  );
}
