import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  CloudSun,
  Database,
  Download,
  FileCheck2,
  MapPinned,
  ShieldCheck,
  Tractor,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFarmerData } from "../../context/FarmerDataContext";

const DEMO_MODE = true;
const ADMIN_WORKFLOW_KEY = "agrifeed-admin-workflow-v1";

const statIcons = {
  farmers: Users,
  approvals: ClipboardCheck,
  farms: Tractor,
  alerts: AlertTriangle,
  activity: Activity,
  verified: UserCheck,
};

const workflowSeed = [
  {
    id: "wf-approvals",
    title: "Pending farmer approvals",
    description: "Review newly submitted farmer and farm profiles awaiting verification.",
    tone: "amber",
  },
  {
    id: "wf-advisories",
    title: "Regional advisories to review",
    description: "Validate location-specific advisory text before dispatch to extension officers.",
    tone: "blue",
  },
  {
    id: "wf-pests",
    title: "Pest outbreak reports",
    description: "Confirm submitted pest escalation records from farmer reports and field scouts.",
    tone: "red",
  },
  {
    id: "wf-weather",
    title: "Weather alert confirmations",
    description: "Check severe weather notices before releasing district-level warning summaries.",
    tone: "green",
  },
  {
    id: "wf-market",
    title: "Market data updates",
    description: "Review the latest demo market entries and extension pricing notes for this week.",
    tone: "purple",
  },
];

const monitoringSeed = [
  {
    id: "weather",
    title: "Weather API status",
    status: "Live Weather Data",
    detail: "Open-Meteo feed connected for forecast and alert calculations.",
    tone: "green",
    icon: CloudSun,
  },
  {
    id: "demo",
    title: "Demo data mode status",
    status: "DEMO_MODE active",
    detail: "Farmer, soil, market, and alert datasets are running from local mock records.",
    tone: "blue",
    icon: ShieldCheck,
  },
  {
    id: "sync",
    title: "LocalStorage sync status",
    status: "Healthy",
    detail: "Local user actions, approvals, and registrations are being stored in browser storage.",
    tone: "green",
    icon: Database,
  },
  {
    id: "reports",
    title: "Report export status",
    status: "Ready",
    detail: "PDF and analytics export actions are available in frontend-only demo mode.",
    tone: "amber",
    icon: FileCheck2,
  },
];

function loadWorkflowState() {
  const fallback = workflowSeed.reduce((accumulator, item) => {
    accumulator[item.id] = "pending";
    return accumulator;
  }, {});

  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_WORKFLOW_KEY) || "{}");
    return { ...fallback, ...saved };
  } catch {
    return fallback;
  }
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

