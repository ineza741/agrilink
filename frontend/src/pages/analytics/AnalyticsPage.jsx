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
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import IconActionButton from "../../components/common/IconActionButton";
import { useAuth } from "../../context/AuthContext";
import { useFarmerData } from "../../context/FarmerDataContext";
import { isBackendSessionActive, phase1BackendService } from "../../services/phase1Backend";
import { copyText, downloadCsvFile, downloadJsonFile, downloadTextFile } from "../../utils/actions";
import { PageShell } from "../../components/common/PageShell";
import { PageHeader } from "../../components/common/PageHeader";
import { AppCard } from "../../components/common/AppCard";
import { SectionCard } from "../../components/common/SectionCard";
import { MetricCard } from "../../components/common/MetricCard";
import { ActionButton } from "../../components/common/ActionButton";
import { StatusBadge } from "../../components/common/StatusBadge";

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
const ADMIN_REPORTS_STORAGE_KEY = "agri-feed-admin-reports-module-v2";
const DEMO_MODE = true;

const reportTemplates = [
  "Operations Summary", "Financial Report", "Crop Production Report", "Weather Impact Report",
  "Pest & Disease Report", "Irrigation Report", "Market Intelligence Report",
];

const adminReportTemplates = [
  "Government Report", "NGO Impact Report", "Farmer Performance Report", "Research Dataset",
  "Market Intelligence Report", "Pest Outbreak Analysis",
];

const chartFilters = ["Monthly", "Quarterly", "Seasonal", "Annual"];
const complianceStandards = ["MINAGRI", "RAB", "FAO", "NGO"];

const adminSummaryCards = [
  { title: "National Yield Coverage", value: "184,200 t", note: "Demo aggregated output", icon: Leaf },
  { title: "Farmer Adoption", value: "4,860", note: "Active demo farmers", icon: UsersRound },
  { title: "District Coverage", value: "18", note: "Across Rwanda demo zones", icon: Map },
  { title: "AI Advisory Accuracy", value: "92.8%", note: "Validated recommendation quality", icon: ShieldCheck },
];

const sustainabilityDashboard = [
  { label: "Sustainability Score", value: 81, note: "National demo sustainability index" },
  { label: "Water Use Efficiency", value: 74, note: "Efficient use across irrigated plots" },
  { label: "Carbon Footprint", value: 63, note: "Lower is better; converted to score" },
  { label: "Climate Resilience Index", value: 78, note: "Ability to adapt to rainfall variability" },
];

const aiRecommendationAnalytics = [
  { label: "Recommendations Issued", value: "12,480" },
  { label: "Accepted", value: "8,965" },
  { label: "Rejected", value: "2,114" },
  { label: "Success Rate", value: "71.8%" },
  { label: "Average Confidence", value: "86.4%" },
];

const comparativeAnalyticsSeed = [
  { label: "Region vs Region", left: "Bugesera: 4.8 t/ha", right: "Musanze: 5.4 t/ha", trend: "Increasing" },
  { label: "Crop vs Crop", left: "Maize ROI: 24%", right: "Beans ROI: 19%", trend: "Stable" },
  { label: "Yield Comparison", left: "District avg: 5.1 t/ha", right: "Platform avg: 5.6 t/ha", trend: "Increasing" },
  { label: "ROI Comparison", left: "Smallholder: 18%", right: "Cooperative: 27%", trend: "Increasing" },
];

const farmerAdoptionSeed = [
  { label: "Registered Farmers", value: "6,420" },
  { label: "Verified Farmers", value: "5,108" },
  { label: "Active Farmers", value: "4,860" },
  { label: "Dormant Farmers", value: "462" },
];

const geographicCoverageSeed = [
  { label: "District Coverage", value: "18 districts", note: "Demo operational footprint" },
  { label: "Sector Coverage", value: "64 sectors", note: "Extension support available" },
  { label: "Farmer Density", value: "357 farmers / district", note: "Average active farmer density" },
];

const pestDiseaseAnalyticsSeed = [
  { label: "Top Pest Risks", value: "Fall Armyworm, Aphids, Late Blight" },
  { label: "Outbreak Frequency", value: "2.6 outbreak events / month" },
  { label: "Treatment Success Rate", value: "77%" },
];

const weatherImpactAnalyticsSeed = [
  { label: "Rainfall vs Yield", value: "Positive correlation in long-rain season", note: "Yield improves above 18 mm weekly rainfall" },
  { label: "Temperature vs Yield", value: "Heat pressure reduces maize productivity", note: "Risk rises above 31°C max temp" },
  { label: "Drought Impact", value: "11% average projected yield loss", note: "Highest in Bugesera dry-window farms" },
];

const reportTemplateDescriptions = {
  "Operations Summary": "Summarizes field productivity, operational efficiency, and recent farm activities for the selected period.",
  "Financial Report": "Focuses on revenue, cost structure, ROI, and cash-efficiency indicators for the active farm.",
  "Crop Production Report": "Highlights yield performance, crop mix contribution, and output benchmarking against local averages.",
  "Weather Impact Report": "Explains how climate variability may have influenced productivity, risk, and timing decisions.",
  "Pest & Disease Report": "Captures crop-health-related operational pressure and likely protection-cost implications.",
  "Irrigation Report": "Reviews water efficiency, irrigation-linked performance, and likely scheduling impact on yields.",
  "Market Intelligence Report": "Connects farm performance with market opportunity, price direction, and selling readiness.",
};

const analyticsIconMap = { Activity, AlertTriangle, BarChart3, Clock3, Droplets, Leaf, Map, ShieldCheck, ShoppingCart, Sparkles, Sprout, TrendingDown, TrendingUp, UsersRound, Wallet };

function resolveAnalyticsIcon(iconName, fallback = BarChart3) { return analyticsIconMap[iconName] || fallback; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function formatRwf(value) { return `RWF ${Math.round(Number(value) || 0).toLocaleString()}`; }

function createDefaultFarm() { return { id: "analytics-default-farm", name: "Primary Performance Plot", region: "Northern Highlands", sizeHectares: 12, primaryCrop: "Maize", cropHistory: [{ crop: "Maize", season: "2024 Long Rain", yield: "24.6 t", challenges: "Moderate water stress" }, { crop: "Beans", season: "2023 Short Rain", yield: "11.2 t", challenges: "Stable season" }], location: { lat: -1.94, lng: 29.87 } }; }
function hashFarm(farm) { return Math.round(Math.abs(Number(farm?.location?.lat || 0)) * 100) + Math.round(Math.abs(Number(farm?.location?.lng || 0)) * 100) + Math.round(Number(farm?.sizeHectares || 0)) * 4; }
function loadStoredState() { try { return JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY) || "{}"); } catch { return {}; } }
function saveStoredState(state) { localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state)); }
function getTrendLabel(value) { if (value >= 6) return "Increasing"; if (value <= -4) return "Declining"; return "Stable"; }
function getTrendDelta(dateRange) { if (dateRange === "30D") return 4.8; if (dateRange === "90D") return 2.1; if (dateRange === "12M") return -1.6; return 3.4; }

