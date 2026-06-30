import ImageWithFallback from "./ImageWithFallback";

export function ImageCard({ src, alt, label, category, subtitle, overlay, onClick, className = "" }) {
  return (
    <article
      className={`image-card ${onClick ? "image-card-clickable" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="image-card-media">
        <ImageWithFallback
          src={src}
          alt={alt || label}
          label={label}
          category={category}
          className="image-card-img"
        />
        {overlay && <div className="image-card-overlay">{overlay}</div>}
      </div>
      {(label || subtitle) && (
        <div className="image-card-info">
          {label && <strong className="image-card-label">{label}</strong>}
          {subtitle && <span className="image-card-subtitle">{subtitle}</span>}
        </div>
      )}
    </article>
  );
}
