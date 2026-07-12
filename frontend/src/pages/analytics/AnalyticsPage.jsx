import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Lightbulb,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { ActionButton } from "../../components/common/ActionButton";
import { AppCard } from "../../components/common/AppCard";
import { PageHeader } from "../../components/common/PageHeader";
import { PageShell } from "../../components/common/PageShell";
import { StatusBadge } from "../../components/common/StatusBadge";
import { phase1BackendService } from "../../services/phase1Backend";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

const STATUS_COLORS = ["#2E7D32", "#8BC34A", "#0F4C24", "#E53935"];

const SUMMARY_CARD_CONFIG = [
  {
    key: "totalFarms",
    label: "Total Farms",
    icon: Sprout,
    description: "Farms included in this report.",
  },
  {
    key: "totalRecommendations",
    label: "Total Recommendations",
    icon: Lightbulb,
    description: "Recommendations created in the selected period.",
  },
  {
    key: "activeAlerts",
    label: "Active Alerts",
    icon: AlertTriangle,
    description: "Unread or unresolved alerts that still need attention.",
  },
  {
    key: "completedActions",
    label: "Completed Actions",
    icon: CheckCircle2,
    description: "Accepted or completed actions recorded in MySQL.",
  },
];

function formatDateRangeLabel(range) {
  return RANGE_OPTIONS.find((option) => option.value === range)?.label || "Last 30 Days";
}

function formatActivityDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSafeErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function downloadBlob(blob, fileName) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function buildSummaryCards(summary = {}) {
  return SUMMARY_CARD_CONFIG.map((card) => ({
    ...card,
    value: Number(summary?.[card.key] || 0).toLocaleString(),
  }));
}

function hasFarmActivity(entries = []) {
  return entries.some(
    (entry) => Number(entry.recommendations || 0) || Number(entry.alerts || 0) || Number(entry.completedActions || 0)
  );
}

function hasRecommendationStatus(entries = []) {
  return entries.some((entry) => Number(entry.count || 0));
}

function hasAnyAnalyticsData(report) {
  if (!report) return false;
  return Boolean(
    Number(report.summary?.totalRecommendations || 0) ||
      Number(report.summary?.activeAlerts || 0) ||
      Number(report.summary?.completedActions || 0) ||
      hasFarmActivity(report.farmActivity) ||
      hasRecommendationStatus(report.recommendationStatus) ||
      (report.recentActivity || []).length
  );
}

