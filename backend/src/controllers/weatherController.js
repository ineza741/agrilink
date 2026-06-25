const asyncHandler = require("../utils/asyncHandler");
const weatherService = require("../services/weatherService");

const getFarmWeatherDashboard = asyncHandler(async (req, res) => {
  const data = await weatherService.getFarmWeatherDashboard(
    req.user,
    req.validated.params.farmId,
    req.validated.query || {},
  );

  res.json({
    success: true,
    data,
  });
});

const getFarmWeatherHistory = asyncHandler(async (req, res) => {
  const data = await weatherService.listFarmWeatherHistory(
    req.user,
    req.validated.params.farmId,
    req.validated.query || {},
  );

  res.json({
    success: true,
    data,
  });
});

module.exports = {
  getFarmWeatherDashboard,
  getFarmWeatherHistory,
};
