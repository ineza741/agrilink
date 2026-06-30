export function FilterBar({ children, className = "" }) {
  return (
    <div className={`filter-bar ${className}`}>
      {children}
    </div>
  );
}

export function FilterChip({ active, onClick, icon: Icon, children, className = "" }) {
  return (
    <button
      type="button"
      className={`filter-chip ${active ? "filter-chip-active" : ""} ${className}`}
      onClick={onClick}
    >
      {Icon && <Icon size={14} />}
      <span>{children}</span>
    </button>
  );
}

export function FilterSelect({ value, onChange, options, label, className = "" }) {
  return (
    <label className={`filter-select ${className}`}>
      {label && <span className="filter-select-label">{label}</span>}
      <select value={value} onChange={onChange}>
        {options.map((opt) => (
          <option key={opt.value || opt} value={opt.value || opt}>
            {opt.label || opt}
          </option>
        ))}
      </select>
    </label>
  );
}
