import { Bell, ChevronDown, CloudOff, LogOut, Menu, Moon, RefreshCw, Search, Settings, UserCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { brandConfig, routeMeta } from "../data/navigation";
import { useAuth } from "../context/AuthContext";
import { useFarmerData } from "../context/FarmerDataContext";
import { useMobileSupport } from "../context/MobileSupportContext";
import { groupSearchResults, searchGlobalRecords } from "../services/globalSearch";
import { getAdminRoleLabel, isAdminRole } from "../utils/roles";

function avatarFromName(name = "User") {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const farmerSearchPlaceholders = {
  "/profile": "Search resources...",
  "/farms": "Search farms, plots, or records...",
  "/farms/new": "Search farm setup help...",
  "/weather": "Search weather insights...",
  "/soil-crop": "Search soil or crop data...",
  "/ai-recommendation": "Search recommendations...",
  "/recommendations": "Search fields, nutrients, or data...",
  "/market-intelligence": "Search crops or markets...",
  "/pests-diseases": "Search diseases or pests...",
  "/irrigation-fertilizer": "Search farm data...",
  "/analytics": "Search analytics...",
  "/notifications": "Search alerts...",
  "/community": "Search community knowledge...",
  "/regional-monitoring": "Search districts, alerts, or advisories...",
  "/settings": "Search settings...",
};

export function AppHeader({ onToggleSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const farmerData = useFarmerData();
  const { isOffline, pendingSyncItems, syncNow, syncing } = useMobileSupport();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isAdminRole(user?.role);
  const crumb = routeMeta[location.pathname]?.crumb || "Dashboard";
  const initials = useMemo(() => avatarFromName(user?.name), [user?.name]);
  const farmerSearchPlaceholder = farmerSearchPlaceholders[location.pathname];
  const [openMenu, setOpenMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const searchResults = useMemo(
    () => searchGlobalRecords({ query: searchQuery, user, farmerData }),
    [searchQuery, user, farmerData]
  );
  const groupedSearchResults = useMemo(() => groupSearchResults(searchResults), [searchResults]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMenu = (menuName) => {
    setOpenMenu((current) => (current === menuName ? null : menuName));
  };

  const handleNavigate = (path) => {
    setOpenMenu(null);
    setSearchOpen(false);
    setSearchQuery("");
    navigate(path);
  };

  useEffect(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderGlobalSearch = (placeholder) => (
    <div className="global-search-wrap" ref={searchWrapRef}>
      <label className="header-search farmer-inline-search global-search-control">
        <Search size={16} />
        <input
          type="text"
          value={searchQuery}
          placeholder={placeholder}
          onFocus={() => setSearchOpen(true)}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearchOpen(false);
            }
            if (event.key === "Enter" && searchResults.length === 1) {
              handleNavigate(searchResults[0].path);
            }
          }}
        />
      </label>

      {searchOpen ? (
        <div className="global-search-panel">
          <div className="global-search-panel-head">
            <strong>Global Search</strong>
            <span>{searchQuery.trim().length < 2 ? "Type at least 2 characters" : `${searchResults.length} result(s)`}</span>
          </div>
          {searchQuery.trim().length < 2 ? (
            <div className="global-search-empty">
              <strong>Search across modules</strong>
              <p>Farmers, farms, soil records, live weather, pests, irrigation, markets, reports, alerts, and community knowledge are indexed from demo and local data.</p>
            </div>
          ) : searchResults.length ? (
            <div className="global-search-groups">
              {Object.entries(groupedSearchResults).map(([module, items]) => (
                <div key={module} className="global-search-group">
                  <div className="global-search-group-title">{module}</div>
                  <div className="global-search-group-list">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="global-search-result"
                        onClick={() => handleNavigate(item.path)}
                      >
                        <div className="global-search-result-copy">
                          <strong>{item.title}</strong>
                          <p>{item.description}</p>
                        </div>
                        <span className="global-search-result-source">{item.source}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="global-search-empty">
              <strong>No matching records found.</strong>
              <p>Try a farmer name, farm name, crop, district, pest, report, alert, or module keyword.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  if (isAdmin) {
    return (
      <header className="prototype-header">
        {renderGlobalSearch("Search farmers, regions, or data records...")}

        <div className="header-tools">
          <div className="header-sync-cluster">
            <span className={isOffline ? "header-status-badge offline" : "header-status-badge"}>
              <CloudOff size={14} />
              <span>{isOffline ? "Offline Mode" : "Online"}</span>
            </span>
            <button
              type="button"
              className="header-sync-button"
              onClick={syncNow}
              disabled={isOffline || syncing}
            >
              <RefreshCw size={14} className={syncing ? "spinning" : ""} />
              <span>{syncing ? "Syncing..." : `Sync${pendingSyncItems.length ? ` (${pendingSyncItems.length})` : ""}`}</span>
            </button>
          </div>
          <div className="farmer-header-menu-wrap">
            <button
              type="button"
              className="header-icon-button"
              aria-label="Notifications"
              onClick={() => toggleMenu("admin-notifications")}
            >
              <Bell size={16} />
            </button>
            {openMenu === "admin-notifications" ? (
              <div className="farmer-header-dropdown">
                <button type="button" onClick={() => setOpenMenu(null)}>
                  <Bell size={15} />
                  <span>No new notifications</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="farmer-header-menu-wrap">
            <button
              type="button"
              className="header-icon-button"
              aria-label="Settings"
              onClick={() => toggleMenu("admin-settings")}
            >
              <Settings size={16} />
            </button>
            {openMenu === "admin-settings" ? (
              <div className="farmer-header-dropdown">
                <button type="button" onClick={() => setOpenMenu(null)}>
                  <Settings size={15} />
                  <span>Admin settings</span>
                </button>
                <button type="button" onClick={() => setOpenMenu(null)}>
                  <Moon size={15} />
                  <span>Theme options</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="farmer-header-menu-wrap">
            <button
              type="button"
              className="header-user-pill admin-profile-pill"
              onClick={() => toggleMenu("admin-profile")}
              aria-label="Profile menu"
            >
              <div className="top-avatar">{initials}</div>
              <div>
                <strong>{user?.name}</strong>
                <span>{getAdminRoleLabel(user?.role)}</span>
              </div>
              <ChevronDown size={14} />
            </button>
            {openMenu === "admin-profile" ? (
              <div className="farmer-header-dropdown profile">
                <button type="button" onClick={() => handleNavigate("/dashboard")}>
                  <UserCircle2 size={15} />
                  <span>Admin profile</span>
                </button>
                <button type="button" onClick={handleLogout}>
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="farmer-header">
      <div className="farmer-header-left">
        <button
          type="button"
          className="farmer-menu-button"
          aria-label="Open sidebar"
          onClick={onToggleSidebar}
        >
          <Menu size={18} />
        </button>

        <div className="farmer-breadcrumb">
          <div className="farmer-app-title">
            <strong>{brandConfig.name}</strong>
            <span>{brandConfig.farmerSubtitle}</span>
          </div>
          <span>/</span>
          <strong>{crumb}</strong>
        </div>
      </div>

      <div className="farmer-header-actions">
        {farmerSearchPlaceholder ? renderGlobalSearch(farmerSearchPlaceholder) : null}
        <div className="header-sync-cluster">
          <span className={isOffline ? "header-status-badge offline" : "header-status-badge"}>
            <CloudOff size={14} />
            <span>{isOffline ? "Offline Mode" : "Online"}</span>
          </span>
          <button
            type="button"
            className="header-sync-button"
            onClick={syncNow}
            disabled={isOffline || syncing}
          >
            <RefreshCw size={14} className={syncing ? "spinning" : ""} />
            <span>{syncing ? "Syncing..." : `Sync${pendingSyncItems.length ? ` (${pendingSyncItems.length})` : ""}`}</span>
          </button>
        </div>
        <div className="farmer-header-menu-wrap">
          <button
            type="button"
            className="header-icon-button"
            aria-label="Notifications"
            onClick={() => toggleMenu("notifications")}
          >
            <Bell size={16} />
          </button>
          {openMenu === "notifications" ? (
            <div className="farmer-header-dropdown">
              <button type="button" onClick={() => handleNavigate("/notifications")}>
                <Bell size={15} />
                <span>Notifications</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="farmer-header-menu-wrap">
          <button
            type="button"
            className="header-icon-button"
            aria-label="Settings"
            onClick={() => toggleMenu("settings")}
          >
            <Settings size={16} />
          </button>
          {openMenu === "settings" ? (
            <div className="farmer-header-dropdown">
              <button type="button" onClick={() => handleNavigate("/settings")}>
                <Settings size={15} />
                <span>Settings</span>
              </button>
            </div>
          ) : null}
        </div>
        <div className="farmer-header-menu-wrap">
          <button
            type="button"
            className="farmer-user-pill"
            onClick={() => toggleMenu("profile")}
            aria-label="Profile menu"
          >
            <strong>{user?.name || "User"}</strong>
            <div className="top-avatar">{initials}</div>
            <ChevronDown size={14} />
          </button>
          {openMenu === "profile" ? (
            <div className="farmer-header-dropdown profile">
              <button type="button" onClick={() => handleNavigate("/profile")}>
                <UserCircle2 size={15} />
                <span>Profile</span>
              </button>
              <button type="button" onClick={handleLogout}>
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
