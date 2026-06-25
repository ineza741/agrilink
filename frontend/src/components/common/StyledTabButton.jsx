export default function StyledTabButton({
  active = false,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`agri-pill-tab${active ? " active" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