function buildAnalyticsData({ farm, cropType, dateRange, reportTemplate, chartFilter }) {
  const seed = hashFarm(farm);
  const cropBase = { All: 1, Maize: 1.14, Wheat: 1.02, Soybeans: 0.94, Rice: 1.08, Beans: 0.88 };
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
  const actualSeries = Array.from({ length: 6 }, (_, index) => Math.round((yieldTons / 6) * (0.82 + index * 0.06 + ((seed + index) % 4) * 0.02)));
  const targetSeries = actualSeries.map((value, index) => Math.round(value * (1.06 + (index % 2) * 0.03)));
  const revenueSeries = ["Q1", "Q2", "Q3", "Q4"].map((label, index) => ({ label, revenue: Math.round(revenue * (0.17 + index * 0.08)), costs: Math.round(costs * (0.22 + index * 0.05)) }));
  const reportRows = [{ period: "June 2024", short: "JUN", yield: `${(yieldTons / 5.7).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.2)), score: `${Math.min(94, sustainability + 6)}%`, status: "Verified" }, { period: "May 2024", short: "MAY", yield: `${(yieldTons / 6.2).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.6)), score: `${Math.min(91, sustainability + 2)}%`, status: "Verified" }, { period: "April 2024", short: "APR", yield: `${(yieldTons / 6).toFixed(1)} Tons`, revenue: formatRwf(Math.round(revenue / 5.4)), score: `${Math.max(74, sustainability - 3)}%`, status: "Pending Review" }];
  const waterEfficiency = clamp(Math.round(waterUseScore), 48, 96);
  const carbonScore = clamp(Math.round(100 - carbonFootprint * 10), 38, 91);
  const soilSustainability = clamp(Math.round(62 + (seed % 16) + (factor - 1) * 18), 44, 94);
  const inputEfficiency = clamp(Math.round(60 + roi / 2.8 - (seed % 9)), 36, 95);
  const mainCrops = cropType === "All" ? ["Maize", "Beans", "Soybeans"] : [cropType, farm?.primaryCrop || "Beans", "Beans"].filter((value, index, array) => array.indexOf(value) === index);
  const cropWeights = mainCrops.map((_, index) => (index === 0 ? 0.48 : index === 1 ? 0.31 : 0.21));
  const revenueBreakdown = mainCrops.map((crop, index) => { const cropRevenue = Math.round(revenue * cropWeights[index]); return { crop, revenue: cropRevenue, contribution: Math.round((cropRevenue / Math.max(revenue, 1)) * 100) }; });
  const districtAverage = Number((yieldTons * (0.95 + (seed % 5) / 100)).toFixed(1));
  const previousSeasonYield = Number((yieldTons * (0.92 + (seed % 6) / 100)).toFixed(1));
  const marketPressure = clamp(Math.round(68 + (seed % 18)), 54, 94);
  const costReductionOpportunity = Math.max(4, Math.round((costs / Math.max(revenue, 1)) * 22));
  const riskLevel = waterEfficiency < 64 || roi < 18 ? "Medium" : "Low";
  const confidence = clamp(Math.round(76 + (seed % 14)), 74, 95);
  const trendDelta = getTrendDelta(dateRange);
  const filterLabels = { Monthly: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"], Quarterly: ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"], Seasonal: ["S1", "S2", "S3", "S4", "S5", "S6"], Annual: ["2019", "2020", "2021", "2022", "2023", "2024"] };
  return { yieldTons, revenue, costs, profit, roi, regionalYield, sustainability, waterUseScore, carbonFootprint, actualSeries, targetSeries, revenueSeries, reportRows, reportTemplateLabel: reportTemplate, waterEfficiency, carbonScore, soilSustainability, inputEfficiency, revenueBreakdown, districtAverage, previousSeasonYield, marketPressure, costReductionOpportunity, riskLevel, confidence, trendDelta, chartLabels: filterLabels[chartFilter] || filterLabels.Seasonal };
}

