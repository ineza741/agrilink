import {
  Activity,
  Map,
  Search,
  Signal,
  TriangleAlert,
  Waves,
} from "lucide-react";

const regionalStats = [
  { title: "Monitored Sectors", value: "12", tone: "blue", icon: Map },
  { title: "Active Alerts", value: "04", tone: "amber", icon: TriangleAlert },
  { title: "Sensor Health", value: "92%", tone: "green", icon: Signal },
];

const sectorRows = [
  { sector: "North Highland A", condition: "Stable", advisory: "Low rainfall stress", tone: "verified" },
  { sector: "East Valley 4", condition: "Attention", advisory: "Pest pressure rising", tone: "review" },
  { sector: "South Basin 2", condition: "Watch", advisory: "Water logging risk", tone: "scheduled" },
];

const monitoringNotes = [
  "East Valley 4 requires closer pest surveillance after the latest symptom cluster.",
  "South Basin 2 should maintain drainage checks after repeated rainfall spikes.",
  "North Highland A remains the most stable production zone this week.",
];

export function RegionalMonitoringPage() {
  return (
    <section className="management-page">
      <div className="page-title-block">
        <h1>Regional Monitoring</h1>
        <p>Compare regional field conditions, alert intensity, and operational monitoring status.</p>
      </div>

      <div className="management-toolbar">
        <div className="toolbar-search">
          <Search size={15} />
          <input type="text" placeholder="Search sector, condition, or monitoring note..." />
        </div>
      </div>

      <div className="management-summary-grid">
        {regionalStats.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="mini-summary-card">
              <div className={`stat-icon tone-${card.tone}`}>
                <Icon size={16} />
              </div>
              <div>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </div>

      <div className="management-grid">
        <article className="prototype-panel management-table-panel">
          <div className="panel-toolbar">
            <h2>Regional Status Board</h2>
            <button type="button" className="text-link-button primary">
              Open Zone Comparison
            </button>
          </div>

          <div className="signup-table management-table">
            <div className="signup-row signup-head regional-head">
              <span>Sector</span>
              <span>Condition</span>
              <span>Advisory</span>
            </div>

            {sectorRows.map((row) => (
              <div key={row.sector} className="signup-row regional-body-row">
                <strong>{row.sector}</strong>
                <span className={`status-pill ${row.tone}`}>{row.condition}</span>
                <span>{row.advisory}</span>
              </div>
            ))}
          </div>

          <div className="regional-monitor-card">
            <div className="regional-monitor-map">
              <div className="regional-monitor-grid" />
              <div className="regional-hotspot hotspot-a" />
              <div className="regional-hotspot hotspot-b" />
              <div className="regional-hotspot hotspot-c" />
            </div>

            <div className="regional-monitor-copy">
              <span className="weather-location-tag">Regional Activity View</span>
              <h3>Alert concentration remains highest in the eastern monitoring corridor.</h3>
              <p>
                Current monitoring indicates the eastern corridor needs the fastest follow-up due
                to combined pest and moisture-risk signals.
              </p>
            </div>
          </div>
        </article>

        <aside className="prototype-panel profile-side-panel">
          <div className="panel-toolbar">
            <h2>Regional Notes</h2>
            <Activity size={16} color="#1ea4ff" />
          </div>

          <div className="editorial-stack">
            {monitoringNotes.map((item) => (
              <div key={item} className="editorial-item">
                <Waves size={15} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="profile-meta-grid">
            <div>
              <span>Most Active Zone</span>
              <strong>East Valley 4</strong>
            </div>
            <div>
              <span>Refresh Interval</span>
              <strong>Every 2 Hours</strong>
            </div>
            <div>
              <span>Escalations Today</span>
              <strong>3 Cases</strong>
            </div>
          </div>

          <button type="button" className="toolbar-button primary full-width">
            Issue Regional Advisory
          </button>
        </aside>
      </div>
    </section>
  );
}
