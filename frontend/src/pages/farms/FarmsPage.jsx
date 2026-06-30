import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Flower2,
  Heart,
  Mail,
  Map,
  MapPin,
  Phone,
  PlusCircle,
  RotateCcw,
  Search,
  ShieldCheck,
  Sprout,
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
import { phase1BackendService } from "../../services/phase1Backend";
import { getFarmImage } from "../../data/cropImages";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";
import { MetricCard } from "../../components/common/MetricCard";

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

function formatReadableDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return "18 Jun 2026, 08:00";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

function escapeCsvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

function formatRelativeTime(dateValue) {
  if (!dateValue) return "Recently";
  const now = new Date();
  const date = new Date(dateValue);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatReadableDate(dateValue);
}

function getSoilHealthLabel(farm) {
  const score = farm.soilHealthScore;
  if (score == null) {
    return farm.verificationStatus === "verified" ? "Good" : "Moderate";
  }
  if (score >= 75) return "Excellent";
  if (score >= 55) return "Good";
  if (score >= 35) return "Moderate";
  return "Needs Attention";
}

function getCropHealthLabel(farm) {
  return farm.verificationStatus === "verified" ? "Healthy" : "Stable";
}

const cropEmoji = {
  Beans: "🫘", Maize: "🌽", Corn: "🌽", "Hybrid Corn": "🌽",
  Tomato: "🍅", Tomatoes: "🍅",
  Potato: "🥔", Potatoes: "🥔", "Irish Potato": "🥔",
  "Sweet Potato": "🍠",
  Rice: "🍚", Cassava: "🌿",
  Coffee: "☕", Tea: "🍵",
  Banana: "🍌", Plantain: "🍌",
  Carrots: "🥕", Onions: "🧅",
  Wheat: "🌾", Cabbage: "🥬",
  Soybeans: "🫘", Barley: "🌾",
  Sorghum: "🌾", Groundnuts: "🥜",
  Peas: "🫛", Vegetables: "🥦",
  Cereals: "🌾", Almonds: "🥜",
};

const historyChipColors = {
  Beans: "#2E7D32", Maize: "#F9A825", Corn: "#F9A825",
  Tomato: "#E53935", Potato: "#8D6E63",
  Rice: "#43A047", Coffee: "#6D4C41",
  Tea: "#558B2F", Banana: "#FDD835",
  Carrots: "#FF6F00", Onions: "#7B1FA2",
  Wheat: "#FF8F00", Cabbage: "#388E3C",
  Soybeans: "#33691E", Barley: "#A1887F",
  Sorghum: "#BF360C", Groundnuts: "#D84315",
  Peas: "#689F38", Vegetables: "#43A047",
  Almonds: "#A1887F",
};

