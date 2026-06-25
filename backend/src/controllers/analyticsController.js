const asyncHandler = require("../utils/asyncHandler");
const analyticsService = require("../services/analyticsService");

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

module.exports = {
  getFarmAnalyticsDashboard,
  getFarmAnalyticsHistory,
  exportFarmAnalytics,
  getAdminAnalyticsDashboard,
  getAdminAnalyticsHistory,
  exportAdminAnalytics,
};
