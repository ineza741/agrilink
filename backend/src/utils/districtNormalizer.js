const DISTRICT_MAP = {
  "gasabo": "Gasabo",
  "kicukiro": "Kicukiro",
  "nyarugenge": "Nyarugenge",
  "bugesera": "Bugesera",
  "gatsibo": "Gatsibo",
  "kayonza": "Kayonza",
  "kirehe": "Kirehe",
  "ngoma": "Ngoma",
  "nyagatare": "Nyagatare",
  "rwamagana": "Rwamagana",
  "burera": "Burera",
  "gakenke": "Gakenke",
  "gicumbi": "Gicumbi",
  "musanze": "Musanze",
  "rulindo": "Rulindo",
  "gisagara": "Gisagara",
  "huye": "Huye",
  "kamonyi": "Kamonyi",
  "muhanga": "Muhanga",
  "nyamagabe": "Nyamagabe",
  "nyanza": "Nyanza",
  "nyaruguru": "Nyaruguru",
  "ruhango": "Ruhango",
  "karongi": "Karongi",
  "ngororero": "Ngororero",
  "nyabihu": "Nyabihu",
  "nyamasheke": "Nyamasheke",
  "rubavu": "Rubavu",
  "rusizi": "Rusizi",
  "rutsiro": "Rutsiro",
};

function normalizeDistrict(value) {
  if (!value) return "";
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/\bDistrict\b/gi, "")
    .replace(/\bProvince\b/gi, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
  return DISTRICT_MAP[cleaned] || cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function normalizeProvince(value) {
  if (!value) return "";
  const cleaned = value.replace(/\s+/g, " ").replace(/\bProvince\b/gi, "").trim().toLowerCase();
  if (cleaned.includes("kigali") || cleaned.includes("city")) return "Kigali City";
  if (cleaned.includes("eastern") || cleaned === "est") return "Eastern Province";
  if (cleaned.includes("northern") || cleaned === "nord") return "Northern Province";
  if (cleaned.includes("southern") || cleaned === "sud") return "Southern Province";
  if (cleaned.includes("western") || cleaned === "ouest") return "Western Province";
  return value;
}

module.exports = { normalizeDistrict, normalizeProvince, DISTRICT_MAP };
