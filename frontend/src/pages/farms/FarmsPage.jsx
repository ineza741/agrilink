import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Mail,
  Map,
  MapPin,
  Phone,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Tractor,
  Upload,
  Users,
  Waves,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";

const DEMO_MODE = true;
const RWANDA_REGIONS = [
  "Gatenga Sector, Kicukiro District",
  "Nyamata Sector, Bugesera District",
  "Musanze District",
  "Rwamagana District",
  "Huye District",
  "Rubavu District",
];

function formatStatus(status) {
  if (status === "verified") return "Verified";
  if (status === "rejected") return "Rejected";
  if (status === "deactivated" || status === "inactive") return "Deactivated";
  return "Pending";
}

function getStatusTone(status) {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  if (status === "deactivated" || status === "inactive") return "slate";
  return "amber";
}

function formatReadableDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "18 Jun 2026";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCsvRegistry(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { rows: [], errors: ["No CSV rows found."] };
  }

  const firstRow = lines[0].toLowerCase();
  const hasHeader = firstRow.includes("name") && firstRow.includes("email");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const errors = [];

  const rows = dataLines.map((line, index) => {
    const [
      name = "",
      email = "",
      phone = "",
      region = "",
      district = "",
      sector = "",
      primaryCrop = "",
      experienceLevel = "",
    ] = line.split(",").map((part) => part.trim());

    const fullRegion =
      region && district && sector
        ? `${sector}, ${district}`
        : region || district || sector || "Gatenga Sector, Kicukiro District";

    const missingFields = [];
    if (!name) missingFields.push("Name");
    if (!email) missingFields.push("Email");
    if (!phone) missingFields.push("Phone");
    if (!primaryCrop) missingFields.push("Primary Crop");

    if (missingFields.length) {
      errors.push(`Row ${index + 1}: missing ${missingFields.join(", ")}.`);
    }

    return {
      id: `preview-${index + 1}`,
      fullName: name,
      email,
      contact: phone,
      region: fullRegion,
      district: district || fullRegion,
      sector: sector || fullRegion,
      primaryCrop: primaryCrop || "Maize",
      experienceLevel: experienceLevel || "Intermediate",
      missingFields,
    };
  });

  return { rows, errors };
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
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    adminFarmerRows,
    data,
    getFarmsByOwner,
    approveProfile,
    rejectProfile,
    deactivateProfile,
    reactivateProfile,
    bulkOnboardFarmers,
  } = useFarmerData();

  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [page, setPage] = useState(1);
  const [profileModalFarmer, setProfileModalFarmer] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewErrors, setPreviewErrors] = useState([]);
  const itemsPerPage = 5;

  const adminRecords = useMemo(() => {
    return adminFarmerRows.map((row) => {
      const farms = getFarmsByOwner(row.userId);
      const primaryFarm = farms[0];
      return {
        ...row,
        contact: row.profile?.contact || "Not provided",
        email: row.profile?.email || "Not provided",
        experienceLevel: row.profile?.experienceLevel || "Intermediate",
        primaryCrop: primaryFarm?.primaryCrop || "Mixed farming",
        farms,
        joinedLabel: formatReadableDate(row.joined),
      };
    });
  }, [adminFarmerRows, getFarmsByOwner]);

  const regions = useMemo(() => ["all", ...RWANDA_REGIONS], []);

  const visibleRows = useMemo(() => {
    return adminRecords.filter((row) => {
      const matchesQuery =
        !query.trim() ||
        [
          row.name,
          row.id,
          row.region,
          row.email,
          row.contact,
          row.primaryCrop,
          row.experienceLevel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase());

      const matchesRegion = regionFilter === "all" || row.region === regionFilter;
      return matchesQuery && matchesRegion;
    });
  }, [adminRecords, query, regionFilter]);

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

  const summaryCards = useMemo(() => {
    const totalFarmers = adminRecords.length;
    const verifiedFarmers = adminRecords.filter((row) => row.status === "verified").length;
    const pendingFarmers = adminRecords.filter((row) => row.status === "pending").length;
    const deactivatedFarmers = adminRecords.filter(
      (row) => row.status === "deactivated" || row.status === "rejected"
    ).length;
    const totalFarms = data.farms.length;
    const regionCounts = adminRecords.reduce((accumulator, row) => {
      accumulator[row.region] = (accumulator[row.region] || 0) + row.farmCount;
      return accumulator;
    }, {});
    const topRegion =
      Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Gatenga Sector, Kicukiro District";

    return [
      { label: "Total Farmers", value: totalFarmers, tone: "blue", icon: Users },
      { label: "Verified Farmers", value: verifiedFarmers, tone: "green", icon: ShieldCheck },
      { label: "Pending Approval", value: pendingFarmers, tone: "amber", icon: AlertTriangle },
      { label: "Deactivated Farmers", value: deactivatedFarmers, tone: "slate", icon: XCircle },
      { label: "Total Farms", value: totalFarms, tone: "blue", icon: Tractor },
      { label: "Top Region", value: topRegion, tone: "green", icon: Map },
    ];
  }, [adminRecords, data.farms.length]);

  const buildPreview = (csvText) => {
    const parsed = parseCsvRegistry(csvText);
    setPreviewRows(parsed.rows);
    setPreviewErrors(parsed.errors);
    setBulkStatus(
      parsed.rows.length
        ? `Preview ready for ${parsed.rows.length} farmer record(s).`
        : "No valid preview rows found yet."
    );
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    setBulkText(text);
    buildPreview(text);
  };

  const handleBulkPreview = () => {
    buildPreview(bulkText);
  };

  const handleBulkOnboard = () => {
    const validRows = previewRows.filter((row) => row.missingFields.length === 0);

    if (!validRows.length) {
      setBulkStatus("No valid farmers ready for import. Fix the preview errors first.");
      return;
    }

    const created = bulkOnboardFarmers(
      validRows.map((row, index) => ({
        fullName: row.fullName,
        email: row.email,
        contact: row.contact,
        region: row.region,
        experienceLevel: row.experienceLevel,
        cooperativeName: "Local Demo Registry Import",
        farmName: `${row.fullName}'s Plot`,
        plotLabel: "Main Plot",
        sizeHectares: 2 + index,
        landType: "Loamy",
        irrigationType: "Drip Irrigation",
        primaryCrop: row.primaryCrop,
        history: [],
      })),
      "AgriFeed Admin"
    );

    setBulkStatus(`Imported ${created.length} farmer record(s) into Local Demo Registry Data.`);
    setBulkText("");
    setPreviewRows([]);
    setPreviewErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportRows = visibleRows.map((row) => ({
    farmerName: row.name,
    farmerId: row.id,
    contact: row.contact,
    email: row.email,
    region: row.region,
    farms: row.farmCount,
    primaryCrop: row.primaryCrop,
    completeness: `${row.completeness}%`,
    status: formatStatus(row.status),
    joined: row.joinedLabel,
  }));

  const handleExportCsv = () => {
    const header = [
      "Farmer Name",
      "Farmer ID",
      "Contact",
      "Email",
      "Region",
      "Number of Farms",
      "Primary Crop",
      "Profile Completeness",
      "Verification Status",
      "Joined Date",
    ];
    const rows = exportRows.map((row) =>
      [
        row.farmerName,
        row.farmerId,
        row.contact,
        row.email,
        row.region,
        row.farms,
        row.primaryCrop,
        row.completeness,
        row.status,
        row.joined,
      ].join(",")
    );
    downloadTextFile("farmer-registry-demo.csv", [header.join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
    setBulkStatus("Exported Local Demo Registry Data as CSV.");
  };

  const handleExportExcel = () => {
    const lines = exportRows.map(
      (row) =>
        `${row.farmerName}\t${row.farmerId}\t${row.contact}\t${row.email}\t${row.region}\t${row.farms}\t${row.primaryCrop}\t${row.completeness}\t${row.status}\t${row.joined}`
    );
    downloadTextFile(
      "farmer-registry-demo.xls",
      ["Farmer Name\tFarmer ID\tContact\tEmail\tRegion\tNumber of Farms\tPrimary Crop\tProfile Completeness\tVerification Status\tJoined Date", ...lines].join("\n"),
      "application/vnd.ms-excel;charset=utf-8"
    );
    setBulkStatus("Exported demo farmer registry in Excel-compatible format.");
  };

  const handleExportReport = () => {
    const report = [
      "AgriSupport Farmer Management Report",
      "Mode: Local Demo Registry Data",
      `Generated: ${formatReadableDate(new Date().toISOString())}`,
      "",
      `Total Farmers: ${summaryCards[0].value}`,
      `Verified Farmers: ${summaryCards[1].value}`,
      `Pending Approval: ${summaryCards[2].value}`,
      `Deactivated Farmers: ${summaryCards[3].value}`,
      `Total Farms: ${summaryCards[4].value}`,
      `Top Region: ${summaryCards[5].value}`,
      "",
      "Visible Farmer Records",
      ...exportRows.map(
        (row) =>
          `- ${row.farmerName} | ${row.region} | ${row.primaryCrop} | ${row.status} | ${row.joined}`
      ),
    ].join("\n");
    downloadTextFile("agrisupport-ngo-government-report.txt", report);
    setBulkStatus("Exported NGO/Government summary report.");
  };

  const selectedFarmerFarms = profileModalFarmer ? getFarmsByOwner(profileModalFarmer.userId) : [];

  return (
    <section className="management-page prototype-admin-farmers-page prototype-admin-farmers-page-v2">
      <div className="prototype-admin-farmers-title">
        <h1>Farmer Management</h1>
        <p>
          Centralized farmer and farm database for verification, multi-farm support, bulk onboarding,
          and extension-officer decision workflow.
        </p>
      </div>

      <div className="prototype-admin-registry-banner">
        <span className="status-pill tone-blue">DEMO_MODE</span>
        <strong>Local Demo Registry Data</strong>
        <small>Frontend-only farmer records, approvals, and farm assets stored in localStorage.</small>
      </div>

      <div className="prototype-admin-farmers-summary-grid prototype-admin-farmers-summary-grid-v2">
        {summaryCards.map((item) => {
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

      <div className="prototype-admin-farmers-filters">
        <label className="prototype-admin-farmers-search">
          <Search size={17} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search farmers by name, ID, contact, crop, or email..."
          />
        </label>
        <label className="prototype-admin-farmers-region real-select">
          <MapPin size={17} />
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region === "all" ? "Filter by Rwanda region" : region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="prototype-admin-farmers-tools">
        <article className="prototype-panel prototype-admin-farmers-bulk-card prototype-admin-bulk-card-v2">
          <div className="panel-toolbar">
            <h2>Bulk Farmer Onboarding</h2>
            <div className="prototype-admin-inline-actions">
              <button type="button" className="details-button" onClick={handleBulkPreview}>
                Preview Import
              </button>
              <button type="button" className="approve-button" onClick={handleBulkOnboard}>
                Save Farmers
              </button>
            </div>
          </div>
          <p className="profile-section-copy">
            Expected CSV format: <code>Name, Email, Phone, Region, District, Sector, Primary Crop, Experience Level</code>
          </p>

          <div className="prototype-admin-bulk-inputs">
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder="Name, Email, Phone, Region, District, Sector, Primary Crop, Experience Level"
              rows="6"
              className="prototype-admin-bulk-textarea"
            />
            <div className="prototype-admin-bulk-upload-panel">
              <button
                type="button"
                className="prototype-admin-secondary-button full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={15} />
                <span>Upload CSV File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="visually-hidden"
                onChange={handleCsvUpload}
              />
              <div className="prototype-admin-bulk-format">
                <strong>Validation checks</strong>
                <span>Missing fields are flagged before import.</span>
              </div>
            </div>
          </div>

          {bulkStatus ? <span className="prototype-admin-bulk-status">{bulkStatus}</span> : null}

          {!!previewRows.length && (
            <div className="prototype-admin-import-preview">
              <div className="prototype-admin-import-preview-head">
                <strong>Import Preview</strong>
                <span>{previewRows.length} row(s)</span>
              </div>
              <div className="prototype-admin-import-preview-table">
                {previewRows.slice(0, 5).map((row) => (
                  <div key={row.id} className="prototype-admin-import-preview-row">
                    <span>{row.fullName || "Missing name"}</span>
                    <span>{row.region}</span>
                    <span>{row.primaryCrop}</span>
                    <small>{row.missingFields.length ? `Missing: ${row.missingFields.join(", ")}` : "Ready"}</small>
                  </div>
                ))}
              </div>
              {!!previewErrors.length && (
                <div className="prototype-admin-import-errors">
                  {previewErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>

        <article className="prototype-panel prototype-admin-farmers-bulk-card compact prototype-admin-export-card">
          <div className="panel-toolbar">
            <h2>Data Export</h2>
            <Download size={16} color="#1ea4ff" />
          </div>
          <p className="profile-section-copy">
            Export filtered farmer and farm records for extension coordination, NGO reporting, and academic review.
          </p>
          <div className="prototype-admin-export-actions">
            <button type="button" className="prototype-admin-secondary-button full" onClick={handleExportCsv}>
              <FileText size={15} />
              <span>Export CSV</span>
            </button>
            <button type="button" className="prototype-admin-secondary-button full" onClick={handleExportExcel}>
              <FileSpreadsheet size={15} />
              <span>Export Excel</span>
            </button>
            <button type="button" className="prototype-admin-secondary-button full" onClick={handleExportReport}>
              <Download size={15} />
              <span>Export NGO/Government Report</span>
            </button>
          </div>
        </article>
      </div>

      <article className="prototype-panel prototype-admin-farmers-table-card prototype-admin-farmers-table-card-v2">
        <div className="prototype-admin-farmers-table">
          <div className="prototype-admin-farmers-head prototype-admin-farmers-head-v2">
            <span>Farmer Name</span>
            <span>Farmer ID</span>
            <span>Contact</span>
            <span>Region / District / Sector</span>
            <span>Number of Farms</span>
            <span>Primary Crop</span>
            <span>Profile Completeness</span>
            <span>Verification Status</span>
            <span>Joined Date</span>
            <span>Actions</span>
          </div>

          {pagedRows.map((farmer) => (
            <div key={farmer.userId} className="prototype-admin-farmers-row prototype-admin-farmers-row-v2">
              <div className="prototype-admin-farmer-cell">
                <div className="prototype-admin-farmer-badge">{farmer.initials}</div>
                <div>
                  <strong>{farmer.name}</strong>
                  <span>{farmer.experienceLevel}</span>
                </div>
              </div>
              <span>{farmer.id}</span>
              <div className="prototype-admin-contact-cell">
                <span><Phone size={13} /> {farmer.contact}</span>
                <small><Mail size={13} /> {farmer.email}</small>
              </div>
              <span>{farmer.region}</span>
              <div className="prototype-admin-farms-count">
                <strong>{farmer.farmCount}</strong>
                <div className="prototype-admin-farms-inline-actions">
                  <button
                    type="button"
                    className="prototype-admin-action-button farm-link-button"
                    onClick={() => setProfileModalFarmer(farmer)}
                  >
                    View farms
                  </button>
                  <button
                    type="button"
                    className="prototype-admin-action-button farm-link-button"
                    onClick={() => navigate("/farms/new")}
                  >
                    Add farm
                  </button>
                </div>
              </div>
              <span>{farmer.primaryCrop}</span>
              <span>{farmer.completeness}%</span>
              <span className={`status-pill tone-${getStatusTone(farmer.status)}`}>
                {formatStatus(farmer.status)}
              </span>
              <span>{farmer.joinedLabel}</span>
              <div className="prototype-admin-farmer-actions prototype-admin-farmer-actions-v2">
                <button
                  type="button"
                  className="prototype-admin-action-button action-view"
                  onClick={() => setProfileModalFarmer(farmer)}
                >
                  <Eye size={14} />
                  <span>View Profile</span>
                </button>
                {farmer.status !== "verified" && farmer.status !== "deactivated" ? (
                  <button
                    type="button"
                    className="prototype-admin-action-button action-approve"
                    onClick={() => {
                      approveProfile(farmer.userId, "AgriFeed Admin");
                      setBulkStatus(`Approved ${farmer.name}.`);
                    }}
                  >
                    Approve
                  </button>
                ) : null}
                {farmer.status === "pending" ? (
                  <button
                    type="button"
                    className="prototype-admin-action-button action-reject"
                    onClick={() => {
                      rejectProfile(farmer.userId, "AgriFeed Admin");
                      setBulkStatus(`Rejected ${farmer.name}.`);
                    }}
                  >
                    Reject
                  </button>
                ) : null}
                {farmer.status !== "deactivated" ? (
                  <button
                    type="button"
                    className="prototype-admin-action-button action-deactivate"
                    onClick={() => {
                      deactivateProfile(farmer.userId);
                      setBulkStatus(`Deactivated ${farmer.name}.`);
                    }}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="prototype-admin-action-button action-reactivate"
                    onClick={() => {
                      reactivateProfile(farmer.userId);
                      setBulkStatus(`Reactivated ${farmer.name}.`);
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>Reactivate</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="prototype-admin-farmers-footer">
          <span>
            Showing {pagedRows.length ? (page - 1) * itemsPerPage + 1 : 0}-{Math.min(page * itemsPerPage, visibleRows.length)} of {visibleRows.length} filtered farmers
          </span>
          <div className="prototype-admin-farmers-pager">
            <button
              type="button"
              className="prototype-admin-pager-button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span className="prototype-admin-pager-indicator">Page {page} of {totalPages}</span>
            <button
              type="button"
              className="prototype-admin-pager-button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </article>

      <footer className="prototype-admin-farmers-bottom">
        <span>© 2026 AgriSupport farmer registry. Workflow, approvals, and onboarding records are stored as Local Demo Registry Data.</span>
      </footer>

      {profileModalFarmer ? (
        <div className="recommendation-modal-backdrop" onClick={() => setProfileModalFarmer(null)}>
          <div
            className="recommendation-feedback-modal prototype-admin-profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="prototype-admin-profile-modal-head">
              <div>
                <h3>{profileModalFarmer.name}</h3>
                <span className={`status-pill tone-${getStatusTone(profileModalFarmer.status)}`}>
                  {formatStatus(profileModalFarmer.status)}
                </span>
              </div>
              <button type="button" className="icon-button plain" onClick={() => setProfileModalFarmer(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="prototype-admin-profile-modal-grid">
              <div className="prototype-admin-profile-facts">
                <p><Phone size={15} /> <span>{profileModalFarmer.contact}</span></p>
                <p><Mail size={15} /> <span>{profileModalFarmer.email}</span></p>
                <p><MapPin size={15} /> <span>{profileModalFarmer.region}</span></p>
                <p><Users size={15} /> <span>{profileModalFarmer.experienceLevel}</span></p>
                <p><ShieldCheck size={15} /> <span>{profileModalFarmer.completeness}% profile completeness</span></p>
              </div>

              <div className="prototype-admin-profile-farms">
                <strong>Registered farms</strong>
                {selectedFarmerFarms.length ? (
                  selectedFarmerFarms.map((farm) => (
                    <div key={farm.id} className="prototype-admin-profile-farm-card">
                      <div className="prototype-admin-profile-farm-top">
                        <strong>{farm.name}</strong>
                        <span>{farm.sizeHectares} ha</span>
                      </div>
                      <span>{farm.primaryCrop} · {farm.landType}</span>
                      <small>{farm.region}</small>
                    </div>
                  ))
                ) : (
                  <p>No farms registered yet.</p>
                )}
              </div>
            </div>

            <div className="prototype-admin-profile-documents">
              <strong>Verification documents / photos</strong>
              <div className="prototype-admin-profile-doc-list">
                {selectedFarmerFarms.map((farm) => (
                  <span key={`${farm.id}-doc`}>
                    {farm.photoName ? `${farm.photoName}` : `${farm.name} - no uploaded photo yet`}
                  </span>
                ))}
              </div>
            </div>

            <div className="recommendation-modal-actions">
              <button type="button" className="details-button" onClick={() => setProfileModalFarmer(null)}>
                Close
              </button>
              <button type="button" className="approve-button" onClick={() => navigate("/profile")}>
                Open Farmer Profile Layout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function FarmsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminFarmsView /> : <FarmerFarmsView />;
}
