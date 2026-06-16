import { Download, Map, MapPin, PlusCircle, Search, Users, Waves } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";

function formatStatus(status) {
  if (status === "verified") return "Verified";
  if (status === "inactive") return "Inactive";
  return "Pending";
}

function FarmerFarmsView() {
  const navigate = useNavigate();
  const { currentFarms, currentProfile, getProfileCompleteness } = useFarmerData();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const visibleFarms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return currentFarms;
    }

    return currentFarms.filter((farm) =>
      [farm.name, farm.region, farm.primaryCrop, farm.plotLabel]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [currentFarms, query]);

  const farmMetrics = useMemo(() => {
    const totalAcreage = currentFarms.reduce((sum, farm) => sum + Number(farm.sizeHectares || 0), 0);
    const verifiedFarms = currentFarms.filter((farm) => farm.verificationStatus === "verified").length;
    const cooperativePlots = currentFarms.filter((farm) => farm.cooperativeName).length;

    return [
      { label: "Total Acreage", value: totalAcreage.toFixed(totalAcreage % 1 === 0 ? 0 : 1), unit: "ha" },
      { label: "Verified Farms", value: `${verifiedFarms}/${currentFarms.length || 0}` },
      { label: "Profile Completeness", value: `${getProfileCompleteness(user.id)}%` },
      { label: "Cooperative Plots", value: `${cooperativePlots}` },
    ];
  }, [currentFarms, getProfileCompleteness, user.id]);

  return (
    <section className="management-page prototype-farms-page">
      <div className="page-title-block prototype-profile-title">
        <h1>Farmer Profile &amp; Farm Management</h1>
        <p>Academic-grade decision support and asset oversight for modern agriculture.</p>
      </div>

      <div className="prototype-farms-head enhanced">
        <div>
          <h2>Registered Farms</h2>
          <p className="profile-section-copy">
            Manage multiple plots, track historical crop performance, and prepare cooperative registrations.
          </p>
        </div>

        <div className="prototype-farms-actions">
          <label className="prototype-inline-search compact">
            <Search size={16} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search farms, plots, crops, or regions..."
            />
          </label>
          <button
            type="button"
            className="profile-prototype-button primary"
            onClick={() => navigate("/farms/new")}
          >
            <PlusCircle size={16} />
            <span>Add New Farm</span>
          </button>
        </div>
      </div>

      <div className="profile-farm-list">
        {visibleFarms.map((farm) => (
          <article key={farm.id} className="prototype-panel profile-farm-card">
            <div className="profile-farm-map">
              <div className="profile-farm-map-grid" />
              <div className="profile-farm-map-road road-a" />
              <div className="profile-farm-map-road road-b" />
              <div className="profile-farm-map-road road-c" />
              <div
                className="profile-farm-pin dynamic-pin"
                style={{
                  left: `${farm.location.mapX}%`,
                  top: `${farm.location.mapY}%`,
                }}
              />
              <div className="profile-farm-coordinates">
                {farm.location.lat.toFixed(2)}° , {farm.location.lng.toFixed(2)}°
              </div>
            </div>

            <div className="profile-farm-content">
              <div className="profile-farm-top">
                <div>
                  <h3>{farm.name}</h3>
                  <div className="profile-farm-meta">
                    <span>
                      <MapPin size={14} />
                      {farm.sizeHectares} Hectares
                    </span>
                    <span>
                      <Waves size={14} />
                      {farm.irrigationType}
                    </span>
                  </div>
                </div>
                <span className={`profile-farm-status ${farm.verificationStatus}`}>
                  {formatStatus(farm.verificationStatus)}
                </span>
              </div>

              <div className="profile-farm-history">
                <span>Crop History</span>
                <div className="profile-history-tags">
                  {farm.history.map((item) => (
                    <span key={item.id} className="profile-history-tag">
                      {item.crop} ({item.season})
                    </span>
                  ))}
                </div>
                <p className="profile-farm-challenges">
                  Historical notes: {farm.history[0]?.challenges || "No major challenges recorded yet."}
                </p>
              </div>

              <div className="profile-farm-extra">
                <span>Land Type: {farm.landType}</span>
                <span>Primary Crop: {farm.primaryCrop}</span>
                {currentProfile?.cooperativeName ? <span>Cooperative: {currentProfile.cooperativeName}</span> : null}
              </div>

              <div className="profile-farm-actions">
                <button type="button" className="profile-farm-link muted" onClick={() => navigate("/analytics")}>
                  Analytics
                </button>
                <button
                  type="button"
                  className="profile-farm-link primary"
                  onClick={() => navigate(`/farms/new?edit=${farm.id}`)}
                >
                  Manage Farm
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="profile-metric-grid wide">
        {farmMetrics.map((metric) => (
          <article key={metric.label} className="profile-metric-card">
            <span>{metric.label}</span>
            <strong>
              {metric.value}
              {metric.unit ? <small>{metric.unit}</small> : null}
            </strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminFarmsView() {
  const { adminFarmerRows, approveProfile, deactivateProfile, bulkOnboardFarmers } = useFarmerData();
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 4;

  const regions = useMemo(
    () => ["all", ...new Set(adminFarmerRows.map((row) => row.region).filter(Boolean))],
    [adminFarmerRows]
  );

  const visibleRows = useMemo(() => {
    return adminFarmerRows.filter((row) => {
      const matchesQuery =
        !query.trim() ||
        [row.name, row.id, row.region, row.profile.email]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase());

      const matchesRegion = regionFilter === "all" || row.region === regionFilter;
      return matchesQuery && matchesRegion;
    });
  }, [adminFarmerRows, query, regionFilter]);

    useEffect(() => {
    setPage(1);
  }, [query, regionFilter]);

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPerPage));
  const pagedRows = visibleRows.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  const adminSummary = useMemo(() => {
    const active = adminFarmerRows.filter((row) => row.status === "verified").length;
    const pending = adminFarmerRows.filter((row) => row.status === "pending").length;
    const topRegion = [...adminFarmerRows]
      .sort((a, b) => b.farmCount - a.farmCount)[0]
      ?.region;

    return [
      { label: "Total Active", value: `${active}`, tone: "green", icon: Users },
      { label: "Pending Approval", value: `${pending}`, tone: "amber", icon: PlusCircle },
      { label: "Top Region", value: topRegion || "Unassigned", tone: "blue", icon: Map },
    ];
  }, [adminFarmerRows]);

  const handleBulkOnboard = () => {
    const rows = bulkText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const [fullName, email, region, crop] = line.split(",").map((part) => part?.trim());
        return {
          fullName: fullName || `Cooperative Farmer ${index + 1}`,
          email: email || `farmer${Date.now()}${index}@agrifeed.local`,
          region: region || "Northern Highlands",
          contact: `+250 788 000 ${String(index + 1).padStart(3, "0")}`,
          experienceLevel: "Intermediate",
          cooperativeName: "Admin Bulk Onboarding Batch",
          farmName: `${fullName || `Farmer ${index + 1}`}'s Plot`,
          plotLabel: "Main Plot",
          sizeHectares: 4 + index,
          landType: "Loamy",
          irrigationType: "Drip Irrigation",
          primaryCrop: crop || "Maize",
          history: [],
        };
      });

    if (!rows.length) {
      setBulkStatus("Add at least one farmer line to onboard.");
      return;
    }

    try {
      const created = bulkOnboardFarmers(rows, "AgriFeed Admin");
      setBulkStatus(`${created.length} farmer account(s) onboarded successfully.`);
      setBulkText("");
    } catch (error) {
      setBulkStatus(error.message || "Bulk onboarding failed.");
    }
  };

  return (
    <section className="management-page prototype-admin-farmers-page">
      <div className="prototype-admin-farmers-title">
        <h1>Farmer Management</h1>
        <p>Manage registrations, multi-farm records, verification flow, and centralized farm mapping data.</p>
      </div>

      <div className="prototype-admin-farmers-filters">
        <label className="prototype-admin-farmers-search">
          <Search size={17} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search farmers by name, ID, or email..."
          />
        </label>
        <label className="prototype-admin-farmers-region real-select">
          <MapPin size={17} />
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region === "all" ? "Filter by Region" : region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="prototype-admin-farmers-tools">
        <article className="prototype-panel prototype-admin-farmers-bulk-card">
          <div className="panel-toolbar">
            <h2>Bulk Farmer Onboarding</h2>
            <button type="button" className="text-link-button primary" onClick={handleBulkOnboard}>
              Run Batch
            </button>
          </div>
          <p className="profile-section-copy">
            Add one farmer per line: <code>Name, Email, Region, Primary Crop</code>
          </p>
          <textarea
            value={bulkText}
            onChange={(event) => setBulkText(event.target.value)}
            placeholder="Aline Mukamana, aline@example.com, Northern Highlands, Maize"
            rows="5"
            className="prototype-admin-bulk-textarea"
          />
          {bulkStatus ? <span className="prototype-admin-bulk-status">{bulkStatus}</span> : null}
        </article>

        <article className="prototype-panel prototype-admin-farmers-bulk-card compact">
          <div className="panel-toolbar">
            <h2>Export Ready</h2>
            <Download size={16} color="#1ea4ff" />
          </div>
          <p className="profile-section-copy">
            Farmer registry data is prepared for government and NGO reporting exports from the System Reports module.
          </p>
        </article>
      </div>

      <article className="prototype-panel prototype-admin-farmers-table-card">
        <div className="prototype-admin-farmers-table">
          <div className="prototype-admin-farmers-head richer">
            <span>Farmer Details</span>
            <span>Region</span>
            <span>Status</span>
            <span>Joined Date</span>
            <span>Actions</span>
          </div>

          {pagedRows.map((farmer) => (
            <div key={farmer.userId} className="prototype-admin-farmers-row richer">
              <div className="prototype-admin-farmer-cell">
                <div className="prototype-admin-farmer-badge">{farmer.initials}</div>
                <div>
                  <strong>{farmer.name}</strong>
                  <span>
                    {farmer.id} · {farmer.farmCount} farms · {farmer.completeness}% complete
                  </span>
                </div>
              </div>
              <span>{farmer.region}</span>
              <span
                className={
                  farmer.status === "verified"
                    ? "prototype-admin-farmer-status active"
                    : farmer.status === "inactive"
                      ? "prototype-admin-farmer-status inactive"
                      : "prototype-admin-farmer-status pending"
                }
              >
                {formatStatus(farmer.status)}
              </span>
              <span>{new Date(farmer.joined).toLocaleDateString()}</span>
              <div className="prototype-admin-farmer-actions">
                <button type="button" className="link" onClick={() => setBulkStatus(`Viewing summary for ${farmer.name}.`)}>
                  View Profile
                </button>
                {farmer.status === "pending" ? (
                  <button type="button" className="approve" onClick={() => approveProfile(farmer.userId, "AgriFeed Admin")}>
                    Approve
                  </button>
                ) : (
                  <button type="button" className="danger" onClick={() => deactivateProfile(farmer.userId)}>
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="prototype-admin-farmers-footer">
          <span>Showing {pagedRows.length ? (page - 1) * itemsPerPage + 1 : 0}-{Math.min(page * itemsPerPage, visibleRows.length)} of {visibleRows.length} filtered farmers</span>
          <div className="prototype-admin-farmers-pager">
            <button type="button">‹</button>
            <button type="button">›</button>
          </div>
        </div>
      </article>

      <div className="prototype-admin-farmers-summary-grid">
        {adminSummary.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="prototype-panel prototype-admin-farmers-summary-card">
              <div className={`prototype-admin-farmers-summary-icon ${item.tone}`}>
                <Icon size={18} />
              </div>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <footer className="prototype-admin-farmers-bottom">
        <span>© 2026 AgriFeed farmer registry. Verification and approval workflow stored in the local module database.</span>
      </footer>
    </section>
  );
}

export function FarmsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminFarmsView /> : <FarmerFarmsView />;
}


