import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isAdminRole, isMarketOfficerRole, normalizeAppRole } from "../../utils/roles";

function getDefaultRouteForRole(role) {
  if (isMarketOfficerRole(role)) return "/market-officer/dashboard";
  if (isAdminRole(role)) return "/dashboard";
  return "/dashboard";
}

export function ProtectedRoute({ children, allowedRoles = null }) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return <div className="route-state">Loading workspace...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const normalizedRole = normalizeAppRole(user?.role);
    const normalizedAllowedRoles = allowedRoles.map((role) => normalizeAppRole(role));

    if (!normalizedAllowedRoles.includes(normalizedRole)) {
      return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
    }
  }

  return children;
}
