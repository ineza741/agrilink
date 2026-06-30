import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { isAdminRole } from "../utils/roles";

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = isAdminRole(user?.role);
  const [isFarmerSidebarOpen, setIsFarmerSidebarOpen] = useState(false);
  const [isAdminSidebarOpen, setIsAdminSidebarOpen] = useState(false);
  const shouldShowHeader = true;

  useEffect(() => {
    if (isAdmin) {
      return undefined;
    }

    const handleToggleSidebar = () => {
      setIsFarmerSidebarOpen((current) => !current);
    };

    window.addEventListener("toggle-farmer-sidebar", handleToggleSidebar);
    return () => {
      window.removeEventListener("toggle-farmer-sidebar", handleToggleSidebar);
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return undefined;
    }
    const handleToggle = () => setIsAdminSidebarOpen((current) => !current);
    window.addEventListener("toggle-admin-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-admin-sidebar", handleToggle);
  }, [isAdmin]);

  const closeSidebars = () => {
    setIsFarmerSidebarOpen(false);
    setIsAdminSidebarOpen(false);
  };

  return (
    <div className={isAdmin ? "dashboard-layout" : "dashboard-layout farmer-layout"}>
      {!isAdmin && isFarmerSidebarOpen ? (
        <button
          type="button"
          className="farmer-sidebar-overlay"
          aria-label="Close menu"
          onClick={() => setIsFarmerSidebarOpen(false)}
        />
      ) : null}

      {isAdmin && isAdminSidebarOpen ? (
        <button
          type="button"
          className="farmer-sidebar-overlay admin-overlay"
          aria-label="Close menu"
          onClick={() => setIsAdminSidebarOpen(false)}
        />
      ) : null}

      <AppSidebar
        isOpen={isAdmin ? (isAdminSidebarOpen ? true : undefined) : isFarmerSidebarOpen}
        onClose={closeSidebars}
      />
      <div className="dashboard-main">
        {shouldShowHeader ? (
          <AppHeader onToggleSidebar={() => {
            if (isAdmin) {
              setIsAdminSidebarOpen((current) => !current);
            } else {
              setIsFarmerSidebarOpen((current) => !current);
            }
          }} />
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
