export function StatusBadge({ status, variant = "default", children, className = "" }) {
  const tone = status?.toLowerCase() === "verified" || status?.toLowerCase() === "active" || status?.toLowerCase() === "completed" || status?.toLowerCase() === "approved" || status?.toLowerCase() === "success" || status?.toLowerCase() === "live" || status?.toLowerCase() === "high" || status?.toLowerCase() === "accepted"
    ? "green"
    : status?.toLowerCase() === "pending" || status?.toLowerCase() === "warning" || status?.toLowerCase() === "moderate" || status?.toLowerCase() === "medium" || status?.toLowerCase() === "review"
      ? "amber"
      : status?.toLowerCase() === "critical" || status?.toLowerCase() === "danger" || status?.toLowerCase() === "failed" || status?.toLowerCase() === "rejected" || status?.toLowerCase() === "inactive" || status?.toLowerCase() === "missed"
        ? "red"
        : variant;
  return (
    <span className={`status-badge status-badge-${tone} ${className}`}>
      {children || status}
    </span>
  );
}
