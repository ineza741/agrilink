const prisma = require("../prisma/client");
const ApiError = require("../utils/ApiError");
const { createAuditLog } = require("./auditLogService");

const STATUS_ORDER = ["Pending", "Accepted", "Completed", "Rejected"];

function getSimpleRangeConfig(range = "30d") {
  const normalized = ["7d", "30d", "90d"].includes(String(range)) ? String(range) : "30d";
  const days = normalized === "7d" ? 7 : normalized === "90d" ? 90 : 30;
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);
  return { range: normalized, startDate, endDate };
}

function toIsoDate(date) {
  return new Date(date).toISOString().split("T")[0];
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeRecommendationStatus(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized || ["GENERATED", "PENDING_REVIEW", "PENDING", "UNDER_REVIEW", "NEW"].includes(normalized)) return "Pending";
  if (["APPROVED", "ACCEPTED", "APPLIED"].includes(normalized)) return "Accepted";
  if (["COMPLETED", "DONE", "RESOLVED"].includes(normalized)) return "Completed";
  if (["REJECTED", "DECLINED", "CANCELLED"].includes(normalized)) return "Rejected";
  return "Pending";
}

function titleCaseStatus(value, fallback = "Pending") {
  const normalized = String(value || "").trim();
  if (!normalized) return fallback;
  return normalized
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isActiveNotificationAlert(alert) {
  const ack = String(alert?.ackStatus || "").trim().toLowerCase();
  const delivery = String(alert?.deliveryStatus || "").trim().toLowerCase();
  return !alert?.archived && (!alert?.read || ["pending", "active", "unresolved"].includes(ack) || ["pending", "active", "unresolved"].includes(delivery));
}

function isActiveMarketAlert(alert) {
  const status = String(alert?.status || "").trim().toLowerCase();
  return ["monitoring", "active", "pending", "unresolved"].includes(status);
}

async function listAccessibleFarms(user) {
  if (user.role === "Farmer") {
    return prisma.farm.findMany({
      where: { farmerProfile: { userId: user.id } },
      orderBy: { farmName: "asc" },
      select: { id: true, farmName: true, district: true, sector: true, province: true },
    });
  }

  if (user.role === "ExtensionOfficer") {
    const district = user.marketOfficerProfile?.district || null;
    const sector = user.marketOfficerProfile?.sector || null;
    return prisma.farm.findMany({
      where: district || sector ? {
        ...(district ? { district } : {}),
        ...(sector ? { sector } : {}),
      } : {},
      orderBy: { farmName: "asc" },
      select: { id: true, farmName: true, district: true, sector: true, province: true },
    });
  }

  if (user.role === "Admin") {
    return prisma.farm.findMany({
      orderBy: { farmName: "asc" },
      select: { id: true, farmName: true, district: true, sector: true, province: true },
    });
  }

  throw new ApiError(403, "You do not have access to analytics.");
}

async function resolveFarmScope(user, farmId) {
  const accessibleFarms = await listAccessibleFarms(user);
  if (!farmId) {
    return { accessibleFarms, selectedFarms: accessibleFarms };
  }

  const selectedFarm = accessibleFarms.find((farm) => farm.id === farmId);
  if (selectedFarm) {
    return { accessibleFarms, selectedFarms: [selectedFarm] };
  }

  const existingFarm = await prisma.farm.findUnique({ where: { id: farmId }, select: { id: true } });
  if (!existingFarm) {
    throw new ApiError(404, "Farm not found.");
  }

  throw new ApiError(403, "You do not have access to this farm.");
}

function buildRecommendationItems(runs, feedbackEntries) {
  const feedbackByKey = new Map();
  feedbackEntries.forEach((entry) => {
    const key = `${entry.runId}:${entry.recommendationId}`;
    const existing = feedbackByKey.get(key);
    if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
      feedbackByKey.set(key, entry);
    }
  });

  const items = [];
  runs.forEach((run) => {
    const recommendations = Array.isArray(run.recommendations) ? run.recommendations : [];
    recommendations.forEach((recommendation, index) => {
      const recommendationId = recommendation?.id || recommendation?.recommendationId || recommendation?.key || `rec-${run.id}-${index + 1}`;
      const feedback = feedbackByKey.get(`${run.id}:${recommendationId}`);
      const sourceStatus = feedback?.feedbackStatus || recommendation?.status || recommendation?.state || recommendation?.reviewStatus || "GENERATED";
      items.push({
        runId: run.id,
        farmId: run.farmId,
        createdAt: run.createdAt,
        recommendationId,
        status: normalizeRecommendationStatus(sourceStatus),
      });
    });
  });
  return items;
}

