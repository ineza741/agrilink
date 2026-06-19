import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  Download,
  Droplets,
  FileJson,
  FileSpreadsheet,
  FileText,
  Leaf,
  Map,
  MoreVertical,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Sprout,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { copyText, downloadCsvFile, downloadJsonFile, downloadTextFile } from "../../utils/actions";

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
const DEMO_MODE = true;

const reportTemplates = [
  "Operations Summary",
  "Financial Report",
  "Crop Production Report",
  "Weather Impact Report",
  "Pest & Disease Report",
  "Irrigation Report",
  "Market Intelligence Report",
];

const chartFilters = ["Monthly", "Quarterly", "Seasonal", "Annual"];

const reportTemplateDescriptions = {
  "Operations Summary": "Summarizes field productivity, operational efficiency, and recent farm activities for the selected period.",
  "Financial Report": "Focuses on revenue, cost structure, ROI, and cash-efficiency indicators for the active farm.",
  "Crop Production Report": "Highlights yield performance, crop mix contribution, and output benchmarking against local averages.",
  "Weather Impact Report": "Explains how climate variability may have influenced productivity, risk, and timing decisions.",
  "Pest & Disease Report": "Captures crop-health-related operational pressure and likely protection-cost implications.",
  "Irrigation Report": "Reviews water efficiency, irrigation-linked performance, and likely scheduling impact on yields.",
  "Market Intelligence Report": "Connects farm performance with market opportunity, price direction, and selling readiness.",
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

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

function getTrendLabel(value) {
  if (value >= 6) return "Increasing";
  if (value <= -4) return "Declining";
  return "Stable";
}

function getTrendDelta(dateRange) {
  if (dateRange === "30D") return 4.8;
  if (dateRange === "90D") return 2.1;
  if (dateRange === "12M") return -1.6;
  return 3.4;
}

function buildAnalyticsData({ farm, cropType, dateRange, reportTemplate, chartFilter }) {
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

  const waterEfficiency = clamp(Math.round(waterUseScore), 48, 96);
  const carbonScore = clamp(Math.round(100 - carbonFootprint * 10), 38, 91);
  const soilSustainability = clamp(Math.round(62 + (seed % 16) + (factor - 1) * 18), 44, 94);
  const inputEfficiency = clamp(Math.round(60 + roi / 2.8 - (seed % 9)), 36, 95);

  const mainCrops = cropType === "All"
    ? ["Maize", "Beans", "Soybeans"]
    : [cropType, farm?.primaryCrop || "Beans", "Beans"].filter((value, index, array) => array.indexOf(value) === index);
  const cropWeights = mainCrops.map((_, index) => (index === 0 ? 0.48 : index === 1 ? 0.31 : 0.21));
  const revenueBreakdown = mainCrops.map((crop, index) => {
    const cropRevenue = Math.round(revenue * cropWeights[index]);
    return {
      crop,
      revenue: cropRevenue,
      contribution: Math.round((cropRevenue / Math.max(revenue, 1)) * 100),
    };
  });

  const districtAverage = Number((yieldTons * (0.95 + (seed % 5) / 100)).toFixed(1));
  const previousSeasonYield = Number((yieldTons * (0.92 + (seed % 6) / 100)).toFixed(1));
  const marketPressure = clamp(Math.round(68 + (seed % 18)), 54, 94);
  const costReductionOpportunity = Math.max(4, Math.round((costs / Math.max(revenue, 1)) * 22));
  const riskLevel = waterEfficiency < 64 || roi < 18 ? "Medium" : "Low";
  const confidence = clamp(Math.round(76 + (seed % 14)), 74, 95);
  const trendDelta = getTrendDelta(dateRange);

  const filterLabels = {
    Monthly: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    Quarterly: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"],
    Seasonal: ["S1", "S2", "S3", "S4", "S5", "S6"],
    Annual: ["2019", "2020", "2021", "2022", "2023", "2024"],
  };

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
    reportTemplateLabel: reportTemplate,
    waterEfficiency,
    carbonScore,
    soilSustainability,
    inputEfficiency,
    revenueBreakdown,
    districtAverage,
    previousSeasonYield,
    marketPressure,
    costReductionOpportunity,
    riskLevel,
    confidence,
    trendDelta,
    chartLabels: filterLabels[chartFilter] || filterLabels.Seasonal,
  };
}

