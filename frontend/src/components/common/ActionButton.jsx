import { forwardRef } from "react";

export const ActionButton = forwardRef(function ActionButton(
  { children, variant = "primary", size = "md", icon: Icon, className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`action-button action-button-${variant} action-button-${size} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 14 : size === "lg" ? 18 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
});
