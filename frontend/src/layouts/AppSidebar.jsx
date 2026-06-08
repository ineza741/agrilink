import { Headphones, Tractor, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  adminNavigationSections,
  brandConfig,
  farmerNavigationSections,
} from "../data/navigation";
import { useAuth } from "../context/AuthContext";

function initialsFromName(name = "User") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar({ isOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const sections = isAdmin ? adminNavigationSections : farmerNavigationSections;
  const initials = initialsFromName(user?.name);

  return (
    <aside className={isAdmin ? "prototype-sidebar" : isOpen ? "farmer-sidebar open" : "farmer-sidebar"}>
      <div className={isAdmin ? "sidebar-brand" : "farmer-sidebar-brand"}>
        <div className="farmer-brand-left">
          <div className="brand-mark">
            <Tractor size={18} />
          </div>
          <div>
            <strong>{brandConfig.name}</strong>
            {!isAdmin ? <span>{brandConfig.farmerSubtitle}</span> : null}
          </div>
        </div>
        {!isAdmin ? (
          <button
            type="button"
            className="farmer-close-button"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      <div className="sidebar-sections">
        {sections.map((section, index) => (
          <div key={`${section.title}-${index}`} className="sidebar-section">
            {section.title ? <p className="sidebar-section-title">{section.title}</p> : null}
            <nav className="sidebar-menu">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`${item.path}-${item.label}`}
                    to={item.path}
                    onClick={() => {
                      if (!isAdmin) {
                        onClose();
                      }
                    }}
                    className={({ isActive }) =>
                      isAdmin
                        ? isActive
                          ? "prototype-link active"
                          : "prototype-link"
                        : isActive
                          ? "farmer-link active"
                          : "farmer-link"
                    }
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {isAdmin ? (
        <div className="sidebar-footer-card">
          <div className="footer-avatar">{initials}</div>
          <div>
            <strong>{user?.name || brandConfig.adminFooterName}</strong>
            <span>{user?.role === "admin" ? "Administrator" : brandConfig.adminFooterRole}</span>
          </div>
        </div>
      ) : (
        <button type="button" className="farmer-support-button">
          <Headphones size={15} />
          <span>{brandConfig.supportLabel}</span>
        </button>
      )}
    </aside>
  );
}