function formatCompactNumber(value) {
  if (value >= 1000) {
    return new Intl.NumberFormat("en", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  return value.toLocaleString();
}

function computeRegionAlertCount(region) {
  const lowerRegion = region.toLowerCase();

  if (lowerRegion.includes("bugesera")) return 3;
  if (lowerRegion.includes("kicukiro")) return 2;
  if (lowerRegion.includes("musanze")) return 2;
  if (lowerRegion.includes("rwamagana")) return 1;
  return 1;
}

function getVerificationTone(rate) {
  if (rate >= 80) return "green";
  if (rate >= 60) return "amber";
  return "red";
}

export function DashboardPage() {
  const navigate = useNavigate();
  const {
    adminFarmerRows,
    data,
    getRegionalSummary,
    approveProfile,
    deactivateProfile,
  } = useFarmerData();

  const [statusMessage, setStatusMessage] = useState("");
  const [workflowState, setWorkflowState] = useState(loadWorkflowState);

  useEffect(() => {
    localStorage.setItem(ADMIN_WORKFLOW_KEY, JSON.stringify(workflowState));
  }, [workflowState]);

  const regionalSummary = useMemo(() => {
    return getRegionalSummary()
      .map((region) => ({
        ...region,
        activeAlerts: computeRegionAlertCount(region.region),
      }))
      .sort((a, b) => b.farmers - a.farmers);
  }, [getRegionalSummary]);

  const totalFarmers = adminFarmerRows.length;
  const totalFarms = data.farms.length;
  const pendingApprovals = adminFarmerRows.filter((row) => row.status === "pending").length;
  const verifiedProfiles = adminFarmerRows.filter((row) => row.status === "verified").length;
  const activeRegionalAlerts = regionalSummary.reduce((sum, region) => sum + region.activeAlerts, 0);
  const systemActivity = totalFarmers * 18 + totalFarms * 9 + verifiedProfiles * 4;

  const dashboardStats = [
    {
      key: "farmers",
      title: "Total Farmers",
      value: totalFarmers.toLocaleString(),
      badge: `${regionalSummary.length} active regions`,
      tone: "blue",
    },
    {
      key: "approvals",
      title: "Pending Approvals",
      value: pendingApprovals.toLocaleString(),
      badge: pendingApprovals ? "Review required" : "Up to date",
      tone: pendingApprovals ? "amber" : "green",
    },
    {
      key: "farms",
      title: "Total Farms",
      value: totalFarms.toLocaleString(),
      badge: "Registered plots",
      tone: "green",
    },
    {
      key: "alerts",
      title: "Active Regional Alerts",
      value: activeRegionalAlerts.toLocaleString(),
      badge: activeRegionalAlerts >= 6 ? "Extension follow-up" : "Monitor closely",
      tone: "amber",
    },
    {
      key: "activity",
      title: "System Activity",
      value: `${formatCompactNumber(systemActivity)} actions`,
      badge: "Last 24 hours",
      tone: "purple",
    },
    {
      key: "verified",
      title: "Verified Profiles",
      value: verifiedProfiles.toLocaleString(),
      badge: `${totalFarmers ? Math.round((verifiedProfiles / totalFarmers) * 100) : 0}% verified`,
      tone: "green",
    },
  ];

  const recentSignups = useMemo(() => {
    return [...adminFarmerRows]
      .sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime())
      .slice(0, 5)
      .map((row) => ({
        userId: row.userId,
        name: row.name,
        initials: row.initials,
        location: row.region,
        experience: row.profile?.experienceLevel || "Intermediate",
        signupDate: formatReadableDate(row.joined),
        verificationStatus: row.status,
      }));
  }, [adminFarmerRows]);

  const workflowItems = useMemo(() => {
    return workflowSeed.map((item) => {
      let count = 1;

      if (item.id === "wf-approvals") count = pendingApprovals;
      if (item.id === "wf-advisories") count = Math.max(2, regionalSummary.length);
      if (item.id === "wf-pests") count = regionalSummary.filter((region) => region.activeAlerts >= 2).length;
      if (item.id === "wf-weather") count = Math.max(1, activeRegionalAlerts - 2);
      if (item.id === "wf-market") count = Math.max(2, totalFarms - 1);

      return {
        ...item,
        count,
        state: workflowState[item.id] || "pending",
      };
    });
  }, [activeRegionalAlerts, pendingApprovals, regionalSummary, totalFarms, workflowState]);

  const topRegions = regionalSummary.slice(0, 5);

  const handleWorkflowState = (id, nextState) => {
    setWorkflowState((current) => ({ ...current, [id]: nextState }));
    setStatusMessage(`Updated ${workflowSeed.find((item) => item.id === id)?.title || "workflow"} to ${nextState}.`);
  };

  return (
    <section className="admin-dashboard-page prototype-extension-dashboard-page">
      <div className="page-title-block prototype-extension-dashboard-title">
        <div>
          <h1>Admin & Extension Officer Portal</h1>
          <p>
            Frontend-only command center for farmer approvals, regional coordination, advisory review,
            and extension operations in Rwanda.
          </p>
        </div>
        <div className="prototype-admin-demo-tag">
          <span>{DEMO_MODE ? "DEMO_MODE" : "Live Mode"}</span>
          <small>localStorage + mock datasets</small>
        </div>
      </div>

      {statusMessage ? <div className="community-inline-notice">{statusMessage}</div> : null}

      <div className="prototype-stats-grid prototype-extension-stats-grid prototype-admin-stats-grid">
        {dashboardStats.map((item) => {
          const Icon = statIcons[item.key];
          return (
            <article key={item.title} className="prototype-stat-card prototype-extension-stat-card">
              <div className="stat-card-top">
                <div className={`stat-icon tone-${item.tone}`}>
                  <Icon size={16} />
                </div>
                <span className={`stat-badge tone-${item.tone === "purple" ? "blue" : item.tone}`}>{item.badge}</span>
              </div>
              <p>{item.title}</p>
              <h3>{item.value}</h3>
            </article>
          );
        })}
      </div>

      <div className="prototype-main-grid prototype-extension-main-grid prototype-admin-overview-grid">
        <article className="prototype-panel prototype-admin-regions-panel">
          <div className="panel-toolbar">
            <h2>Regional Data Overview</h2>
            <button
              type="button"
              className="text-link-button primary"
              onClick={() => navigate("/regional-monitoring")}
            >
              Open Dashboard
            </button>
          </div>

          <div className="regional-data-list prototype-admin-regional-list">
            {topRegions.map((region) => (
              <button
                type="button"
                key={region.region}
                className="regional-data-row regional-data-button prototype-admin-region-row"
                onClick={() => {
                  navigate("/regional-monitoring");
                  setStatusMessage(`Opened regional monitoring for ${region.region}.`);
                }}
              >
                <div className="prototype-admin-region-main">
                  <strong>{region.region}</strong>
                  <span>
                    {region.farmers} farmers · {region.farms} farms
                  </span>
                </div>
                <div className="prototype-admin-region-meta">
                  <span>{region.activeAlerts} active alerts</span>
                  <small className={`status-pill tone-${getVerificationTone(region.verificationRate)}`}>
                    {region.verificationRate}% verified
                  </small>
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="prototype-panel prototype-admin-workflow-panel">
          <div className="panel-toolbar">
            <h2>Extension Officer Workflow</h2>
            <ClipboardCheck size={16} />
          </div>

          <div className="prototype-admin-workflow-list">
            {workflowItems.map((item) => (
              <div key={item.id} className="prototype-admin-workflow-item">
                <div className="prototype-admin-workflow-copy">
                  <div className="prototype-admin-workflow-topline">
                    <strong>{item.title}</strong>
                    <span className={`status-pill tone-${item.tone}`}>{item.count} open</span>
                  </div>
                  <p>{item.description}</p>
                </div>
                <div className="prototype-admin-workflow-actions">
                  <button
                    type="button"
                    className="details-button"
                    onClick={() => handleWorkflowState(item.id, "in-review")}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    className="approve-button"
                    onClick={() => handleWorkflowState(item.id, "completed")}
                  >
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="prototype-extension-admin-grid prototype-admin-table-grid">
        <article className="prototype-panel table-panel prototype-extension-table-panel">
          <div className="table-header">
            <div className="prototype-extension-table-title">
              <h2>Recent Farmer Signups</h2>
              <span>Readable demo approvals queue</span>
            </div>
            <button type="button" className="text-link-button primary" onClick={() => navigate("/farms")}>
              View Farmer Management
            </button>
          </div>

          <div className="signup-table">
            <div className="signup-row signup-head prototype-admin-signup-head">
              <span>Farmer Name</span>
              <span>Location</span>
              <span>Experience</span>
              <span>Signup Date</span>
              <span>Verification Status</span>
              <span>Action</span>
            </div>

            {recentSignups.map((item) => (
              <div key={item.userId} className="signup-row prototype-admin-signup-row">
                <div className="farmer-cell">
                  <div className="initials-badge tone-blue">{item.initials}</div>
                  <strong>{item.name}</strong>
                </div>
                <span>{item.location}</span>
                <span>{item.experience}</span>
                <span>{item.signupDate}</span>
                <span className={`status-pill tone-${item.verificationStatus === "verified" ? "green" : item.verificationStatus === "pending" ? "amber" : "red"}`}>
                  {item.verificationStatus}
                </span>
                <div className="action-cell prototype-admin-action-cell">
                  <button
                    type="button"
                    className="approve-button"
                    onClick={() => {
                      approveProfile(item.userId, "AgriFeed Admin");
                      setStatusMessage(`Approved ${item.name}.`);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="prototype-admin-danger-button"
                    onClick={() => {
                      deactivateProfile(item.userId);
                      setStatusMessage(`Rejected ${item.name}.`);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="details-button"
                    onClick={() => navigate("/farms")}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="prototype-panel extension-maintenance-card prototype-admin-monitoring-card">
          <div className="panel-toolbar">
            <h2>System Monitoring & Maintenance</h2>
            <ShieldCheck size={16} />
          </div>

          <div className="prototype-admin-monitoring-list">
            {monitoringSeed.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="prototype-admin-monitoring-item">
                  <div className={`stat-icon tone-${item.tone}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.status}</span>
                    <p>{item.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prototype-admin-monitoring-actions">
            <button
              type="button"
              className="prototype-admin-secondary-button full"
              onClick={() => {
                navigate("/analytics");
                setStatusMessage("Opened reports and data export tools.");
              }}
            >
              <Download size={15} />
              <span>Open Reports & Data Export</span>
            </button>
            <button
              type="button"
              className="prototype-admin-secondary-button full"
              onClick={() => {
                navigate("/regional-monitoring");
                setStatusMessage("Opened regional monitoring dashboard.");
              }}
            >
              <MapPinned size={15} />
              <span>Issue Regional Advisory</span>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