export function AnalyticsPage() {
  const [selectedFarmId, setSelectedFarmId] = useState("all");
  const [selectedRange, setSelectedRange] = useState("30d");
  const [report, setReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (!report) return;
    fetchAnalytics({ silent: true });
  }, [selectedFarmId, selectedRange]);

  async function fetchAnalytics(options = {}) {
    const { silent = false, showRefreshToast = false } = options;
    setAnalyticsLoading(true);

    if (!silent) {
      setErrorMessage("");
    }

    try {
      const data = await phase1BackendService.analytics.simpleReport({
        farmId: selectedFarmId === "all" ? undefined : selectedFarmId,
        range: selectedRange,
      });
      setReport(data);
      setErrorMessage("");

      if (showRefreshToast) {
        toast.success("Analytics refreshed", {
          description: "The latest report data has been loaded.",
        });
      }
    } catch (error) {
      const message = getSafeErrorMessage(error, "Analytics data could not be loaded. Please try again.");
      setErrorMessage("Analytics data could not be loaded. Please try again.");
      toast.error("Action failed", { description: message });
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function handleExportPdf() {
    setPdfExporting(true);
    try {
      const blob = await phase1BackendService.analytics.exportSimpleReportPdf({
        farmId: selectedFarmId === "all" ? undefined : selectedFarmId,
        range: selectedRange,
      });
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `agrisupport-analytics-report-${dateStamp}.pdf`);
      toast.success("PDF report ready", {
        description: "The analytics report was downloaded successfully.",
      });
    } catch (error) {
      toast.error("Action failed", {
        description: getSafeErrorMessage(error, "Unable to prepare the PDF report."),
      });
    } finally {
      setPdfExporting(false);
    }
  }

  async function handleExportExcel() {
    setExcelExporting(true);
    try {
      const blob = await phase1BackendService.analytics.exportSimpleReportExcel({
        farmId: selectedFarmId === "all" ? undefined : selectedFarmId,
        range: selectedRange,
      });
      const dateStamp = new Date().toISOString().split("T")[0];
      downloadBlob(blob, `agrisupport-analytics-report-${dateStamp}.xlsx`);
      toast.success("Excel report ready", {
        description: "The analytics workbook was downloaded successfully.",
      });
    } catch (error) {
      toast.error("Action failed", {
        description: getSafeErrorMessage(error, "Unable to prepare the Excel report."),
      });
    } finally {
      setExcelExporting(false);
    }
  }

  const availableFarms = report?.filters?.availableFarms || [];
  const summaryCards = buildSummaryCards(report?.summary);
  const noFarmActivity = !hasFarmActivity(report?.farmActivity || []);
  const noRecommendationStatus = !hasRecommendationStatus(report?.recommendationStatus || []);
  const noRecentActivity = !report?.recentActivity?.length;
  const noAnalyticsData = report && !hasAnyAnalyticsData(report);

  return (
    <PageShell>
      <PageHeader
        title="Analytics & Reports"
        description="Review farm activity, recommendation outcomes, alerts, and completed actions."
      >
        <div className="analytics-simple-header-actions">
          <ActionButton
            variant="secondary"
            icon={FileText}
            onClick={handleExportPdf}
            disabled={pdfExporting}
          >
            {pdfExporting ? "Preparing PDF..." : "Export PDF"}
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon={FileSpreadsheet}
            onClick={handleExportExcel}
            disabled={excelExporting}
          >
            {excelExporting ? "Preparing Excel..." : "Export Excel"}
          </ActionButton>
        </div>
      </PageHeader>

      <AppCard className="analytics-simple-toolbar-card">
        <div className="analytics-simple-toolbar">
          <label className="analytics-simple-filter">
            <span>Farm</span>
            <select value={selectedFarmId} onChange={(event) => setSelectedFarmId(event.target.value)}>
              <option value="all">All Farms</option>
              {availableFarms.map((farm) => (
                <option key={farm.farmId} value={farm.farmId}>
                  {farm.farmName}
                </option>
              ))}
            </select>
          </label>

          <label className="analytics-simple-filter">
            <span>Date Range</span>
            <select value={selectedRange} onChange={(event) => setSelectedRange(event.target.value)}>
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="analytics-simple-refresh">
            <ActionButton
              icon={RefreshCw}
              variant="primary"
              onClick={() => fetchAnalytics({ silent: true, showRefreshToast: true })}
              disabled={analyticsLoading}
            >
              {analyticsLoading && report ? "Refreshing..." : "Refresh"}
            </ActionButton>
          </div>
        </div>
      </AppCard>

      {!report && analyticsLoading ? (
        <AppCard className="analytics-simple-state-card">
          <p>Loading analytics...</p>
        </AppCard>
      ) : null}

      {!report && !analyticsLoading && errorMessage ? (
        <AppCard className="analytics-simple-state-card analytics-simple-state-card-error">
          <p>{errorMessage}</p>
        </AppCard>
      ) : null}

      {report ? (
        <>
          {noAnalyticsData ? (
            <AppCard className="analytics-simple-state-card">
              <p>No analytics records are available for the selected period.</p>
            </AppCard>
          ) : null}

          <div className="analytics-simple-summary-grid">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <AppCard key={card.key} className="analytics-simple-summary-card">
                  <div className="analytics-simple-summary-head">
                    <div className="analytics-simple-summary-icon">
                      <Icon size={18} />
                    </div>
                    <span>{card.label}</span>
                  </div>
                  <strong className="analytics-simple-summary-value">{card.value}</strong>
                  <p className="analytics-simple-summary-note">{card.description}</p>
                </AppCard>
              );
            })}
          </div>

          <div className="analytics-simple-chart-grid">
            <AppCard className="analytics-simple-panel">
              <div className="analytics-simple-panel-head">
                <div>
                  <h3>Farm Activity</h3>
                  <p>{formatDateRangeLabel(selectedRange)}</p>
                </div>
              </div>

              {noFarmActivity ? (
                <div className="analytics-simple-empty">No farm activity was recorded during the selected period.</div>
              ) : (
                <div className="analytics-simple-chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.farmActivity} barGap={8}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DDEBDD" />
                      <XAxis
                        dataKey="farmName"
                        tick={{ fontSize: 12 }}
                        interval={0}
                        angle={report.farmActivity.length > 3 ? -12 : 0}
                        textAnchor={report.farmActivity.length > 3 ? "end" : "middle"}
                        height={report.farmActivity.length > 3 ? 64 : 40}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="recommendations" fill="#2E7D32" radius={[6, 6, 0, 0]} name="Recommendations" />
                      <Bar dataKey="alerts" fill="#F9A825" radius={[6, 6, 0, 0]} name="Alerts" />
                      <Bar dataKey="completedActions" fill="#0F4C24" radius={[6, 6, 0, 0]} name="Completed Actions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AppCard>

            <AppCard className="analytics-simple-panel">
              <div className="analytics-simple-panel-head">
                <div>
                  <h3>Recommendation Status</h3>
                  <p>{formatDateRangeLabel(selectedRange)}</p>
                </div>
              </div>

              {noRecommendationStatus ? (
                <div className="analytics-simple-empty">No recommendation records were found for the selected period.</div>
              ) : (
                <div className="analytics-simple-chart-wrap analytics-simple-chart-wrap-pie">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={report.recommendationStatus}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={52}
                        outerRadius={86}
                        paddingAngle={2}
                      >
                        {report.recommendationStatus.map((entry, index) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AppCard>
          </div>

          <AppCard className="analytics-simple-panel">
            <div className="analytics-simple-panel-head">
              <div>
                <h3>Recent Activity</h3>
                <p>Latest 10 important records</p>
              </div>
            </div>

            {noRecentActivity ? (
              <div className="analytics-simple-empty">No recent activity was recorded.</div>
            ) : (
              <div className="data-table-wrapper analytics-simple-table-wrapper">
                <div className="data-table analytics-simple-table">
                  <div className="data-table-head analytics-simple-table-head">
                    <span className="data-table-th">Date</span>
                    <span className="data-table-th">Farm</span>
                    <span className="data-table-th">Module</span>
                    <span className="data-table-th">Activity</span>
                    <span className="data-table-th">Status</span>
                  </div>
                  {report.recentActivity.map((entry) => (
                    <div key={entry.id} className="data-table-row analytics-simple-table-row">
                      <div className="data-table-td">{formatActivityDate(entry.date)}</div>
                      <div className="data-table-td">{entry.farmName}</div>
                      <div className="data-table-td">{entry.module}</div>
                      <div className="data-table-td">{entry.activity}</div>
                      <div className="data-table-td">
                        <StatusBadge status={entry.status}>{entry.status}</StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AppCard>
        </>
      ) : null}
    </PageShell>
  );
}