function AdminAnalyticsView() {
  const { user } = useAuth();
  const stored = useMemo(() => { try { return JSON.parse(localStorage.getItem(ADMIN_REPORTS_STORAGE_KEY) || "{}"); } catch { return {}; } }, []);
  const [selectedMethodology, setSelectedMethodology] = useState(methodologyCards.find((item) => item.active)?.title || methodologyCards[0].title);
  const [exportSelection, setExportSelection] = useState(exportChecks);
  const [selectedTemplate, setSelectedTemplate] = useState(stored.selectedTemplate || adminReportTemplates[0]);
  const [selectedCompliance, setSelectedCompliance] = useState(stored.selectedCompliance || "MINAGRI");
  const [selectedComparison, setSelectedComparison] = useState(stored.selectedComparison || "Region vs Region");
  const [selectedExportFormat, setSelectedExportFormat] = useState(stored.selectedExportFormat || "CSV");
  const [recentExports, setRecentExports] = useState(stored.recentExports || [{ name: "national_yield_q3.pdf", type: "PDF", time: "2m ago" }, { name: "ngo-impact-rubavu.csv", type: "CSV", time: "18m ago" }]);
  const [backendDashboard, setBackendDashboard] = useState(null);
  const [backendHistory, setBackendHistory] = useState([]);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => { localStorage.setItem(ADMIN_REPORTS_STORAGE_KEY, JSON.stringify({ selectedTemplate, selectedCompliance, selectedComparison, selectedExportFormat, recentExports })); }, [recentExports, selectedCompliance, selectedComparison, selectedExportFormat, selectedTemplate]);

  useEffect(() => {
    let isMounted = true;
    async function loadBackendAnalytics() {
      if (!isBackendSessionActive() || !["admin", "extensionofficer"].includes(user?.role)) return;
      setIsBackendLoading(true);
      try {
        const [dashboard, history] = await Promise.all([phase1BackendService.analytics.adminDashboard({ reportTemplate: selectedTemplate, methodology: selectedMethodology, selectedComparison, selectedCompliance, selectedExportFormat }), phase1BackendService.analytics.adminHistory()]);
        if (!isMounted) return;
        setBackendDashboard(dashboard || null);
        setBackendHistory(Array.isArray(history) ? history : []);
        if (Array.isArray(history) && history.length) setRecentExports(history.slice(0, 6).map((entry) => ({ name: entry.fileName || `${entry.reportTemplate}.${entry.exportFormat}`, type: String(entry.exportFormat || "").toUpperCase(), time: entry.timeLabel || "Just now" })));
      } catch { if (!isMounted) return; setBackendDashboard(null); setBackendHistory([]); } finally { if (isMounted) setIsBackendLoading(false); }
    }
    loadBackendAnalytics(); return () => { isMounted = false; };
  }, [selectedComparison, selectedCompliance, selectedExportFormat, selectedMethodology, selectedTemplate, user?.role]);

  const executiveSummary = useMemo(() => {
    if (backendDashboard?.executiveSummary) return backendDashboard.executiveSummary;
    return `AI Executive Summary: ${selectedTemplate} shows ${adminSummaryCards[1].value} active farmers across ${geographicCoverageSeed[0].value}. Sustainability score is ${sustainabilityDashboard[0].value}/100, AI recommendation success rate is ${aiRecommendationAnalytics[3].value}, and the dominant pest pressure remains ${pestDiseaseAnalyticsSeed[0].value}. Recommended action: strengthen drought-response irrigation planning in Bugesera and scale verified advisory adoption in Musanze and Kicukiro.`;
  }, [backendDashboard, selectedTemplate]);

  const dashboardSummaryCards = backendDashboard?.summaryCards || adminSummaryCards;
  const dashboardSustainability = backendDashboard?.sustainabilityDashboard || sustainabilityDashboard;
  const dashboardAiAnalytics = backendDashboard?.aiRecommendationAnalytics || aiRecommendationAnalytics;
  const dashboardComparative = backendDashboard?.comparativeAnalytics || comparativeAnalyticsSeed;
  const dashboardFarmerAdoption = backendDashboard?.farmerAdoption || farmerAdoptionSeed;
  const dashboardGeographicCoverage = backendDashboard?.geographicCoverage || geographicCoverageSeed;
  const dashboardPestAnalytics = backendDashboard?.pestDiseaseAnalytics || pestDiseaseAnalyticsSeed;
  const dashboardWeatherImpact = backendDashboard?.weatherImpactAnalytics || weatherImpactAnalyticsSeed;
  const dashboardSourceLabels = backendDashboard?.sourceLabels || [isBackendSessionActive() && ["admin", "extensionofficer"].includes(user?.role) ? "Backend Analytics" : "Demo Analytics", "Local Data", backendHistory.length ? "Persisted Export History" : "Export Ready"];
  const recentExportItems = useMemo(() => {
    if (backendHistory.length) return backendHistory.slice(0, 6).map((entry) => ({ name: entry.fileName || `${entry.reportTemplate}.${entry.exportFormat}`, type: String(entry.exportFormat || "").toUpperCase(), time: entry.timeLabel || "Just now", template: entry.reportTemplate || "System Report", compliance: entry.compliance || "N/A", createdAt: entry.dateLabel || "N/A" }));
    if (Array.isArray(backendDashboard?.recentExports) && backendDashboard.recentExports.length) return backendDashboard.recentExports.slice(0, 6).map((entry) => ({ name: entry.name, type: entry.type, time: entry.time, template: selectedTemplate, compliance: selectedCompliance, createdAt: entry.time }));
    return recentExports.slice(0, 6).map((entry) => ({ ...entry, template: selectedTemplate, compliance: selectedCompliance, createdAt: entry.time }));
  }, [backendDashboard?.recentExports, backendHistory, recentExports, selectedCompliance, selectedTemplate]);
  const reportHistoryRows = useMemo(() => {
    if (backendHistory.length) return backendHistory.map((entry) => ({ id: entry.id, fileName: entry.fileName || `${entry.reportTemplate}.${entry.exportFormat}`, template: entry.reportTemplate || "System Report", format: String(entry.exportFormat || "").toUpperCase(), compliance: entry.compliance || "N/A", createdAt: entry.dateLabel || entry.timeLabel || "Just now" }));
    return recentExportItems.map((entry, index) => ({ id: `${entry.name}-${index}`, fileName: entry.name, template: entry.template, format: entry.type, compliance: entry.compliance, createdAt: entry.createdAt }));
  }, [backendHistory, recentExportItems]);

  const exportReportBundle = async (format) => {
    const payload = { generatedAt: new Date().toISOString(), methodology: selectedMethodology, reportTemplate: selectedTemplate, complianceStandard: selectedCompliance, selectedExportFormat: format, includedDataPoints: exportSelection.filter((item) => item.checked).map((item) => item.label), metrics: dashboardSummaryCards, sustainabilityDashboard: dashboardSustainability, aiRecommendationAnalytics: dashboardAiAnalytics, comparativeAnalytics: dashboardComparative, farmerAdoption: dashboardFarmerAdoption, geographicCoverage: dashboardGeographicCoverage, pestDiseaseAnalytics: dashboardPestAnalytics, weatherImpactAnalytics: dashboardWeatherImpact, executiveSummary, demoMode: DEMO_MODE && !backendDashboard };
    if (isBackendSessionActive() && ["admin", "extensionofficer"].includes(user?.role)) { try { const exportRecord = await phase1BackendService.analytics.exportAdmin({ format, reportTemplate: selectedTemplate, methodology: selectedMethodology, selectedComparison, selectedCompliance }); if (exportRecord) { setBackendHistory((current) => [exportRecord, ...current].slice(0, 20)); payload.backendExport = exportRecord; } } catch {} }
    if (format === "json") { downloadJsonFile("system-reports-export.json", payload); return; }
    if (format === "excel") { downloadCsvFile("system-reports-export.csv", [["Metric", "Value", "Note"], ...dashboardSummaryCards.map((card) => [card.title, card.value, card.note])]); return; }
    if (format === "gis") { downloadJsonFile("regional-coverage.geojson", { type: "FeatureCollection", features: [{ type: "Feature", properties: { district: "Kicukiro District", farmerDensity: "420 farmers / district" }, geometry: { type: "Point", coordinates: [30.101, -1.97] } }, { type: "Feature", properties: { district: "Bugesera District", farmerDensity: "335 farmers / district" }, geometry: { type: "Point", coordinates: [30.218, -2.09] } }, { type: "Feature", properties: { district: "Musanze District", farmerDensity: "388 farmers / district" }, geometry: { type: "Point", coordinates: [29.634, -1.501] } }] }); return; }
    downloadTextFile("system-reports-export.txt", `System-Wide Reports & Export\nGenerated: ${payload.generatedAt}\nMethodology: ${selectedMethodology}\nTemplate: ${selectedTemplate}\nCompliance: ${selectedCompliance}\n\nExecutive Summary:\n${executiveSummary}\n\nIncluded:\n- ${payload.includedDataPoints.join("\n- ")}`);
  };

  return (
    <PageShell>
      <PageHeader title="System-Wide Reports & Export" description="Aggregated platform intelligence and government compliance reporting tools.">
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {dashboardSourceLabels.map((label, index) => <StatusBadge key={label} status={index === 0 ? "verified" : index === 1 ? "default" : "pending"}>{label}</StatusBadge>)}
        </div>
      </PageHeader>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <AppCard>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Active Compliance</span>
          <strong style={{ fontSize: "18px", display: "block", marginTop: "4px", color: "var(--text-main)" }}>{selectedCompliance}</strong>
          <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>{backendDashboard ? "Backend-aligned reporting profile" : "Frontend demo reporting profile"}</small>
        </AppCard>
        <AppCard>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Export History</span>
          <strong style={{ fontSize: "18px", display: "block", marginTop: "4px" }}>{reportHistoryRows.length}</strong>
          <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>{backendHistory.length ? "Persisted backend export records" : "Local recent export activity"}</small>
        </AppCard>
        <AppCard>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Last Refresh</span>
          <strong style={{ fontSize: "16px", display: "block", marginTop: "4px", color: "var(--text-main)" }}>{backendDashboard?.generatedAt ? new Date(backendDashboard.generatedAt).toLocaleString("en-GB") : "Demo session"}</strong>
          <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>{isBackendLoading ? "Refreshing backend intelligence..." : "Reporting data ready"}</small>
        </AppCard>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <ActionButton variant="secondary" icon={Clock3} onClick={() => setIsHistoryOpen(true)}>View History</ActionButton>
        <ActionButton variant="primary" icon={Sparkles} onClick={() => downloadTextFile("ai-insight-summary.txt", `AI Insight Summary\n\n${executiveSummary}\n\nAI recommendation acceptance: ${dashboardAiAnalytics[1].value}\nAverage confidence: ${dashboardAiAnalytics[4].value}\nDistrict coverage: ${dashboardGeographicCoverage[0].value}`)}>Generate AI Summary</ActionButton>
      </div>

      <div className="analytics-kpi-grid">
        {dashboardSummaryCards.map((card) => {
          const Icon = typeof card.icon === "string" ? resolveAnalyticsIcon(card.icon, Leaf) : card.icon;
          return (
            <div key={card.title} className="analytics-kpi-card">
              <div className="analytics-kpi-head"><span>{card.title}</span><Icon size={18} /></div>
              <strong className="analytics-kpi-value">{card.value}</strong>
              <span className="analytics-kpi-note green">{card.note}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <AppCard>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>Generate Reports & Data Export</h2>
            </div>
            <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Report Template</span>
                <select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", fontFamily: "var(--font)", fontSize: "14px" }}>
                  {adminReportTemplates.map((template) => (<option key={template} value={template}>{template}</option>))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Compliance Reporting</span>
                <select value={selectedCompliance} onChange={(event) => setSelectedCompliance(event.target.value)} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", fontFamily: "var(--font)", fontSize: "14px" }}>
                  {complianceStandards.map((item) => (<option key={item} value={item}>{item}</option>))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Comparative View</span>
                <select value={selectedComparison} onChange={(event) => setSelectedComparison(event.target.value)} style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", fontFamily: "var(--font)", fontSize: "14px" }}>
                  {dashboardComparative.map((item) => (<option key={item.label} value={item.label}>{item.label}</option>))}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Region Scope</span>
                <select style={{ padding: "10px 12px", border: "1px solid var(--border)", borderRadius: "10px", fontFamily: "var(--font)", fontSize: "14px" }}>
                  <option>All National Regions</option><option>Kigali Coverage</option><option>Eastern Province</option><option>Northern Province</option><option>Southern Province</option><option>Western Province</option>
                </select>
              </label>
            </div>
            <div style={{ padding: "0 24px 24px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Report Type & Methodology</span>
              <div style={{ display: "flex", gap: "10px" }}>
                {methodologyCards.map((item) => (
                  <button key={item.title} type="button" onClick={() => setSelectedMethodology(item.title)}
                    style={{ flex: 1, padding: "14px", borderRadius: "10px", border: `2px solid ${selectedMethodology === item.title ? "var(--primary-green)" : "var(--border)"}`, background: selectedMethodology === item.title ? "var(--light-green)" : "var(--card)", cursor: "pointer", textAlign: "left", fontFamily: "var(--font)" }}>
                    <strong style={{ fontSize: "14px", display: "block", color: "var(--text-main)" }}>{item.title}</strong>
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>{item.body}</p>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{DEMO_MODE ? "Demo Mode · LocalStorage reporting workflow" : "Connected reporting workflow"}</span>
              <ActionButton variant="primary" onClick={() => downloadTextFile("government-report-preview.txt", `${selectedTemplate} Preview\n\nMethodology: ${selectedMethodology}\nCompliance: ${selectedCompliance}\n\nExecutive Summary:\n${executiveSummary}\n\nMetrics:\n- ${dashboardSummaryCards.map((card) => `${card.title}: ${card.value} (${card.note})`).join("\n- ")}`)}>Compile Preview Report</ActionButton>
            </div>
          </AppCard>

          <div className="analytics-grid-2">
            <AppCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div><h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Sustainability Dashboard</h3><p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>National demo sustainability intelligence</p></div>
                <StatusBadge status="default">Demo Scorecard</StatusBadge>
              </div>
              <div className="analytics-sustainability-list">
                {dashboardSustainability.map((item) => (
                  <div key={item.label} className="analytics-sustainability-item">
                    <div className="bar-label"><span>{item.label}</span><strong>{item.value}/100</strong></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width: `${item.value}%` }} /></div>
                    <small style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>{item.note}</small>
                  </div>
                ))}
              </div>
            </AppCard>
            <AppCard>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div><h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>AI Recommendation Analytics</h3><p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>Recommendation quality and adoption performance</p></div>
                <StatusBadge status="default">AI Ops</StatusBadge>
              </div>
              {dashboardAiAnalytics.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: "14px" }}>
                  <div><strong style={{ display: "block", color: "var(--text-main)" }}>{item.label}</strong><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Demo reporting metric</span></div>
                  <strong style={{ color: "var(--primary-green)" }}>{item.value}</strong>
                </div>
              ))}
            </AppCard>
          </div>

          <div className="analytics-grid-2">
            <AppCard>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Comparative Analytics</h3>
              {dashboardComparative.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div><strong style={{ fontSize: "14px" }}>{item.label}</strong><span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>{item.left} vs {item.right}</span></div>
                  <StatusBadge status={item.trend === "Increasing" ? "verified" : "default"}>{item.trend}</StatusBadge>
                </div>
              ))}
            </AppCard>
            <AppCard>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Farmer Adoption Analytics</h3>
              {dashboardFarmerAdoption.map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div><strong style={{ fontSize: "14px" }}>{item.label}</strong><span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>Platform adoption metric</span></div>
                  <strong style={{ color: "var(--text-main)" }}>{item.value}</strong>
                </div>
              ))}
            </AppCard>
          </div>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <AppCard className="analytics-chart-card">
            <div style={{ padding: "20px 24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Export Configuration</h3>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Include Data Points</span>
                {exportSelection.map((item) => (
                  <label key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", fontSize: "13px", cursor: "pointer" }}>
                    <input type="checkbox" checked={item.checked} onChange={() => setExportSelection((current) => current.map((entry) => entry.label === item.label ? { ...entry, checked: !entry.checked } : entry))} />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>Export Format</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[...exportFormats, { title: "Export to CSV", subtitle: "Tabular reporting package", icon: FileSpreadsheet, tone: "green", mode: "excel" }, { title: "GIS Export", subtitle: "Geographic coverage dataset", icon: Map, tone: "blue", mode: "gis" }, { title: "Power BI Pack", subtitle: "Dashboard integration instructions", icon: BarChart3, tone: "blue", mode: "powerbi" }, { title: "Research Dataset", subtitle: "Academic structured export", icon: FileJson, tone: "blue", mode: "dataset" }].map((fmt) => {
                  const Icon = fmt.icon;
                  return (
                    <button key={fmt.title} type="button" onClick={() => exportReportBundle(fmt.mode || (fmt.tone === "red" ? "pdf" : fmt.tone === "green" ? "excel" : "json"))}
                      style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", border: "1px solid var(--border)", borderRadius: "10px", background: "var(--card)", cursor: "pointer", fontFamily: "var(--font)", textAlign: "left", transition: "all 0.15s" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-green)" }}><Icon size={16} /></div>
                      <div style={{ flex: 1 }}><strong style={{ fontSize: "13px", display: "block", color: "var(--text-main)" }}>{fmt.title}</strong><small style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmt.subtitle}</small></div>
                      <Download size={14} style={{ color: "var(--text-muted)" }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </AppCard>

          <AppCard style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 12px", color: "var(--text-main)" }}>Recent Export</h3>
            {recentExportItems.map((item) => (
              <div key={`${item.name}-${item.time}`} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                <strong style={{ color: "var(--text-main)" }}>{item.name}</strong>
                <small style={{ color: "var(--text-muted)" }}>{item.type} · {item.time}</small>
              </div>
            ))}
          </AppCard>
        </aside>
      </div>

      {isHistoryOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setIsHistoryOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", borderRadius: "var(--radius-xl)", width: "90%", maxWidth: "800px", maxHeight: "80vh", overflow: "auto", padding: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div><h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>Reports & Export History</h2><p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>{backendHistory.length ? "Backend-persisted analytics exports" : "Recent report exports captured in the current demo session."}</p></div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <ActionButton variant="secondary" icon={Download} onClick={() => downloadJsonFile("system-report-history.json", backendHistory.length ? backendHistory : recentExportItems)}>Export History</ActionButton>
                <button onClick={() => setIsHistoryOpen(false)} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} /></button>
              </div>
            </div>
            {reportHistoryRows.length ? (
              <div className="analytics-table-card">
                <div className="analytics-table-head"><span>File</span><span>Template</span><span>Format</span><span>Compliance</span><span>Created</span></div>
                {reportHistoryRows.map((entry) => (
                  <div key={entry.id} className="analytics-table-row">
                    <strong>{entry.fileName}</strong><span>{entry.template}</span><span>{entry.format}</span><span>{entry.compliance}</span><span>{entry.createdAt}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}><strong>No export history yet.</strong><p style={{ margin: "4px 0 0", fontSize: "13px" }}>Generate a report bundle to start building the reporting audit trail.</p></div>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}

function FarmerAnalyticsView() {
  const { user } = useAuth();
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
  const [backendDashboard, setBackendDashboard] = useState(null);
  const [backendHistory, setBackendHistory] = useState([]);
  const [backendError, setBackendError] = useState("");

  useEffect(() => { saveStoredState({ dateRange, cropType, activityFilter, reportTemplate, chartFilter }); }, [activityFilter, chartFilter, cropType, dateRange, reportTemplate]);
  useEffect(() => { setIsLoading(true); const timeoutId = window.setTimeout(() => setIsLoading(false), 260); return () => window.clearTimeout(timeoutId); }, [activityFilter, chartFilter, cropType, dateRange, reportTemplate, selectedFarmId]);

  useEffect(() => {
    let isMounted = true;
    async function loadBackendAnalytics() {
      if (!selectedFarmId || !isBackendSessionActive() || user?.role !== "farmer") return;
      setIsLoading(true); setBackendError("");
      try { const [dashboard, history] = await Promise.all([phase1BackendService.analytics.farmDashboard(selectedFarmId, { dateRange, cropType, activityFilter, reportTemplate, chartFilter }), phase1BackendService.analytics.farmHistory(selectedFarmId)]); if (!isMounted) return; setBackendDashboard(dashboard || null); setBackendHistory(Array.isArray(history) ? history : []); } catch { if (!isMounted) return; setBackendDashboard(null); setBackendHistory([]); setBackendError("Demo analytics mode active."); } finally { if (isMounted) setIsLoading(false); }
    }
    loadBackendAnalytics(); return () => { isMounted = false; };
  }, [activityFilter, chartFilter, cropType, dateRange, reportTemplate, selectedFarmId, user?.role]);

  useEffect(() => { if (!farms.some((farm) => farm.id === selectedFarmId)) setSelectedFarmId(farms[0]?.id || "analytics-default-farm"); }, [farms, selectedFarmId]);
  const selectedFarm = useMemo(() => farms.find((farm) => farm.id === selectedFarmId) || farms[0], [farms, selectedFarmId]);
  const analytics = useMemo(() => backendDashboard?.analytics || buildAnalyticsData({ farm: selectedFarm, cropType, dateRange, reportTemplate, chartFilter }), [backendDashboard, chartFilter, cropType, dateRange, reportTemplate, selectedFarm]);

  const farmerMetricCards = [
    { title: "Profit Estimation", value: formatRwf(analytics.profit), note: `${analytics.profit >= 0 ? "+" : ""}${Math.max(1.8, analytics.roi / 3).toFixed(1)}% vs last cycle`, tone: analytics.profit >= 0 ? "green" : "red", icon: Wallet },
    { title: "ROI %", value: `${analytics.roi}%`, note: `${analytics.roi >= 0 ? "+" : ""}${Math.max(1.1, analytics.roi / 6).toFixed(1)}% above target`, tone: analytics.roi >= 0 ? "green" : "red", icon: BarChart3 },
    { title: "Operating Costs", value: formatRwf(analytics.costs), note: `${Math.max(1.4, analytics.waterUseScore / 18).toFixed(1)}% controlled spend`, tone: "red", icon: ShoppingCart },
    { title: "Estimated Yield", value: `${analytics.yieldTons.toLocaleString()} t`, note: `${Math.min(99, analytics.confidence)}% forecast confidence`, tone: "green", icon: Sprout },
  ];

  const maxYield = Math.max(...analytics.actualSeries, ...analytics.targetSeries);
  const maxRevenue = Math.max(...analytics.revenueSeries.map((item) => item.revenue));
  const maxCosts = Math.max(...analytics.revenueSeries.map((item) => item.costs));
  const trendLabel = getTrendLabel(analytics.trendDelta);
  const filteredRows = activityFilter === "All" ? analytics.reportRows : analytics.reportRows.filter((row) => activityFilter === "Verified" ? row.status === "Verified" : row.status !== "Verified");
  const activeTemplateDescription = backendDashboard?.activeTemplateDescription || reportTemplateDescriptions[reportTemplate] || "Template-specific reporting view for the selected farm.";

  const exportFarmerAnalytics = async (format) => {
    if (isBackendSessionActive() && user?.role === "farmer" && selectedFarm?.id) { try { const exportRecord = await phase1BackendService.analytics.exportFarm(selectedFarm.id, { format, dateRange, cropType, activityFilter, reportTemplate, chartFilter }); if (exportRecord) setBackendHistory((current) => [exportRecord, ...current].slice(0, 20)); } catch {} }
    if (format === "excel") { downloadCsvFile("farm-analytics.csv", [["Period", "Yield", "Revenue", "Score", "Status"], ...filteredRows.map((row) => [row.period, row.yield, row.revenue, row.score, row.status])]); return; }
    if (format === "json") { downloadJsonFile("farm-analytics.json", analytics); return; }
    downloadTextFile(`${format === "report" ? "farm-report" : "farm-analytics-share"}.txt`, `Farm Analytics\nFarm: ${selectedFarm.name}\nTemplate: ${analytics.reportTemplateLabel}\nMode: ${backendDashboard ? "Backend Analytics" : DEMO_MODE ? "Demo Analytics" : "Live Analytics"}\nYield: ${analytics.yieldTons} t\nRevenue: ${formatRwf(analytics.revenue)}\nCosts: ${formatRwf(analytics.costs)}\nROI: ${analytics.roi}%`);
  };

  const aiInsights = backendDashboard?.aiInsights?.map((item) => ({ ...item, icon: resolveAnalyticsIcon(item.icon, Sparkles) })) || [
    { label: "Key Finding", body: `${selectedFarm.primaryCrop || "Primary crop"} performance is ${analytics.yieldTons >= analytics.regionalYield ? "above" : "slightly below"} the regional average for this reporting window.`, icon: Sparkles },
    { label: "Yield Improvement", body: `${Math.max(3, Math.round((analytics.yieldTons / Math.max(analytics.previousSeasonYield, 1) - 1) * 100))}% improvement opportunity is possible through tighter irrigation and nutrient timing.`, icon: TrendingUp },
    { label: "Cost Reduction", body: `Input optimization can reduce operating pressure by about ${analytics.costReductionOpportunity}% if labor and fertilizer timing are synchronized.`, icon: Wallet },
    { label: "Risk Observation", body: `${analytics.riskLevel} operational risk is driven mainly by ${analytics.waterEfficiency < 64 ? "water efficiency" : "seasonal cost pressure"} in this cycle.`, icon: AlertTriangle },
  ];

  const sustainabilityRows = backendDashboard?.sustainabilityRows?.map((item) => ({ ...item, icon: resolveAnalyticsIcon(item.icon, Leaf) })) || [
    { label: "Water Efficiency", value: `${analytics.waterEfficiency}%`, percent: analytics.waterEfficiency, icon: Droplets },
    { label: "Carbon Footprint", value: `${analytics.carbonFootprint} tCO2e`, percent: analytics.carbonScore, icon: Leaf },
    { label: "Soil Sustainability", value: `${analytics.soilSustainability}%`, percent: analytics.soilSustainability, icon: Sprout },
    { label: "Input Efficiency", value: `${analytics.inputEfficiency}%`, percent: analytics.inputEfficiency, icon: Activity },
  ];

  const benchmarkRows = backendDashboard?.benchmarkRows || [
    { label: "Farm vs Regional Average", farm: `${analytics.yieldTons.toLocaleString()} t`, baseline: `${analytics.regionalYield.toLocaleString()} t`, trend: analytics.yieldTons >= analytics.regionalYield ? "Increasing" : "Stable" },
    { label: "Farm vs District Average", farm: `${analytics.yieldTons.toLocaleString()} t`, baseline: `${analytics.districtAverage.toLocaleString()} t`, trend: analytics.yieldTons >= analytics.districtAverage ? "Increasing" : "Stable" },
    { label: "Farm vs Previous Season", farm: `${analytics.yieldTons.toLocaleString()} t`, baseline: `${analytics.previousSeasonYield.toLocaleString()} t`, trend: analytics.yieldTons >= analytics.previousSeasonYield ? "Increasing" : "Declining" },
  ];

  if (isLoading) {
    return (<PageShell><div style={{ padding: "24px", background: "var(--light-green)", borderRadius: "10px", color: "var(--primary-green)", fontWeight: 600 }}>Loading demo analytics...</div></PageShell>);
  }

  return (
    <PageShell>
      <PageHeader title="Farm Analytics & Yield Reports" description="AI-assisted insights for academic-standard crop performance and financial planning.">
        <div style={{ display: "flex", gap: "8px" }}>
          <StatusBadge status={backendDashboard ? "verified" : "default"}>{backendDashboard ? "Backend Analytics" : "Demo Analytics"}</StatusBadge>
          <StatusBadge status="default">Local Data</StatusBadge>
        </div>
      </PageHeader>

      <div className="analytics-toolbar">
        <label><span>Active farm</span><select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>{farms.map((farm) => (<option key={farm.id} value={farm.id}>{farm.name} - {farm.region}</option>))}</select></label>
        <label><span>Date range</span><select value={dateRange} onChange={(event) => setDateRange(event.target.value)}><option value="30D">Last 30 Days</option><option value="90D">Last 90 Days</option><option value="6M">Last 6 Months</option><option value="12M">Last 12 Months</option></select></label>
        <label><span>Crop type</span><select value={cropType} onChange={(event) => setCropType(event.target.value)}><option value="All">All Crops</option><option value="Maize">Maize</option><option value="Wheat">Wheat</option><option value="Soybeans">Soybeans</option><option value="Rice">Rice</option><option value="Beans">Beans</option></select></label>
        <label><span>Activity</span><select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value)}><option value="All">All Activity</option><option value="Verified">Verified Reports</option><option value="Pending">Pending Review</option></select></label>
        <label><span>Report</span><select value={reportTemplate} onChange={(event) => setReportTemplate(event.target.value)}>{reportTemplates.map((template) => (<option key={template} value={template}>{template}</option>))}</select></label>
        <label><span>Chart</span><select value={chartFilter} onChange={(event) => setChartFilter(event.target.value)}>{chartFilters.map((filter) => (<option key={filter} value={filter}>{filter}</option>))}</select></label>
      </div>

      <div className="analytics-actions">
        <ActionButton variant="secondary" icon={FileSpreadsheet} onClick={() => exportFarmerAnalytics("excel")}>Excel</ActionButton>
        <ActionButton variant="secondary" icon={FileText} onClick={() => exportFarmerAnalytics("report")}>{analytics.reportTemplateLabel}</ActionButton>
        <ActionButton variant="secondary" icon={Download} onClick={() => exportFarmerAnalytics("pdf")}>PDF</ActionButton>
        <ActionButton variant="secondary" icon={Sparkles} onClick={async () => { const shareUrl = `${window.location.origin}/analytics?farm=${selectedFarm.id}`; const copied = await copyText(shareUrl); setShareReady(copied || !shareReady); }}>{shareReady ? "Share Link Ready" : "Share Link"}</ActionButton>
      </div>

      <div className="analytics-kpi-grid">
        {farmerMetricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="analytics-kpi-card">
              <div className="analytics-kpi-head"><span>{card.title}</span><Icon size={18} /></div>
              <strong className="analytics-kpi-value">{card.value}</strong>
              <span className={`analytics-kpi-note ${card.tone}`}>{card.note}</span>
            </div>
          );
        })}
      </div>

      <div className="analytics-grid-2">
        <SectionCard title="AI Performance Insights" subtitle={`Confidence score: ${analytics.confidence}%`} action={<StatusBadge status={trendLabel === "Increasing" ? "verified" : trendLabel === "Declining" ? "pending" : "default"}>{trendLabel}</StatusBadge>}>
          <div className="analytics-insights-list">
            {aiInsights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="analytics-insight-item">
                  <Icon size={16} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Profitability Explanation" subtitle="ROI = (Revenue - Cost) / Cost × 100"
          action={trendLabel === "Increasing" ? <TrendingUp size={18} color="var(--primary-green)" /> : trendLabel === "Declining" ? <TrendingDown size={18} color="var(--danger)" /> : <BarChart3 size={18} color="var(--text-muted)" />}>
          <div className="analytics-profit-row"><span>Revenue</span><strong>{formatRwf(analytics.revenue)}</strong></div>
          <div className="analytics-profit-row"><span>Cost</span><strong>{formatRwf(analytics.costs)}</strong></div>
          <div className="analytics-profit-row"><span>Profit</span><strong>{formatRwf(analytics.profit)}</strong></div>
          <div style={{ marginTop: "12px" }}><StatusBadge status={trendLabel === "Increasing" ? "verified" : trendLabel === "Declining" ? "pending" : "default"}>{analytics.roi}% ROI · {trendLabel}</StatusBadge></div>
        </SectionCard>
      </div>

      <div className="analytics-grid-2">
        <SectionCard title="Comparative Analysis">
          <div className="analytics-profit-row"><span>Farm Yield</span><strong>{analytics.yieldTons.toLocaleString()} t</strong></div>
          <div className="analytics-profit-row"><span>Regional Average</span><strong>{analytics.regionalYield.toLocaleString()} t</strong></div>
          <div style={{ marginTop: "12px" }}><StatusBadge status={analytics.yieldTons >= analytics.regionalYield ? "verified" : "pending"}>{analytics.yieldTons >= analytics.regionalYield ? "Above regional average" : "Below regional average"}</StatusBadge></div>
        </SectionCard>

        <SectionCard title="Sustainability Score">
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <strong style={{ fontSize: "36px", color: "var(--primary-green)" }}>{analytics.sustainability}</strong>
            <span style={{ fontSize: "18px", color: "var(--text-muted)" }}>/100</span>
          </div>
          <div className="analytics-sustainability-list">
            {sustainabilityRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="analytics-sustainability-item">
                  <div className="bar-label"><span><Icon size={14} style={{ marginRight: 4 }} />{row.label}</span><strong>{row.value}</strong></div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${row.percent}%` }} /></div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="analytics-grid-2">
        <AppCard>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Revenue Breakdown by Crop</h3>
          {analytics.revenueBreakdown.map((row) => (
            <div key={row.crop} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div><strong style={{ fontSize: "14px" }}>{row.crop}</strong><span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>{formatRwf(row.revenue)}</span></div>
              <strong style={{ color: "var(--primary-green)" }}>{row.contribution}%</strong>
            </div>
          ))}
        </AppCard>
        <AppCard>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 16px" }}>Farm Benchmarking</h3>
          {benchmarkRows.map((row) => (
            <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div><strong style={{ fontSize: "14px" }}>{row.label}</strong><span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>{row.farm} vs {row.baseline}</span></div>
              <StatusBadge status={row.trend === "Increasing" ? "verified" : row.trend === "Declining" ? "pending" : "default"}>{row.trend}</StatusBadge>
            </div>
          ))}
        </AppCard>
      </div>

      <div className="analytics-grid-2">
        <SectionCard title="Active Report Template" subtitle={reportTemplate} action={<StatusBadge status={backendDashboard ? "verified" : "default"}>{backendDashboard ? "Backend Analytics" : "Demo Analytics"}</StatusBadge>}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.6 }}>{activeTemplateDescription}</p>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <ActionButton variant="secondary" icon={FileText} onClick={() => exportFarmerAnalytics("report")}>Generate Template Report</ActionButton>
            <ActionButton variant="secondary" icon={FileJson} onClick={() => exportFarmerAnalytics("json")}>Export Structured Data</ActionButton>
          </div>
        </SectionCard>
        <SectionCard title="Trend Indicators" subtitle="Academic reporting summary for the selected view" action={<StatusBadge status={trendLabel === "Increasing" ? "verified" : trendLabel === "Declining" ? "pending" : "default"}>{trendLabel}</StatusBadge>}>
          <div className="analytics-profit-row"><span>Yield Direction</span><strong>{analytics.trendDelta >= 0 ? `+${analytics.trendDelta}%` : `${analytics.trendDelta}%`}</strong></div>
          <div className="analytics-profit-row"><span>Market Pressure</span><strong>{analytics.marketPressure}%</strong></div>
          <div className="analytics-profit-row"><span>Operational Risk</span><strong>{analytics.riskLevel}</strong></div>
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <AppCard className="analytics-chart-card">
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Yield Summary</h3><p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>Actual vs. Target Production</p></div>
              <div className="analytics-chart-legend"><span><span className="legend-swatch actual" /> Actual</span><span><span className="legend-swatch target" /> Target</span></div>
            </div>
          </div>
          <div className="analytics-chart-body">
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{chartFilter} trend view</div>
            <div className="analytics-chart-vis">
              {analytics.actualSeries.map((value, index) => (
                <div key={`yield-${value}-${index}`} className="analytics-chart-bar-group">
                  <span className="bar-actual" style={{ height: `${Math.max(22, Math.round((value / maxYield) * 100))}%` }} />
                  <span className="bar-target" style={{ height: `${Math.max(26, Math.round((analytics.targetSeries[index] / maxYield) * 100))}%` }} />
                </div>
              ))}
            </div>
            <div className="analytics-chart-axis" style={{ gridTemplateColumns: `repeat(${analytics.chartLabels.length}, 1fr)` }}>
              {analytics.chartLabels.map((label) => (<span key={label}>{label}</span>))}
            </div>
          </div>
        </AppCard>

        <AppCard className="analytics-chart-card">
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Cost vs. Revenue</h3><p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "2px 0 0" }}>Quarterly financial performance</p></div>
              <div className="analytics-chart-legend"><span><span className="legend-swatch revenue" /> Revenue</span><span><span className="legend-swatch costs" /> Costs</span></div>
            </div>
          </div>
          <div className="analytics-chart-body">
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>{chartFilter} finance view</div>
            <div className="analytics-chart-vis">
              {analytics.revenueSeries.map((row) => (
                <div key={row.label} className="analytics-chart-bar-group">
                  <span className="bar-revenue" style={{ height: `${Math.max(26, Math.round((row.revenue / maxRevenue) * 100))}%` }} />
                  <span className="bar-costs" style={{ height: `${Math.max(18, Math.round((row.costs / maxCosts) * 100))}%` }} />
                </div>
              ))}
            </div>
            <div className="analytics-chart-axis" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {analytics.revenueSeries.map((row) => (<span key={row.label}>{row.label}</span>))}
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard className="analytics-table-card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Historical Monthly Reports</h3>
            <ActionButton variant="ghost" size="sm" onClick={() => downloadJsonFile("farm-report-archive.json", backendHistory.length ? backendHistory : filteredRows)}>View Archive →</ActionButton>
          </div>
        </div>
        {filteredRows.length ? (
          <div>
            <div className="analytics-table-head"><span>Period</span><span>Yield</span><span>Revenue</span><span>Score</span><span>Status</span><span></span></div>
            {filteredRows.map((row) => (
              <div key={row.period} className="analytics-table-row">
                <strong>{row.period}</strong>
                <span>{row.yield}</span>
                <strong>{row.revenue}</strong>
                <StatusBadge status={row.score}>{row.score}</StatusBadge>
                <StatusBadge status={row.status === "Verified" ? "verified" : "pending"}>{row.status}</StatusBadge>
                <div style={{ display: "flex", gap: "4px" }}>
                  <IconActionButton className="prototype-farm-report-icon-button" label={`Download text report for ${row.period}`} title="Download text report" onClick={() => downloadTextFile(`${row.period.replace(/\s+/g, "-").toLowerCase()}-report.txt`, JSON.stringify(row, null, 2))}><Download size={16} /></IconActionButton>
                  <IconActionButton className="prototype-farm-report-icon-button" label={`Download JSON report for ${row.period}`} title="Download JSON report" onClick={() => downloadJsonFile(`${row.period.replace(/\s+/g, "-").toLowerCase()}-report.json`, row)}><MoreVertical size={16} /></IconActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--text-muted)" }}><strong>No reports available.</strong><p style={{ margin: "4px 0 0", fontSize: "13px" }}>Try switching the activity filter or generate a different report template.</p></div>
        )}
      </AppCard>
    </PageShell>
  );
}

export function AnalyticsPage() {
  const { user } = useAuth();
  return ["admin", "extensionofficer"].includes(user?.role) ? <AdminAnalyticsView /> : <FarmerAnalyticsView />;
}
