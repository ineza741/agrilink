export function SummaryCard({ title, value, detail, tone }) {
  return (
    <article className={`summary-card tone-${tone}`}>
      <p>{title}</p>
      <h3>{value}</h3>
      <span>{detail}</span>
    </article>
  );
}
