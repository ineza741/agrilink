const asyncHandler = require("../utils/asyncHandler");
const analyticsService = require("../services/analyticsService");
const simpleAnalyticsService = require("../services/simpleAnalyticsService");

const getFarmAnalyticsDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getFarmAnalyticsDashboard(
    req.user,
    req.validated.params.farmId,
    req.validated.query || {},
  );

  res.json({
    success: true,
    data,
  });
});

const getFarmAnalyticsHistory = asyncHandler(async (req, res) => {
  const data = await analyticsService.listFarmAnalyticsHistory(
    req.user,
    req.validated.params.farmId,
  );

  res.json({
    success: true,
    data,
  });
});

const exportFarmAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.createFarmAnalyticsExport(
    req.user,
    req.validated.params.farmId,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Farm analytics export prepared successfully.",
    data,
  });
});

const getAdminAnalyticsDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getAdminAnalyticsDashboard(
    req.user,
    req.validated.query || {},
  );

  res.json({
    success: true,
    data,
  });
});

const getAdminAnalyticsHistory = asyncHandler(async (req, res) => {
  const data = await analyticsService.listAdminAnalyticsHistory(req.user);

  res.json({
    success: true,
    data,
  });
});

const exportAdminAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.createAdminAnalyticsExport(
    req.user,
    req.validated.body,
  );

  res.status(201).json({
    success: true,
    message: "Admin analytics export prepared successfully.",
    data,
  });
});

const getSimpleReport = asyncHandler(async (req, res) => {
  const data = await simpleAnalyticsService.buildSimpleAnalyticsReport({
    user: req.user,
    farmId: req.validated.query?.farmId || null,
    range: req.validated.query?.range || "30d",
  });

  res.json({
    success: true,
    data,
  });
});

const exportSimpleReportPdf = asyncHandler(async (req, res) => {
  const result = await simpleAnalyticsService.exportSimpleAnalyticsPdf({
    user: req.user,
    farmId: req.validated.query?.farmId || null,
    range: req.validated.query?.range || "30d",
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(result.buffer);
});

const exportSimpleReportExcel = asyncHandler(async (req, res) => {
  const result = await simpleAnalyticsService.exportSimpleAnalyticsExcel({
    user: req.user,
    farmId: req.validated.query?.farmId || null,
    range: req.validated.query?.range || "30d",
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
  res.send(result.buffer);
});

module.exports = {
  getFarmAnalyticsDashboard,
  getFarmAnalyticsHistory,
  exportFarmAnalytics,
  getAdminAnalyticsDashboard,
  getAdminAnalyticsHistory,
  exportAdminAnalytics,
  getSimpleReport,
  exportSimpleReportPdf,
  exportSimpleReportExcel,
};
