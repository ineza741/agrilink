import {
  CheckCircle2,
  ClipboardCheck,
  Search,
  Sparkles,
  Sprout,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const recommendationStats = [
  { title: "Recommended Crop", value: "Irish Potato", tone: "green", icon: Sprout },
  { title: "Irrigation Plan", value: "Ready", tone: "blue", icon: Waves },
  { title: "Action Confidence", value: "91%", tone: "amber", icon: Sparkles },
];

const recommendations = [
  {
    title: "Plant Irish Potato on Upper Ridge Plot",
    reason: "Soil pH, texture, and current rainfall pattern strongly favor Irish potato growth.",
    badge: "High Confidence",
    tone: "verified",
  },
  {
    title: "Reduce Nitrogen on Valley South Plot",
    reason: "Current moisture levels raise the risk of nutrient loss if heavy application continues.",
    badge: "Medium Priority",
    tone: "review",
  },
  {
    title: "Delay extra watering until Thursday",
    reason: "The weather model shows adequate rainfall support for the next 48 hours.",
    badge: "Weather Linked",
    tone: "scheduled",
  },
];

const guidanceNotes = [
  "Recommendations combine the latest soil, weather, and field monitoring inputs.",
  "Highest-confidence actions should be reviewed first during the morning planning cycle.",
  "Farmer feedback can be used later to improve model accuracy and seasonal advice quality.",
];

export function AiRecommendationPage() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  return (
    <section className="management-page">
      <div className="page-title-block">
        <h1>AI Recommendation</h1>
        <p>Review the system's suggested crop, irrigation, and field action decisions.</p>
      </div>

      {statusMessage ? <div className="community-inline-notice">{statusMessage}</div> : null}

      <div className="management-toolbar">
        <div className="toolbar-search">
          <Search size={15} />
          <input type="text" placeholder="Search recommendation, field action, or reason..." />
        </div>
      </div>

      <div className="management-summary-grid">
        {recommendationStats.map((card) => {
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
            <h2>Recommended Actions</h2>
            <button
              type="button"
              className="text-link-button primary"
              onClick={() => setStatusMessage("Guidance export queued for the reporting module.")}
            >
              Export Guidance
            </button>
          </div>

          <div className="content-card-list">
            {recommendations.map((item) => (
              <article key={item.title} className="content-item-card">
                <div className="content-item-top">
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.reason}</p>
                  </div>
                  <span className={`status-pill ${item.tone}`}>{item.badge}</span>
                </div>

                <div className="content-item-actions">
                  <button
                    type="button"
                    className="details-button"
                    onClick={() => setStatusMessage(`Reviewing: ${item.title}`)}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    className="approve-button"
                    onClick={() => {
                      setAccepted((current) =>
                        current.includes(item.title) ? current : [...current, item.title]
                      );
                      setStatusMessage(`Accepted action: ${item.title}`);
                    }}
                  >
                    {accepted.includes(item.title) ? "Accepted" : "Accept"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <aside className="prototype-panel profile-side-panel">
          <div className="panel-toolbar">
            <h2>Decision Notes</h2>
            <ClipboardCheck size={16} color="#1ea4ff" />
          </div>

          <div className="editorial-stack">
            {guidanceNotes.map((item) => (
              <div key={item} className="editorial-item">
                <CheckCircle2 size={15} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="profile-meta-grid">
            <div>
              <span>Primary Driver</span>
              <strong>Soil + Weather</strong>
            </div>
            <div>
              <span>Last Refresh</span>
              <strong>Today 06:20 PM</strong>
            </div>
            <div>
              <span>Pending Confirmations</span>
              <strong>3 Actions</strong>
            </div>
          </div>

          <button
            type="button"
            className="toolbar-button primary full-width"
            onClick={() => navigate("/recommendations")}
          >
            Generate Full Advisory
          </button>
        </aside>
      </div>
    </section>
  );
}
