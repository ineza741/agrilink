import { useState, useCallback } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api")
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

function resolveBackendAssetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

const FALLBACK = "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260">
    <rect width="400" height="260" fill="#f0fdf4"/>
    <rect x="0" y="0" width="400" height="4" fill="#bbf7d0"/>
    <circle cx="200" cy="90" r="36" fill="#86efac" opacity="0.25"/>
    <path d="M185 85 L200 100 L215 80" stroke="#22c55e" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
    <text x="200" y="165" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#9ca3af">Image unavailable</text>
  </svg>`
);

export function PlantHealthImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveBackendAssetUrl(src);
  const showFallback = failed || !resolvedUrl;

  const handleError = useCallback(() => {
    if (!failed) setFailed(true);
  }, [failed]);

  return (
    <div className={`plant-health-img-wrap ${className}`}>
      {showFallback ? (
        <img
          src={FALLBACK}
          alt={alt || "Plant health image"}
          className="plant-health-img"
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      ) : (
        <img
          src={resolvedUrl}
          alt={alt || "Plant health image"}
          className="plant-health-img"
          onError={handleError}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      )}
    </div>
  );
}

export { resolveBackendAssetUrl };
