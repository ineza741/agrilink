import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const [isFarmerSidebarOpen, setIsFarmerSidebarOpen] = useState(false);
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

      <AppSidebar isOpen={isAdmin ? true : isFarmerSidebarOpen} onClose={() => setIsFarmerSidebarOpen(false)} />
      <div className="dashboard-main">
        {shouldShowHeader ? (
          <AppHeader onToggleSidebar={() => setIsFarmerSidebarOpen((current) => !current)} />
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