function buildRecentActivity({
  farmsById,
  recommendationRuns,
  recommendationFeedback,
  pestDiagnoses,
  pestActionLogs,
  irrigationRecords,
  farmReminders,
  marketAlerts,
  marketAnalyses,
  notificationAlerts,
  farmAuditLogs,
  cropPriceHistory,
}) {
  const rows = [];

  recommendationRuns.forEach((entry) => {
    rows.push({
      id: `recommendation-run-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Recommendations",
      activity: "AI recommendation generated",
      status: "Pending",
    });
  });

  recommendationFeedback.forEach((entry) => {
    const status = normalizeRecommendationStatus(entry.feedbackStatus);
    rows.push({
      id: `recommendation-feedback-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Recommendations",
      activity: status === "Completed" ? "Recommendation marked complete" : status === "Rejected" ? "Recommendation rejected" : "Recommendation accepted",
      status,
    });
  });

  irrigationRecords.forEach((entry) => {
    rows.push({
      id: `irrigation-record-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Irrigation",
      activity: "Irrigation activity recorded",
      status: titleCaseStatus(entry.completionStatus, "Completed"),
    });
  });

  pestDiagnoses.forEach((entry) => {
    rows.push({
      id: `pest-diagnosis-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Pest & Disease",
      activity: String(entry.status || "").toLowerCase() === "accepted" ? "Pest diagnosis accepted" : "Pest diagnosis recorded",
      status: titleCaseStatus(entry.status, "Pending"),
    });
  });

  pestActionLogs.forEach((entry) => {
    const status = normalizeRecommendationStatus(entry.feedbackStatus);
    rows.push({
      id: `pest-action-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Pest & Disease",
      activity: status === "Completed" ? "Pest treatment marked complete" : "Pest diagnosis accepted",
      status,
    });
  });

  marketAlerts.forEach((entry) => {
    rows.push({
      id: `market-alert-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Market Intelligence",
      activity: "Price alert created",
      status: titleCaseStatus(entry.status, "Active"),
    });
  });

  marketAnalyses.forEach((entry) => {
    rows.push({
      id: `market-analysis-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Market Intelligence",
      activity: "Market analysis generated",
      status: "Completed",
    });
  });

  notificationAlerts.forEach((entry) => {
    rows.push({
      id: `notification-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "All Farms",
      module: "Notifications",
      activity: entry.title || "Alert created",
      status: isActiveNotificationAlert(entry) ? "Active" : entry.read ? "Completed" : "Pending",
    });
  });

  farmReminders.forEach((entry) => {
    rows.push({
      id: `farm-reminder-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.farmId)?.farmName || "Unknown Farm",
      module: "Farm Management",
      activity: String(entry.status || "").toLowerCase() === "completed" ? "Farm task marked complete" : "Farm reminder created",
      status: titleCaseStatus(entry.status, "Pending"),
    });
  });

  farmAuditLogs.forEach((entry) => {
    rows.push({
      id: `farm-audit-${entry.id}`,
      date: entry.createdAt,
      farmName: farmsById.get(entry.entityId)?.farmName || "Unknown Farm",
      module: "Farm Management",
      activity: entry.action === "UPDATE_FARM" ? "Farm profile updated" : "Farm record changed",
      status: "Completed",
    });
  });

  cropPriceHistory.forEach((entry) => {
    rows.push({
      id: `crop-price-history-${entry.id}`,
      date: entry.createdAt,
      farmName: entry.district || "Market Record",
      module: "Market Intelligence",
      activity: `${entry.cropName} price updated at ${entry.marketName}`,
      status: titleCaseStatus(entry.status, "Completed"),
    });
  });

  return rows
    .sort((left, right) => new Date(right.date) - new Date(left.date))
    .slice(0, 10)
    .map((row) => ({
      ...row,
      date: new Date(row.date).toISOString(),
    }));
}

async function buildSimpleAnalyticsReport({ user, farmId = null, range = "30d" }) {
  const { accessibleFarms, selectedFarms } = await resolveFarmScope(user, farmId || null);
  const { startDate, endDate, range: normalizedRange } = getSimpleRangeConfig(range);
  const farmIds = selectedFarms.map((farm) => farm.id);
  const farmsById = new Map(selectedFarms.map((farm) => [farm.id, farm]));

  const baseResponse = {
    filters: {
      farmId: farmId || null,
      range: normalizedRange,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
      availableFarms: accessibleFarms.map((farm) => ({ farmId: farm.id, farmName: farm.farmName })),
    },
    summary: {
      totalFarms: selectedFarms.length,
      totalRecommendations: 0,
      activeAlerts: 0,
      completedActions: 0,
    },
    farmActivity: selectedFarms.map((farm) => ({
      farmId: farm.id,
      farmName: farm.farmName,
      recommendations: 0,
      alerts: 0,
      completedActions: 0,
    })),
    recommendationStatus: STATUS_ORDER.map((status) => ({ status, count: 0 })),
    recentActivity: [],
  };

  if (!farmIds.length) {
    return baseResponse;
  }

  const [
    recommendationRuns,
    recommendationFeedback,
    notificationAlerts,
    marketAlerts,
    irrigationRecords,
    farmReminders,
    pestDiagnoses,
    pestActionLogs,
    marketAnalyses,
    farmAuditLogs,
    cropPriceHistory,
  ] = await Promise.all([
    prisma.aiRecommendationRun.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, createdAt: true, recommendations: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aiRecommendationFeedback.findMany({
      where: { farmId: { in: farmIds }, createdAt: { lte: endDate } },
      select: { id: true, runId: true, farmId: true, recommendationId: true, feedbackStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notificationAlert.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, title: true, read: true, archived: true, ackStatus: true, deliveryStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketAlert.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.irrigationRecord.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, completionStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.farmReminder.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pestDiagnosis.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.pestActionLog.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, feedbackStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketAnalysis.findMany({
      where: { farmId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, farmId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Farm", entityId: { in: farmIds }, createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, entityId: true, action: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.cropPriceHistory.findMany({
      where: { createdAt: { gte: startDate, lte: endDate }, district: { in: [...new Set(selectedFarms.map((farm) => farm.district).filter(Boolean))] } },
      select: { id: true, cropName: true, marketName: true, district: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const recommendationItems = buildRecommendationItems(recommendationRuns, recommendationFeedback);
  const recommendationStatusCounts = STATUS_ORDER.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  recommendationItems.forEach((item) => {
    recommendationStatusCounts[item.status] += 1;
  });

  const activeNotificationAlerts = notificationAlerts.filter(isActiveNotificationAlert);
  const activeMarketAlerts = marketAlerts.filter(isActiveMarketAlert);
  const completedRecommendationActions = recommendationItems.filter((item) => ["Accepted", "Completed"].includes(item.status)).length;
  const completedPestActions = pestActionLogs.filter((item) => ["Accepted", "Completed"].includes(normalizeRecommendationStatus(item.feedbackStatus))).length;
  const completedFarmReminders = farmReminders.filter((item) => String(item.status || "").trim().toLowerCase() === "completed").length;
  const completedIrrigationRecords = irrigationRecords.filter((item) => String(item.completionStatus || "").trim().toLowerCase() === "completed").length;

  const farmActivity = selectedFarms.map((farm) => ({
    farmId: farm.id,
    farmName: farm.farmName,
    recommendations: recommendationItems.filter((item) => item.farmId === farm.id).length,
    alerts:
      activeNotificationAlerts.filter((item) => item.farmId === farm.id).length +
      activeMarketAlerts.filter((item) => item.farmId === farm.id).length,
    completedActions:
      recommendationItems.filter((item) => item.farmId === farm.id && ["Accepted", "Completed"].includes(item.status)).length +
      pestActionLogs.filter((item) => item.farmId === farm.id && ["Accepted", "Completed"].includes(normalizeRecommendationStatus(item.feedbackStatus))).length +
      farmReminders.filter((item) => item.farmId === farm.id && String(item.status || "").trim().toLowerCase() === "completed").length +
      irrigationRecords.filter((item) => item.farmId === farm.id && String(item.completionStatus || "").trim().toLowerCase() === "completed").length,
  }));

  return {
    filters: baseResponse.filters,
    summary: {
      totalFarms: selectedFarms.length,
      totalRecommendations: recommendationItems.length,
      activeAlerts: activeNotificationAlerts.length + activeMarketAlerts.length,
      completedActions: completedRecommendationActions + completedPestActions + completedFarmReminders + completedIrrigationRecords,
    },
    farmActivity,
    recommendationStatus: STATUS_ORDER.map((status) => ({ status, count: recommendationStatusCounts[status] })),
    recentActivity: buildRecentActivity({
      farmsById,
      recommendationRuns,
      recommendationFeedback: recommendationFeedback.filter((entry) => farmIds.includes(entry.farmId)),
      pestDiagnoses,
      pestActionLogs,
      irrigationRecords,
      farmReminders,
      marketAlerts,
      marketAnalyses,
      notificationAlerts,
      farmAuditLogs,
      cropPriceHistory,
    }),
  };
}

async function storeExportRecord({ user, farmId, range, format, payload }) {
  const dateStamp = toIsoDate(new Date());
  const fileName = `agrisupport-analytics-report-${dateStamp}.${format === "excel" ? "xlsx" : "pdf"}`;

  const record = await prisma.analyticsExport.create({
    data: {
      actorUserId: user.id,
      farmId: farmId || null,
      scopeType: "simple-report",
      reportTemplate: "Analytics & Reports",
      exportFormat: format,
      dateRange: range,
      fileName,
      payload,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: format === "pdf" ? "EXPORT_ANALYTICS_PDF" : "EXPORT_ANALYTICS_EXCEL",
    entityType: "AnalyticsExport",
    entityId: record.id,
    details: {
      farmId: farmId || null,
      range,
      fileName,
    },
  });

  return fileName;
}

async function exportSimpleAnalyticsPdf({ user, farmId = null, range = "30d" }) {
  const report = await buildSimpleAnalyticsReport({ user, farmId, range });
  const fileName = await storeExportRecord({ user, farmId, range, format: "pdf", payload: report });

  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const buffers = [];
  doc.on("data", (chunk) => buffers.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on("end", () => resolve({ buffer: Buffer.concat(buffers), fileName }));
    doc.on("error", reject);

    const selectedFarmLabel = report.filters.farmId
      ? report.filters.availableFarms.find((item) => item.farmId === report.filters.farmId)?.farmName || "Selected Farm"
      : "All Farms";

    doc.font("Helvetica-Bold").fontSize(18).text("Analytics & Reports", { align: "center" });
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10).text(`Generated: ${formatDateTime(new Date())}`, { align: "center" });
    doc.text(`Selected Farm: ${selectedFarmLabel}`, { align: "center" });
    doc.text(`Date Range: ${report.filters.startDate} to ${report.filters.endDate}`, { align: "center" });
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text("Summary");
    doc.moveDown(0.3);
    [
      ["Total Farms", report.summary.totalFarms],
      ["Total Recommendations", report.summary.totalRecommendations],
      ["Active Alerts", report.summary.activeAlerts],
      ["Completed Actions", report.summary.completedActions],
    ].forEach(([label, value]) => {
      doc.font("Helvetica-Bold").fontSize(10).text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(String(value));
    });

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(12).text("Farm Activity");
    doc.moveDown(0.3);
    if (!report.farmActivity.length || report.farmActivity.every((entry) => !entry.recommendations && !entry.alerts && !entry.completedActions)) {
      doc.font("Helvetica").fontSize(10).text("No farm activity was recorded during the selected period.");
    } else {
      report.farmActivity.forEach((entry) => {
        doc.font("Helvetica-Bold").fontSize(10).text(entry.farmName);
        doc.font("Helvetica").text(`Recommendations: ${entry.recommendations}   Alerts: ${entry.alerts}   Completed Actions: ${entry.completedActions}`);
      });
    }

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(12).text("Recommendation Status");
    doc.moveDown(0.3);
    report.recommendationStatus.forEach((entry) => {
      doc.font("Helvetica-Bold").fontSize(10).text(`${entry.status}: `, { continued: true });
      doc.font("Helvetica").text(String(entry.count));
    });

    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(12).text("Recent Activity");
    doc.moveDown(0.3);
    if (!report.recentActivity.length) {
      doc.font("Helvetica").fontSize(10).text("No recent activity was recorded.");
    } else {
      report.recentActivity.forEach((entry) => {
        if (doc.y > 740) doc.addPage();
        doc.font("Helvetica-Bold").fontSize(10).text(`${formatDate(entry.date)} | ${entry.farmName} | ${entry.module}`);
        doc.font("Helvetica").fontSize(10).text(`${entry.activity} (${entry.status})`);
      });
    }

    doc.end();
  });
}

async function exportSimpleAnalyticsExcel({ user, farmId = null, range = "30d" }) {
  const report = await buildSimpleAnalyticsReport({ user, farmId, range });
  const fileName = await storeExportRecord({ user, farmId, range, format: "excel", payload: report });
  const ExcelJS = require("exceljs");
  const workbook = new ExcelJS.Workbook();

  const selectedFarmLabel = report.filters.farmId
    ? report.filters.availableFarms.find((item) => item.farmId === report.filters.farmId)?.farmName || "Selected Farm"
    : "All Farms";

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 28 },
  ];
  [
    ["Selected Farm", selectedFarmLabel],
    ["Date Range", `${report.filters.startDate} to ${report.filters.endDate}`],
    ["Total Farms", report.summary.totalFarms],
    ["Total Recommendations", report.summary.totalRecommendations],
    ["Active Alerts", report.summary.activeAlerts],
    ["Completed Actions", report.summary.completedActions],
  ].forEach(([field, value]) => summarySheet.addRow({ field, value }));

  const farmActivitySheet = workbook.addWorksheet("Farm Activity");
  farmActivitySheet.columns = [
    { header: "Farm", key: "farmName", width: 32 },
    { header: "Recommendations", key: "recommendations", width: 18 },
    { header: "Alerts", key: "alerts", width: 14 },
    { header: "Completed Actions", key: "completedActions", width: 20 },
  ];
  report.farmActivity.forEach((entry) => farmActivitySheet.addRow(entry));

  const recommendationStatusSheet = workbook.addWorksheet("Recommendation Status");
  recommendationStatusSheet.columns = [
    { header: "Status", key: "status", width: 18 },
    { header: "Count", key: "count", width: 14 },
  ];
  report.recommendationStatus.forEach((entry) => recommendationStatusSheet.addRow(entry));

  const recentActivitySheet = workbook.addWorksheet("Recent Activity");
  recentActivitySheet.columns = [
    { header: "Date", key: "date", width: 22 },
    { header: "Farm", key: "farmName", width: 28 },
    { header: "Module", key: "module", width: 22 },
    { header: "Activity", key: "activity", width: 42 },
    { header: "Status", key: "status", width: 16 },
  ];
  report.recentActivity.forEach((entry) => recentActivitySheet.addRow({ ...entry, date: formatDateTime(entry.date) }));

  [summarySheet, farmActivitySheet, recommendationStatusSheet, recentActivitySheet].forEach((sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A7F37" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), fileName };
}

module.exports = {
  buildSimpleAnalyticsReport,
  exportSimpleAnalyticsPdf,
  exportSimpleAnalyticsExcel,
};