function AdminAnalyticsView() {
  const [selectedMethodology, setSelectedMethodology] = useState(
    methodologyCards.find((item) => item.active)?.title || methodologyCards[0].title
  );
  const [exportSelection, setExportSelection] = useState(exportChecks);

  const exportReportBundle = (format) => {
    const payload = {
      generatedAt: new Date().toISOString(),
      methodology: selectedMethodology,
      includedDataPoints: exportSelection.filter((item) => item.checked).map((item) => item.label),
      metrics: statCards,
    };

    if (format === "json") {
      downloadJsonFile("system-reports-export.json", payload);
      return;
    }

    if (format === "excel") {
      downloadCsvFile("system-reports-export.csv", [
        ["Metric", "Value", "Note"],
        ...statCards.map((card) => [card.title, card.value, card.note]),
      ]);
      return;
    }

    downloadTextFile(
      "system-reports-export.txt",
      `System-Wide Reports & Export\nGenerated: ${payload.generatedAt}\nMethodology: ${selectedMethodology}\n\nIncluded:\n- ${payload.includedDataPoints.join("\n- ")}`
    );
  };

  return (
    <section className="management-page prototype-admin-reports-page">
      <div className="prototype-admin-reports-main">
        <div className="page-title-block prototype-admin-reports-title">
          <h1>System-Wide Reports &amp; Export</h1>
          <p>Aggregated platform intelligence and government compliance reporting tools.</p>
        </div>

        <div className="prototype-admin-reports-actions">
          <button
            type="button"
            className="prototype-admin-secondary-button"
            onClick={() => downloadJsonFile("system-report-history.json", statCards)}
          >
            <Clock3 size={15} />
            <span>View History</span>
          </button>
          <button
            type="button"
            className="prototype-admin-primary-button"
            onClick={() =>
              downloadTextFile(
                "ai-insight-summary.txt",
                `AI Insight Summary\n\nTop adoption rate: ${statCards[1].value}\nAdvisory accuracy: ${statCards[3].value}\nActive regions: ${statCards[2].value}`
              )
            }
          >
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
                      className={selectedMethodology === item.title ? "prototype-admin-methodology-card active" : "prototype-admin-methodology-card"}
                      onClick={() => setSelectedMethodology(item.title)}
                    >
                      <strong>{item.title}</strong>
                      <p>{item.body}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="prototype-admin-generator-footer">
                <span>Compliant with ISO 31030:2021 Reporting Standards</span>
                <button
                  type="button"
                  className="prototype-admin-dark-button"
                  onClick={() =>
                    downloadTextFile(
                      "government-report-preview.txt",
                      `Government Report Preview\n\nMethodology: ${selectedMethodology}\nMetrics:\n- ${statCards.map((card) => `${card.title}: ${card.value} (${card.note})`).join("\n- ")}`
                    )
                  }
                >
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
                {exportSelection.map((item) => (
                  <label key={item.label} className="prototype-admin-check-row">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() =>
                        setExportSelection((current) =>
                          current.map((entry) =>
                            entry.label === item.label ? { ...entry, checked: !entry.checked } : entry
                          )
                        )
                      }
                    />
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
                    <button
                      key={format.title}
                      type="button"
                      className="prototype-admin-export-format"
                      onClick={() => exportReportBundle(format.tone === "red" ? "pdf" : format.tone === "green" ? "excel" : "json")}
                    >
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
  const [reportTemplate, setReportTemplate] = useState(stored.reportTemplate || "Operations Summary");
  const [chartFilter, setChartFilter] = useState(stored.chartFilter || "Seasonal");
  const [shareReady, setShareReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    saveStoredState({ dateRange, cropType, activityFilter, reportTemplate, chartFilter });
  }, [activityFilter, chartFilter, cropType, dateRange, reportTemplate]);

  useEffect(() => {
    setIsLoading(true);
    const timeoutId = window.setTimeout(() => setIsLoading(false), 260);
    return () => window.clearTimeout(timeoutId);
  }, [activityFilter, chartFilter, cropType, dateRange, reportTemplate, selectedFarmId]);

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
    () => buildAnalyticsData({ farm: selectedFarm, cropType, dateRange, reportTemplate, chartFilter }),
    [chartFilter, cropType, dateRange, reportTemplate, selectedFarm]
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
      note: `${Math.min(99, analytics.confidence)}% forecast confidence`,
      tone: "green",
      icon: Sprout,
    },
  ];

  const maxYield = Math.max(...analytics.actualSeries, ...analytics.targetSeries);
  const maxRevenue = Math.max(...analytics.revenueSeries.map((item) => item.revenue));
  const maxCosts = Math.max(...analytics.revenueSeries.map((item) => item.costs));
  const trendLabel = getTrendLabel(analytics.trendDelta);
  const filteredRows =
    activityFilter === "All"
      ? analytics.reportRows
      : analytics.reportRows.filter((row) =>
          activityFilter === "Verified" ? row.status === "Verified" : row.status !== "Verified"
        );
  const activeTemplateDescription =
    reportTemplateDescriptions[reportTemplate] || "Template-specific reporting view for the selected farm.";

  const exportFarmerAnalytics = (format) => {
    if (format === "excel") {
      downloadCsvFile("farm-analytics.csv", [
        ["Period", "Yield", "Revenue", "Score", "Status"],
        ...filteredRows.map((row) => [row.period, row.yield, row.revenue, row.score, row.status]),
      ]);
      return;
    }

    if (format === "json") {
      downloadJsonFile("farm-analytics.json", analytics);
      return;
    }

    downloadTextFile(
      `${format === "report" ? "farm-report" : "farm-analytics-share"}.txt`,
      `Farm Analytics\nFarm: ${selectedFarm.name}\nTemplate: ${analytics.reportTemplateLabel}\nMode: ${DEMO_MODE ? "Demo Analytics" : "Live Analytics"}\nYield: ${analytics.yieldTons} t\nRevenue: ${formatRwf(analytics.revenue)}\nCosts: ${formatRwf(analytics.costs)}\nROI: ${analytics.roi}%`
    );
  };

  const aiInsights = [
    {
      label: "Key Finding",
      body: `${selectedFarm.primaryCrop || "Primary crop"} performance is ${analytics.yieldTons >= analytics.regionalYield ? "above" : "slightly below"} the regional average for this reporting window.`,
      icon: Sparkles,
    },
    {
      label: "Yield Improvement",
      body: `${Math.max(3, Math.round((analytics.yieldTons / Math.max(analytics.previousSeasonYield, 1) - 1) * 100))}% improvement opportunity is possible through tighter irrigation and nutrient timing.`,
      icon: TrendingUp,
    },
    {
      label: "Cost Reduction",
      body: `Input optimization can reduce operating pressure by about ${analytics.costReductionOpportunity}% if labor and fertilizer timing are synchronized.`,
      icon: Wallet,
    },
    {
      label: "Risk Observation",
      body: `${analytics.riskLevel} operational risk is driven mainly by ${analytics.waterEfficiency < 64 ? "water efficiency" : "seasonal cost pressure"} in this cycle.`,
      icon: AlertTriangle,
    },
  ];

  const sustainabilityRows = [
    { label: "Water Efficiency", value: `${analytics.waterEfficiency}%`, percent: analytics.waterEfficiency, icon: Droplets },
    { label: "Carbon Footprint", value: `${analytics.carbonFootprint} tCO2e`, percent: analytics.carbonScore, icon: Leaf },
    { label: "Soil Sustainability", value: `${analytics.soilSustainability}%`, percent: analytics.soilSustainability, icon: Sprout },
    { label: "Input Efficiency", value: `${analytics.inputEfficiency}%`, percent: analytics.inputEfficiency, icon: Activity },
  ];

  const benchmarkRows = [
    {
      label: "Farm vs Regional Average",
      farm: `${analytics.yieldTons.toLocaleString()} t`,
      baseline: `${analytics.regionalYield.toLocaleString()} t`,
      trend: analytics.yieldTons >= analytics.regionalYield ? "Increasing" : "Stable",
    },
    {
      label: "Farm vs District Average",
      farm: `${analytics.yieldTons.toLocaleString()} t`,
      baseline: `${analytics.districtAverage.toLocaleString()} t`,
      trend: analytics.yieldTons >= analytics.districtAverage ? "Increasing" : "Stable",
    },
    {
      label: "Farm vs Previous Season",
      farm: `${analytics.yieldTons.toLocaleString()} t`,
      baseline: `${analytics.previousSeasonYield.toLocaleString()} t`,
      trend: analytics.yieldTons >= analytics.previousSeasonYield ? "Increasing" : "Declining",
    },
  ];

  if (isLoading) {
    return (
      <section className="management-page prototype-farm-analytics-page">
        <div className="irrigation-state-banner">Loading demo analytics...</div>
      </section>
    );
  }

  return (
    <section className="management-page prototype-farm-analytics-page">
      <div className="page-title-block prototype-farm-analytics-title">
        <h1>Farm Analytics &amp; Yield Reports</h1>
        <p>AI-assisted insights for academic-standard crop performance and financial planning.</p>
      </div>

      <div className="regional-source-row">
        <span className="regional-source-badge demo">Demo Analytics</span>
        <span className="regional-source-badge local">Local Data</span>
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
            {reportTemplates.map((template) => (
              <option key={template} value={template}>
                {template}
              </option>
            ))}
          </select>
        </label>
        <label className="prototype-farm-analytics-field">
          <span>Chart filter</span>
          <select value={chartFilter} onChange={(event) => setChartFilter(event.target.value)}>
            {chartFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="prototype-farm-analytics-actions">
        <button
          type="button"
          className="prototype-farm-analytics-secondary"
          onClick={() => exportFarmerAnalytics("excel")}
        >
          <FileSpreadsheet size={15} />
          <span>Excel</span>
        </button>
        <button
          type="button"
          className="prototype-farm-analytics-primary"
          onClick={() => exportFarmerAnalytics("report")}
        >
          <FileText size={15} />
          <span>{analytics.reportTemplateLabel}</span>
        </button>
        <button
          type="button"
          className="prototype-farm-analytics-secondary"
          onClick={() => exportFarmerAnalytics("pdf")}
        >
          <Download size={15} />
          <span>PDF</span>
        </button>
        <button
          type="button"
          className="prototype-farm-analytics-secondary"
          onClick={async () => {
            const shareUrl = `${window.location.origin}/analytics?farm=${selectedFarm.id}`;
            const copied = await copyText(shareUrl);
            setShareReady(copied || !shareReady);
          }}
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
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h2>AI Performance Insights</h2>
              <p>Confidence score: {analytics.confidence}%</p>
            </div>
            <div className={`prototype-farm-analytics-compare-badge ${trendLabel.toLowerCase()}`}>
              {trendLabel}
            </div>
          </div>
          <div className="analytics-ai-insights-list">
            {aiInsights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="analytics-ai-insight-row">
                  <div className="analytics-ai-insight-icon">
                    <Icon size={16} />
                  </div>
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h2>Profitability Explanation</h2>
              <p>ROI = (Revenue - Cost) / Cost × 100</p>
            </div>
            {trendLabel === "Increasing" ? <TrendingUp size={18} color="#1fa060" /> : trendLabel === "Declining" ? <TrendingDown size={18} color="#d64545" /> : <BarChart3 size={18} color="#4a6fa5" />}
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Revenue</span>
            <strong>{formatRwf(analytics.revenue)}</strong>
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Cost</span>
            <strong>{formatRwf(analytics.costs)}</strong>
          </div>
          <div className="prototype-farm-analytics-compare-row">
            <span>Profit</span>
            <strong>{formatRwf(analytics.profit)}</strong>
          </div>
          <div className="prototype-farm-analytics-compare-badge">
            {analytics.roi}% ROI · {trendLabel}
          </div>
        </article>
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
          <div className="analytics-sustainability-list">
            {sustainabilityRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="analytics-sustainability-row">
                  <div className="analytics-sustainability-head">
                    <span><Icon size={14} /> {row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                  <div className="irrigation-resource-track">
                    <div className="irrigation-resource-fill" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>

      <div className="prototype-farm-analytics-summary-grid">
        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <h3>Revenue Breakdown by Crop</h3>
          <div className="analytics-revenue-breakdown">
            {analytics.revenueBreakdown.map((row) => (
              <div key={row.crop} className="analytics-revenue-row">
                <div>
                  <strong>{row.crop}</strong>
                  <span>{formatRwf(row.revenue)}</span>
                </div>
                <small>{row.contribution}% contribution</small>
              </div>
            ))}
          </div>
        </article>

        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <h3>Farm Benchmarking</h3>
          <div className="analytics-benchmark-list">
            {benchmarkRows.map((row) => (
              <div key={row.label} className="analytics-benchmark-row">
                <div>
                  <strong>{row.label}</strong>
                  <span>{row.farm} vs {row.baseline}</span>
                </div>
                <small className={row.trend.toLowerCase()}>{row.trend}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="prototype-farm-analytics-summary-grid">
        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h3>Active Report Template</h3>
              <p>{reportTemplate}</p>
            </div>
            <div className="prototype-farm-analytics-compare-badge">Demo Analytics</div>
          </div>
          <p className="analytics-template-description">{activeTemplateDescription}</p>
          <div className="analytics-template-actions">
            <button
              type="button"
              className="prototype-farm-analytics-secondary analytics-template-button"
              onClick={() => exportFarmerAnalytics("report")}
            >
              <FileText size={15} />
              <span>Generate Template Report</span>
            </button>
            <button
              type="button"
              className="prototype-farm-analytics-secondary analytics-template-button"
              onClick={() => exportFarmerAnalytics("json")}
            >
              <FileJson size={15} />
              <span>Export Structured Data</span>
            </button>
          </div>
        </article>

        <article className="prototype-panel prototype-farm-analytics-summary-card">
          <div className="prototype-farm-analytics-card-head">
            <div>
              <h3>Trend Indicators</h3>
              <p>Academic reporting summary for the selected view</p>
            </div>
            <div className={`prototype-farm-analytics-compare-badge ${trendLabel.toLowerCase()}`}>
              {trendLabel}
            </div>
          </div>
          <div className="analytics-benchmark-list">
            <div className="analytics-benchmark-row">
              <div>
                <strong>Yield Direction</strong>
                <span>{analytics.trendDelta >= 0 ? `+${analytics.trendDelta}% movement` : `${analytics.trendDelta}% movement`}</span>
              </div>
              <small className={trendLabel.toLowerCase()}>{trendLabel}</small>
            </div>
            <div className="analytics-benchmark-row">
              <div>
                <strong>Market Pressure</strong>
                <span>{analytics.marketPressure}% opportunity strength</span>
              </div>
              <small className={analytics.marketPressure >= 75 ? "increasing" : "stable"}>
                {analytics.marketPressure >= 75 ? "Increasing" : "Stable"}
              </small>
            </div>
            <div className="analytics-benchmark-row">
              <div>
                <strong>Operational Risk</strong>
                <span>{analytics.riskLevel} risk based on current demo calculations</span>
              </div>
              <small className={analytics.riskLevel === "Low" ? "increasing" : "declining"}>{analytics.riskLevel}</small>
            </div>
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
          <div className="analytics-chart-filter-label">{chartFilter} trend view</div>
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
              {analytics.chartLabels.map((label) => (
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
          <div className="analytics-chart-filter-label">{chartFilter} finance view</div>
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
          <button
            type="button"
            className="prototype-farm-report-link"
            onClick={() => downloadJsonFile("farm-report-archive.json", filteredRows)}
          >
            View Archive →
          </button>
        </div>

        {filteredRows.length ? (
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
                  <button
                    type="button"
                    className="prototype-farm-report-icon-button"
                    onClick={() => downloadTextFile(`${row.period.replace(/\s+/g, "-").toLowerCase()}-report.txt`, JSON.stringify(row, null, 2))}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    type="button"
                    className="prototype-farm-report-icon-button"
                    onClick={() => downloadJsonFile(`${row.period.replace(/\s+/g, "-").toLowerCase()}-report.json`, row)}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="prototype-empty-state-card">
            <strong>No reports available for this filter yet.</strong>
            <p>Try switching the activity filter or generate a different report template to populate this analytics view.</p>
          </div>
        )}
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
