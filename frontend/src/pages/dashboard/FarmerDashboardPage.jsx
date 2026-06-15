import {
  AlertTriangle,
  ArrowRight,
  CloudSun,
  Droplets,
  FlaskConical,
  MapPin,
  Search,
  Sprout,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const statCards = [
  {
    title: "Farm Summary",
    value: "150.4 Acres",
    badge: "Active",
    tone: "green",
    detailLines: ["Crop: Corn, Soy, Wheat"],
    icon: Sprout,
  },
  {
    title: "Weather",
    value: "24°C",
    badge: "Stable",
    tone: "blue",
    detailLines: ["65% Humidity"],
    icon: CloudSun,
  },
  {
    title: "Active Alerts",
    value: "2 Action Items",
    tone: "red",
    detailLines: ["Pest Detection (Sector", "4)", "Frost Alert (Overnight)"],
    icon: AlertTriangle,
  },
  {
    title: "AI Recommendation",
    value: "New Insight",
    tone: "sky",
    detailLines: [
      "\"Optimize Nitrogen",
      "application in corn plots",
      "based on recent rainfall",
      "levels...\"",
    ],
    icon: FlaskConical,
    link: "View Full Analysis",
  },
];

const resourceRows = [
  { label: "Water Usage (L)", value: "78%", tone: "blue" },
  { label: "Fertilizer (N-P-K)", value: "42%", tone: "green" },
  { label: "Fuel Allocation", value: "60%", tone: "amber" },
];

const quickActions = [
  { label: "Add Soil Test", icon: FlaskConical, to: "/soil-crop" },
  { label: "View Market", icon: Sprout, to: "/market-intelligence" },
  { label: "Check Pests", icon: Search, to: "/pests-diseases" },
];

function widthFromPercent(value) {
  return value;
}

export function FarmerDashboardPage() {
  const navigate = useNavigate();

  return (
    <section className="farmer-dashboard-page">
      <div className="page-title-block farmer-page-title">
        <h1>Farmer Dashboard Overview</h1>
        <p>Real-time agricultural intelligence and farm health management.</p>
      </div>

      <div className="farmer-stat-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className={`farmer-stat-card tone-${card.tone}`}>
              <div className="farmer-stat-top">
                <div className={`stat-icon tone-${card.tone === "red" ? "amber" : card.tone}`}>
                  <Icon size={15} />
                </div>
                {card.badge ? <span className={`farmer-badge tone-${card.tone}`}>{card.badge}</span> : null}
              </div>
              <p>{card.title}</p>
              <h3>{card.value}</h3>
              <div className="farmer-stat-detail">
                {card.detailLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
              {card.link ? (
                <button
                  type="button"
                  className="text-link-button primary farmer-link-button"
                  onClick={() => navigate("/recommendations")}
                >
                  {card.link}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="farmer-main-grid">
        <article className="prototype-panel farmer-map-panel">
          <div className="panel-toolbar">
            <h2>Interactive Field Map</h2>
            <div className="map-controls">
              <button type="button" className="mini-select">Sat View</button>
              <button type="button" className="mini-select active">NDVI Index</button>
            </div>
          </div>

          <div className="field-map-placeholder refined-map">
            <div className="field-grid field-grid-a" />
            <div className="field-grid field-grid-b" />
            <div className="map-roads map-road-a" />
            <div className="map-roads map-road-b" />
            <div className="map-roads map-road-c" />
            <div className="map-lane map-lane-a" />
            <div className="map-lane map-lane-b" />
            <div className="map-pin-cluster">
              <MapPin size={14} />
              <MapPin size={14} />
              <MapPin size={14} />
            </div>
            <div className="map-caption">Healthy Growth</div>
          </div>
        </article>

        <aside className="prototype-panel resource-panel">
          <div className="panel-toolbar">
            <h2>Resource Consumption</h2>
          </div>

          <div className="resource-list">
            {resourceRows.map((row) => (
              <div key={row.label} className="resource-item">
                <div className="resource-item-top">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
                <div className="resource-bar-track">
                  <div className={`resource-bar-fill tone-${row.tone}`} style={{ width: widthFromPercent(row.value) }} />
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="download-report-button" onClick={() => navigate("/analytics")}>
            Download Reports
          </button>
        </aside>
      </div>

      <div className="quick-actions-panel">
        <h2>Quick Actions</h2>
        <div className="quick-action-row">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                className="quick-action-chip"
                onClick={() => navigate(action.to)}
              >
                <Icon size={14} />
                <span>{action.label}</span>
                <ArrowRight size={13} />
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
