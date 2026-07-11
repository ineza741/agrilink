import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sprout,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { phase1BackendService } from "../../services/phase1Backend";

function formatCurrency(value) {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return `RWF ${Math.round(Number(value)).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "New";
  const numeric = Number(value);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function EmptyState({ message }) {
  return (
    <div
      style={{
        border: "1px dashed rgba(22, 163, 74, 0.24)",
        borderRadius: 18,
        padding: 24,
        color: "var(--agri-text-secondary)",
        background: "rgba(240, 253, 244, 0.7)",
      }}
    >
      {message}
    </div>
  );
}

export function MarketOfficerDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await phase1BackendService.cropPrices.dashboard();
        setDashboard(response);
      } catch (err) {
        setError(err?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <section className="market-officer-dashboard-page">
        <div className="prototype-panel" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: 56 }}>
          <LoaderCircle size={18} className="spin" />
          <span>Loading market officer dashboard...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="market-officer-dashboard-page">
        <div className="prototype-panel" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>
          <button type="button" className="recommendation-primary-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  const officer = dashboard?.officer || {};
  const recentUpdates = Array.isArray(dashboard?.recentUpdates) ? dashboard.recentUpdates : [];
  const attentionItems = Array.isArray(dashboard?.cropsRequiringAttention) ? dashboard.cropsRequiringAttention : [];
  const latestChange = dashboard?.latestPriceChange || null;

  const statCards = [
    {
      title: "Crops Managed",
      value: dashboard?.cropsManaged ?? 0,
      icon: Sprout,
      helper: "Active official crop prices in your scope.",
    },
    {
      title: "Prices Updated Today",
      value: dashboard?.pricesUpdatedToday ?? 0,
      icon: RefreshCw,
      helper: "Created or updated today.",
    },
    {
      title: "Active Markets",
      value: dashboard?.activeMarkets ?? 0,
      icon: MapPin,
      helper: "Markets covered by active prices.",
    },
    {
      title: "Latest Price Change",
      value: latestChange?.cropName || "--",
      icon: TrendingUp,
      helper: latestChange
        ? `${latestChange.priceType}: ${formatPercent(latestChange.changePercent)} (${formatCurrency(latestChange.oldValue)} to ${formatCurrency(latestChange.newValue)})`
        : "No recent changes yet.",
    },
  ];

  return (
    <section className="market-officer-dashboard-page" style={{ display: "grid", gap: 24 }}>
      <div className="page-title-block" style={{ marginBottom: 0 }}>
        <div>
          <h1>Market Officer Dashboard</h1>
          <p>Manage official crop prices used across AgriSupport.</p>
        </div>
        <button
          type="button"
          className="recommendation-primary-button"
          onClick={() => navigate("/market-officer/prices")}
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <TrendingUp size={16} />
          <span>Update Crop Price</span>
        </button>
      </div>

      <article
        className="prototype-panel"
        style={{
          background: "linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(240, 253, 244, 0.95))",
          border: "1px solid rgba(22, 163, 74, 0.18)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--agri-text-secondary)", fontSize: 13 }}>Current officer</p>
            <strong style={{ fontSize: 18 }}>{officer.fullName || "--"}</strong>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--agri-text-secondary)", fontSize: 13 }}>Assigned market</p>
            <strong style={{ fontSize: 16 }}>{officer.marketName || "--"}</strong>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--agri-text-secondary)", fontSize: 13 }}>Assigned district</p>
            <strong style={{ fontSize: 16 }}>{officer.district || "--"}</strong>
          </div>
          <div>
            <p style={{ margin: "0 0 6px", color: "var(--agri-text-secondary)", fontSize: 13 }}>Last successful update</p>
            <strong style={{ fontSize: 16 }}>{formatDateTime(dashboard?.lastSuccessfulUpdateAt)}</strong>
          </div>
        </div>
      </article>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="prototype-stat-card" style={{ minHeight: 148 }}>
              <div className="stat-card-top">
                <div className="stat-icon tone-green">
                  <Icon size={16} />
                </div>
              </div>
              <p>{card.title}</p>
              <h3 style={{ lineHeight: 1.2 }}>{card.value}</h3>
              <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>{card.helper}</span>
            </article>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <article className="prototype-panel">
          <div className="panel-toolbar" style={{ marginBottom: 18 }}>
            <div>
              <h2>Recent Price Updates</h2>
              <p>Latest five official price changes in your scope.</p>
            </div>
          </div>

          {recentUpdates.length === 0 ? (
            <EmptyState message="No crop prices have been updated yet." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {recentUpdates.map((item) => {
                const summary = item.summary || null;
                const positive = !summary || summary.changeValue >= 0;
                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid rgba(22, 163, 74, 0.12)",
                      borderRadius: 18,
                      padding: 18,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                      <div>
                        <strong style={{ display: "block", marginBottom: 4 }}>{item.cropName}</strong>
                        <span style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>{item.marketName}</span>
                      </div>
                      <span className="stat-badge tone-green">{item.status || "Published"}</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginTop: 16, fontSize: 13 }}>
                      <div>
                        <span style={{ color: "var(--agri-text-secondary)" }}>Old price</span>
                        <strong style={{ display: "block", marginTop: 4 }}>{formatCurrency(summary?.oldValue)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--agri-text-secondary)" }}>New price</span>
                        <strong style={{ display: "block", marginTop: 4 }}>{formatCurrency(summary?.newValue)}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--agri-text-secondary)" }}>Change</span>
                        <strong
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                            color: positive ? "var(--success)" : "var(--danger)",
                          }}
                        >
                          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          {formatPercent(summary?.changePercent)}
                        </strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--agri-text-secondary)" }}>Effective date</span>
                        <strong style={{ display: "block", marginTop: 4 }}>{formatDate(item.effectiveDate)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="prototype-panel">
          <div className="panel-toolbar" style={{ marginBottom: 18 }}>
            <div>
              <h2>Crops Requiring Attention</h2>
              <p>Items missing an active update or needing review.</p>
            </div>
          </div>

          {attentionItems.length === 0 ? (
            <EmptyState message="No crops require attention right now." />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {attentionItems.map((item, index) => (
                <div
                  key={`${item.cropName}-${item.issue}-${index}`}
                  style={{
                    border: "1px solid rgba(245, 158, 11, 0.22)",
                    borderRadius: 18,
                    padding: 18,
                    background: "rgba(255, 251, 235, 0.7)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <strong style={{ display: "block", marginBottom: 4 }}>{item.cropName}</strong>
                      <span style={{ display: "block", color: "var(--agri-text-secondary)", fontSize: 13, marginBottom: 8 }}>
                        {item.marketName || "Assigned market"}
                      </span>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{item.issue}</div>
                      <div style={{ color: "var(--agri-text-secondary)", fontSize: 13 }}>{item.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="prototype-panel">
        <div className="panel-toolbar" style={{ marginBottom: 16 }}>
          <div>
            <h2>Quick Action</h2>
            <p>Open the crop prices screen to publish or revise an official price.</p>
          </div>
          <button
            type="button"
            className="recommendation-primary-button"
            onClick={() => navigate("/market-officer/prices")}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <Clock3 size={16} />
            <span>Update Crop Price</span>
          </button>
        </div>
      </article>
    </section>
  );
}
