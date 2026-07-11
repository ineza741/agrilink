export function normalizeAppRole(role = "") {
  return String(role).trim().toLowerCase();
}

export function isAdminRole(role = "") {
  return ["admin", "extensionofficer"].includes(normalizeAppRole(role));
}

export function isMarketOfficerRole(role = "") {
  return normalizeAppRole(role) === "marketofficer";
}

export function getAdminRoleLabel(role = "") {
  const normalized = normalizeAppRole(role);
  if (normalized === "extensionofficer") return "Extension Officer";
  if (normalized === "marketofficer") return "Market Officer";
  return "Administrator";
}
