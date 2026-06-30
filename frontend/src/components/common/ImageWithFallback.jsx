import { useEffect, useMemo, useState } from "react";
import { getCropImageUrl, getPestImageUrl, getDiseaseImageUrl } from "../../data/cropImages";

function createPlaceholderDataUri(label, category) {
  const safeLabel = String(label || "AgriSupport")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const palette =
    category === "disease"
      ? {
          start: "#1a4a1a",
          end: "#2d6b2d",
          accent: "#a7f3d0",
          tag: "Disease Reference",
        }
      : {
          start: "#305f2d",
          end: "#4d8d47",
          accent: "#a7f3d0",
          tag: "Crop Reference",
        };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="560" viewBox="0 0 800 560">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${palette.start}" />
          <stop offset="100%" stop-color="${palette.end}" />
        </linearGradient>
      </defs>
      <rect width="800" height="560" rx="42" fill="url(#bg)" />
      <circle cx="642" cy="118" r="92" fill="rgba(255,255,255,0.08)" />
      <circle cx="142" cy="442" r="128" fill="rgba(255,255,255,0.06)" />
      <rect x="48" y="56" width="202" height="42" rx="21" fill="rgba(255,255,255,0.12)" />
      <text x="149" y="83" text-anchor="middle" font-size="20" font-family="Segoe UI, Arial" fill="${palette.accent}" font-weight="700">${palette.tag}</text>
      <text x="60" y="320" font-size="46" font-family="Segoe UI, Arial" fill="#ffffff" font-weight="700">${safeLabel}</text>
      <text x="60" y="368" font-size="22" font-family="Segoe UI, Arial" fill="rgba(255,255,255,0.78)">AgriSupport academic placeholder image</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function ImageWithFallback({
  src,
  alt,
  label,
  category = "crop",
  className = "",
  cropName,
  pestName,
  diseaseName,
  ...props
}) {
  const autoSrc = useMemo(() => {
    if (src) return src;
    if (cropName) return getCropImageUrl(cropName);
    if (pestName) return getPestImageUrl(pestName);
    if (diseaseName) return getDiseaseImageUrl(diseaseName);
    return null;
  }, [src, cropName, pestName, diseaseName]);

  const fallbackSrc = useMemo(
    () => createPlaceholderDataUri(label || alt || cropName || pestName || diseaseName || "AgriSupport", category),
    [alt, category, label, cropName, pestName, diseaseName],
  );

  const [currentSrc, setCurrentSrc] = useState(autoSrc || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(autoSrc || fallbackSrc);
  }, [autoSrc, fallbackSrc]);

  return (
    <img
      src={currentSrc}
      alt={alt || label || cropName || pestName || diseaseName || "Agricultural reference"}
      className={className}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
      {...props}
    />
  );
}
