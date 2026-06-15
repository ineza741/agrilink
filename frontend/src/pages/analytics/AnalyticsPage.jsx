import {
  Clock3,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Leaf,
  Map,
  ShieldCheck,
  Sparkles,
  UsersRound,
  BarChart3,
  Wallet,
  ShoppingCart,
  Sprout,
  MoreVertical,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FarmerPrototypeTopbar } from "../../components/common/FarmerPrototypeTopbar";
import { useFarmerData } from "../../context/FarmerDataContext";

const statCards = [
  { title: "Total Platform Yield", value: "1.2M Tons", note: "+12%", icon: Leaf },
  { title: "Adoption Rate", value: "78.5%", note: "+5.2%", icon: UsersRound },
  { title: "Active Regions", value: "142", note: "Stable", icon: Map },
  { title: "Advisory Accuracy", value: "94.2%", note: "+1.5%", icon: ShieldCheck },
];

const exportChecks = [
  { label: "Yield Statistics", checked: true },
  { label: "Farmer Demographics", checked: true },
  { label: "Financial Projections", checked: false },
  { label: "Weather Historical Data", checked: true },
  { label: "Raw API Payload", checked: false },
];

const exportFormats = [
  { title: "Export to PDF", subtitle: "Includes visualizations", icon: FileText, tone: "red" },
  { title: "Export to Excel", subtitle: "Raw tabular data structure", icon: FileSpreadsheet, tone: "green" },
  { title: "JSON / API Data", subtitle: "Machine readable feed", icon: FileJson, tone: "blue" },
];

const methodologyCards = [
  { title: "Standard Agricultural", body: "Basic yield and weather correlations.", active: true },
  { title: "Economic Impact", body: "Market prices and farmer revenue analysis." },
  { title: "Climate Resilience", body: "Adaptation metrics and carbon auditing." },
];

const ANALYTICS_STORAGE_KEY = "agri-feed-analytics-module-v1";

function formatRwf(value) {
  return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`;
}

function createDefaultFarm() {
  return {
    id: "analytics-default-farm",
    name: "Primary Performance Plot",
    region: "Northern Highlands",
    sizeHectares: 12,
    primaryCrop: "Maize",
    cropHistory: [
      { crop: "Maize", season: "2024 Long Rain", yield: "24.6 t", challenges: "Moderate water stress" },
      { crop: "Beans", season: "2023 Short Rain", yield: "11.2 t", challenges: "Stable season" },
    ],
    location: { lat: -1.94, lng: 29.87 },
  };
}

function hashFarm(farm) {
  return (
    Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) +
    Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) +
    Math.round(Number(farm?.sizeHectares || 0)) * 4
  );
}

function loadStoredState() {
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredState(state) {
  localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state));
}

function buildAnalyticsData({ farm, cropType, dateRange, reportTemplate }) {
  const seed = hashFarm(farm);
  const cropBase = {
    All: 1,
    Maize: 1.14,
    Wheat: 1.02,
    Soybeans: 0.94,
    Rice: 1.08,
    Beans: 0.88,
  };
  const factor = cropBase[cropType] || 1;
  const rangeFactor = dateRange === "12M" ? 1.22 : dateRange === "90D" ? 0.86 : 1;
  const area = Number(farm?.sizeHectares || 10);

  const yieldTons = Number((area * 18.8 * factor * rangeFactor + (seed % 11)).toFixed(1));
  const revenue = Math.round(yieldTons * (285 + (seed % 24)));
  const costs = Math.round(area * (810 + (seed % 70)) * rangeFactor);
  const profit = revenue - costs;
  const roi = Number(((profit / Math.max(costs, 1)) * 100).toFixed(1));
  const regionalYield = Number((yieldTons * (0.9 + (seed % 8) / 100)).toFixed(1));
  const waterUseScore = Math.max(52, 88 - (seed % 14) - (dateRange === "12M" ? 3 : 0));
  const carbonFootprint = Number((2.4 + (seed % 7) * 0.18).toFixed(1));
  const sustainability = Math.round((waterUseScore + (100 - carbonFootprint * 10) + Math.min(100, 68 + roi)) / 3);

  const actualSeries = Array.from({ length: 6 }, (_, index) =>
    Math.round((yieldTons / 6) * (0.82 + index * 0.06 + ((seed + index) % 4) * 0.02))
  );
  const targetSeries = actualSeries.map((value, index) => Math.round(value * (1.06 + (index % 2) * 0.03)));
  const revenueSeries = ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({
    label,
    revenue: Math.round(revenue * (0.17 + index * 0.08)),
    costs: Math.round(costs * (0.22 + index * 0.05)),
  }));

  const reportRows = [
    { period: "June 2024", short: "JUN", yield: `${(yieldTons / 5.7).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.2)), score: `${Math.min(94, sustainability + 6)}%`, status: "Verified" },
    { period: "May 2024", short: "MAY", yield: `${(yieldTons / 6.2).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.6)), score: `${Math.min(91, sustainability + 2)}%`, status: "Verified" },
    { period: "April 2024", short: "APR", yield: `${(yieldTons / 6).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.4)), score: `${Math.max(74, sustainability - 3)}%`, status: "Pending Review" },
  ];

  const reportTemplateLabel =
    reportTemplate === "sustainability"
      ? "Sustainability Impact Report"
      : reportTemplate === "finance"
        ? "Financial Performance Report"
        : "Farm Operations Report";

  return {
    yieldTons,
    revenue,
    costs,
    profit,
    roi,
    regionalYield,
    sustainability,
    waterUseScore,
    carbonFootprint,
    actualSeries,
    targetSeries,
    revenueSeries,
    reportRows,
    reportTemplateLabel,
  };
}

