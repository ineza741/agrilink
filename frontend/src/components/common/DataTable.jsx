export function DataTable({ columns, rows, emptyMessage = "No data available.", className = "" }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="data-table-empty">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`data-table-wrapper ${className}`}>
      <div className="data-table">
        <div className="data-table-head">
          {columns.map((col) => (
            <div key={col.key} className="data-table-th" style={col.width ? { width: col.width } : undefined}>
              {col.label}
            </div>
          ))}
        </div>
        <div className="data-table-body">
          {rows.map((row, index) => (
            <div key={row.id || index} className="data-table-row">
              {columns.map((col) => (
                <div key={col.key} className="data-table-td" style={col.width ? { width: col.width } : undefined}>
                  {col.render ? col.render(row, index) : row[col.key]}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
