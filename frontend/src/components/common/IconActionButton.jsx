export default function IconActionButton({
  label,
  title,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      aria-label={label || title}
      title={title || label}
      className={`agri-icon-action-button${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