function AdminAnalyticsView() {
  return (
    <section className="management-page prototype-admin-reports-page">
      <div className="prototype-admin-reports-main">
          <div className="page-title-block prototype-admin-reports-title">
            <h1>System-Wide Reports &amp; Export</h1>
            <p>Aggregated platform intelligence and government compliance reporting tools.</p>
          </div>

          <div className="prototype-admin-reports-actions">
            <button type="button" className="prototype-admin-secondary-button">
              <Clock3 size={15} />
              <span>View History</span>
            </button>
            <button type="button" className="prototype-admin-primary-button">
              <Sparkles size={15} />
              <span>Generate AI Insight</span>
            </button>
          </div>

          <div className="prototype-admin-stat-grid">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="prototype-admin-stat-card">
                  <div className="prototype-admin-stat-head">
                    <span>{card.title}</span>
                    <Icon size={18} />
                  </div>
                  <div className="prototype-admin-stat-body">
                    <strong>{card.value}</strong>
                    <small>{card.note}</small>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="prototype-admin-report-grid">
            <div className="prototype-admin-report-main">
              <article className="prototype-panel prototype-admin-generator-card">
                <div className="prototype-admin-section-head">
                  <h2>Generate Government Report</h2>
                </div>

                <div className="prototype-admin-form-grid">
                  <label>
                    <span>Reporting Period</span>
                    <div className="prototype-admin-date-range">
                      <input type="text" placeholder="mm/dd/yyyy" />
                      <i>—</i>
                      <input type="text" placeholder="mm/dd/yyyy" />
                    </div>
                  </label>

                  <label>
                    <span>Region Scope</span>
                    <select defaultValue="All National Regions">
                      <option>All National Regions</option>
                      <option>Northern Regions</option>
                      <option>Eastern Regions</option>
                    </select>
                  </label>
                </div>

                <div className="prototype-admin-methodology">
                  <span>Report Type &amp; Methodology</span>
                  <div className="prototype-admin-methodology-grid">
                    {methodologyCards.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        className={item.active ? "prototype-admin-methodology-card active" : "prototype-admin-methodology-card"}
                      >
                        <strong>{item.title}</strong>
                        <p>{item.body}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="prototype-admin-generator-footer">
                  <span>Compliant with ISO 31030:2021 Reporting Standards</span>
                  <button type="button" className="prototype-admin-dark-button">
                    Compile Preview Report
                  </button>
                </div>
              </article>

              <article className="prototype-panel prototype-admin-chart-card">
                <h2>Aggregate Yield Trend Analysis</h2>
                <div className="prototype-admin-chart">
                  <svg viewBox="0 0 700 240" preserveAspectRatio="none">
                    <path
                      d="M0,170 C60,90 120,90 180,140 C240,190 310,140 360,85 C420,20 505,40 560,170 C610,225 665,210 700,70"
                      fill="none"
                      stroke="#1ea4e9"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="prototype-admin-chart-axis">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            <aside className="prototype-panel prototype-admin-export-card">
              <div className="prototype-admin-section-head">
                <h2>Export Configuration</h2>
              </div>

              <div className="prototype-admin-export-section">
                <span>Include Data Points</span>
                <div className="prototype-admin-check-list">
                  {exportChecks.map((item) => (
                    <label key={item.label} className="prototype-admin-check-row">
                      <input type="checkbox" defaultChecked={item.checked} />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="prototype-admin-export-section">
                <span>Export Format</span>
                <div className="prototype-admin-export-format-list">
                  {exportFormats.map((format) => {
                    const Icon = format.icon;
                    return (
                      <button key={format.title} type="button" className="prototype-admin-export-format">
                        <div className={`prototype-admin-export-icon ${format.tone}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <strong>{format.title}</strong>
                          <small>{format.subtitle}</small>
                        </div>
                        <Download size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="prototype-admin-recent-export">
                <span>Recent Export</span>
                <div>
                  <strong>national_yield_q3.pdf</strong>
                  <small>2m ago</small>
                </div>
              </div>
            </aside>
          </div>
      </div>
    </section>
  );
}

function FarmerAnalyticsView() {
  const { currentFarms } = useFarmerData();
  const farms = currentFarms.length ? currentFarms : [createDefaultFarm()];
  const stored = useMemo(() => loadStoredState(), []);
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "analytics-default-farm");
  const [dateRange, setDateRange] = useState(stored.dateRange || "6M");
  const [cropType, setCropType] = useState(stored.cropType || farms[0]?.primaryCrop || "All");
  const [activityFilter, setActivityFilter] = useState(stored.activityFilter || "All");
  const [reportTemplate, setReportTemplate] = useState(stored.reportTemplate || "operations");
  const [shareReady, setShareReady] = useState(false);

  useEffect(() => {
    saveStoredState({ dateRange, cropType, activityFilter, reportTemplate });
  }, [activityFilter, cropType, dateRange, reportTemplate]);

  useEffect(() => {
    if (!farms.some((farm) => farm.id === selectedFarmId)) {
      setSelectedFarmId(farms[0]?.id || "analytics-default-farm");
    }
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || farms[0],
    [farms, selectedFarmId]
  );

  const analytics = useMemo(
    () => buildAnalyticsData({ farm: selectedFarm, cropType, dateRange, reportTemplate }),
    [cropType, dateRange, reportTemplate, selectedFarm]
  );

  const farmerMetricCards = [
    {
      title: "Profit Estimation",
      value: formatRwf(analytics.profit),
      note: `${analytics.profit >= 0 ? "+" : ""}${Math.max(1.8, analytics.roi / 3).toFixed(1)}% vs last cycle`,
      tone: analytics.profit >= 0 ? "green" : "red",
      icon: Wallet,
    },
    {
      title: "ROI %",
      value: `${analytics.roi}%`,
      note: `${analytics.roi >= 0 ? "+" : ""}${Math.max(1.1, analytics.roi / 6).toFixed(1)}% above target`,
      tone: analytics.roi >= 0 ? "green" : "red",
      icon: BarChart3,
    },
    {
      title: "Operating Costs",
      value: formatRwf(analytics.costs),
      note: `${Math.max(1.4, analytics.waterUseScore / 18).toFixed(1)}% controlled spend`,
      tone: "red",
      icon: ShoppingCart,
    },
    {
      title: "Estimated Yield",
      value: `${analytics.yieldTons.toLocaleString()} t`,
      note: `${Math.min(99, analytics.sustainability + 6)}% forecast confidence`,
      tone: "green",
      icon: Sprout,
    },
  ];

  const maxYield = Math.max(...analytics.actualSeries, ...analytics.targetSeries);
  const maxRevenue = Math.max(...analytics.revenueSeries.map((item) => item.revenue));
  const maxCosts = Math.max(...analytics.revenueSeries.map((item) => item.costs));
  const filteredRows =
    activityFilter === "All"
      ? analytics.reportRows
      : analytics.reportRows.filter((row) =>
          activityFilter === "Verified" ? row.status === "Verified" : row.status !== "Verified"
        );

  return (
    <section className="management-page prototype-farm-analytics-page">
      <FarmerPrototypeTopbar
        brand="AgriIntel AI"
        items={["Dashboard", "Analytics", "Yield Forecast", "Settings"]}
        active="Analytics"
        placeholder="Search analytics..."
      />

      <div className="page-title-block prototype-farm-analytics-title">
        <h1>Farm Analytics &amp; Yield Reports</h1>
        <p>AI-assisted insights for academic-standard crop performance and financial planning.</p>
      </div>

      <div className="prototype-farm-analytics-toolbar">
        <label className="prototype-farm-analytics-field">
          <span>Active farm</span>
          <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name} - {farm.region}
              </option>
            ))}
          </select>
        </label>
        <label className="prototype-farm-analytics-field">
          <span>Date range</span>
          <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last 90 Days</option>
            <option value="6M">Last 6 Months</option>
            <option value="12M">Last 12 Months</option>
          </select>
        </label>
        <label className="prototype-farm-analytics-field">
          <span>Crop type</span>
          <select value={cropType} onChange={(event) => setCropType(event.target.value)}>
            <option value="All">All Crops</option>
            <option value="Maize">Maize</option>
            <option value="Wheat">Wheat</option>
            <option value="Soybeans">Soybeans</option>
            <option value="Rice">Rice</option>
            <option value="Beans">Beans</option>
          </select>
        </label>
        <label className="prototype-farm-analytics-field">
          <span>Activity</span>
          <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}>
            <option value="All">All Activity</option>
            <option value="Verified">Verified Reports</option>
            <option value="Pending">Pending Review</option>
          </select>
        </label>
        <label className="prototype-farm-analytics-field">
          <span>Report template</span>
          <select value={reportTemplate} onChange={(event) => setReportTemplate(event.target.value)}>
            <option value="operations">Operations Summary</option>
            <option value="finance">Financial Report</option>
            <option value="sustainability">Sustainability Report</option>
          </select>
        </label>
      </div>

      <div className="prototype-farm-analytics-actions">
        <button type="button" className="prototype-farm-analytics-secondary">
          <FileSpreadsheet size={15} />
          <span>Excel</span>
        </button>
        <button type="button" className="prototype-farm-analytics-primary">
          <FileText size={15} />
          <span>{analytics.reportTemplateLabel}</span>
        </button>
        <button
          type="button"
          className="prototype-farm-analytics-secondary"
          onClick={() => setShareReady((current) => !current)}
        >
          <Sparkles size={15} />
          <span>{shareReady ? "Share Link Ready" : "Share Link"}</span>
        </button>
      </div>

      <div className="prototype-farm-analytics-stat-grid">
        {farmerMetricCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="prototype-farm-analytics-stat-card">
              <div className="prototype-farm-analytics-stat-head">
                <span>{card.title}</span>
                <Icon size={18} />
              </div>
              <strong>{card.value}</strong>
              <small className={card.tone}>{card.note}</small>
            </article>
          );
        })}
      </div>

      <div className="prototype-farm-analytics-summary-grid">
        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <h3>Comparative Analysis</h3>
          <div className="prototype-farm-analytics-compare-row">
            <span>Farm Yield</span>
            <strong>{analytics.yieldTons.toLocaleString()} t</strong>
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Regional Average</span>
            <strong>{analytics.regionalYield.toLocaleString()} t</strong>
          </div>
          <div className="prototype-farm-analytics-compare-badge">
            {analytics.yieldTons >= analytics.regionalYield ? "Above regional average" : "Below regional average"}
          </div>
        </article>

        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <h3>Sustainability Score</h3>
          <div className="prototype-farm-analytics-sustainability-score">
            <strong>{analytics.sustainability}</strong>
            <span>/100</span>
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Water Use Efficiency</span>
            <strong>{analytics.waterUseScore}%</strong>
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Carbon Footprint</span>
            <strong>{analytics.carbonFootprint} tCO₂e</strong>
          </div>
        </article>
      </div>

      <div className="prototype-farm-analytics-chart-grid">
        <article className="prototype-panel prototype-farm-analytics-chart-card">
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h2>Yield Summary</h2>
              <p>Actual vs. Target Production (Tons/Acre)</p>
            </div>
            <div className="prototype-farm-analytics-legend">
              <span><i className="actual" /> Actual</span>
              <span><i className="target" /> Target</span>
            </div>
          </div>
          <div className="prototype-farm-analytics-empty-chart functional">
            <div className="prototype-farm-analytics-grid-lines">
              {[1, 2, 3, 4].map((line) => <i key={line} />)}
            </div>
            <div className="prototype-farm-analytics-bars">
              {analytics.actualSeries.map((value, index) => (
                <div key={`yield-${value}-${index}`} className="prototype-farm-analytics-bar-group">
                  <span className="actual" style={{ height: `${Math.max(22, Math.round((value / maxYield) * 100))}%` }} />
                  <span className="target" style={{ height: `${Math.max(26, Math.round((analytics.targetSeries[index] / maxYield) * 100))}%` }} />
                </div>
              ))}
            </div>
            <div className="prototype-farm-analytics-axis">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </article>

        <article className="prototype-panel prototype-farm-analytics-chart-card">
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h2>Cost vs. Revenue Trend</h2>
              <p>Quarterly financial performance analysis</p>
            </div>
            <div className="prototype-farm-analytics-legend">
              <span><i className="revenue" /> Revenue</span>
              <span><i className="costs" /> Costs</span>
            </div>
          </div>
          <div className="prototype-farm-analytics-trend-chart functional">
            <div className="prototype-farm-analytics-grid-lines">
              {[1, 2, 3, 4].map((line) => <i key={`trend-line-${line}`} />)}
            </div>
            <div className="prototype-farm-analytics-line-grid">
              {analytics.revenueSeries.map((row) => (
                <div key={row.label} className="prototype-farm-analytics-line-column">
                  <span className="revenue" style={{ height: `${Math.max(26, Math.round((row.revenue / maxRevenue) * 100))}%` }} />
                  <span className="costs" style={{ height: `${Math.max(18, Math.round((row.costs / maxCosts) * 100))}%` }} />
                </div>
              ))}
            </div>
            <div className="prototype-farm-analytics-axis">
              {analytics.revenueSeries.map((row) => (
                <span key={row.label}>{row.label}</span>
              ))}
            </div>
          </div>
        </article>
      </div>

      <article className="prototype-panel prototype-farm-report-table-card">
        <div className="prototype-farm-analytics-card-head">
          <h2>Historical Monthly Reports</h2>
          <button type="button" className="prototype-farm-report-link">View Archive →</button>
        </div>

        <div className="prototype-farm-report-table">
          <div className="prototype-farm-report-head">
            <span>Reporting Period</span>
            <span>Total Yield</span>
            <span>Revenue</span>
            <span>Efficiency Score</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {filteredRows.map((row) => (
            <div key={row.period} className="prototype-farm-report-row">
              <div className="prototype-farm-report-period">
                <div className="prototype-farm-report-badge">{row.short}</div>
                <strong>{row.period}</strong>
              </div>
              <span>{row.yield}</span>
              <strong>{row.revenue}</strong>
              <div className="prototype-farm-report-score">
                <div className="prototype-farm-report-score-bar">
                  <div style={{ width: row.score }} />
                </div>
              </div>
              <span className={row.status === "Verified" ? "prototype-farm-report-status verified" : "prototype-farm-report-status pending"}>
                {row.status}
              </span>
              <div className="prototype-farm-report-actions">
                <Download size={16} />
                <MoreVertical size={16} />
              </div>
            </div>
          ))}
        </div>
      </article>

      <footer className="prototype-farm-analytics-footer">
        <span>Academic Decision Support Engine v4.2.0</span>
        <span>Methodology</span>
        <span>Privacy Policy</span>
        <span>Terms of Service</span>
        <span>© 2024 AgriIntel AI Systems. All rights reserved.</span>
      </footer>
    </section>
  );
}

export function AnalyticsPage() {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminAnalyticsView /> : <FarmerAnalyticsView />;
}
