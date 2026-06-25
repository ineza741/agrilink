export function normalizeAppRole(role = "") {
  return String(role).trim().toLowerCase();
}

export function isAdminRole(role = "") {
  return ["admin", "extensionofficer"].includes(normalizeAppRole(role));
}

export function getAdminRoleLabel(role = "") {
  return normalizeAppRole(role) === "extensionofficer" ? "Extension Officer" : "Administrator";
}