function FarmerFarmsView() {
  const navigate = useNavigate();
  const { currentFarms, currentProfile, getProfileCompleteness } = useFarmerData();
  const { user } = useAuth();
  const [query, setQuery] = useState("");

  const visibleFarms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return currentFarms;
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
    <PageShell>
      <PageHeader
        title="Registered Farms"
        subtitle="Manage multiple plots, track historical crop performance, and prepare cooperative registrations"
        actions={
          <div className="farm-header-actions">
            <label className="farm-search">
              <Search size={16} />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search farms, crops, or regions..."
              />
            </label>
            <ActionButton variant="primary" onClick={() => navigate("/farms/new")}>
              <PlusCircle size={16} />
              <span>Add Farm</span>
            </ActionButton>
          </div>
        }
      />

      <div className="farm-metrics-row">
        {farmMetrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            suffix={metric.unit}
            color="green"
          />
        ))}
      </div>

      <div className="farm-card-grid">
        {visibleFarms.map((farm) => {
          const heroImage = getFarmImage(farm);
          const soilHealth = getSoilHealthLabel(farm);
          const cropHealth = getCropHealthLabel(farm);
          const hasCoords = farm.location?.lat != null && farm.location?.lng != null;
          const cropKey = Object.keys(cropEmoji).find(
            (k) => k.toLowerCase() === (farm.primaryCrop || "").toLowerCase()
          ) || Object.keys(cropEmoji).find(
            (k) => (farm.primaryCrop || "").toLowerCase().includes(k.toLowerCase())
          );
          const emoji = cropKey ? cropEmoji[cropKey] : "🌿";
          return (
            <article key={farm.id} className="farm-card">
              <div className="farm-card-hero">
                <img src={heroImage} alt={farm.primaryCrop} className="farm-card-hero-img" loading="lazy" onError={(e) => { e.target.src = getFarmImage(); }} />
                <div className="farm-card-overlay">
                  <div className="farm-card-overlay-info">
                    <h3 className="farm-card-hero-title">{farm.name}</h3>
                    <div className="farm-card-hero-crop-row">
                      <span className="farm-card-hero-emoji">{emoji}</span>
                      <span className="farm-card-hero-crop">{farm.primaryCrop || "Mixed Crops"}</span>
                    </div>
                    <span className="farm-card-hero-district">{farm.region || "Unspecified Region"}</span>
                  </div>
                  <div className="farm-card-overlay-badges">
                    <StatusBadge variant={farm.verificationStatus === "verified" ? "success" : farm.verificationStatus === "pending" ? "warning" : "error"}>
                      {formatStatus(farm.verificationStatus)}
                    </StatusBadge>
                    {farm.cooperativeName ? <StatusBadge variant="info">Co-op</StatusBadge> : null}
                    {farm.status === "active" ? <StatusBadge variant="success">Active</StatusBadge> : null}
                  </div>
                </div>
              </div>

              <div className="farm-card-body">
                <div className="farm-card-details-grid">
                  <div className="farm-card-detail-item">
                    <MapPin size={14} />
                    <span className="farm-card-detail-label">Size</span>
                    <span className="farm-card-detail-value">{farm.sizeHectares || 0} ha</span>
                  </div>
                  <div className="farm-card-detail-item">
                    <Waves size={14} />
                    <span className="farm-card-detail-label">Irrigation</span>
                    <span className="farm-card-detail-value">{farm.irrigationType || "Rain-fed"}</span>
                  </div>
                  <div className="farm-card-detail-item">
                    <Sprout size={14} />
                    <span className="farm-card-detail-label">Crop</span>
                    <span className="farm-card-detail-value">{farm.primaryCrop || "Mixed"}</span>
                  </div>
                  <div className="farm-card-detail-item">
                    <Flower2 size={14} />
                    <span className="farm-card-detail-label">Crop Health</span>
                    <span className="farm-card-detail-value">{cropHealth}</span>
                  </div>
                  <div className="farm-card-detail-item">
                    <Heart size={14} />
                    <span className="farm-card-detail-label">Soil Health</span>
                    <span className="farm-card-detail-value">{soilHealth}</span>
                  </div>
                  <div className="farm-card-detail-item">
                    <CalendarDays size={14} />
                    <span className="farm-card-detail-label">Last Inspected</span>
                    <span className="farm-card-detail-value">{farm.updatedAt ? formatRelativeTime(farm.updatedAt) : "N/A"}</span>
                  </div>
                </div>

                {farm.history.length > 0 ? (
                  <div className="farm-card-history">
                    {farm.history.map((item) => {
                      const chipKey = Object.keys(cropEmoji).find(
                        (k) => k.toLowerCase() === (item.crop || "").toLowerCase()
                      ) || Object.keys(cropEmoji).find(
                        (k) => (item.crop || "").toLowerCase().includes(k.toLowerCase())
                      );
                      const chipEmoji = chipKey ? cropEmoji[chipKey] : "🌿";
                      const chipBg = chipKey ? historyChipColors[chipKey] : "#2E7D32";
                      return (
                        <span
                          key={item.id}
                          className="farm-history-chip"
                          style={{
                            background: `${chipBg}1A`,
                            color: chipBg,
                            border: `1px solid ${chipBg}33`,
                          }}
                        >
                          <span>{chipEmoji}</span>
                          <span>{item.crop}</span>
                          <span className="farm-history-chip-season">{item.season}</span>
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                <div className="farm-card-footer">
                  <div className="farm-card-timestamp">
                    <Clock3 size={12} />
                    <span>{farm.updatedAt ? `Updated ${formatRelativeTime(farm.updatedAt)}` : "Newly registered"}</span>
                  </div>
                  <div className="farm-card-actions">
                    <ActionButton variant="primary" size="sm" onClick={() => navigate(`/farms/new?edit=${farm.id}`)}>
                      <Tractor size={14} />
                      <span>Manage Farm</span>
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => navigate("/analytics")}>
                      <BarChart3 size={14} />
                      <span>Analytics</span>
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                      <Map size={14} />
                      <span>View Map</span>
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => navigate(`/farms/history/${farm.id}`)}>
                      <RotateCcw size={14} />
                      <span>Crop History</span>
                    </ActionButton>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}

function AdminFarmsView() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    adminFarmerRows,
    adminDashboardSummary,
    data,
    getFarmsByOwner,
    approveProfile,
    rejectProfile,
    deactivateProfile,
    reactivateProfile,
    bulkOnboardFarmers,
    loadFarmerProfileDetails,
  } = useFarmerData();

  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [bulkText, setBulkText] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const [page, setPage] = useState(1);
  const [profileModalFarmer, setProfileModalFarmer] = useState(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);
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
        latestActivityLabel: formatReadableDateTime(row.latestActivityAt || row.joined),
        totalFarmSize: row.totalFarmSize ?? farms.reduce((sum, farm) => sum + Number(farm.sizeHectares || 0), 0),
        totalFarmSizeUnit: row.totalFarmSizeUnit || "hectares",
        hasMultipleFarms: row.hasMultipleFarms ?? farms.length > 1,
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
    const totalFarmers = adminDashboardSummary?.totalFarmers ?? adminRecords.length;
    const verifiedFarmers =
      adminDashboardSummary?.verifiedFarmers ??
      adminRecords.filter((row) => row.status === "verified").length;
    const pendingFarmers =
      adminDashboardSummary?.pendingFarmers ??
      adminRecords.filter((row) => row.status === "pending").length;
    const deactivatedFarmers =
      adminDashboardSummary?.deactivatedFarmers ??
      adminRecords.filter((row) => row.status === "deactivated" || row.status === "rejected").length;
    const totalFarms = adminDashboardSummary?.totalFarms ?? data.farms.length;
    const regionCounts = adminRecords.reduce((accumulator, row) => {
      accumulator[row.region] = (accumulator[row.region] || 0) + row.farmCount;
      return accumulator;
    }, {});
    const topRegion =
      adminDashboardSummary?.topRegion ||
      Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      "Gatenga Sector, Kicukiro District";

    return [
      { label: "Total Farmers", value: totalFarmers, tone: "blue", icon: Users },
      { label: "Verified Farmers", value: verifiedFarmers, tone: "green", icon: ShieldCheck },
      { label: "Pending Approval", value: pendingFarmers, tone: "amber", icon: AlertTriangle },
      { label: "Deactivated Farmers", value: deactivatedFarmers, tone: "slate", icon: XCircle },
      { label: "Total Farms", value: totalFarms, tone: "blue", icon: Tractor },
      { label: "Top Region", value: topRegion, tone: "green", icon: Map },
    ];
  }, [adminDashboardSummary, adminRecords, data.farms.length]);

  const registryInsight = useMemo(() => {
    const verificationRate =
      adminDashboardSummary?.verificationRate ??
      (summaryCards[0]?.value
        ? Math.round((Number(summaryCards[1]?.value || 0) / Number(summaryCards[0]?.value || 1)) * 100)
        : 0);
    const multiFarmFarmers =
      adminDashboardSummary?.multiFarmFarmers ??
      adminRecords.filter((row) => row.hasMultipleFarms).length;
    const topRegion = adminDashboardSummary?.topRegion || summaryCards[5]?.value;

    return {
      verificationRate,
      multiFarmFarmers,
      topRegion,
    };
  }, [adminDashboardSummary, adminRecords, summaryCards]);

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

  const handleOpenProfile = async (farmer) => {
    setProfileModalFarmer(farmer);
    setProfileModalLoading(true);

    try {
      const hydrated = await loadFarmerProfileDetails(farmer.userId);
      if (hydrated?.row) {
        setProfileModalFarmer((current) => (current?.userId === farmer.userId ? hydrated.row : current));
      }
    } catch {
      // Keep the local/demo modal data if backend detail loading is unavailable.
    } finally {
      setProfileModalLoading(false);
    }
  };

  const handleBulkOnboard = async () => {
    const validRows = previewRows.filter((row) => row.missingFields.length === 0);

    if (!validRows.length) {
      setBulkStatus("No valid farmers ready for import. Fix the preview errors first.");
      return;
    }

    setBulkStatus("Saving imported farmer records...");

    try {
      const created = await bulkOnboardFarmers(
        validRows.map((row, index) => ({
          fullName: row.fullName,
          email: row.email,
          contact: row.contact,
          region: row.region,
          district: row.district,
          sector: row.sector,
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
    } catch {
      setBulkStatus("Imported farmer records into Local Demo Registry Data.");
    }
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
    void (async () => {
      try {
        const backendExport = await phase1BackendService.admin.farmerRegistryExport();
        const records = Array.isArray(backendExport?.records) ? backendExport.records : [];

        if (records.length) {
          const header = [
            "Farmer Name",
            "Farmer Profile ID",
            "User ID",
            "Contact",
            "Email",
            "Region",
            "District",
            "Sector",
            "Experience Level",
            "Primary Crop",
            "Verification Status",
            "Admin Status",
            "Number of Farms",
            "Verified Farms",
            "Total Farm Size",
            "Farm Size Unit",
            "Primary Farm Name",
            "Latest Activity",
            "Created At",
          ];
          const rows = records.map((row) =>
            [
              row.fullName,
              row.farmerProfileId,
              row.userId,
              row.phone,
              row.email,
              row.region,
              row.district,
              row.sector,
              row.experienceLevel,
              row.primaryCrop,
              row.verificationStatus,
              row.adminStatus,
              row.farmCount,
              row.verifiedFarmCount,
              row.totalFarmSize,
              row.totalFarmSizeUnit,
              row.primaryFarmName,
              formatReadableDateTime(row.latestActivityAt),
              formatReadableDate(row.createdAt),
            ]
              .map(escapeCsvValue)
              .join(",")
          );

          downloadTextFile(
            "farmer-registry-backend.csv",
            [header.map(escapeCsvValue).join(","), ...rows].join("\n"),
            "text/csv;charset=utf-8"
          );
          setBulkStatus("Exported backend farmer registry as CSV.");
          return;
        }
      } catch {
        // Fall back to local export below.
      }

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
        ]
          .map(escapeCsvValue)
          .join(",")
      );
      downloadTextFile("farmer-registry-demo.csv", [header.map(escapeCsvValue).join(","), ...rows].join("\n"), "text/csv;charset=utf-8");
      setBulkStatus("Exported Local Demo Registry Data as CSV.");
    })();
  };

  const handleExportExcel = () => {
    void (async () => {
      try {
        const backendExport = await phase1BackendService.admin.farmerRegistryExport();
        const records = Array.isArray(backendExport?.records) ? backendExport.records : [];
        if (records.length) {
          const lines = records.map(
            (row) =>
              `${row.fullName}\t${row.farmerProfileId}\t${row.userId}\t${row.phone}\t${row.email}\t${row.region}\t${row.district}\t${row.sector}\t${row.experienceLevel}\t${row.primaryCrop}\t${row.adminStatus}\t${row.farmCount}\t${row.totalFarmSize}\t${row.totalFarmSizeUnit}\t${formatReadableDateTime(row.latestActivityAt)}`
          );
          downloadTextFile(
            "farmer-registry-backend.xls",
            [
              "Farmer Name\tFarmer Profile ID\tUser ID\tContact\tEmail\tRegion\tDistrict\tSector\tExperience Level\tPrimary Crop\tAdmin Status\tNumber of Farms\tTotal Farm Size\tFarm Size Unit\tLatest Activity",
              ...lines,
            ].join("\n"),
            "application/vnd.ms-excel;charset=utf-8"
          );
          setBulkStatus("Exported backend farmer registry in Excel-compatible format.");
          return;
        }
      } catch {
        // Fall through to local demo export.
      }

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
    })();
  };

  const handleExportReport = () => {
    void (async () => {
      try {
        const backendExport = await phase1BackendService.admin.farmerRegistryExport();
        const records = Array.isArray(backendExport?.records) ? backendExport.records : [];
        const summary = backendExport?.summary || null;

        if (records.length) {
          const report = [
            "AgriSupport Farmer Management Report",
            "Mode: Backend Registry Export",
            `Generated: ${formatReadableDateTime(backendExport.generatedAt)}`,
            "",
            `Total Farmers: ${summary?.totalFarmers ?? records.length}`,
            `Verified Farmers: ${summary?.verifiedFarmers ?? records.filter((row) => row.adminStatus === "Verified").length}`,
            `Pending Approval: ${summary?.pendingFarmers ?? records.filter((row) => row.adminStatus === "Pending").length}`,
            `Deactivated Farmers: ${summary?.deactivatedFarmers ?? records.filter((row) => row.adminStatus === "Deactivated").length}`,
            `Total Farms: ${summary?.totalFarms ?? records.reduce((sum, row) => sum + Number(row.farmCount || 0), 0)}`,
            `Top Region: ${summary?.topRegion || "Rwanda"}`,
            "",
            "Registry Records",
            ...records.map(
              (row) =>
                `- ${row.fullName} | ${row.region || row.district} | ${row.primaryCrop} | ${row.adminStatus} | ${row.farmCount} farm(s) | Latest activity ${formatReadableDateTime(row.latestActivityAt)}`
            ),
          ].join("\n");
          downloadTextFile("agrisupport-ngo-government-report.txt", report);
          setBulkStatus("Exported NGO/Government summary report from backend registry data.");
          return;
        }
      } catch {
        // Use local demo report below.
      }

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
    })();
  };

  const selectedFarmerFarms = profileModalFarmer ? getFarmsByOwner(profileModalFarmer.userId) : [];

  return (
    <section className="fm-page">
      <div className="fm-header">
        <div className="fm-header-row">
          <div>
            <h1>Farmer Management</h1>
            <p>Centralized farmer and farm database for verification, multi-farm support, bulk onboarding, and extension-officer decision workflow.</p>
          </div>
          <div className="fm-badges">
            <span className="fm-badge blue">DEMO_MODE</span>
            <span className="fm-badge green">Local Demo Registry Data</span>
          </div>
        </div>
      </div>

      <div className="fm-summary-grid">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="fm-summary-card">
              <div className={`fm-summary-icon ${item.tone}`}>
                <Icon size={18} />
              </div>
              <div className="fm-summary-info">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="fm-insight-banner">
        <span className="fm-badge green">{registryInsight.verificationRate}% verified</span>
        <strong>{registryInsight.topRegion}</strong>
        <small>{registryInsight.multiFarmFarmers} farmers currently manage more than one registered farm.</small>
      </div>

      <div className="fm-toolbar">
        <label className="fm-search">
          <Search size={16} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search farmers by name, ID, contact, crop, or email..."
          />
        </label>
        <label className="fm-select-wrap">
          <MapPin size={16} />
          <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region === "all" ? "Filter by Rwanda region" : region}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="fm-tools-grid">
        <article className="fm-card">
          <div className="fm-card-header">
            <h2>Bulk Farmer Onboarding</h2>
            <div className="fm-card-header-actions">
              <button type="button" className="fm-btn secondary" onClick={handleBulkPreview}>Preview Import</button>
              <button type="button" className="fm-btn primary" onClick={handleBulkOnboard}>Save Farmers</button>
            </div>
          </div>
          <div className="fm-card-body">
            <p className="fm-code-hint">Expected CSV format: <code>Name, Email, Phone, Region, District, Sector, Primary Crop, Experience Level</code></p>
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder="Name, Email, Phone, Region, District, Sector, Primary Crop, Experience Level"
              rows="5"
              className="fm-bulk-textarea"
            />
            <div className="fm-bulk-meta">
              <div className="fm-bulk-upload">
                <button type="button" className="fm-btn secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} />
                  <span>Upload CSV File</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={handleCsvUpload} />
              </div>
              <div className="fm-bulk-format">
                <strong>Validation checks</strong>
                <span> — Missing fields are flagged before import.</span>
              </div>
            </div>
            {bulkStatus ? <span className="fm-bulk-status">{bulkStatus}</span> : null}
            {!!previewRows.length && (
              <div className="fm-preview">
                <div className="fm-preview-head">
                  <strong>Import Preview</strong>
                  <span>{previewRows.length} row(s)</span>
                </div>
                <div className="fm-preview-table">
                  {previewRows.slice(0, 5).map((row) => (
                    <div key={row.id} className="fm-preview-row">
                      <span>{row.fullName || "Missing name"}</span>
                      <span>{row.region}</span>
                      <span>{row.primaryCrop}</span>
                      <small>{row.missingFields.length ? `Missing: ${row.missingFields.join(", ")}` : "Ready"}</small>
                    </div>
                  ))}
                </div>
                {!!previewErrors.length && (
                  <div className="fm-preview-errors">
                    {previewErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </article>

        <article className="fm-card">
          <div className="fm-card-header">
            <h2>Data Export</h2>
            <Download size={16} color="var(--primary-green)" />
          </div>
          <div className="fm-card-body">
            <p className="fm-code-hint">Export filtered farmer and farm records for extension coordination, NGO reporting, and academic review.</p>
            <div className="fm-export-actions">
              <button type="button" className="fm-btn secondary full" onClick={handleExportCsv}>
                <FileText size={15} />
                <span>Export CSV</span>
              </button>
              <button type="button" className="fm-btn secondary full" onClick={handleExportExcel}>
                <FileSpreadsheet size={15} />
                <span>Export Excel</span>
              </button>
              <button type="button" className="fm-btn secondary full" onClick={handleExportReport}>
                <Download size={15} />
                <span>Export NGO/Government Report</span>
              </button>
            </div>
          </div>
        </article>
      </div>

      <article className="fm-card">
        <div className="fm-card-header">
          <h2>Farmer Registry</h2>
          <span className="fm-code-hint">{visibleRows.length} farmer{visibleRows.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="fm-table-wrap">
          <div className="fm-table">
            <div className="fm-table-head">
              <span>Farmer Name</span>
              <span>Farmer ID</span>
              <span>Contact</span>
              <span>Region</span>
              <span>Farms</span>
              <span>Crop</span>
              <span>Completeness</span>
              <span>Status</span>
              <span>Joined</span>
              <span>Actions</span>
            </div>
            {pagedRows.map((farmer) => (
              <div key={farmer.userId} className="fm-table-row">
                <div className="fm-farmer-cell">
                  <div className="fm-farmer-avatar">{farmer.initials}</div>
                  <div className="fm-farmer-info">
                    <strong>{farmer.name}</strong>
                    <span>{farmer.experienceLevel}</span>
                  </div>
                </div>
                <span>{farmer.id}</span>
                <div className="fm-contact-cell">
                  <span><Phone size={12} /> {farmer.contact}</span>
                  <small><Mail size={12} /> {farmer.email}</small>
                </div>
                <span>{farmer.region}</span>
                <div className="fm-farms-cell">
                  <strong>{farmer.farmCount}</strong>
                  <div className="fm-farms-links">
                    <button type="button" className="fm-link-btn" onClick={() => handleOpenProfile(farmer)}>View farms</button>
                    <button type="button" className="fm-link-btn" onClick={() => navigate("/farms/new")}>Add farm</button>
                  </div>
                </div>
                <span>{farmer.primaryCrop}</span>
                <span>{farmer.completeness}%</span>
                <span className={`fm-status ${getStatusTone(farmer.status)}`}>{formatStatus(farmer.status)}</span>
                <span>{farmer.joinedLabel}</span>
                <div className="fm-actions">
                  <button type="button" className="fm-action-btn view" onClick={() => handleOpenProfile(farmer)}>
                    <Eye size={12} />
                    <span>View</span>
                  </button>
                  {farmer.status !== "verified" && farmer.status !== "deactivated" ? (
                    <button type="button" className="fm-action-btn approve" onClick={() => { approveProfile(farmer.userId, "AgriFeed Admin"); setBulkStatus(`Approved ${farmer.name}.`); }}>
                      Approve
                    </button>
                  ) : null}
                  {farmer.status === "pending" ? (
                    <button type="button" className="fm-action-btn reject" onClick={() => { rejectProfile(farmer.userId, "AgriFeed Admin"); setBulkStatus(`Rejected ${farmer.name}.`); }}>
                      Reject
                    </button>
                  ) : null}
                  {farmer.status !== "deactivated" ? (
                    <button type="button" className="fm-action-btn deactivate" onClick={() => { deactivateProfile(farmer.userId); setBulkStatus(`Deactivated ${farmer.name}.`); }}>
                      Deactivate
                    </button>
                  ) : (
                    <button type="button" className="fm-action-btn reactivate" onClick={() => { reactivateProfile(farmer.userId); setBulkStatus(`Reactivated ${farmer.name}.`); }}>
                      <RotateCcw size={12} />
                      <span>Reactivate</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="fm-table-footer">
          <span>Showing {pagedRows.length ? (page - 1) * itemsPerPage + 1 : 0}-{Math.min(page * itemsPerPage, visibleRows.length)} of {visibleRows.length} filtered farmers</span>
          <div className="fm-pager">
            <button type="button" className="fm-pager-btn" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
            <span className="fm-pager-indicator">Page {page} of {totalPages}</span>
            <button type="button" className="fm-pager-btn" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
          </div>
        </div>
      </article>

      <div className="fm-bottom">© 2026 AgriSupport farmer registry. Workflow, approvals, and onboarding records are stored as Local Demo Registry Data.</div>

      {profileModalFarmer ? (
        <div className="fm-modal-backdrop" onClick={() => setProfileModalFarmer(null)}>
          <div className="fm-modal" onClick={(event) => event.stopPropagation()}>
            <div className="fm-modal-head">
              <div className="fm-modal-head-left">
                <h3>{profileModalFarmer.name}</h3>
                <span className={`fm-status ${getStatusTone(profileModalFarmer.status)}`}>{formatStatus(profileModalFarmer.status)}</span>
              </div>
              <button type="button" className="fm-btn ghost" onClick={() => setProfileModalFarmer(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="fm-modal-body">
              <div className="fm-modal-grid">
                <div className="fm-modal-facts">
                  <div className="fm-modal-fact"><Phone size={14} /> <span>{profileModalFarmer.contact}</span></div>
                  <div className="fm-modal-fact"><Mail size={14} /> <span>{profileModalFarmer.email}</span></div>
                  <div className="fm-modal-fact"><MapPin size={14} /> <span>{profileModalFarmer.region}</span></div>
                  <div className="fm-modal-fact"><Users size={14} /> <span>{profileModalFarmer.experienceLevel}</span></div>
                  <div className="fm-modal-fact"><ShieldCheck size={14} /> <span>{profileModalFarmer.completeness}% profile completeness</span></div>
                  <div className="fm-modal-fact"><Tractor size={14} /> <span>{profileModalFarmer.farmCount || selectedFarmerFarms.length} registered farm(s)</span></div>
                  <div className="fm-modal-fact"><Map size={14} /> <span>{Number(profileModalFarmer.totalFarmSize || 0).toFixed(1)} {profileModalFarmer.totalFarmSizeUnit || "hectares"} total area</span></div>
                  <div className="fm-modal-fact"><CheckCircle2 size={14} /> <span>Latest activity: {formatReadableDateTime(profileModalFarmer.latestActivityAt || profileModalFarmer.joined)}</span></div>
                </div>
                <div className="fm-modal-farms">
                  <strong>Registered farms</strong>
                  {profileModalLoading ? <p>Loading farmer profile details...</p> : null}
                  {selectedFarmerFarms.length ? (
                    selectedFarmerFarms.map((farm) => (
                      <div key={farm.id} className="fm-farm-card">
                        <div className="fm-farm-card-top">
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
              <div className="fm-modal-docs">
                <strong>Verification documents / photos</strong>
                <div className="fm-doc-list">
                  {selectedFarmerFarms.map((farm) => (
                    <span key={`${farm.id}-doc`}>{farm.photoName ? `${farm.photoName}` : `${farm.name} - no uploaded photo yet`}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="fm-modal-actions">
              <button type="button" className="fm-btn secondary" onClick={() => setProfileModalFarmer(null)}>Close</button>
              <button type="button" className="fm-btn primary" onClick={() => navigate("/profile")}>Open Farmer Profile Layout</button>
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
