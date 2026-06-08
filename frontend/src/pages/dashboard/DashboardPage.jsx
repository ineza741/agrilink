import {
  AlertTriangle,
  ArrowUpRight,
  Bolt,
  Download,
  ShieldCheck,
  Users,
  Wrench,
  Map as MapIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFarmerData } from "../../context/FarmerDataContext";

const statIcons = {
  blue: Users,
  green: ShieldCheck,
  amber: AlertTriangle,
  purple: Bolt,
};

const maintenanceChecks = [
  "Sync farmer approvals every 6 hours",
  "Validate regional weather source uptime",
  "Review high-risk alert queue",
];

function chartBars(values) {
  const max = Math.max(...values, 1);
  return values.map((value) => Math.max(18, Math.round((value / max) * 100)));
}

export function DashboardPage() {
  const { adminFarmerRows, data, getRegionalSummary } = useFarmerData();
  const [range, setRange] = useState("7D");
  const regionalSummary = useMemo(() => getRegionalSummary(), [getRegionalSummary]);

  const totalFarmers = adminFarmerRows.length;
  const totalFarms = data.farms.length;
  const pendingApprovals = adminFarmerRows.filter((row) => row.status === "pending").length;
  const activeRegionalAlerts = regionalSummary.filter((region) => region.verificationRate < 70).length;
  const reqPerDay = Math.round(totalFarmers * 12.8 + totalFarms * 3.1);
  const adoptionRate = totalFarmers
    ? Math.round((adminFarmerRows.filter((row) => row.completeness >= 70).length / totalFarmers) * 100)
    : 0;

  const dashboardStats = [
    { title: "Total Farmers", value: totalFarmers.toLocaleString(), badge: `+${Math.max(2, pendingApprovals)} pending`, iconTone: "blue", badgeTone: "green" },
    { title: "Total Farms", value: totalFarms.toLocaleString(), badge: `Adoption ${adoptionRate}%`, iconTone: "green", badgeTone: "green" },
    { title: "Active Regional Alerts", value: activeRegionalAlerts.toLocaleString(), badge: activeRegionalAlerts ? "High Risk" : "Stable", iconTone: "amber", badgeTone: activeRegionalAlerts ? "amber" : "green" },
    { title: "System Activity (Req/Day)", value: `${(reqPerDay / 1000).toFixed(1)}k`, badge: "Stable", iconTone: "purple", badgeTone: "blue" },
  ];

  const systemActivity = useMemo(() => {
    const base = range === "30D" ? [120, 135, 142, 138, 154, 163, 172] : [48, 56, 62, 58, 71, 79, 86];
    const factor = Math.max(1, Math.round(totalFarmers / 2.4));
    return base.map((value, index) => value + factor + index * 2);
  }, [range, totalFarmers]);

  const bars = chartBars(systemActivity);
  const topRegion = [...regionalSummary].sort((a, b) => b.farms - a.farms)[0];
  const recentSignups = adminFarmerRows
    .filter((row) => row.status === "pending")
    .slice(0, 4)
    .map((row) => ({
      name: row.name,
      region: row.region,
      specialty: row.profile?.experienceLevel || "Mixed farming",
      date: new Date(row.joined).toLocaleDateString("en-ZA", { month: "short", day: "numeric", year: "numeric" }),
      initials: row.initials,
    }));

  return (
    <section className="admin-dashboard-page prototype-extension-dashboard-page">
      <div className="page-title-block prototype-extension-dashboard-title">
        <h1>Extension Dashboard</h1>
        <p>Academic-AI assisted farmer support oversight, approvals, regional monitoring, and engagement analytics.</p>
      </div>

      <div className="prototype-stats-grid prototype-extension-stats-grid">
        {dashboardStats.map((item) => {
          const Icon = statIcons[item.iconTone];
          return (
            <article key={item.title} className="prototype-stat-card prototype-extension-stat-card">
              <div className="stat-card-top">
                <div className={`stat-icon tone-${item.iconTone}`}>
                  <Icon size={16} />
                </div>
                <span className={`stat-badge tone-${item.badgeTone}`}>{item.badge}</span>
              </div>
              <p>{item.title}</p>
              <h3>{item.value}</h3>
            </article>
          );
        })}
      </div>

      <div className="prototype-main-grid prototype-extension-main-grid">
        <article className="prototype-panel chart-panel prototype-extension-chart-panel functional">
          <div className="panel-toolbar">
            <h2>User Activity & Engagement ({range === "30D" ? "Last 30 Days" : "Last 7 Days"})</h2>
            <button type="button" className="mini-select" onClick={() => setRange((current) => (current === "7D" ? "30D" : "7D"))}>
              {range}
            </button>
          </div>
          <div className="extension-activity-bars">
            {bars.map((height, index) => (
              <div key={`${height}-${index}`} className="extension-activity-bar-wrap">
                <span className="extension-activity-bar" style={{ height: `${height}%` }} />
              </div>
            ))}
          </div>
          <div className="extension-activity-axis">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </article>

        <article className="prototype-panel region-panel prototype-extension-region-panel functional">
          <div className="panel-toolbar">
            <h2>Regional Data Overview</h2>
            <ArrowUpRight size={15} />
          </div>

          <div className="region-map-card">
            <div className="device-frame">
              <div className="device-screen">
                <div className="map-grid" />
              </div>
            </div>
            <div className="alert-callout">
              <span className="alert-dot" />
              <strong>{topRegion ? `${topRegion.region} · ${topRegion.farms} farms` : "No regional data yet"}</strong>
            </div>
          </div>

          <div className="regional-data-list">
            {regionalSummary.slice(0, 3).map((region) => (
              <div key={region.region} className="regional-data-row">
                <div>
                  <strong>{region.region}</strong>
                  <span>{region.farmers} farmers · {region.farms} farms</span>
                </div>
                <small>{region.verificationRate}% verified</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="prototype-extension-admin-grid">
        <article className="prototype-panel table-panel prototype-extension-table-panel">
          <div className="table-header">
            <div className="prototype-extension-table-title">
              <h2>Recent Farmer Signups</h2>
              <span>Awaiting Approval</span>
            </div>
            <button type="button" className="text-link-button primary">
              View All Requests
            </button>
          </div>

          <div className="signup-table">
            <div className="signup-row signup-head">
              <span>Farmer Name</span>
              <span>Location/Region</span>
              <span>Experience</span>
              <span>Signup Date</span>
              <span>Action</span>
            </div>

            {recentSignups.map((item) => (
              <div key={item.name} className="signup-row">
                <div className="farmer-cell">
                  <div className="initials-badge tone-blue">{item.initials}</div>
                  <strong>{item.name}</strong>
                </div>
                <span>{item.region}</span>
                <span>{item.specialty}</span>
                <span>{item.date}</span>
                <div className="action-cell">
                  <button type="button" className="approve-button">Approve</button>
                  <button type="button" className="details-button">Details</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="prototype-panel extension-maintenance-card">
          <div className="panel-toolbar">
            <h2>System Monitoring & Maintenance</h2>
            <Wrench size={16} />
          </div>
          <div className="extension-maintenance-list">
            {maintenanceChecks.map((item) => (
              <div key={item} className="extension-maintenance-item">
                <ShieldCheck size={15} />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="extension-maintenance-export">
            <button type="button" className="prototype-admin-secondary-button full">
              <Download size={15} />
              <span>Export Government / NGO Pack</span>
            </button>
          </div>
          <div className="extension-maintenance-role">
            <MapIcon size={15} />
            <span>Role-based access active for regional agricultural officers.</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
