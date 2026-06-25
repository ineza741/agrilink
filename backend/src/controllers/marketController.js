const asyncHandler = require("../utils/asyncHandler");
const marketService = require("../services/marketService");

const analyzeMarket = asyncHandler(async (req, res) => {
  const analysis = await marketService.analyzeMarket(req.user, req.validated.params.farmId, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Market analysis generated successfully.",
    data: analysis,
  });
});

const getLatestMarketAnalysis = asyncHandler(async (req, res) => {
  const analysis = await marketService.getLatestMarketAnalysis(req.user, req.validated.params.farmId, req.validated.query || {});
  res.json({
    success: true,
    data: analysis,
  });
});

const listMarketAlerts = asyncHandler(async (req, res) => {
  const alerts = await marketService.listMarketAlerts(req.user, req.validated.params.farmId);
  res.json({
    success: true,
    data: alerts,
  });
});

const createMarketAlert = asyncHandler(async (req, res) => {
  const alert = await marketService.createMarketAlert(req.user, req.validated.params.farmId, req.validated.body);
  res.status(201).json({
    success: true,
    message: "Market alert created successfully.",
    data: alert,
  });
});

const deleteMarketAlert = asyncHandler(async (req, res) => {
  const result = await marketService.deleteMarketAlert(req.user, req.validated.params.id);
  res.json({
    success: true,
    message: "Market alert deleted successfully.",
    data: result,
  });
});

module.exports = {
  analyzeMarket,
  getLatestMarketAnalysis,
  listMarketAlerts,
  createMarketAlert,
  deleteMarketAlert,
};
